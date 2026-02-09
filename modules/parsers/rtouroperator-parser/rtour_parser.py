"""
Парсер туров с сайта rtoperator.ru
"""
import asyncio
import aiohttp
import json
from bs4 import BeautifulSoup
from typing import List, Dict, Any
from datetime import datetime
import re

class RTourParser:
    def __init__(self):
        self.base_url = "https://www.rtoperator.ru"
        self.tours_url = f"{self.base_url}/tury/poekhali/"
        self.info_url = f"{self.base_url}/toursInfo.html"
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        }
        
    async def fetch_page(self, session: aiohttp.ClientSession, url: str) -> str:
        """Загрузка страницы"""
        async with session.get(url, headers=self.headers) as response:
            return await response.text()
    
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
            if title_elem:
                tour['name'] = title_elem.get_text(strip=True)
                
                # Ссылка на тур
                link = title_elem.find('a') if title_elem.name != 'a' else title_elem
                if link and link.get('href'):
                    tour['url'] = self.base_url + link['href'] if not link['href'].startswith('http') else link['href']
            
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
            duration_elem = card.find(class_=re.compile(r'duration|days', re.I)) or \
                           card.find(string=re.compile(r'\d+\s*(?:дн|день|дней)', re.I))
            if duration_elem:
                duration_text = duration_elem if isinstance(duration_elem, str) else duration_elem.get_text(strip=True)
                days_match = re.search(r'(\d+)\s*(?:дн|день|дней)', duration_text)
                if days_match:
                    tour['days'] = int(days_match.group(1))
            
            # Цена
            price_elem = card.find(class_=re.compile(r'price', re.I))
            if price_elem:
                price_text = price_elem.get_text(strip=True)
                price_match = re.search(r'([\d\s]+)', price_text.replace(' ', ''))
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
    
    async def fetch_tour_dates(self, session: aiohttp.ClientSession, tour_id: int, page: int = 1) -> List[Dict[str, Any]]:
        """Получить даты и ведомости для тура"""
        url = f"{self.info_url}?_={tour_id}&page={page}"
        
        try:
            html = await self.fetch_page(session, url)
            soup = BeautifulSoup(html, 'html.parser')
            
            dates = []
            
            # Ищем таблицу или список с датами
            date_rows = soup.find_all('tr', class_=re.compile(r'date|tour', re.I))
            
            for row in date_rows:
                date_data = {}
                
                # Дата
                date_elem = row.find(class_=re.compile(r'date', re.I))
                if date_elem:
                    date_text = date_elem.get_text(strip=True)
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
                price_elem = row.find(class_=re.compile(r'price', re.I))
                if price_elem:
                    price_text = price_elem.get_text(strip=True)
                    price_match = re.search(r'([\d\s]+)', price_text.replace(' ', ''))
                    if price_match:
                        date_data['price'] = int(price_match.group(1).replace(' ', ''))
                
                # Наличие мест
                available_elem = row.find(class_=re.compile(r'available|seats', re.I))
                if available_elem:
                    available_text = available_elem.get_text(strip=True).lower()
                    date_data['available'] = 'нет мест' not in available_text and 'sold' not in available_text
                
                if date_data:
                    dates.append(date_data)
            
            return dates
            
        except Exception as e:
            print(f"Ошибка загрузки дат для тура {tour_id}, страница {page}: {e}")
            return []
    
    async def parse_tours_page(self, session: aiohttp.ClientSession, page: int = 1) -> tuple[List[Dict[str, Any]], int]:
        """Парсинг страницы со списком туров"""
        url = self.tours_url if page == 1 else f"{self.tours_url}?page={page}"
        
        try:
            html = await self.fetch_page(session, url)
            soup = BeautifulSoup(html, 'html.parser')
            
            # Получаем общее количество страниц
            total_pages = self.extract_total_pages(html)
            
            tours = []
            
            # Ищем карточки туров
            tour_cards = soup.find_all(class_=re.compile(r'tour.*card|card.*tour|tour.*item', re.I))
            
            if not tour_cards:
                # Альтернативный поиск
                tour_cards = soup.find_all('div', class_=re.compile(r'item|card', re.I))
            
            for card in tour_cards:
                tour = self.parse_tour_card(card)
                if tour and 'name' in tour:
                    tours.append(tour)
            
            return tours, total_pages
            
        except Exception as e:
            print(f"Ошибка парсинга страницы {page}: {e}")
            return [], 1
    
    async def parse_all_tours(self) -> List[Dict[str, Any]]:
        """Парсинг всех туров со всех страниц"""
        async with aiohttp.ClientSession() as session:
            # Парсим первую страницу и узнаем количество страниц
            tours, total_pages = await self.parse_tours_page(session, 1)
            
            print(f"Найдено страниц: {total_pages}")
            print(f"Туров на первой странице: {len(tours)}")
            
            # Парсим остальные страницы параллельно
            if total_pages > 1:
                tasks = []
                for page in range(2, total_pages + 1):
                    tasks.append(self.parse_tours_page(session, page))
                
                results = await asyncio.gather(*tasks)
                
                for page_tours, _ in results:
                    tours.extend(page_tours)
            
            print(f"Всего туров: {len(tours)}")
            
            # Для каждого тура получаем даты
            print("Загрузка дат для туров...")
            for i, tour in enumerate(tours):
                if 'id' in tour:
                    dates = await self.fetch_tour_dates(session, tour['id'])
                    tour['dates'] = dates
                    
                    if (i + 1) % 10 == 0:
                        print(f"Обработано туров: {i + 1}/{len(tours)}")
            
            return tours
    
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
