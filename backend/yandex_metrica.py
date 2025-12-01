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

    def get_campaigns_by_source(
        self,
        date_from: str = None,
        date_to: str = None
    ) -> Dict[str, Any]:
        """
        Получить статистику по кампаниям с разбивкой по источникам
        
        Args:
            date_from: Дата начала периода (YYYY-MM-DD)
            date_to: Дата окончания периода (YYYY-MM-DD)
        
        Returns:
            Данные о кампаниях с разбивкой по источникам
        """
        if not date_from:
            date_from = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
        if not date_to:
            date_to = datetime.now().strftime("%Y-%m-%d")
        
        params = {
            "id": self.counter_id,
            "date1": date_from,
            "date2": date_to,
            "metrics": "ym:s:visits,ym:s:users,ym:s:pageviews,ym:s:bounceRate,ym:s:avgVisitDurationSeconds",
            "dimensions": "ym:s:UTMSource,ym:s:UTMMedium,ym:s:UTMCampaign",
            "limit": 100000,
            "accuracy": "full"
        }
        
        try:
            logger.info(f"Запрос кампаний из Метрики: {date_from} - {date_to}")
            response = self.session.get(self.BASE_URL, params=params, timeout=30)
            response.raise_for_status()
            
            data = response.json()
            logger.info(f"Получено {len(data.get('data', []))} записей кампаний")
            return self._parse_campaigns_data(data)
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Ошибка запроса кампаний: {e}")
            raise
    
    def _parse_campaigns_data(self, api_response: Dict[str, Any]) -> Dict[str, Any]:
        """
        Парсинг данных кампаний в удобный формат
        """
        result = {
            "campaigns": [],
            "sources": {},
            "totals": {
                "visits": 0,
                "users": 0,
                "pageviews": 0
            }
        }
        
        data = api_response.get("data", [])
        campaigns_map = {}
        
        for row in data:
            dimensions = row.get("dimensions", [])
            metrics = row.get("metrics", [])
            
            if len(dimensions) >= 3:
                source = dimensions[0].get("name", "") or "(not set)"
                medium = dimensions[1].get("name", "") or "(not set)"
                campaign = dimensions[2].get("name", "") or "(not set)"
                
                visits = int(metrics[0]) if len(metrics) > 0 else 0
                users = int(metrics[1]) if len(metrics) > 1 else 0
                pageviews = int(metrics[2]) if len(metrics) > 2 else 0
                bounce_rate = float(metrics[3]) if len(metrics) > 3 else 0
                avg_duration = float(metrics[4]) if len(metrics) > 4 else 0
                
                # Агрегация по кампаниям
                campaign_key = f"{source}|{medium}|{campaign}"
                if campaign_key not in campaigns_map:
                    campaigns_map[campaign_key] = {
                        "source": source,
                        "medium": medium,
                        "campaign": campaign,
                        "visits": 0,
                        "users": 0,
                        "pageviews": 0,
                        "bounceRate": 0,
                        "avgDuration": 0,
                        "_bounce_sum": 0,
                        "_duration_sum": 0,
                        "_count": 0
                    }
                
                campaigns_map[campaign_key]["visits"] += visits
                campaigns_map[campaign_key]["users"] += users
                campaigns_map[campaign_key]["pageviews"] += pageviews
                campaigns_map[campaign_key]["_bounce_sum"] += bounce_rate * visits
                campaigns_map[campaign_key]["_duration_sum"] += avg_duration * visits
                campaigns_map[campaign_key]["_count"] += 1
                
                # Агрегация по источникам
                if source not in result["sources"]:
                    result["sources"][source] = {
                        "visits": 0,
                        "users": 0,
                        "campaigns": set()
                    }
                result["sources"][source]["visits"] += visits
                result["sources"][source]["users"] += users
                result["sources"][source]["campaigns"].add(campaign)
                
                # Общие итоги
                result["totals"]["visits"] += visits
                result["totals"]["users"] += users
                result["totals"]["pageviews"] += pageviews
        
        # Финализация данных
        for key, data in campaigns_map.items():
            if data["visits"] > 0:
                data["bounceRate"] = round(data["_bounce_sum"] / data["visits"], 2)
                data["avgDuration"] = round(data["_duration_sum"] / data["visits"], 1)
            del data["_bounce_sum"]
            del data["_duration_sum"]
            del data["_count"]
            result["campaigns"].append(data)
        
        # Конвертируем set в list для sources
        for source_data in result["sources"].values():
            source_data["campaigns"] = list(source_data["campaigns"])
            source_data["campaignCount"] = len(source_data["campaigns"])
        
        # Сортируем кампании по визитам
        result["campaigns"].sort(key=lambda x: x["visits"], reverse=True)
        
        return result
