"""
Парсер туров с сайта rtoperator.ru (с Playwright для обхода защиты)
"""
import asyncio
import json
from bs4 import BeautifulSoup
from typing import List, Dict, Any
from datetime import datetime
import re
from playwright.async_api import async_playwright, Page

class RTourParser:
    def __init__(self):
        self.base_url = "https://www.rtoperator.ru"
        self.tours_url = f"{self.base_url}/tury/poekhali/"
        self.info_url = f"{self.base_url}/toursInfo.html"
        
    async def wait_for_page_load(self, page: Page):
        """Ждем полной загрузки страницы"""
        try:
            await page.wait_for_load_state("networkidle", timeout=30000)
            await asyncio.sleep(2)  # Дополнительная задержка для JS
        except:
            pass
    
    def extract_total_pages(self, html: str) -> int:
        """Извлечь общее количество страниц из скрытого div"""
        soup = BeautifulSoup(html, 'html.parser')
        
        # Ищем <div style="display: none"> с информацией о пагинации
        hidden_divs = soup.find_all('div', style=re.compile(r'display:\s*none', re.I))
        
        for div in hidden_divs:
            text = div.get_text(strip=True)
            # Формат: ", 1, 39," где 39 - количество страниц
            match = re.search(r',\s*\d+\s*,\s*(\d+)\s*,', text)
            if match:
                return int(match.group(1))
        
        return 1
    
    def parse_tour_card(self, card) -> Dict[str, Any]:
        """Парсинг карточки тура"""
        tour = {}
        
        try:
            # Название тура
            title_elem = card.find('h3') or card.find('a', class_=re.compile(r'tour.*title', re.I))
            if not title_elem:
                title_elem = card.find('a')
            
            if title_elem:
                tour['name'] = title_elem.get_text(strip=True)
                
                # Ссылка на тур
                link = title_elem.find('a') if title_elem.name != 'a' else title_elem
                if link and link.get('href'):
                    href = link['href']
                    tour['url'] = self.base_url + href if not href.startswith('http') else href
            
            # ID тура из ссылки
            if 'url' in tour:
                id_match = re.search(r'/(\d+)/?', tour['url'])
                if id_match:
                    tour['id'] = int(id_match.group(1))
            
            # Маршрут
            route_elem = card.find(class_=re.compile(r'route|direction', re.I))
            if route_elem:
                route_text = route_elem.get_text(strip=True)
                tour['route'] = [r.strip() for r in re.split(r'[-–—→]', route_text) if r.strip()]
            
            # Длительность
            duration_elem = card.find(class_=re.compile(r'duration|days', re.I))
            if not duration_elem:
                duration_elem = card.find(string=re.compile(r'\d+\s*(?:дн|день|дней)', re.I))
            
            if duration_elem:
                duration_text = duration_elem if isinstance(duration_elem, str) else duration_elem.get_text(strip=True)
                days_match = re.search(r'(\d+)\s*(?:дн|день|дней)', duration_text)
                if days_match:
                    tour['days'] = int(days_match.group(1))
            
            # Цена
            price_elem = card.find(class_=re.compile(r'price', re.I))
            if price_elem:
                price_text = price_elem.get_text(strip=True)
                price_match = re.search(r'([\d\s]+)', price_text.replace(' ', '').replace('\xa0', ''))
                if price_match:
                    tour['price'] = int(price_match.group(1).replace(' ', ''))
                
                # Валюта
                if '₽' in price_text or 'руб' in price_text.lower():
                    tour['currency'] = 'руб'
                elif '$' in price_text:
                    tour['currency'] = '$'
                elif '€' in price_text:
                    tour['currency'] = '€'
            
            # Изображение
            img = card.find('img')
            if img and img.get('src'):
                img_src = img['src']
                tour['image'] = self.base_url + img_src if not img_src.startswith('http') else img_src
                
        except Exception as e:
            print(f"Ошибка парсинга карточки тура: {e}")
        
        return tour if tour else None
    
    async def fetch_tour_dates(self, page: Page, tour_id: int, page_num: int = 1) -> List[Dict[str, Any]]:
        """Получить даты и ведомости для тура"""
        url = f"{self.info_url}?_={tour_id}&page={page_num}"
        
        try:
            await page.goto(url, wait_until="networkidle", timeout=30000)
            await self.wait_for_page_load(page)
            
            html = await page.content()
            soup = BeautifulSoup(html, 'html.parser')
            
            dates = []
            
            # Ищем таблицу или список с датами
            date_rows = soup.find_all('tr')
            
            for row in date_rows:
                date_data = {}
                
                # Дата
                date_cells = row.find_all('td')
                if len(date_cells) > 0:
                    date_text = date_cells[0].get_text(strip=True)
                    # Пытаемся распарсить дату
                    try:
                        # Формат может быть разным: "01.01.2026", "1 января 2026" и т.д.
                        date_match = re.search(r'(\d{1,2})[.\s](\d{1,2})[.\s](\d{4})', date_text)
                        if date_match:
                            day, month, year = date_match.groups()
                            date_data['date'] = f"{day.zfill(2)}.{month.zfill(2)}.{year}"
                    except:
                        date_data['date'] = date_text
                
                # Цена на конкретную дату
                for cell in date_cells:
                    cell_text = cell.get_text(strip=True)
                    price_match = re.search(r'([\d\s]+)\s*₽', cell_text.replace(' ', '').replace('\xa0', ''))
                    if price_match:
                        date_data['price'] = int(price_match.group(1).replace(' ', ''))
                        break
                
                if date_data:
                    dates.append(date_data)
            
            return dates
            
        except Exception as e:
            print(f"Ошибка загрузки дат для тура {tour_id}, страница {page_num}: {e}")
            return []
    
    async def parse_tours_page(self, page: Page, page_num: int = 1) -> tuple[List[Dict[str, Any]], int]:
        """Парсинг страницы со списком туров"""
        url = self.tours_url if page_num == 1 else f"{self.tours_url}?page={page_num}"
        
        try:
            print(f"Загрузка страницы {page_num}: {url}")
            await page.goto(url, wait_until="networkidle", timeout=60000)
            await self.wait_for_page_load(page)
            
            html = await page.content()
            soup = BeautifulSoup(html, 'html.parser')
            
            # Получаем общее количество страниц
            total_pages = self.extract_total_pages(html)
            
            tours = []
            
            # Ищем карточки туров - пробуем разные варианты
            tour_cards = soup.find_all('div', class_=re.compile(r'tour', re.I))
            
            if not tour_cards:
                tour_cards = soup.find_all('article')
            
            if not tour_cards:
                tour_cards = soup.find_all('div', class_=re.compile(r'item|card', re.I))
            
            print(f"Найдено карточек на странице {page_num}: {len(tour_cards)}")
            
            for card in tour_cards:
                tour = self.parse_tour_card(card)
                if tour and 'name' in tour:
                    tours.append(tour)
            
            return tours, total_pages
            
        except Exception as e:
            print(f"Ошибка парсинга страницы {page_num}: {e}")
            return [], 1
    
    async def parse_all_tours(self) -> List[Dict[str, Any]]:
        """Парсинг всех туров со всех страниц"""
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=False)  # headless=False для отладки
            context = await browser.new_context(
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            )
            page = await context.new_page()
            
            try:
                # Парсим первую страницу
                tours, total_pages = await self.parse_tours_page(page, 1)
                
                print(f"Найдено страниц: {total_pages}")
                print(f"Туров на первой странице: {len(tours)}")
                
                # Парсим остальные страницы последовательно (чтобы не нагружать сервер)
                if total_pages > 1:
                    for page_num in range(2, min(total_pages + 1, 6)):  # Ограничим 5 страницами для теста
                        page_tours, _ = await self.parse_tours_page(page, page_num)
                        tours.extend(page_tours)
                        await asyncio.sleep(1)  # Пауза между запросами
                
                print(f"Всего туров: {len(tours)}")
                
                # Для каждого тура получаем даты (пропустим для первого запуска)
                # print("Загрузка дат для туров...")
                # for i, tour in enumerate(tours[:5]):  # Только первые 5 для теста
                #     if 'id' in tour:
                #         dates = await self.fetch_tour_dates(page, tour['id'])
                #         tour['dates'] = dates
                #         print(f"Обработан тур {i + 1}: {len(dates)} дат")
                #         await asyncio.sleep(1)
                
                return tours
                
            finally:
                await browser.close()
    
    def save_to_json(self, tours: List[Dict[str, Any]], filename: str = "rtoperator.json"):
        """Сохранение в JSON"""
        output = {
            "source": "rtoperator",
            "parsed_at": datetime.now().isoformat(),
            "total_count": len(tours),
            "programs": tours
        }
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(output, f, ensure_ascii=False, indent=2)
        
        print(f"Сохранено в {filename}")


async def main():
    parser = RTourParser()
    tours = await parser.parse_all_tours()
    parser.save_to_json(tours, "rtoperator.json")


if __name__ == "__main__":
    asyncio.run(main())
