"""
Парсер дат отправления туров с vs-travel.ru
Извлекает расписание с датами, ценами и количеством мест
"""

import requests
from bs4 import BeautifulSoup
from datetime import datetime
import logging
from typing import List, Dict, Optional
import re

logging.basicConfig(level=logging.INFO)

class TourDatesParser:
    """Парсер дат отправления для туров"""
    
    def __init__(self):
        self.base_url = "https://vs-travel.ru"
        self.session = requests.Session()
        self.logger = logging.getLogger(__name__)
        
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'ru-RU,ru;q=0.9',
        })
    
    def parse_tour_dates(self, tour_url: str) -> List[Dict]:
        """
        Парсит даты отправления тура со страницы
        
        Args:
            tour_url: URL страницы тура (например, https://vs-travel.ru/tour?id=1373)
        
        Returns:
            Список словарей с датами: [{
                'date_from': '19.11.2025',
                'date_to': '21.11.2025',
                'weekdays': 'ср-пт',
                'seats': 5,
                'price': 18850,
                'available': True
            }, ...]
        """
        try:
            self.logger.info(f"Парсинг дат тура: {tour_url}")
            
            response = self.session.get(tour_url, timeout=30)
            if response.status_code != 200:
                self.logger.error(f"Ошибка HTTP {response.status_code}")
                return []
            
            soup = BeautifulSoup(response.text, 'lxml')
            dates = []
            
            # Ищем список с датами: <ul class="dates-rows">
            dates_container = soup.find('ul', class_='dates-rows')
            
            if not dates_container:
                # Пробуем альтернативные селекторы
                dates_container = soup.find('div', class_='dates-rows')
            if not dates_container:
                dates_container = soup.find('div', {'id': 'dates'})
            if not dates_container:
                self.logger.warning("Не найден контейнер с датами")
                # Сохраняем HTML для отладки
                tour_id = tour_url.split('=')[-1] if '=' in tour_url else 'unknown'
                debug_file = f"debug_dates_{tour_id}.html"
                with open(debug_file, 'w', encoding='utf-8') as f:
                    f.write(response.text)
                self.logger.info(f"HTML сохранен в {debug_file} для анализа")
                return []
            
            # Все строки с датами: <li class="daterow">
            date_rows = dates_container.find_all('li', class_='daterow')
            self.logger.info(f"Найдено строк с датами: {len(date_rows)}")
            
            for row in date_rows:
                try:
                    date_info = self._parse_date_row(row)
                    if date_info:
                        dates.append(date_info)
                        self.logger.debug(f"Найдена дата: {date_info['date_from']} - {date_info['price']} ₽")
                except Exception as e:
                    self.logger.error(f"Ошибка парсинга строки даты: {str(e)}")
                    continue
            
            self.logger.info(f"Найдено дат: {len(dates)}")
            return dates
            
        except Exception as e:
            self.logger.error(f"Ошибка парсинга дат тура: {str(e)}", exc_info=True)
            return []
    
    def _parse_date_row(self, row) -> Optional[Dict]:
        """Парсит одну строку с датой отправления"""
        try:
            # Дата: <div class="daterow-date">19.11.2025 - 21.11.2025 <br><span>ср-пт</span></div>
            date_div = row.find('div', class_='daterow-date')
            if not date_div:
                return None
            
            date_text = date_div.get_text(separator=' ', strip=True)
            
            # Извлекаем даты (формат: DD.MM.YYYY - DD.MM.YYYY)
            date_pattern = r'(\d{2}\.\d{2}\.\d{4})\s*-\s*(\d{2}\.\d{2}\.\d{4})'
            date_match = re.search(date_pattern, date_text)
            
            if not date_match:
                return None
            
            date_from = date_match.group(1)
            date_to = date_match.group(2)
            
            # Дни недели в <span>
            weekday_span = date_div.find('span')
            weekdays = weekday_span.get_text(strip=True) if weekday_span else ''
            
            # Количество мест: <div class="daterow-count"> 12</div>
            count_div = row.find('div', class_='daterow-count')
            seats = 0
            if count_div:
                try:
                    seats = int(count_div.get_text(strip=True))
                except ValueError:
                    seats = 0
            
            # Цена: <span class="tour-detail-content__cat-price__price_b">18 850</span>
            price_span = row.find('span', class_='tour-detail-content__cat-price__price_b')
            if not price_span:
                # Альтернативный поиск цены
                price_div = row.find('div', class_='tour-detail-content__catalog-price')
                if price_div:
                    price_text = price_div.get_text()
                    price_pattern = r'от\s*([\d\s]+)\s*₽'
                    price_match = re.search(price_pattern, price_text)
                    if price_match:
                        price_str = price_match.group(1).replace(' ', '')
                        price = int(price_str)
                    else:
                        return None
                else:
                    return None
            else:
                price_str = price_span.get_text(strip=True).replace(' ', '')
                try:
                    price = int(price_str)
                except ValueError:
                    return None
            
            # Проверяем доступность (есть ли кнопка "Купить")
            buy_btn = row.find('a', class_='button')
            available = buy_btn is not None and seats > 0
            
            return {
                'date_from': date_from,
                'date_to': date_to,
                'weekdays': weekdays,
                'seats': seats,
                'price': price,
                'available': available
            }
            
        except Exception as e:
            self.logger.error(f"Ошибка парсинга строки: {str(e)}")
            return None
    
    def parse_all_tours_dates(self, tour_urls: List[str]) -> Dict[str, List[Dict]]:
        """
        Парсит даты для списка туров
        
        Args:
            tour_urls: Список URL туров
        
        Returns:
            Словарь {tour_url: [даты]}
        """
        results = {}
        
        for url in tour_urls:
            try:
                dates = self.parse_tour_dates(url)
                results[url] = dates
            except Exception as e:
                self.logger.error(f"Ошибка парсинга {url}: {str(e)}")
                results[url] = []
        
        return results


# Тестовый запуск
if __name__ == "__main__":
    parser = TourDatesParser()
    
    # Тестируем на одном туре
    test_url = "https://vs-travel.ru/tour?id=1373"
    dates = parser.parse_tour_dates(test_url)
    
    print(f"\nНайдено дат: {len(dates)}\n")
    
    for i, date in enumerate(dates[:5], 1):  # Показываем первые 5
        print(f"{i}. {date['date_from']} - {date['date_to']} ({date['weekdays']})")
        print(f"   Мест: {date['seats']}, Цена: {date['price']} ₽")
        print()
