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
    MANAGEMENT_URL = "https://api-metrika.yandex.net/management/v1"
    
    # Основные конверсионные цели для отображения (лимит API ~20 метрик)
    CONVERSION_GOALS = {
        301950976: "ЗАКАЗ (страница успеха)",
        485406426: "Ecommerce: покупка",
        484029889: "CRM: заявка получена",
        484029963: "CRM: Внесена предоплата",
        484009486: "CRM: Заказ создан",
        484009487: "CRM: Заказ оплачен",
        260679148: "Купить - в карточке",
        260679473: "Купить - из прочих мест",
        222378141: "On-line заявка: ОДН",
        222378195: "On-line заявка: МНОГ",
        222378242: "On-line заявка: ЖД",
        484037544: "Нажал купить на странице тура",
        484037649: "Перешел на создание заказа",
    }
    
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
        dimensions: List[str] = None,
        selected_goal_ids: List[int] = None
    ) -> Dict[str, Any]:
        """
        Получить статистику по UTM меткам
        
        Args:
            date_from: Дата начала периода (YYYY-MM-DD)
            date_to: Дата окончания периода (YYYY-MM-DD)
            utm_term: Фильтр по конкретному UTM term
            metrics: Метрики для получения (visits, users, pageviews, bounceRate и т.д.)
            dimensions: Измерения (ym:s:UTMTerm, ym:s:date и т.д.)
            selected_goal_ids: Список ID целей для подсчёта конверсий (если пусто - все цели)
        
        Returns:
            Данные статистики из API
        """
        if not date_from:
            date_from = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
        if not date_to:
            date_to = datetime.now().strftime("%Y-%m-%d")
        
        # Формируем метрики с разбивкой по целям (как в campaigns)
        goal_metrics = ",".join([f"ym:s:goal{goal_id}reaches" for goal_id in self.CONVERSION_GOALS.keys()])
        
        if not metrics:
            metrics = [
                "ym:s:visits", "ym:s:users", "ym:s:pageviews", 
                "ym:s:bounceRate", "ym:s:avgVisitDurationSeconds",
                "ym:s:ecommerceRUBRevenue", "ym:s:sumGoalReachesAny"
            ]
        
        if not dimensions:
            # Добавляем все UTM параметры для полной картины
            dimensions = ["ym:s:UTMSource", "ym:s:UTMMedium", "ym:s:UTMCampaign", "ym:s:UTMTerm"]
        
        # Добавляем цели к метрикам
        all_metrics = ",".join(metrics) + "," + goal_metrics
        
        params = {
            "id": self.counter_id,
            "date1": date_from,
            "date2": date_to,
            "metrics": all_metrics,
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
    
    def parse_utm_data(self, api_response: Dict[str, Any], selected_goal_ids: List[int] = None) -> List[Dict[str, Any]]:
        """
        Парсинг ответа API в удобный формат
        
        Args:
            api_response: Ответ от API Метрики
            selected_goal_ids: Список ID целей для подсчёта конверсий (если пусто - все цели)
        
        Returns:
            Список записей с полными UTM данными: utm_source, utm_medium, utm_campaign, utm_term
        """
        result = []
        data = api_response.get("data", [])
        goal_ids = list(self.CONVERSION_GOALS.keys())
        
        for row in data:
            dimensions = row.get("dimensions", [])
            metrics = row.get("metrics", [])
            
            # Новый формат: UTMSource, UTMMedium, UTMCampaign, UTMTerm
            # Метрики: visits[0], users[1], pageviews[2], bounceRate[3], avgTime[4], revenue[5], sumGoalReaches[6], goals[7+]
            if len(dimensions) >= 4 and len(metrics) >= 4:
                utm_source = dimensions[0].get("name", "") or ""
                utm_medium = dimensions[1].get("name", "") or ""
                utm_campaign = dimensions[2].get("name", "") or ""
                utm_term = dimensions[3].get("name", "") or ""
                
                # Парсим конверсии по отдельным целям (начиная с индекса 7)
                goals_breakdown = {}
                selected_conversions = 0
                for i, goal_id in enumerate(goal_ids):
                    goal_value = int(metrics[7 + i]) if len(metrics) > 7 + i else 0
                    goals_breakdown[str(goal_id)] = goal_value
                    # Если указаны конкретные цели - суммируем только их
                    if selected_goal_ids and goal_id in selected_goal_ids:
                        selected_conversions += goal_value
                
                # Если выбраны конкретные цели - используем их сумму, иначе - sumGoalReachesAny
                if selected_goal_ids and len(selected_goal_ids) > 0:
                    conversions = selected_conversions
                else:
                    conversions = int(metrics[6]) if len(metrics) > 6 else 0
                
                record = {
                    "utm_source": utm_source,
                    "utm_medium": utm_medium,
                    "utm_campaign": utm_campaign,
                    "utm_term": utm_term,
                    "visits": int(metrics[0]) if len(metrics) > 0 else 0,
                    "users": int(metrics[1]) if len(metrics) > 1 else 0,
                    "pageviews": int(metrics[2]) if len(metrics) > 2 else 0,
                    "bounceRate": round(float(metrics[3]), 1) if len(metrics) > 3 else 0,
                    "avgTime": round(float(metrics[4]) / 60, 2) if len(metrics) > 4 else 0,  # В минутах
                    "revenue": round(float(metrics[5]), 2) if len(metrics) > 5 else 0,
                    "conversions": conversions,
                    "goalsBreakdown": goals_breakdown
                }
                result.append(record)
            # Обратная совместимость: старый формат UTMTerm, date
            elif len(dimensions) >= 2 and len(metrics) >= 4:
                utm_term = dimensions[0].get("name", "") or ""
                date = dimensions[1].get("name", "") if len(dimensions) > 1 else ""
                
                record = {
                    "utm_source": "",
                    "utm_medium": "",
                    "utm_campaign": "",
                    "utm_term": utm_term,
                    "date": date,
                    "visits": int(metrics[0]) if len(metrics) > 0 else 0,
                    "users": int(metrics[1]) if len(metrics) > 1 else 0,
                    "pageviews": int(metrics[2]) if len(metrics) > 2 else 0,
                    "bounceRate": round(float(metrics[3]), 1) if len(metrics) > 3 else 0,
                    "revenue": 0,
                    "conversions": 0,
                    "goalsBreakdown": {}
                }
                result.append(record)
        
        return result

    def get_campaigns_by_source(
        self,
        date_from: str = None,
        date_to: str = None,
        selected_goal_ids: List[int] = None
    ) -> Dict[str, Any]:
        """
        Получить статистику по кампаниям с разбивкой по источникам
        
        Args:
            date_from: Дата начала периода (YYYY-MM-DD)
            date_to: Дата окончания периода (YYYY-MM-DD)
            selected_goal_ids: Список ID целей для подсчёта конверсий
        
        Returns:
            Данные о кампаниях с разбивкой по источникам
        """
        if not date_from:
            date_from = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
        if not date_to:
            date_to = datetime.now().strftime("%Y-%m-%d")
        
        # Формируем метрики с разбивкой по целям
        goal_metrics = ",".join([f"ym:s:goal{goal_id}reaches" for goal_id in self.CONVERSION_GOALS.keys()])
        
        params = {
            "id": self.counter_id,
            "date1": date_from,
            "date2": date_to,
            # Метрики: visits, users, pageviews, bounceRate, avgDuration, revenue, sumGoalReachesAny, + отдельные цели
            "metrics": f"ym:s:visits,ym:s:users,ym:s:pageviews,ym:s:bounceRate,ym:s:avgVisitDurationSeconds,ym:s:ecommerceRUBRevenue,ym:s:sumGoalReachesAny,{goal_metrics}",
            "dimensions": "ym:s:UTMSource,ym:s:UTMMedium,ym:s:UTMCampaign,ym:s:UTMTerm,ym:s:UTMContent",
            "limit": 100000,
            "accuracy": "full"
        }
        
        try:
            logger.info(f"Запрос кампаний из Метрики: {date_from} - {date_to}")
            response = self.session.get(self.BASE_URL, params=params, timeout=30)
            response.raise_for_status()
            
            data = response.json()
            logger.info(f"Получено {len(data.get('data', []))} записей кампаний")
            return self._parse_campaigns_data(data, selected_goal_ids)
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Ошибка запроса кампаний: {e}")
            raise
    
    def _parse_campaigns_data(self, api_response: Dict[str, Any], selected_goal_ids: List[int] = None) -> Dict[str, Any]:
        """
        Парсинг данных кампаний в удобный формат
        
        Args:
            api_response: Ответ от API
            selected_goal_ids: Список ID целей для подсчёта (если пусто - все цели)
        """
        result = {
            "campaigns": [],
            "sources": {},
            "totals": {
                "visits": 0,
                "users": 0,
                "pageviews": 0,
                "revenue": 0,
                "conversions": 0
            },
            "goalNames": self.CONVERSION_GOALS,  # Передаём названия целей
            "selectedGoalIds": selected_goal_ids or []  # Передаём выбранные цели
        }
        
        data = api_response.get("data", [])
        campaigns_map = {}
        
        # Список ID целей для парсинга
        goal_ids = list(self.CONVERSION_GOALS.keys())
        
        for row in data:
            dimensions = row.get("dimensions", [])
            metrics = row.get("metrics", [])
            
            if len(dimensions) >= 3:
                source = dimensions[0].get("name", "") or "(not set)"
                medium = dimensions[1].get("name", "") or "(not set)"
                campaign = dimensions[2].get("name", "") or "(not set)"
                term = dimensions[3].get("name", "") if len(dimensions) > 3 else ""
                content = dimensions[4].get("name", "") if len(dimensions) > 4 else ""
                
                visits = int(metrics[0]) if len(metrics) > 0 else 0
                users = int(metrics[1]) if len(metrics) > 1 else 0
                pageviews = int(metrics[2]) if len(metrics) > 2 else 0
                bounce_rate = float(metrics[3]) if len(metrics) > 3 else 0
                avg_duration = float(metrics[4]) if len(metrics) > 4 else 0
                revenue = float(metrics[5]) if len(metrics) > 5 else 0
                sum_goal_reaches_any = int(metrics[6]) if len(metrics) > 6 else 0
                
                # Парсим конверсии по отдельным целям (начиная с индекса 7)
                goals_breakdown = {}
                for i, goal_id in enumerate(goal_ids):
                    goal_value = int(metrics[7 + i]) if len(metrics) > 7 + i else 0
                    goals_breakdown[str(goal_id)] = goal_value
                
                # Расчёт конверсий: если выбраны конкретные цели - суммируем только их, иначе используем sumGoalReachesAny
                if selected_goal_ids:
                    conversions = sum(goals_breakdown.get(str(gid), 0) for gid in selected_goal_ids)
                else:
                    conversions = sum_goal_reaches_any
                
                # Агрегация по кампаниям
                campaign_key = f"{source}|{medium}|{campaign}|{term}|{content}"
                if campaign_key not in campaigns_map:
                    campaigns_map[campaign_key] = {
                        "source": source,
                        "medium": medium,
                        "campaign": campaign,
                        "term": term,
                        "content": content,
                        "visits": 0,
                        "users": 0,
                        "pageviews": 0,
                        "bounceRate": 0,
                        "avgDuration": 0,
                        "revenue": 0,
                        "conversions": 0,
                        "goalsBreakdown": {str(goal_id): 0 for goal_id in goal_ids},
                        "_bounce_sum": 0,
                        "_duration_sum": 0,
                        "_count": 0
                    }
                
                campaigns_map[campaign_key]["visits"] += visits
                campaigns_map[campaign_key]["users"] += users
                campaigns_map[campaign_key]["pageviews"] += pageviews
                campaigns_map[campaign_key]["revenue"] += revenue
                campaigns_map[campaign_key]["conversions"] += conversions
                campaigns_map[campaign_key]["_bounce_sum"] += bounce_rate * visits
                campaigns_map[campaign_key]["_duration_sum"] += avg_duration * visits
                campaigns_map[campaign_key]["_count"] += 1
                
                # Агрегация конверсий по целям
                for goal_id_str, goal_value in goals_breakdown.items():
                    campaigns_map[campaign_key]["goalsBreakdown"][goal_id_str] += goal_value
                
                # Агрегация по источникам
                if source not in result["sources"]:
                    result["sources"][source] = {
                        "visits": 0,
                        "users": 0,
                        "conversions": 0,
                        "goalsBreakdown": {str(goal_id): 0 for goal_id in goal_ids},
                        "campaigns": set(),
                        "_bounce_sum": 0,
                        "_duration_sum": 0
                    }
                result["sources"][source]["visits"] += visits
                result["sources"][source]["users"] += users
                result["sources"][source]["conversions"] += conversions
                result["sources"][source]["campaigns"].add(campaign)
                result["sources"][source]["_bounce_sum"] += bounce_rate * visits
                result["sources"][source]["_duration_sum"] += avg_duration * visits
                
                # Агрегация конверсий по целям для источников
                for goal_id_str, goal_value in goals_breakdown.items():
                    result["sources"][source]["goalsBreakdown"][goal_id_str] += goal_value
                
                # Общие итоги
                result["totals"]["visits"] += visits
                result["totals"]["users"] += users
                result["totals"]["pageviews"] += pageviews
                result["totals"]["revenue"] += revenue
                result["totals"]["conversions"] += conversions
        
        # Финализация данных
        for key, data in campaigns_map.items():
            if data["visits"] > 0:
                data["bounceRate"] = round(data["_bounce_sum"] / data["visits"], 2)
                data["avgDuration"] = round(data["_duration_sum"] / data["visits"], 1)
            del data["_bounce_sum"]
            del data["_duration_sum"]
            del data["_count"]
            result["campaigns"].append(data)
        
        # Конвертируем set в list для sources и рассчитываем средние
        for source_data in result["sources"].values():
            source_data["campaigns"] = list(source_data["campaigns"])
            source_data["campaignCount"] = len(source_data["campaigns"])
            if source_data["visits"] > 0:
                source_data["bounceRate"] = round(source_data["_bounce_sum"] / source_data["visits"], 2)
                source_data["avgDuration"] = round(source_data["_duration_sum"] / source_data["visits"], 1)
            else:
                source_data["bounceRate"] = 0
                source_data["avgDuration"] = 0
            del source_data["_bounce_sum"]
            del source_data["_duration_sum"]
        
        # Сортируем кампании по визитам
        result["campaigns"].sort(key=lambda x: x["visits"], reverse=True)
        
        return result
