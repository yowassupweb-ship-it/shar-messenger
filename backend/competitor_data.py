"""
API для работы с данными конкурентов (Magput, VS-Travel)
"""
import json
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime
import asyncio
import logging

logger = logging.getLogger(__name__)

class CompetitorDataManager:
    def __init__(self):
        self.base_path = Path(__file__).parent.parent / "magput-parser"
        self.sources = {
            "magput-all": {
                "id": "magput-all",
                "name": "Magput - Все туры",
                "type": "magput",
                "subType": "11",  # SubType "11" = 2508 многодневных туров
                "file": "magput-all.json",
                "enabled": True,
                "lastSync": None,
                "itemsCount": 0,
                "canParse": True  # Поддерживает парсинг через API
            }
        }
    
    def load_json_file(self, filename: str) -> Dict[str, Any]:
        """Загрузка JSON файла"""
        file_path = self.base_path / filename
        if not file_path.exists():
            return {"programs": []}
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading {filename}: {e}")
            return {"programs": []}
    
    def get_sources(self) -> List[Dict[str, Any]]:
        """Получить список всех источников"""
        sources_list = []
        for source_id, source in self.sources.items():
            data = self.load_json_file(source["file"])
            source_copy = source.copy()
            source_copy["itemsCount"] = len(data.get("programs", []))
            source_copy["status"] = "success" if source_copy["itemsCount"] > 0 else "idle"
            
            # Добавляем информацию о датах
            programs = data.get("programs", [])
            items_with_dates = sum(1 for p in programs if p.get("dates"))
            source_copy["itemsWithDates"] = items_with_dates
            source_copy["itemsWithoutDates"] = source_copy["itemsCount"] - items_with_dates
            
            sources_list.append(source_copy)
        return sources_list
    
    async def parse_source(self, source_id: str, db_manager) -> Dict[str, Any]:
        """
        Парсинг источника Magput
        
        Args:
            source_id: ID источника
            db_manager: Экземпляр Database для сохранения состояния
        
        Returns:
            Результат парсинга
        """
        from parser.magput_parser import MagputParser
        
        if source_id not in self.sources:
            raise ValueError(f"Источник {source_id} не найден")
        
        source = self.sources[source_id]
        
        try:
            # Устанавливаем начальное состояние
            db_manager.set_parsing_state(source_id, {
                "status": "parsing",
                "progress": 0,
                "message": "Инициализация парсера...",
                "startedAt": datetime.now().isoformat()
            })
            
            parser = MagputParser()
            sub_type = source.get("subType", "11")
            
            logger.info(f"Начало парсинга {source['name']} (SubType: {sub_type})")
            
            # Обновляем состояние
            db_manager.set_parsing_state(source_id, {
                "status": "parsing",
                "progress": 25,
                "message": "Получение данных с Magput..."
            })
            
            # Парсим туры
            tours = parser.fetch_tours(sub_type=sub_type)
            
            # Обновляем состояние
            db_manager.set_parsing_state(source_id, {
                "status": "parsing",
                "progress": 75,
                "message": f"Сохранение {len(tours)} туров..."
            })
            
            # Сохраняем результат
            file_path = self.base_path / source["file"]
            file_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Для Magput сохраняем полный результат парсера
            data = {
                "count": len(tours),
                "currentPage": 1,
                "itemsPerPage": len(tours),
                "programs": [tour.get("rawData", tour) for tour in tours],
                "lastUpdate": datetime.now().isoformat(),
                "source": "magput",
                "subType": sub_type
            }
            
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            
            # Завершаем парсинг
            db_manager.set_parsing_state(source_id, {
                "status": "completed",
                "progress": 100,
                "message": f"Успешно спарсено {len(tours)} туров",
                "completedAt": datetime.now().isoformat(),
                "itemsCount": len(tours)
            })
            
            logger.info(f"Парсинг {source['name']} завершен: {len(tours)} туров")
            
            return {
                "success": True,
                "itemsCount": len(tours),
                "message": f"Успешно спарсено {len(tours)} туров"
            }
            
        except Exception as e:
            logger.error(f"Ошибка парсинга {source['name']}: {str(e)}", exc_info=True)
            
            # Устанавливаем состояние ошибки
            db_manager.set_parsing_state(source_id, {
                "status": "error",
                "progress": 0,
                "message": str(e),
                "errorAt": datetime.now().isoformat()
            })
            
            raise
    
    def get_all_programs(self) -> List[Dict[str, Any]]:
        """Получить все программы из всех источников"""
        all_programs = []
        
        for source_id, source in self.sources.items():
            if not source["enabled"]:
                continue
                
            data = self.load_json_file(source["file"])
            programs = data.get("programs", [])
            
            for program in programs:
                # Добавляем информацию об источнике
                program_copy = program.copy()
                program_copy["source"] = "magput"
                program_copy["sourceId"] = source_id
                program_copy["sourceName"] = source["name"]
                all_programs.append(program_copy)
        
        return all_programs
    
    def get_timeline_data(self, limit: int = 100, offset: int = 0) -> Dict[str, Any]:
        """Получить данные для таймлайна - туры с датами с пагинацией"""
        all_programs = self.get_all_programs()
        timeline_items = []
        
        for program in all_programs:
            # Получаем базовую информацию о туре
            tour_info = {
                "tourId": program.get("id"),
                "tourName": program["content"].get("name", ""),
                "days": program["content"]["duration"].get("days", 1),
                "price": program["content"]["priceMin"].get("brutto", 0),
                "currency": program["content"]["priceMin"].get("currency", "руб"),
                "source": program.get("source"),
                "sourceId": program.get("sourceId"),
                "sourceName": program.get("sourceName"),
                "image": program.get("mainPhoto", {}).get("url"),
                "route": [r.get("name", "") for r in program.get("route", [])],
            }
            
            # Добавляем каждую дату как отдельный элемент таймлайна
            dates = program.get("dates", [])
            if dates:
                for date_obj in dates:
                    date_str = date_obj.get("date", "")
                    if date_str:
                        timeline_item = tour_info.copy()
                        timeline_item["date"] = date_str
                        timeline_item["dateFormatted"] = self.format_date(date_str)
                        timeline_items.append(timeline_item)
            else:
                # Если дат нет, добавляем тур без даты
                timeline_item = tour_info.copy()
                timeline_item["date"] = None
                timeline_item["dateFormatted"] = "Дата не указана"
                timeline_items.append(timeline_item)
        
        # Сортируем по дате
        timeline_items.sort(key=lambda x: x.get("date") or "9999-12-31")
        
        # Применяем пагинацию
        total = len(timeline_items)
        paginated_items = timeline_items[offset:offset + limit]
        
        return {
            "items": paginated_items,
            "total": total,
            "limit": limit,
            "offset": offset,
            "hasMore": offset + limit < total
        }
    
    def format_date(self, date_str: str) -> str:
        """Форматирование даты в читаемый вид"""
        try:
            dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
            months = {
                1: "янв", 2: "фев", 3: "мар", 4: "апр", 5: "май", 6: "июн",
                7: "июл", 8: "авг", 9: "сен", 10: "окт", 11: "ноя", 12: "дек"
            }
            return f"{dt.day} {months[dt.month]} {dt.year}"
        except:
            return date_str
    
    def get_products(self) -> List[Dict[str, Any]]:
        """Получить уникальные продукты (туры без привязки к датам)"""
        all_programs = self.get_all_programs()
        products = []
        
        for program in all_programs:
            product = {
                "id": f"{program.get('sourceId')}-{program.get('id')}",
                "tourId": program.get("id"),
                "name": program["content"].get("name", ""),
                "price": program["content"]["priceMin"].get("brutto", 0),
                "currency": program["content"]["priceMin"].get("currency", "руб"),
                "days": program["content"]["duration"].get("days", 1),
                "source": program.get("source"),
                "sourceId": program.get("sourceId"),
                "sourceName": program.get("sourceName"),
                "image": program.get("mainPhoto", {}).get("url"),
                "route": [r.get("name", "") for r in program.get("route", [])],
                "datesCount": len(program.get("dates", [])),
                "enabled": True
            }
            products.append(product)
        
        return products

# Глобальный экземпляр
competitor_manager = CompetitorDataManager()
