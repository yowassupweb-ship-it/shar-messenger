"""
Парсер для Magput.ru
Использует POST-запросы к API для получения списка туров
"""
import requests
import logging
from typing import List, Dict, Optional
from datetime import datetime

logging.basicConfig(level=logging.INFO)

class MagputParser:
    def __init__(self):
        self.base_url = "https://magput.ru"
        self.api_url = "https://back.magput.ru/backend/Search/SearchPrograms"
        self.logger = logging.getLogger(__name__)
        self.session = requests.Session()
        
        # Стандартные заголовки как в браузере
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br, zstd',
            'Content-Type': 'application/json;charset=UTF-8',
            'Origin': 'https://magput.ru',
            'Referer': 'https://magput.ru/',
            'sec-ch-ua': '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-site'
        })
    
    def get_default_payload(self, sub_type: str = "11") -> Dict:
        """
        Базовый payload для запроса
        sub_type: "10" - однодневные, "11" - многодневные
        """
        return {
            "ByCheckin": False,
            "ByRange": False,
            "Checkin": None,
            "CityName": "-1",
            "CityType": "-1",
            "Count": 0,
            "CountOnly": False,
            "CurrentPage": 1,
            "DurationMax": 20,
            "DurationMin": 1,  # Всегда 1
            "ExcludeTopics": [],
            "FilterDates": False,
            "GroupByTopics": False,
            "GuideName": None,
            "ItemsPerPage": 30,  # Как в вашем запросе
            "LastIdDigits": [],
            "OnlyHits": False,
            "OnlyNew": False,
            "OptType": -1,
            "PlacesMinLimit": 0,
            "PriceMax": None,
            "PriceMin": None,
            "ProgramIds": [],
            "ProgramTypes": [],
            "ProgramTypesAndLogic": True,
            "Range": 0,
            "SortByDate": True,
            "StartCityName": None,
            "SubType": sub_type,
            "TopicIds": [],
            "Type": -1,
            "WithNotActual": False
        }
    
    def fetch_tours(self, sub_type: str = "11", max_pages: int = None) -> List[Dict]:
        """
        Получение туров с Magput через пагинацию
        
        Args:
            sub_type: "10" для однодневных, "11" для многодневных
            max_pages: максимальное количество страниц (None = все)
        
        Returns:
            Список туров
        """
        try:
            self.logger.info(f"Начало парсинга Magput (тип: {'однодневные' if sub_type == '10' else 'многодневные'})")
            
            tours = []
            page = 1
            total_count = None
            items_per_page = 30
            
            while True:
                payload = self.get_default_payload(sub_type)
                payload["CurrentPage"] = page
                
                self.logger.info(f"Запрос страницы {page}...")
                
                response = self.session.post(
                    self.api_url,
                    json=payload,
                    timeout=60
                )
                
                if response.status_code != 200:
                    self.logger.error(f"Ошибка HTTP {response.status_code}")
                    break
                
                data = response.json()
                
                if total_count is None:
                    total_count = data.get("count", 0)
                    items_per_page = data.get("itemsPerPage", 30)
                    total_pages = (total_count + items_per_page - 1) // items_per_page
                    self.logger.info(f"Всего туров: {total_count}, страниц: {total_pages}")
                
                programs = data.get("programs", [])
                
                if not programs:
                    self.logger.info(f"Страница {page} пустая")
                    break
                
                for program in programs:
                    try:
                        tour_data = self.parse_program(program, sub_type)
                        if tour_data:
                            tours.append(tour_data)
                    except Exception as e:
                        self.logger.error(f"Ошибка парсинга {program.get('id')}: {str(e)}")
                        continue
                
                self.logger.info(f"Обработано {len(tours)}/{total_count} туров")
                
                # Проверка завершения
                if max_pages and page >= max_pages:
                    break
                
                if len(programs) < items_per_page or page >= total_pages:
                    break
                
                page += 1
            
            self.logger.info(f"Парсинг завершен. Получено {len(tours)} туров")
            return tours
            
        except Exception as e:
            self.logger.error(f"Критическая ошибка: {str(e)}", exc_info=True)
            raise
    
    def parse_program(self, program: Dict, sub_type: str) -> Optional[Dict]:
        """Парсинг одной программы в формат продукта"""
        try:
            program_id = program.get("id")
            if not program_id:
                return None
            
            content = program.get("content", {})
            name = content.get("name", "")
            
            # Длительность
            duration = content.get("duration", {})
            days = duration.get("days", 1)
            
            # Цена
            price_min = content.get("priceMin", {})
            price = price_min.get("brutto", 0)
            currency = price_min.get("currency", "руб")
            
            # Маршрут
            route = program.get("route", [])
            route_names = [r.get("name", "") for r in route]
            route_str = " → ".join(route_names) if route_names else ""
            
            # Изображение
            main_photo = program.get("mainPhoto", {})
            image_url = main_photo.get("url", "")
            if image_url and not image_url.startswith("http"):
                image_url = f"{self.base_url}{image_url}"
            
            # URL тура
            tour_url = f"{self.base_url}/programs/{program_id}"
            
            # Даты
            dates = program.get("dates", [])
            dates_data = []
            for date_obj in dates:
                date_str = date_obj.get("date")
                if date_str:
                    dates_data.append({
                        "date": date_str,
                        "dateFormatted": self.format_date(date_str),
                        "price": price,
                        "available": True
                    })
            
            # Формируем ID в формате magput_XXXXXX
            formatted_id = f"magput_{str(program_id).zfill(6)}"
            
            tour_data = {
                'id': formatted_id,
                'name': name,
                'days': str(days),
                'route': route_str,
                'image': image_url,
                'price': str(price),
                'currency': currency,
                'model': name,
                'url': tour_url,
                'dates': dates_data,
                'datesCount': len(dates_data),
                'source': 'magput',
                'subType': 'one-day' if sub_type == "10" else 'multi-day',
                'rawData': program  # Сохраняем оригинальные данные
            }
            
            return tour_data
            
        except Exception as e:
            self.logger.error(f"Ошибка парсинга программы {program.get('id')}: {str(e)}")
            return None
    
    def format_date(self, date_str: str) -> str:
        """Форматирование даты в читаемый вид"""
        try:
            # Пробуем разные форматы даты
            for fmt in ["%Y-%m-%dT%H:%M:%S", "%Y-%m-%d", "%Y-%m-%dT%H:%M:%SZ"]:
                try:
                    dt = datetime.strptime(date_str.replace("Z", ""), fmt.replace("Z", ""))
                    months = {
                        1: "янв", 2: "фев", 3: "мар", 4: "апр", 5: "май", 6: "июн",
                        7: "июл", 8: "авг", 9: "сен", 10: "окт", 11: "ноя", 12: "дек"
                    }
                    return f"{dt.day} {months[dt.month]} {dt.year}"
                except ValueError:
                    continue
            return date_str
        except:
            return date_str
    
    def fetch_all_tours(self, max_pages: int = None) -> Dict[str, List[Dict]]:
        """
        Получение всех туров (однодневных и многодневных) одним вызовом
        
        Returns:
            Dict с ключами 'one_day' и 'multi_day'
        """
        self.logger.info("="*60)
        self.logger.info("ЗАПУСК ПОЛНОГО ПАРСИНГА MAGPUT")
        self.logger.info("="*60)
        
        # Парсим многодневные (SubType: "10" по вашему запросу дает 2502)
        multi_day = self.fetch_tours(sub_type="10", max_pages=max_pages)
        
        # Парсим однодневные (если они есть отдельно с другим SubType)
        # one_day = self.fetch_tours(sub_type="11", max_pages=max_pages)
        
        self.logger.info("="*60)
        self.logger.info(f"ПАРСИНГ ЗАВЕРШЕН: {len(multi_day)} туров")
        self.logger.info("="*60)
        
        return {
            'all': multi_day,  # Все туры (SubType "10" возвращает 2502 - все туры)
            'multi_day': multi_day,
            'one_day': []  # Пока пусто, уточним логику позже
        }


if __name__ == "__main__":
    # Тестирование парсера
    parser = MagputParser()
    
    print("Парсинг многодневных туров...")
    multi_day = parser.fetch_tours(sub_type="11")
    print(f"Найдено многодневных туров: {len(multi_day)}")
    
    if multi_day:
        print("\nПример многодневного тура:")
        print(f"ID: {multi_day[0]['id']}")
        print(f"Название: {multi_day[0]['name']}")
        print(f"Дней: {multi_day[0]['days']}")
        print(f"Цена: {multi_day[0]['price']} {multi_day[0].get('currency', 'руб')}")
        print(f"Маршрут: {multi_day[0]['route']}")
        print(f"Дат отправления: {multi_day[0]['datesCount']}")
    
    print("\n" + "="*50)
    print("Парсинг однодневных туров...")
    one_day = parser.fetch_tours(sub_type="10")
    print(f"Найдено однодневных туров: {len(one_day)}")
    
    if one_day:
        print("\nПример однодневного тура:")
        print(f"ID: {one_day[0]['id']}")
        print(f"Название: {one_day[0]['name']}")
        print(f"Цена: {one_day[0]['price']} {one_day[0].get('currency', 'руб')}")
        print(f"Дат отправления: {one_day[0]['datesCount']}")
    
    print("\n" + "="*50)
    print(f"ИТОГО: {len(multi_day) + len(one_day)} туров")
