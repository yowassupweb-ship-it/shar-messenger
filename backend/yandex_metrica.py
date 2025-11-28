"""
Модуль для работы с API Яндекс.Метрики
"""
import requests
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)


class YandexMetricaClient:
    """Клиент для работы с API Яндекс.Метрики"""
    
    BASE_URL = "https://api-metrika.yandex.net/stat/v1/data"
    
    def __init__(self, counter_id: str, token: str):
        self.counter_id = counter_id
        self.token = token
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"OAuth {token}",
            "Content-Type": "application/json"
        })
    
    def get_utm_statistics(
        self,
        date_from: str = None,
        date_to: str = None,
        utm_term: str = None,
        metrics: List[str] = None,
        dimensions: List[str] = None
    ) -> Dict[str, Any]:
        """
        Получить статистику по UTM меткам
        
        Args:
            date_from: Дата начала периода (YYYY-MM-DD)
            date_to: Дата окончания периода (YYYY-MM-DD)
            utm_term: Фильтр по конкретному UTM term
            metrics: Метрики для получения (visits, users, pageviews, bounceRate и т.д.)
            dimensions: Измерения (ym:s:UTMTerm, ym:s:date и т.д.)
        
        Returns:
            Данные статистики из API
        """
        if not date_from:
            date_from = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
        if not date_to:
            date_to = datetime.now().strftime("%Y-%m-%d")
        
        if not metrics:
            metrics = ["ym:s:visits", "ym:s:users", "ym:s:pageviews", "ym:s:bounceRate"]
        
        if not dimensions:
            dimensions = ["ym:s:UTMTerm", "ym:s:date"]
        
        params = {
            "id": self.counter_id,
            "date1": date_from,
            "date2": date_to,
            "metrics": ",".join(metrics),
            "dimensions": ",".join(dimensions),
            "limit": 100000,
            "accuracy": "full"
        }
        
        # Фильтр по конкретному UTM term
        if utm_term:
            params["filters"] = f"ym:s:UTMTerm=='{utm_term}'"
        
        try:
            logger.info(f"Запрос статистики из Метрики: {date_from} - {date_to}")
            response = self.session.get(self.BASE_URL, params=params, timeout=30)
            response.raise_for_status()
            
            data = response.json()
            logger.info(f"Получено {len(data.get('data', []))} записей из Метрики")
            return data
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Ошибка запроса к API Метрики: {e}")
            raise
    
    def get_phone_conversions(
        self,
        date_from: str = None,
        date_to: str = None,
        goal_id: str = None
    ) -> Dict[str, Any]:
        """
        Получить данные о конверсиях по целям (звонки)
        
        Args:
            date_from: Дата начала
            date_to: Дата окончания
            goal_id: ID цели в Метрике
        
        Returns:
            Данные о конверсиях
        """
        if not date_from:
            date_from = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
        if not date_to:
            date_to = datetime.now().strftime("%Y-%m-%d")
        
        metrics = ["ym:s:visits"]
        dimensions = ["ym:s:UTMTerm", "ym:s:date"]
        
        if goal_id:
            metrics.append(f"ym:s:goal{goal_id}reaches")
            metrics.append(f"ym:s:goal{goal_id}conversionRate")
        
        params = {
            "id": self.counter_id,
            "date1": date_from,
            "date2": date_to,
            "metrics": ",".join(metrics),
            "dimensions": ",".join(dimensions),
            "limit": 100000,
            "accuracy": "full"
        }
        
        try:
            logger.info(f"Запрос конверсий из Метрики: {date_from} - {date_to}")
            response = self.session.get(self.BASE_URL, params=params, timeout=30)
            response.raise_for_status()
            
            data = response.json()
            logger.info(f"Получено {len(data.get('data', []))} записей конверсий")
            return data
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Ошибка запроса конверсий: {e}")
            raise
    
    def parse_utm_data(self, api_response: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Парсинг ответа API в удобный формат
        
        Returns:
            Список записей с utm_term, date, visits, users, pageviews, bounceRate
        """
        result = []
        data = api_response.get("data", [])
        
        for row in data:
            dimensions = row.get("dimensions", [])
            metrics = row.get("metrics", [])
            
            if len(dimensions) >= 2 and len(metrics) >= 4:
                utm_term = dimensions[0].get("name", "")
                date = dimensions[1].get("name", "")
                
                record = {
                    "utm_term": utm_term,
                    "date": date,
                    "visits": metrics[0] if len(metrics) > 0 else 0,
                    "users": metrics[1] if len(metrics) > 1 else 0,
                    "pageviews": metrics[2] if len(metrics) > 2 else 0,
                    "bounceRate": metrics[3] if len(metrics) > 3 else 0
                }
                result.append(record)
        
        return result
