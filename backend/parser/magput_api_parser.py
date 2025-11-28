"""
Парсер для magput.ru через их API
Использует endpoint https://back.magput.ru/backend/Search/SearchPrograms
"""

import aiohttp
import asyncio
from typing import List, Dict, Any
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class MagputAPIParser:
    """Парсер туров magput.ru через API"""
    
    def __init__(self):
        self.api_url = "https://back.magput.ru/backend/Search/SearchPrograms"
        self.base_url = "https://magput.ru"
        
        # Headers из реального запроса
        self.headers = {
            'accept': 'application/json, text/plain, */*',
            'accept-language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
            'content-type': 'application/json;charset=UTF-8',
            'origin': 'https://magput.ru',
            'referer': 'https://magput.ru/',
            'sec-ch-ua': '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-site',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
    
    async def fetch_tours(self, category: str = "odnodnevnie-ekskursii", page: int = 1, page_size: int = 50) -> Dict[str, Any]:
        """
        Получить туры через API
        
        Args:
            category: Категория туров
            page: Номер страницы
            page_size: Количество на странице
        
        Returns:
            Словарь с данными туров
        """
        # Payload для POST запроса (примерный, нужно уточнить структуру)
        payload = {
            "category": category,
            "page": page,
            "pageSize": page_size,
            "filters": {},
            "sort": "date"
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                logger.info(f"Запрос к API: {self.api_url}, страница {page}")
                
                async with session.post(
                    self.api_url,
                    json=payload,
                    headers=self.headers,
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as response:
                    
                    if response.status == 200:
                        data = await response.json()
                        logger.info(f"Получено {len(data.get('items', []))} туров")
                        return data
                    else:
                        logger.error(f"Ошибка API: {response.status}")
                        return {"items": [], "total": 0}
                        
        except Exception as e:
            logger.error(f"Ошибка запроса к API: {e}")
            return {"items": [], "total": 0}
    
    async def fetch_tour_details(self, tour_id: str) -> Dict[str, Any]:
        """
        Получить детальную информацию о туре
        
        Args:
            tour_id: ID тура
        
        Returns:
            Словарь с детальными данными
        """
        # Endpoint для деталей тура (нужно уточнить)
        detail_url = f"https://back.magput.ru/backend/Tour/GetDetails/{tour_id}"
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    detail_url,
                    headers=self.headers,
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as response:
                    
                    if response.status == 200:
                        return await response.json()
                    else:
                        logger.error(f"Ошибка получения деталей тура {tour_id}: {response.status}")
                        return {}
                        
        except Exception as e:
            logger.error(f"Ошибка получения деталей тура {tour_id}: {e}")
            return {}
    
    def parse_tour_data(self, tour: Dict[str, Any]) -> Dict[str, Any]:
        """
        Преобразовать данные тура в нужный формат
        
        Args:
            tour: Сырые данные тура из API
        
        Returns:
            Форматированные данные
        """
        return {
            "id": tour.get("id", ""),
            "name": tour.get("name", tour.get("title", "")),
            "url": f"{self.base_url}{tour.get('url', '')}",
            "route": tour.get("route", ""),
            "price": tour.get("price", 0),
            "image": tour.get("image", ""),
            "duration_days": tour.get("days", tour.get("duration", 1)),
            "dates": tour.get("dates", []),
            "description": tour.get("description", ""),
            "category": tour.get("category", ""),
            "parsedAt": datetime.utcnow().isoformat()
        }
    
    async def parse_all_tours(self, max_pages: int = 10) -> List[Dict[str, Any]]:
        """
        Спарсить все туры
        
        Args:
            max_pages: Максимальное количество страниц
        
        Returns:
            Список всех туров
        """
        all_tours = []
        
        for page in range(1, max_pages + 1):
            logger.info(f"Парсинг страницы {page}/{max_pages}")
            
            data = await self.fetch_tours(page=page)
            items = data.get("items", [])
            
            if not items:
                logger.info("Больше нет туров, останавливаем парсинг")
                break
            
            for tour in items:
                parsed_tour = self.parse_tour_data(tour)
                all_tours.append(parsed_tour)
            
            # Проверяем, есть ли еще страницы
            total = data.get("total", 0)
            if len(all_tours) >= total:
                break
            
            # Небольшая задержка между запросами
            await asyncio.sleep(1)
        
        logger.info(f"Всего спарсено туров: {len(all_tours)}")
        return all_tours
    
    async def fetch_tour_dates(self, tour_id: str) -> List[str]:
        """
        Получить даты проведения тура
        
        Args:
            tour_id: ID тура
        
        Returns:
            Список дат в формате ISO
        """
        details = await self.fetch_tour_details(tour_id)
        dates = details.get("availableDates", details.get("dates", []))
        return dates


async def main():
    """Пример использования парсера"""
    parser = MagputAPIParser()
    
    # Парсим все туры
    tours = await parser.parse_all_tours(max_pages=5)
    
    print(f"\nНайдено туров: {len(tours)}")
    
    if tours:
        print("\nПример первого тура:")
        first_tour = tours[0]
        for key, value in first_tour.items():
            print(f"  {key}: {value}")


if __name__ == "__main__":
    asyncio.run(main())
