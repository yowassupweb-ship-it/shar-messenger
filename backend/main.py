from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, FileResponse, StreamingResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
from contextlib import asynccontextmanager
import sys
import os
import secrets
import asyncio
import logging
from dotenv import load_dotenv
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Загружаем переменные окружения
load_dotenv()

# Добавляем путь к парсеру
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'parser'))

from database import db
from parser.tour_parser import TourParser
from parser.tour_dates_parser import TourDatesParser
from yandex_metrica import YandexMetricaClient
from feed_generator import generate_yml_feed
from competitor_data import competitor_manager
import xml.etree.ElementTree as ET
from xml.dom import minidom
from telegram_notifier import telegram

# Инициализация планировщика
scheduler = AsyncIOScheduler()

async def auto_sync_source(source_id: str):
    """Async wrapper для запуска парсинга в планировщике"""
    source = db.get_data_source(source_id)
    if not source:
        print(f"[Планировщик] Источник {source_id} не найден")
        return
    
    # Проверяем, не идет ли уже парсинг
    if source_id in active_parsing_tasks and active_parsing_tasks[source_id].get('running'):
        print(f"[Планировщик] Парсинг {source['name']} уже запущен")
        return
    
    print(f"[Планировщик] Запускаем авто-синхронизацию для '{source['name']}'")
    
    # Устанавливаем флаг парсинга
    db.update_data_source(source_id, {'isParsing': True})
    active_parsing_tasks[source_id] = {'running': True, 'stop_requested': False}
    
    # Запускаем парсинг в отдельном потоке
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, parse_source_task, source)

def setup_scheduler():
    """Настройка планировщика для автоматической синхронизации источников"""
    sources = db.get_data_sources()
    
    # Удаляем существующие задачи синхронизации
    for job in scheduler.get_jobs():
        if job.id.startswith('sync_'):
            scheduler.remove_job(job.id)
    
    # Добавляем задачи для источников с autoSync
    for source in sources:
        if source.get('autoSync') and source.get('enabled', True):
            interval = source.get('syncInterval', 3600)  # По умолчанию 1 час
            job_id = f"sync_{source['id']}"
            
            scheduler.add_job(
                auto_sync_source,
                trigger=IntervalTrigger(seconds=interval),
                id=job_id,
                args=[source['id']],
                replace_existing=True,
                name=f"Auto-sync: {source['name']}"
            )
            print(f"[Планировщик] Добавлена задача синхронизации '{source['name']}' каждые {interval} сек.")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Жизненный цикл приложения - запуск и остановка планировщика"""
    # Startup
    print("[Планировщик] Запуск планировщика авто-синхронизации...")
    setup_scheduler()
    scheduler.start()
    print(f"[Планировщик] Запущен, активных задач: {len(scheduler.get_jobs())}")
    
    yield  # Приложение работает
    
    # Shutdown
    print("[Планировщик] Остановка планировщика...")
    scheduler.shutdown()

app = FastAPI(title="Feed Editor API", lifespan=lifespan)
security = HTTPBasic()

# Глобальный словарь для отслеживания активных парсингов
active_parsing_tasks = {}

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Middleware для логирования запросов
@app.middleware("http")
async def log_requests(request, call_next):
    print(f">>> Incoming request: {request.method} {request.url}")
    response = await call_next(request)
    print(f"<<< Response status: {response.status_code}")
    return response

# Test Telegram endpoint
@app.post("/api/test-telegram")
async def test_telegram():
    """Тестовая отправка уведомления в Telegram"""
    settings = db.get_settings()
    result = {
        "enabled": settings.get('telegramNotifications', False),
        "has_token": bool(settings.get('telegramBotToken')),
        "has_chat_id": bool(settings.get('telegramChatId')),
        "token_length": len(settings.get('telegramBotToken', '')),
        "chat_id": settings.get('telegramChatId', '')
    }
    
    # Пробуем отправить
    success = telegram.send_notification("🧪 <b>Тестовое сообщение</b>\n\nЕсли вы видите это - уведомления работают!")
    result["send_success"] = success
    
    return result

# Models
class DataSourceCreate(BaseModel):
    name: str
    url: str
    type: str = "html"
    auth: Optional[Dict[str, str]] = None
    enabled: bool = True
    categories: List[Dict[str, str]] = []
    autoSync: bool = False
    syncInterval: int = 3600

class DataSourceUpdate(BaseModel):
    name: Optional[str] = None
    url: Optional[str] = None
    enabled: Optional[bool] = None
    categories: Optional[List[Dict[str, str]]] = None
    autoSync: Optional[bool] = None
    syncInterval: Optional[int] = None

class FeedCreate(BaseModel):
    name: str
    sourceId: Optional[str] = None  # Опционально для одного источника
    sourceIds: Optional[List[str]] = None  # Для нескольких источников
    format: str = "xml"
    settings: Dict[str, Any] = {}
    slug: Optional[str] = None
    folderId: Optional[str] = None

class TemplateCreate(BaseModel):
    name: str
    type: str  # 'feed' или 'utm'
    content: str  # Mustache шаблон как строка
    description: Optional[str] = None

class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    content: Optional[str] = None  # Mustache шаблон как строка
    description: Optional[str] = None

class CollectionCreate(BaseModel):
    name: str
    url: Optional[str] = None
    description: Optional[str] = None
    pictures: Optional[List[str]] = None
    productIds: Optional[List[str]] = []  # Список ID товаров в каталоге

class CollectionUpdate(BaseModel):
    name: Optional[str] = None
    url: Optional[str] = None
    description: Optional[str] = None
    pictures: Optional[List[str]] = None

class UTMTemplateCreate(BaseModel):
    name: str
    source: str
    medium: str
    campaign: str
    term: Optional[str] = None
    content: Optional[str] = None
    baseUrl: str
    status: str = 'active'
    enableTracking: bool = False
    trackingFolder: str = 'other'

class UTMTemplateUpdate(BaseModel):
    name: Optional[str] = None
    source: Optional[str] = None
    medium: Optional[str] = None
    campaign: Optional[str] = None
    term: Optional[str] = None
    content: Optional[str] = None
    baseUrl: Optional[str] = None
    status: Optional[str] = None
    enableTracking: Optional[bool] = None
    trackingFolder: Optional[str] = None

class TrackedPostCreate(BaseModel):
    platform: str
    postUrl: str
    title: str
    utmTemplate: Optional[str] = None
    utmUrl: Optional[str] = None
    clicks: int = 0
    views: int = 0
    conversions: int = 0
    users: int = 0
    frequency: float = 0
    avgTime: float = 0

class TrackedPostUpdate(BaseModel):
    title: Optional[str] = None
    clicks: Optional[int] = None
    views: Optional[int] = None
    conversions: Optional[int] = None
    users: Optional[int] = None
    frequency: Optional[float] = None
    avgTime: Optional[float] = None

class UTMHistoryItem(BaseModel):
    url: str
    source: str
    medium: str
    campaign: str
    term: Optional[str] = None
    content: Optional[str] = None
    username: Optional[str] = None

# Routes

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Feed Editor API"}

# Settings
@app.get("/api/settings")
def get_settings():
    return db.get_settings()

@app.put("/api/settings")
def update_settings(settings: Dict[str, Any]):
    db.update_settings(settings)
    return db.get_settings()

# Scheduler status
@app.get("/api/scheduler/status")
def get_scheduler_status():
    """Получить статус планировщика автосинхронизации"""
    jobs = scheduler.get_jobs()
    return {
        "running": scheduler.running,
        "jobs_count": len(jobs),
        "jobs": [
            {
                "id": job.id,
                "name": job.name,
                "next_run": job.next_run_time.isoformat() if job.next_run_time else None,
                "trigger": str(job.trigger)
            }
            for job in jobs
        ]
    }

@app.post("/api/scheduler/refresh")
def refresh_scheduler():
    """Обновить планировщик (перечитать настройки источников)"""
    setup_scheduler()
    return {"status": "refreshed", "jobs_count": len(scheduler.get_jobs())}

# Data Sources
@app.get("/api/data-sources")
def get_data_sources():
    """Получить список источников данных (БЕЗ источников конкурентов)"""
    all_sources = db.get_data_sources()
    # Фильтруем источники конкурентов - они отображаются только в разделе Анализ конкурентов
    return [s for s in all_sources if s.get('type') not in ['competitor', 'magput']]

@app.get("/api/data-sources/{source_id}")
def get_data_source(source_id: str):
    source = db.get_data_source(source_id)
    if not source:
        raise HTTPException(status_code=404, detail="Data source not found")
    return source

@app.post("/api/data-sources")
def create_data_source(source: DataSourceCreate):
    print(f"Получен запрос на создание источника: {source.dict()}")
    source_data = source.dict()
    source_data["id"] = f"src_{datetime.now().timestamp()}"
    source_data["createdAt"] = datetime.now().isoformat()
    source_data["updatedAt"] = datetime.now().isoformat()
    result = db.add_data_source(source_data)
    print(f"Источник создан: {result}")
    return result

@app.put("/api/data-sources/{source_id}")
def update_data_source(source_id: str, updates: DataSourceUpdate):
    result = db.update_data_source(source_id, updates.dict(exclude_unset=True))
    if not result:
        raise HTTPException(status_code=404, detail="Data source not found")
    
    # Обновляем планировщик если изменились настройки autoSync
    if updates.autoSync is not None or updates.syncInterval is not None:
        setup_scheduler()
    
    return result

@app.delete("/api/data-sources/{source_id}")
def delete_data_source(source_id: str):
    """Удалить источник данных вместе со всеми его товарами"""
    # Сначала удаляем все товары этого источника
    products = db.get_products(source_id=source_id)
    for product in products:
        db.delete_product(product['id'])
    
    # Затем удаляем сам источник
    if not db.delete_data_source(source_id):
        raise HTTPException(status_code=404, detail="Data source not found")
    
    # Логируем удаление
    db.add_log({
        "type": "system",
        "message": f"Удален источник и {len(products)} товаров",
        "status": "info",
        "metadata": {"sourceId": source_id, "deletedProducts": len(products)}
    })
    
    return {"status": "deleted", "deletedProducts": len(products)}

# Parser endpoint
@app.post("/api/data-sources/{source_id}/parse")
async def parse_data_source(source_id: str, background_tasks: BackgroundTasks):
    """Запуск парсинга источника данных"""
    source = db.get_data_source(source_id)
    if not source:
        raise HTTPException(status_code=404, detail="Data source not found")
    
    # Проверяем, не идет ли уже парсинг
    if source_id in active_parsing_tasks and active_parsing_tasks[source_id].get('running'):
        raise HTTPException(status_code=400, detail="Parsing already in progress")
    
    # Устанавливаем флаг парсинга
    db.update_data_source(source_id, {'isParsing': True})
    
    # Создаем запись о парсинге
    active_parsing_tasks[source_id] = {'running': True, 'stop_requested': False}
    
    # Запускаем парсинг в фоне
    background_tasks.add_task(parse_source_task, source)
    
    return {
        "status": "started",
        "message": f"Parsing started for {source['name']}",
        "sourceId": source_id
    }

@app.post("/api/data-sources/{source_id}/stop-parse")
async def stop_parse_data_source(source_id: str):
    """Остановка парсинга источника данных"""
    source = db.get_data_source(source_id)
    if not source:
        raise HTTPException(status_code=404, detail="Data source not found")
    
    # Проверяем, идет ли парсинг
    if source_id not in active_parsing_tasks or not active_parsing_tasks[source_id].get('running'):
        # Если парсинг не активен, просто сбрасываем флаг
        db.update_data_source(source_id, {'isParsing': False})
        return {
            "status": "stopped",
            "message": f"Parsing flag reset for {source['name']}",
            "sourceId": source_id
        }
    
    # Устанавливаем флаг остановки
    active_parsing_tasks[source_id]['stop_requested'] = True
    
    # Немедленно сбрасываем флаг isParsing
    db.update_data_source(source_id, {'isParsing': False})
    
    return {
        "status": "stopping",
        "message": f"Stop requested for {source['name']}",
        "sourceId": source_id
    }

def parse_source_task(source: Dict[str, Any]):
    """Фоновая задача парсинга с retry логикой"""
    source_id = source['id']
    source_type = source.get('type', 'html')
    max_retries = 3
    retry_delay = 3600  # 1 час между попытками
    
    try:
        for attempt in range(max_retries):
            # Проверяем флаг остановки
            if active_parsing_tasks.get(source_id, {}).get('stop_requested'):
                print(f"Парсинг источника {source['name']} остановлен пользователем")
                db.update_data_source(source_id, {
                    'lastSyncStatus': 'stopped',
                    'lastSyncError': 'Остановлено пользователем',
                    'isParsing': False
                })
                return
            
            try:
                print(f"Попытка парсинга {attempt + 1}/{max_retries} для источника {source['name']} (тип: {source_type})")
                
                tours = []
                
                # Определяем тип парсера
                if source_type == 'magput':
                    # Используем Magput парсер
                    from parser.magput_parser import MagputParser
                    parser = MagputParser()
                    result = parser.fetch_all_tours()
                    tours = result.get('all', [])
                    print(f"Magput парсер: получено {len(tours)} туров")
                else:
                    # Используем обычный HTML парсер для vs-travel.ru
                    auth = source.get('auth') or {}
                    parser = TourParser(
                        base_url=source['url'],
                        username=auth.get('username'),
                        password=auth.get('password')
                    )
                    parser.login()
                    tours = parser.fetch_tours()
                    print(f"HTML парсер: получено {len(tours)} туров")
                
                # Проверяем флаг остановки перед сохранением
                if active_parsing_tasks.get(source_id, {}).get('stop_requested'):
                    print(f"Парсинг источника {source['name']} остановлен перед сохранением")
                    db.update_data_source(source_id, {
                        'lastSyncStatus': 'stopped',
                        'isParsing': False
                    })
                    return
                
                # Используем sync_products вместо delete + add
                db.sync_products(source_id, tours)
                
                # Обновляем время последней синхронизации
                db.update_data_source(source_id, {
                    'lastSync': datetime.now().isoformat(),
                    'lastSyncStatus': 'success',
                    'itemsCount': len(tours),
                    'lastSyncError': None,
                    'isParsing': False
                })
                
                # Логируем успешный парсинг
                db.add_log({
                    "type": "parser",
                    "message": f"Парсинг источника '{source['name']}' завершен",
                    "details": f"Получено товаров: {len(tours)}",
                    "status": "success",
                    "sourceId": source_id
                })
                
                print(f"Парсинг успешно завершен для источника {source['name']}, получено товаров: {len(tours)}")
                return  # Успешный парсинг - выходим
                
            except Exception as e:
                import traceback
                error_msg = f"Попытка {attempt + 1}/{max_retries} неудачна: {str(e)}"
                print(f"Ошибка парсинга источника {source['name']}: {error_msg}")
                print(f"Traceback: {traceback.format_exc()}")
                
                if attempt < max_retries - 1:
                    print(f"Следующая попытка через {retry_delay} секунд...")
                    import time
                    time.sleep(retry_delay)
                else:
                    # Последняя попытка неудачна
                    error_detail = f"Парсинг не удался после {max_retries} попыток. Последняя ошибка: {str(e)}"
                    db.update_data_source(source_id, {
                        'lastSync': datetime.now().isoformat(),
                        'lastSyncStatus': 'error',
                        'lastSyncError': error_detail,
                        'isParsing': False
                    })
                    
                    # Логируем ошибку парсинга
                    db.add_log({
                        "type": "parser",
                        "message": f"Ошибка парсинга источника '{source['name']}'",
                        "details": error_detail,
                        "status": "error",
                        "sourceId": source_id
                    })
                    
                    print(f"Парсинг источника {source['name']} окончательно провален после {max_retries} попыток")
    finally:
        # Очищаем запись о парсинге
        if source_id in active_parsing_tasks:
            active_parsing_tasks[source_id]['running'] = False

def parse_dates_for_source_task(source_id: str, products: List[Dict[str, Any]]):
    """Фоновая задача парсинга дат для всех туров источника"""
    try:
        from parser.tour_dates_parser import TourDatesParser
        parser = TourDatesParser()
        
        total = len(products)
        success_count = 0
        error_count = 0
        
        for i, product in enumerate(products, 1):
            try:
                if not product.get('url'):
                    print(f"[{i}/{total}] Пропуск {product.get('name')} - нет URL")
                    continue
                
                print(f"[{i}/{total}] Парсинг дат для: {product.get('name')}")
                dates = parser.parse_tour_dates(product['url'])
                
                if dates:
                    db.update_product_dates(product['id'], dates)
                    success_count += 1
                    print(f"  ✓ Найдено дат: {len(dates)}")
                else:
                    print(f"  ✗ Даты не найдены")
                    error_count += 1
                    
            except Exception as e:
                error_count += 1
                print(f"  ✗ Ошибка: {str(e)}")
                continue
        
        # Логируем результат
        db.add_log({
            "type": "parser",
            "message": f"Парсинг дат для источника завершен",
            "details": f"Успешно: {success_count}, Ошибок: {error_count}, Всего: {total}",
            "status": "success" if error_count == 0 else "warning",
            "sourceId": source_id
        })
        
        print(f"Парсинг дат завершен. Успешно: {success_count}/{total}")
        
    except Exception as e:
        print(f"Критическая ошибка парсинга дат: {str(e)}")
        db.add_log({
            "type": "parser",
            "message": "Критическая ошибка парсинга дат",
            "details": str(e),
            "status": "error",
            "sourceId": source_id
        })

# Products
@app.get("/api/products")
def get_products(sourceId: Optional[str] = None, merged: bool = True):
    """
    Получить товары с возможностью объединения дубликатов
    merged=True - объединяет товары с одинаковым ID из разных источников
    
    Примечание: товары конкурентов находятся в отдельном API /api/competitors/products
    """
    products = db.get_products(source_id=sourceId)
    
    if not merged:
        return products
    
    # Объединяем товары с одинаковым ID
    merged_products = {}
    for product in products:
        product_id = product['id']
        
        if product_id not in merged_products:
            # Первая встреча этого товара - добавляем с массивом источников
            merged_products[product_id] = {
                **product,
                'sourceIds': [product.get('sourceId')],
                'sources': [product.get('sourceId')]  # Для обратной совместимости
            }
        else:
            # Товар уже есть - добавляем источник
            if product.get('sourceId') not in merged_products[product_id]['sourceIds']:
                merged_products[product_id]['sourceIds'].append(product.get('sourceId'))
                merged_products[product_id]['sources'].append(product.get('sourceId'))
            
            # Обновляем данные, если текущая версия новее
            current_updated = merged_products[product_id].get('updatedAt', '')
            new_updated = product.get('updatedAt', '')
            if new_updated > current_updated:
                # Сохраняем sourceIds и обновляем остальные поля
                source_ids = merged_products[product_id]['sourceIds']
                sources = merged_products[product_id]['sources']
                merged_products[product_id] = {
                    **product,
                    'sourceIds': source_ids,
                    'sources': sources
                }
    
    return list(merged_products.values())

@app.get("/api/products/{product_id}")
def get_product(product_id: str):
    """Получить товар по ID"""
    product = db.get_product(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@app.put("/api/products/{product_id}")
def update_product(product_id: str, updates: Dict[str, Any]):
    """Обновить товар (например, скрыть/показать)"""
    result = db.update_product(product_id, updates)
    if not result:
        raise HTTPException(status_code=404, detail="Product not found")
    return result

@app.post("/api/products/{product_id}/parse-dates")
async def parse_product_dates(product_id: str):
    """Парсит даты отправления для конкретного тура"""
    product = db.get_product(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if not product.get('url'):
        raise HTTPException(status_code=400, detail="У продукта нет URL для парсинга")
    
    try:
        from parser.tour_dates_parser import TourDatesParser
        parser = TourDatesParser()
        dates = parser.parse_tour_dates(product['url'])
        
        # Сохраняем даты в продукт
        updated_product = db.update_product_dates(product_id, dates)
        
        # Логируем
        db.add_log({
            "type": "parser",
            "message": f"Парсинг дат для '{product['name']}'",
            "details": f"Найдено дат: {len(dates)}",
            "status": "success",
            "productId": product_id
        })
        
        return {
            "success": True,
            "datesCount": len(dates),
            "dates": dates,
            "product": updated_product
        }
    except Exception as e:
        db.add_log({
            "type": "parser",
            "message": f"Ошибка парсинга дат для '{product['name']}'",
            "details": str(e),
            "status": "error",
            "productId": product_id
        })
        raise HTTPException(status_code=500, detail=f"Ошибка парсинга дат: {str(e)}")

@app.post("/api/data-sources/{source_id}/parse-all-dates")
async def parse_all_dates_for_source(source_id: str, background_tasks: BackgroundTasks):
    """Парсит даты для всех туров источника"""
    source = db.get_data_source(source_id)
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    
    products = db.get_products(source_id=source_id)
    if not products:
        raise HTTPException(status_code=404, detail="No products found for this source")
    
    # Запускаем парсинг дат в фоне
    background_tasks.add_task(parse_dates_for_source_task, source_id, products)
    
    return {
        "message": f"Запущен парсинг дат для {len(products)} туров",
        "productsCount": len(products)
    }

@app.get("/api/data-sources/{source_id}/products")
def get_source_products(source_id: str):
    """Получить товары конкретного источника"""
    source = db.get_data_source(source_id)
    if not source:
        raise HTTPException(status_code=404, detail="Data source not found")
    return db.get_products(source_id=source_id)

# Feeds
@app.get("/api/feeds")
def get_feeds():
    return db.get_feeds()

@app.get("/api/feeds/{feed_id}")
def get_feed(feed_id: str):
    feed = db.get_feed(feed_id)
    if not feed:
        raise HTTPException(status_code=404, detail="Feed not found")
    return feed

@app.post("/api/feeds")
def create_feed(feed: FeedCreate):
    # Проверяем, что указан хотя бы один источник
    if not feed.sourceId and not feed.sourceIds:
        raise HTTPException(status_code=400, detail="Необходимо указать sourceId или sourceIds")
    
    # Если указан только один источник, преобразуем в список
    if feed.sourceId and not feed.sourceIds:
        feed.sourceIds = [feed.sourceId]
    
    feed_data = feed.dict()
    result = db.add_feed(feed_data)
    
    # Логируем создание фида
    sources_info = f"{len(feed.sourceIds)} источников" if feed.sourceIds and len(feed.sourceIds) > 1 else feed.sourceId or feed.sourceIds[0]
    db.add_log({
        "type": "feed",
        "message": f"Создан новый фид '{feed.name}'",
        "details": f"Формат: {feed.format}, Источники: {sources_info}",
        "status": "success",
        "feedId": result['id']
    })
    
    return result

@app.put("/api/feeds/{feed_id}")
def update_feed(feed_id: str, updates: Dict[str, Any]):
    result = db.update_feed(feed_id, updates)
    if not result:
        raise HTTPException(status_code=404, detail="Feed not found")
    return result

@app.delete("/api/feeds/{feed_id}")
def delete_feed(feed_id: str):
    if not db.delete_feed(feed_id):
        raise HTTPException(status_code=404, detail="Feed not found")
    return {"status": "deleted"}

def _apply_custom_template(template: Dict[str, Any], products: List[Dict[str, Any]], collections: List[Dict[str, Any]], settings: Dict[str, Any]) -> bytes:
    """Применяет кастомный шаблон к продуктам используя Mustache синтаксис"""
    # Поддержка обоих форматов: content: {...} и content: "string"
    template_content = template.get('content', '')
    if isinstance(template_content, dict):
        template_content = template_content.get('template', '')
    
    if not template_content:
        # Если шаблона нет, fallback на YML
        return generate_yml_feed(products, collections, settings)
    
    try:
        import pystache
        
        # Подготавливаем данные для шаблона
        template_data = {
            'shop_name': settings.get('siteName', 'Вокруг света'),
            'company': settings.get('companyName', 'Туристическая компания "Вокруг света"'),
            'url': settings.get('siteUrl', 'https://vs-travel.ru'),
            'date': datetime.now().strftime('%Y-%m-%d %H:%M'),
            'currency': settings.get('defaultCurrency', 'RUB'),
            'categories': [],
            'offers': []
        }
        
        # Собираем уникальные категории
        unique_categories = {}
        category_id = 1
        
        for product in products:
            cat_name = product.get('categoryName', 'Туры')
            if cat_name not in unique_categories:
                unique_categories[cat_name] = category_id
                template_data['categories'].append({
                    'id': category_id,
                    'name': cat_name
                })
                category_id += 1
        
        # Если категорий нет, добавляем дефолтную
        if not template_data['categories']:
            template_data['categories'].append({
                'id': 1,
                'name': 'Туры'
            })
            unique_categories['Туры'] = 1
        
        # Подготавливаем товары
        for product in products:
            cat_name = product.get('categoryName', 'Туры')
            offer_data = {
                'id': product.get('id', ''),
                'url': product.get('url', ''),
                'price': str(product.get('price', '0')),
                'oldPrice': str(product.get('oldPrice')) if product.get('oldPrice') else None,
                'oldprice': str(product.get('oldPrice')) if product.get('oldPrice') else None,  # alias
                'categoryId': unique_categories.get(cat_name, 1),
                'picture': product.get('image', ''),
                'image': product.get('image', ''),  # alias
                'name': product.get('name', ''),
                'route': product.get('route', ''),
                'description': product.get('description') or product.get('route', ''),
                'vendor': product.get('vendor', settings.get('siteName', 'Вокруг света')),
                'model': product.get('model', product.get('name', '')),
                'days': product.get('days', ''),
                'available': 'true' if product.get('active', True) else 'false',
                # Алиасы для VK/Google формата
                'title': product.get('name', ''),
                'link': product.get('url', ''),
                'image_link': product.get('image', ''),
                'condition': 'new',
                'availability': 'in stock' if product.get('active', True) else 'out of stock',
                'brand': product.get('vendor', settings.get('siteName', 'Вокруг света')),
                'product_type': cat_name,
                'currency': settings.get('defaultCurrency', 'RUB')
            }
            template_data['offers'].append(offer_data)
        
        # Добавляем entries как алиас для offers (для VK/Google шаблонов)
        template_data['entries'] = template_data['offers']
        
        # Рендерим шаблон
        renderer = pystache.Renderer(escape=lambda u: u)  # Отключаем HTML escaping для XML
        result = renderer.render(template_content, template_data)
        
        return result.encode('utf-8')
        
    except ImportError:
        print("Warning: pystache not installed, falling back to manual template rendering")
        # Fallback на ручную замену переменных
        return _apply_template_manual(template_content, products, collections, settings)
    except Exception as e:
        print(f"Error applying custom template: {e}")
        import traceback
        traceback.print_exc()
        # Fallback на YML
        return generate_yml_feed(products, collections, settings)


def _apply_template_manual(template_content: str, products: List[Dict[str, Any]], collections: List[Dict[str, Any]], settings: Dict[str, Any]) -> bytes:
    """Ручная замена переменных в шаблоне (fallback если нет pystache)"""
    import re
    
    # Подготавливаем данные
    shop_name = settings.get('siteName', 'Вокруг света')
    company = settings.get('companyName', 'Туристическая компания "Вокруг света"')
    url = settings.get('siteUrl', 'https://vs-travel.ru')
    date = datetime.now().strftime('%Y-%m-%d %H:%M')
    currency = settings.get('defaultCurrency', 'RUB')
    
    # Собираем категории
    unique_categories = {}
    category_id = 1
    categories_xml = ""
    
    for product in products:
        cat_name = product.get('categoryName', 'Туры')
        if cat_name not in unique_categories:
            unique_categories[cat_name] = category_id
            categories_xml += f'      <category id="{category_id}">{cat_name}</category>\n'
            category_id += 1
    
    if not categories_xml:
        categories_xml = '      <category id="1">Туры</category>\n'
        unique_categories['Туры'] = 1
    
    # Генерируем offers
    offers_xml = ""
    for product in products:
        cat_name = product.get('categoryName', 'Туры')
        cat_id = unique_categories.get(cat_name, 1)
        available = 'true' if product.get('active', True) else 'false'
        
        # Формируем oldprice тег если есть
        oldprice_xml = ""
        old_price_value = product.get('oldPrice') or product.get('oldprice')
        if old_price_value:
            try:
                old_price_num = float(old_price_value)
                current_price_num = float(product.get('price', 0))
                if old_price_num > current_price_num:
                    oldprice_xml = f"\n        <oldprice>{int(old_price_num)}</oldprice>"
            except (ValueError, TypeError):
                pass
        
        offers_xml += f'''      <offer id="{product.get('id', '')}" available="{available}">
        <url>{product.get('url', '')}</url>
        <price>{product.get('price', '0')}</price>{oldprice_xml}
        <currencyId>{currency}</currencyId>
        <categoryId>{cat_id}</categoryId>
        <picture>{product.get('image', '')}</picture>
        <name>{product.get('name', '')}</name>
        <description>{product.get('description') or product.get('route', '')}</description>
      </offer>
'''
    
    # Заменяем переменные в шаблоне
    result = template_content
    result = result.replace('{{shop_name}}', shop_name)
    result = result.replace('{{company}}', company)
    result = result.replace('{{url}}', url)
    result = result.replace('{{date}}', date)
    result = result.replace('{{currency}}', currency)
    
    # Заменяем блоки
    # {{#categories}}...{{/categories}}
    categories_block = re.search(r'{{#categories}}(.*?){{/categories}}', result, re.DOTALL)
    if categories_block:
        result = result.replace(categories_block.group(0), categories_xml)
    
    # {{#offers}}...{{/offers}}
    offers_block = re.search(r'{{#offers}}(.*?){{/offers}}', result, re.DOTALL)
    if offers_block:
        result = result.replace(offers_block.group(0), offers_xml)
    
    return result.encode('utf-8')
    
    return result.encode('utf-8')

# Feed XML Generation
@app.get("/api/feeds/{feed_id}/xml")
def get_feed_xml(feed_id: str):
    """Генерация XML фида для Яндекс.Директ"""
    from fastapi.responses import Response
    
    feed = db.get_feed(feed_id)
    if not feed:
        raise HTTPException(status_code=404, detail="Feed not found")
    
    # Получаем товары
    source_ids = feed.get('sourceIds', [])
    source_id = feed.get('sourceId')
    
    print(f"\n===== FEED XML GENERATION =====")
    print(f"Feed ID: {feed_id}")
    print(f"Feed Name: {feed.get('name')}")
    print(f"sourceId (legacy): {source_id}")
    print(f"sourceIds (array): {source_ids}")
    
    # Поддержка обратной совместимости - если есть только sourceId
    if source_id and not source_ids:
        source_ids = [source_id]
        print(f"Using fallback - converted sourceId to sourceIds: {source_ids}")
    
    products = []
    
    # Если фид ручной (manual) и есть список productIds
    if 'manual' in source_ids and feed.get('settings', {}).get('productIds'):
        product_ids = feed['settings']['productIds']
        all_products = db.get_products()
        products = [p for p in all_products if p['id'] in product_ids]
    elif source_ids:
        # Собираем товары из всех источников
        all_products = db.get_products()
        print(f"DEBUG: Total products in DB: {len(all_products)}")
        print(f"DEBUG: Source IDs to process: {source_ids}")
        
        for src_id in source_ids:
            if src_id == 'manual':
                continue  # Пропускаем manual
                
            source_products = [p for p in all_products if p.get('sourceId') == src_id]
            print(f"DEBUG: Source {src_id} has {len(source_products)} products")
            
            # Добавляем категорию по имени источника
            source = db.get_data_source(src_id)
            category_name = source.get('name', src_id) if source else src_id
            print(f"DEBUG: Category name for {src_id}: {category_name}")
            
            for product in source_products:
                # Клонируем продукт чтобы не изменять оригинал
                p = product.copy()
                p['categoryName'] = category_name  # Добавляем категорию
                products.append(p)
                print(f"  Added product {p['id']} with category '{category_name}'")
        
        print(f"\nDEBUG: Total products collected: {len(products)}")
        print(f"DEBUG: Unique categories: {set(p.get('categoryName', 'NO CATEGORY') for p in products)}")
        print(f"================================\n")
    
    # Фильтруем только видимые товары (не скрытые)
    visible_products = [p for p in products if not p.get('hidden', False)]
    
    # Применяем UTM параметры если указан шаблон
    utm_template_id = feed.get('utmTemplateId')
    if utm_template_id:
        utm_template = db.get_utm_template(utm_template_id)
        if utm_template:
            # Генерируем UTM параметры
            utm_params = []
            utm_params.append(f"utm_source={utm_template['source']}")
            utm_params.append(f"utm_medium={utm_template['medium']}")
            utm_params.append(f"utm_campaign={utm_template['campaign']}")
            if utm_template.get('term'):
                utm_params.append(f"utm_term={utm_template['term']}")
            if utm_template.get('content'):
                utm_params.append(f"utm_content={utm_template['content']}")
            
            utm_string = '&'.join(utm_params)
            
            # Применяем UTM ко всем товарам
            for product in visible_products:
                if 'url' in product and product['url']:
                    separator = '&' if '?' in product['url'] else '?'
                    product['url'] = f"{product['url']}{separator}{utm_string}"
    
    # Получаем каталоги
    collections = db.get_collections()
    
    # Получаем настройки
    settings = db.get_settings()
    
    # Проверяем, есть ли кастомный шаблон
    feed_template_id = feed.get('settings', {}).get('feedTemplateId')
    print(f"\nDEBUG Template Check:")
    print(f"  Feed settings: {feed.get('settings')}")
    print(f"  Template ID: {feed_template_id}")
    
    if feed_template_id and feed_template_id != 'yandex_market':
        print(f"  Using custom template: {feed_template_id}")
        # Используем кастомный шаблон
        template = db.get_template(feed_template_id)
        print(f"  Template loaded: {template.get('name') if template else 'NOT FOUND'}")
        print(f"  Template type: {template.get('type') if template else None}")
        
        if template and template.get('type') == 'feed':
            print(f"  Applying custom template...")
            xml_content = _apply_custom_template(template, visible_products, collections, settings)
        else:
            print(f"  Template not valid, using YML fallback")
            # Fallback to YML if template not found
            xml_content = generate_yml_feed(visible_products, collections, settings)
    else:
        print(f"  No custom template, using standard YML")
        # Генерируем стандартный YML фид
        xml_content = generate_yml_feed(visible_products, collections, settings)
    
    return Response(content=xml_content, media_type="application/xml")

@app.get("/api/feeds/{feed_id}/export")
def export_feed(feed_id: str, format: str = "xml"):
    """Экспорт фида в различных форматах"""
    import json
    import csv
    import io
    
    if format == "xml":
        # Для XML используем тот же метод что и /xml endpoint
        xml_content = get_feed_xml(feed_id).body.decode('utf-8')
        return Response(
            content=xml_content,
            media_type="application/xml",
            headers={"Content-Disposition": f"attachment; filename=feed_{feed_id}.xml"}
        )
    
    # Для JSON и CSV нужно получить данные
    feed = db.get_feed(feed_id)
    if not feed:
        raise HTTPException(status_code=404, detail="Feed not found")
    
    # Получаем товары
    source_ids = feed.get('sourceIds', [])
    source_id = feed.get('sourceId')
    
    if source_id and not source_ids:
        source_ids = [source_id]
    
    products = []
    if 'manual' in source_ids and feed.get('settings', {}).get('productIds'):
        product_ids = feed['settings']['productIds']
        all_products = db.get_products()
        products = [p for p in all_products if p['id'] in product_ids]
    elif source_ids:
        all_products = db.get_products()
        for src_id in source_ids:
            if src_id == 'manual':
                continue
            source_products = [p for p in all_products if p.get('sourceId') == src_id]
            source = db.get_data_source(src_id)
            category_name = source.get('name', src_id) if source else src_id
            for product in source_products:
                p = product.copy()
                p['categoryName'] = category_name
                products.append(p)
    
    visible_products = [p for p in products if not p.get('hidden', False)]
    
    if format == "json":
        json_content = json.dumps(visible_products, ensure_ascii=False, indent=2)
        return Response(
            content=json_content,
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename=feed_{feed_id}.json"}
        )
    
    elif format == "csv":
        output = io.StringIO()
        if visible_products:
            fieldnames = ['id', 'name', 'price', 'url', 'image', 'categoryName', 'days', 'route']
            writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction='ignore')
            writer.writeheader()
            writer.writerows(visible_products)
        
        csv_content = output.getvalue()
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=feed_{feed_id}.csv"}
        )
    
    else:
        raise HTTPException(status_code=400, detail="Unsupported format")

# Auth
class LoginRequest(BaseModel):
    username: str
    password: str

@app.post("/api/auth/login")
def login(credentials: LoginRequest):
    print(f"Login attempt - Username: '{credentials.username}', Password: '{credentials.password}'")
    print(f"About to call verify_user...")
    is_valid = db.verify_user(credentials.username, credentials.password)
    print(f"verify_user returned: {is_valid}")
    if is_valid:
        return {
            "status": "success",
            "user": {
                "username": credentials.username,
                "role": "admin"
            }
        }
    raise HTTPException(status_code=401, detail="Invalid credentials")

# Templates - Шаблоны фидов и UTM
@app.get("/api/templates")
def get_templates(type: Optional[str] = None):
    """Получить все шаблоны или по типу (feed/utm)"""
    templates = db.get_templates()
    
    # Преобразуем в формат который ожидает фронтенд
    for template in templates:
        # Если content - строка, преобразуем в объект {template, variables}
        if isinstance(template.get('content'), str):
            template['content'] = {
                'template': template.get('content', ''),
                'variables': template.get('variables', [])
            }
        # Если content уже объект, оставляем как есть
        elif isinstance(template.get('content'), dict):
            # Убедимся что есть variables
            if 'variables' not in template['content']:
                template['content']['variables'] = template.get('variables', [])
    
    if type:
        templates = [t for t in templates if t.get('type') == type]
    return templates

@app.post("/api/templates")
def create_template(template: TemplateCreate):
    """Создать новый шаблон"""
    template_data = {
        "id": f"tpl_{datetime.now().timestamp()}",
        "name": template.name,
        "type": template.type,
        "content": template.content,
        "description": template.description,
        "createdAt": datetime.now().isoformat(),
        "updatedAt": datetime.now().isoformat()
    }
    
    created = db.add_template(template_data)
    return created

@app.get("/api/templates/{template_id}")
def get_template(template_id: str):
    """Получить шаблон по ID"""
    template = db.get_template(template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Миграция старого формата content: {template: "..."} -> content: "..."
    if isinstance(template.get('content'), dict):
        template['content'] = template['content'].get('template', '')
    
    return template

@app.put("/api/templates/{template_id}")
def update_template(template_id: str, template: TemplateUpdate):
    """Обновить шаблон"""
    existing = db.get_template(template_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Template not found")
    
    update_data = template.dict(exclude_unset=True)
    update_data["updatedAt"] = datetime.now().isoformat()
    
    updated = db.update_template(template_id, update_data)
    return updated

@app.delete("/api/templates/{template_id}")
def delete_template(template_id: str):
    """Удалить шаблон"""
    if not db.delete_template(template_id):
        raise HTTPException(status_code=404, detail="Template not found")
    return {"status": "deleted"}

# Публичный endpoint для фида с опциональной авторизацией
def verify_feed_credentials(credentials: HTTPBasicCredentials, feed: Dict[str, Any]) -> bool:
    """Проверка учётных данных для доступа к фиду"""
    feed_settings = feed.get('settings', {})
    
    # Если защита не включена - доступ открыт
    if not feed_settings.get('requireAuth', False):
        return True
    
    # Проверяем credentials
    correct_username = feed_settings.get('username', 'admin')
    correct_password = feed_settings.get('password', 'password')
    
    is_username_correct = secrets.compare_digest(credentials.username, correct_username)
    is_password_correct = secrets.compare_digest(credentials.password, correct_password)
    
    return is_username_correct and is_password_correct

@app.get("/feed/{feed_id}")
def get_public_feed(feed_id: str, credentials: Optional[HTTPBasicCredentials] = Depends(security)):
    """
    Публичный endpoint для получения XML фида.
    Используется Яндекс.Директом для загрузки товаров.
    Поддерживает опциональную HTTP Basic авторизацию.
    
    Пример использования:
    https://your-domain.com/feed/feed_001
    или с авторизацией:
    https://username:password@your-domain.com/feed/feed_001
    """
    from fastapi.responses import Response
    
    feed = db.get_feed(feed_id)
    if not feed:
        raise HTTPException(status_code=404, detail="Feed not found")
    
    # Проверка авторизации если требуется
    if feed.get('settings', {}).get('requireAuth', False):
        if not credentials or not verify_feed_credentials(credentials, feed):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Неверные учётные данные",
                headers={"WWW-Authenticate": "Basic"},
            )
    
    # Получаем товары
    source_id = feed.get('sourceId')
    if not source_id:
        raise HTTPException(status_code=400, detail="Feed has no data source")
    
    # Если фид ручной (manual) и есть список productIds
    if source_id == 'manual' and feed.get('settings', {}).get('productIds'):
        product_ids = feed['settings']['productIds']
        all_products = db.get_products()
        products = [p for p in all_products if p['id'] in product_ids]
    else:
        # Иначе берем по источнику
        products = db.get_products(source_id=source_id)
    
    # Фильтруем только видимые товары
    visible_products = [p for p in products if not p.get('hidden', False)]
    
    if not visible_products:
        raise HTTPException(status_code=404, detail="No products found")
    
    # Получаем каталоги
    collections = db.get_collections()
    
    # Получаем настройки
    settings = db.get_settings()
    
    # Генерируем XML через оптимизированный генератор
    xml_content = generate_yml_feed(visible_products, collections, settings)
    
    return Response(
        content=xml_content,
        media_type="application/xml",
        headers={
            "Content-Disposition": f"inline; filename=feed_{feed_id}.xml",
            "Cache-Control": "public, max-age=3600"  # Кэш на 1 час
        }
    )

# Public Feed Preview (HTML)
@app.get("/feed/preview/{feed_id}")
def get_feed_preview(feed_id: str):
    """Публичная HTML страница предпросмотра фида"""
    feed = db.get_feed(feed_id)
    if not feed:
        raise HTTPException(status_code=404, detail="Feed not found")
    
    # Получаем товары для фида
    all_products = db.get_products()
    product_ids = feed.get('settings', {}).get('productIds', [])
    
    if product_ids:
        products = [p for p in all_products if p['id'] in product_ids]
    else:
        source_id = feed.get('sourceId')
        if source_id and source_id != 'manual':
            products = [p for p in all_products if p.get('sourceId') == source_id and not p.get('hidden', False)]
        else:
            products = all_products
    
    # HTML шаблон
    html = f"""
    <!DOCTYPE html>
    <html lang="ru">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{feed['name']} - Предпросмотр фида</title>
        <style>
            * {{ margin: 0; padding: 0; box-sizing: border-box; }}
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 20px; }}
            .container {{ max-width: 1200px; margin: 0 auto; }}
            .header {{ background: white; padding: 30px; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }}
            h1 {{ font-size: 32px; margin-bottom: 10px; color: #333; }}
            .meta {{ color: #666; font-size: 14px; }}
            .stats {{ display: flex; gap: 20px; margin-top: 20px; }}
            .stat {{ background: #f8f9fa; padding: 10px 20px; border-radius: 8px; }}
            .stat-label {{ font-size: 12px; color: #666; }}
            .stat-value {{ font-size: 24px; font-weight: bold; color: #333; margin-top: 5px; }}
            .products {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }}
            .product {{ background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); transition: transform 0.2s; }}
            .product:hover {{ transform: translateY(-4px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }}
            .product-image {{ width: 100%; height: 200px; object-fit: cover; background: #f0f0f0; }}
            .product-content {{ padding: 20px; }}
            .product-name {{ font-size: 16px; font-weight: 600; margin-bottom: 8px; color: #333; line-height: 1.4; }}
            .product-route {{ font-size: 14px; color: #666; margin-bottom: 12px; }}
            .product-footer {{ display: flex; justify-content: space-between; align-items: center; margin-top: 12px; padding-top: 12px; border-top: 1px solid #eee; }}
            .product-price {{ font-size: 20px; font-weight: bold; color: #2563eb; }}
            .product-days {{ font-size: 12px; color: #666; background: #f8f9fa; padding: 4px 8px; border-radius: 4px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>{feed['name']}</h1>
                <div class="meta">Формат: {feed.get('format', 'xml').upper()} · Товаров: {len(products)}</div>
                <div class="stats">
                    <div class="stat">
                        <div class="stat-label">Всего товаров</div>
                        <div class="stat-value">{len(products)}</div>
                    </div>
                    <div class="stat">
                        <div class="stat-label">Последнее обновление</div>
                        <div class="stat-value">{feed.get('lastUpdate', 'Никогда')[:10]}</div>
                    </div>
                </div>
            </div>
            <div class="products">
    """
    
    for product in products:
        days_label = "Экскурсия" if product.get('days') == "1" else f"{product.get('days', 'N/A')} дней"
        price = int(product.get('price', 0))
        price_formatted = f"{price:,}".replace(',', ' ')
        
        html += f"""
                <div class="product">
                    <img src="{product.get('image', '')}" alt="{product.get('name', '')}" class="product-image" onerror="this.style.display='none'">
                    <div class="product-content">
                        <div class="product-name">{product.get('name', '')}</div>
                        <div class="product-route">{product.get('route', '')}</div>
                        <div class="product-footer">
                            <div class="product-price">{price_formatted} ₽</div>
                            <div class="product-days">{days_label}</div>
                        </div>
                    </div>
                </div>
        """
    
    html += """
            </div>
        </div>
    </body>
    </html>
    """
    
    return Response(content=html, media_type="text/html")

# User Management (Admin Panel)
class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: str = "user"
    enabledTools: List[str] = []

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    enabledTools: Optional[List[str]] = None

@app.get("/api/users")
def get_users():
    """Получить список всех пользователей"""
    return db.get_users()

@app.get("/api/users/{user_id}")
def get_user(user_id: str):
    """Получить пользователя по ID"""
    user = db.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@app.post("/api/users")
def create_user(user: UserCreate):
    """Создать нового пользователя"""
    user_data = user.dict()
    user_data["id"] = f"user_{datetime.now().timestamp()}"
    user_data["createdAt"] = datetime.now().isoformat()
    result = db.add_user(user_data)
    return result

@app.put("/api/users/{user_id}")
def update_user(user_id: str, user: UserUpdate):
    """Обновить пользователя"""
    user_data = user.dict(exclude_unset=True)
    result = db.update_user(user_id, user_data)
    if not result:
        raise HTTPException(status_code=404, detail="User not found")
    return result

@app.delete("/api/users/{user_id}")
def delete_user(user_id: str):
    """Удалить пользователя"""
    result = db.delete_user(user_id)
    if not result:
        raise HTTPException(status_code=404, detail="User not found")
    return {"status": "deleted"}

@app.put("/api/users/{user_id}/tools")
def update_user_tools(user_id: str, tools: Dict[str, List[str]]):
    """Обновить доступные инструменты пользователя"""
    result = db.update_user(user_id, {"enabledTools": tools.get("enabledTools", [])})
    if not result:
        raise HTTPException(status_code=404, detail="User not found")
    return result

# Product Health Check
@app.post("/api/products/check-availability")
async def check_product_availability(background_tasks: BackgroundTasks):
    """Проверка доступности товаров (404 check)"""
    import aiohttp
    import asyncio
    import ssl
    
    products = db.get_products()
    updated_count = 0
    
    # Создаем SSL контекст который игнорирует ошибки сертификатов
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    
    async def check_url(session, product):
        if not product.get('url'):
            return None
        
        try:
            # Используем GET запрос для проверки финального URL после редиректа
            async with session.get(product['url'], timeout=aiohttp.ClientTimeout(total=10), allow_redirects=True, ssl=ssl_context) as response:
                # Проверяем статус 404 или редирект на страницу 404
                final_url = str(response.url)
                if response.status == 404 or '/404' in final_url or final_url.endswith('/404'):
                    # Ставим товар на паузу
                    db.update_product(product['id'], {'active': False})
                    print(f"✓ Product {product['id']} paused - 404 detected: {final_url}")
                    return product['id']
                return None
        except asyncio.TimeoutError:
            # Таймаут - товар считаем недоступным
            db.update_product(product['id'], {'active': False})
            print(f"✓ Product {product['id']} paused - timeout")
            return product['id']
        except Exception as e:
            # Любая другая ошибка - игнорируем (товар остается активным)
            # print(f"Skipped {product.get('url')}: {type(e).__name__}")
            pass
        
        return None
    
    async def check_all():
        async with aiohttp.ClientSession() as session:
            tasks = [check_url(session, p) for p in products if p.get('url')]
            results = await asyncio.gather(*tasks)
            return [r for r in results if r]
    
    paused_products = await check_all()
    
    # Логируем результат проверки
    db.add_log({
        "type": "availability_check",
        "message": f"Проверка наличия завершена",
        "details": f"Проверено {len(products)} товаров, поставлено на паузу {len(paused_products)}",
        "status": "success" if len(paused_products) == 0 else "warning"
    })
    
    return {
        "checked": len(products),
        "paused": len(paused_products),
        "paused_ids": paused_products
    }

# Logs
@app.get("/api/logs")
def get_logs():
    """Получить все логи"""
    try:
        logs = db.get_logs()
        return logs
    except Exception as e:
        print(f"Error getting logs: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/logs")
def create_log(log: dict):
    """Создать запись в логе"""
    try:
        return db.add_log(log)
    except Exception as e:
        print(f"Error creating log: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/logs")
def clear_logs():
    """Очистить все логи"""
    db.clear_logs()
    return {"status": "cleared"}


# Analytics
@app.get("/api/analytics")
def get_analytics(
    feedId: Optional[str] = None,
    productId: Optional[str] = None,
    dateFrom: Optional[str] = None,
    dateTo: Optional[str] = None
):
    """Получить данные аналитики с фильтрацией"""
    try:
        filters = {}
        if feedId:
            filters["feedId"] = feedId
        if productId:
            filters["productId"] = productId
        if dateFrom:
            filters["dateFrom"] = dateFrom
        if dateTo:
            filters["dateTo"] = dateTo
        
        analytics = db.get_analytics(filters)
        return analytics
    except Exception as e:
        print(f"Error getting analytics: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/analytics/sync")
async def sync_analytics(background_tasks: BackgroundTasks):
    """Синхронизировать данные из Яндекс.Метрики"""
    try:
        # Получаем настройки из БД или .env
        settings = db.get_settings()
        counter_id = settings.get("yandexMetricaCounterId") or os.getenv("YANDEX_METRICA_COUNTER_ID")
        token = settings.get("yandexMetricaToken") or os.getenv("YANDEX_METRICA_TOKEN")
        
        if not counter_id or not token:
            raise HTTPException(
                status_code=400,
                detail="Яндекс.Метрика не настроена. Укажите counter_id и token в настройках."
            )
        
        # Запускаем синхронизацию в фоне
        background_tasks.add_task(sync_analytics_task, counter_id, token)
        
        db.add_log({
            "type": "analytics",
            "message": "Запущена синхронизация с Яндекс.Метрикой",
            "status": "info"
        })
        
        return {"status": "started", "message": "Синхронизация запущена в фоновом режиме"}
        
    except Exception as e:
        print(f"Error syncing analytics: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


async def sync_analytics_task(counter_id: str, token: str):
    """Фоновая задача синхронизации аналитики"""
    try:
        client = YandexMetricaClient(counter_id, token)
        
        # Получаем данные за последние 30 дней
        from datetime import timedelta
        date_to = datetime.now().strftime("%Y-%m-%d")
        date_from = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
        
        # Запрос статистики
        raw_data = client.get_utm_statistics(date_from, date_to)
        parsed_data = client.parse_utm_data(raw_data)
        
        # Получаем фиды для сопоставления UTM term с товарами
        feeds = db.get_feeds()
        products = db.get_products()
        
        # Сохраняем данные в БД
        saved_count = 0
        for record in parsed_data:
            utm_term = record["utm_term"]
            
            # Пытаемся определить товар и фид по UTM term
            # UTM term обычно содержит ID товара или уникальный идентификатор
            product_id = None
            feed_id = None
            
            # Поиск товара по ID в UTM
            for product in products:
                if product["id"] in utm_term:
                    product_id = product["id"]
                    # Найти фид по товару
                    for feed in feeds:
                        if product_id in feed.get("settings", {}).get("productIds", []):
                            feed_id = feed["id"]
                            break
                    break
            
            # Сохраняем запись аналитики
            analytics_record = {
                "utm_term": utm_term,
                "date": record["date"],
                "visits": record["visits"],
                "users": record["users"],
                "pageviews": record["pageviews"],
                "bounceRate": record["bounceRate"],
                "productId": product_id,
                "feedId": feed_id
            }
            
            db.add_analytics_data(analytics_record)
            saved_count += 1
        
        db.add_log({
            "type": "analytics",
            "message": f"Синхронизация с Яндекс.Метрикой завершена",
            "details": f"Сохранено {saved_count} записей за период {date_from} - {date_to}",
            "status": "success"
        })
        
    except Exception as e:
        print(f"Error in sync_analytics_task: {e}")
        import traceback
        traceback.print_exc()
        
        db.add_log({
            "type": "analytics",
            "message": "Ошибка синхронизации с Яндекс.Метрикой",
            "details": str(e),
            "status": "error"
        })


@app.delete("/api/analytics")
def clear_analytics():
    """Очистить все данные аналитики"""
    db.clear_analytics()
    
    db.add_log({
        "type": "analytics",
        "message": "Данные аналитики очищены",
        "status": "info"
    })
    
    return {"status": "cleared"}

# Collections (Каталоги товаров)
@app.get("/api/collections")
def get_collections():
    """Получить все каталоги"""
    return db.get_collections()

@app.get("/api/collections/{collection_id}")
def get_collection(collection_id: str):
    """Получить каталог по ID"""
    collection = db.get_collection(collection_id)
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    return collection

@app.post("/api/collections")
def create_collection(collection: CollectionCreate):
    """Создать новый каталог"""
    collection_data = collection.dict()
    result = db.add_collection(collection_data)
    
    db.add_log({
        "type": "collection",
        "message": f"Создан каталог '{collection.name}'",
        "status": "success"
    })
    
    return result

@app.put("/api/collections/{collection_id}")
def update_collection(collection_id: str, collection: CollectionUpdate):
    """Обновить каталог"""
    result = db.update_collection(collection_id, collection.dict(exclude_unset=True))
    if not result:
        raise HTTPException(status_code=404, detail="Collection not found")
    return result

@app.delete("/api/collections/{collection_id}")
def delete_collection(collection_id: str):
    """Удалить каталог"""
    if not db.delete_collection(collection_id):
        raise HTTPException(status_code=404, detail="Collection not found")
    
    db.add_log({
        "type": "collection",
        "message": f"Удален каталог {collection_id}",
        "status": "info"
    })
    
    return {"status": "deleted"}

@app.post("/api/collections/{collection_id}/products/{product_id}")
def add_product_to_collection(collection_id: str, product_id: str):
    """Добавить товар в каталог"""
    if not db.add_product_to_collection(collection_id, product_id):
        raise HTTPException(status_code=404, detail="Collection or product not found")
    return {"status": "added"}

@app.delete("/api/collections/{collection_id}/products/{product_id}")
def remove_product_from_collection(collection_id: str, product_id: str):
    """Удалить товар из каталога"""
    if not db.remove_product_from_collection(collection_id, product_id):
        raise HTTPException(status_code=404, detail="Collection or product not found")
    return {"status": "removed"}

@app.get("/api/collections/{collection_id}/products")
def get_collection_products(collection_id: str):
    """Получить все товары каталога"""
    collection = db.get_collection(collection_id)
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    
    all_products = db.get_products()
    collection_products = [p for p in all_products if collection_id in p.get("collectionIds", [])]
    return collection_products

# Analytics / Yandex Metrica
@app.get("/api/analytics/metrica")
def get_metrica_analytics(
    date_from: str = None,
    date_to: str = None,
    utm_term: str = None
):
    """Получить статистику из Яндекс.Метрики"""
    try:
        settings = db.get_settings()
        counter_id = settings.get("metricaCounterId")
        token = settings.get("metricaToken")
        
        if not counter_id or not token:
            raise HTTPException(
                status_code=400,
                detail="Настройте Яндекс.Метрику (ID счетчика и токен)"
            )
        
        client = YandexMetricaClient(counter_id=counter_id, token=token)
        data = client.get_utm_statistics(
            date_from=date_from,
            date_to=date_to,
            utm_term=utm_term
        )
        
        parsed = client.parse_utm_data(data)
        
        # Сохраняем данные аналитики на сервере
        db.save_analytics_data({
            "date_from": date_from,
            "date_to": date_to,
            "utm_term": utm_term,
            "data": parsed,
            "fetched_at": datetime.now().isoformat()
        })
        
        return parsed
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/analytics/campaigns")
def get_campaigns_analytics(
    date_from: str = None,
    date_to: str = None
):
    """Получить статистику по кампаниям с разбивкой по источникам из Яндекс.Метрики"""
    try:
        settings = db.get_settings()
        counter_id = settings.get("metricaCounterId")
        token = settings.get("metricaToken")
        
        if not counter_id or not token:
            raise HTTPException(
                status_code=400,
                detail="Настройте Яндекс.Метрику (ID счетчика и токен)"
            )
        
        client = YandexMetricaClient(counter_id=counter_id, token=token)
        data = client.get_campaigns_by_source(
            date_from=date_from,
            date_to=date_to
        )
        
        return data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/analytics/history")
def get_analytics_history():
    """Получить историю аналитических данных"""
    return db.get_analytics_history()

@app.post("/api/products/bulk-add-to-catalog")
def bulk_add_products_to_catalog(request: Dict[str, Any]):
    """Массовое добавление товаров в каталог"""
    try:
        product_ids = request.get("product_ids", [])
        collection_id = request.get("collection_id", "")
        
        if not collection_id or not product_ids:
            raise HTTPException(status_code=400, detail="Missing product_ids or collection_id")
        
        for product_id in product_ids:
            db.add_product_to_collection(collection_id, product_id)
        return {"success": True, "added": len(product_ids)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# UTM Templates
@app.get("/api/utm-templates")
def get_utm_templates():
    """Получить все UTM шаблоны"""
    try:
        templates = db.get_utm_templates()
        return templates
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/utm-templates/{template_id}")
def get_utm_template(template_id: str):
    """Получить UTM шаблон по ID"""
    try:
        template = db.get_utm_template(template_id)
        if not template:
            raise HTTPException(status_code=404, detail="Шаблон не найден")
        return template
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/utm-templates")
def create_utm_template(template: UTMTemplateCreate):
    """Создать новый UTM шаблон"""
    try:
        new_template = db.create_utm_template({
            "name": template.name,
            "source": template.source,
            "medium": template.medium,
            "campaign": template.campaign,
            "term": template.term,
            "content": template.content,
            "baseUrl": template.baseUrl,
            "status": template.status,
            "createdAt": datetime.utcnow().isoformat()
        })
        return new_template
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/utm-templates/{template_id}")
def update_utm_template(template_id: str, template: UTMTemplateUpdate):
    """Обновить UTM шаблон"""
    try:
        update_data = template.model_dump(exclude_unset=True)
        updated_template = db.update_utm_template(template_id, update_data)
        if not updated_template:
            raise HTTPException(status_code=404, detail="Шаблон не найден")
        return updated_template
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/utm-templates/{template_id}")
def delete_utm_template(template_id: str):
    """Удалить UTM шаблон"""
    try:
        success = db.delete_utm_template(template_id)
        if not success:
            raise HTTPException(status_code=404, detail="Шаблон не найден")
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Tracked Posts
@app.get("/api/tracked-posts")
def get_tracked_posts():
    """Получить все отслеживаемые посты"""
    try:
        posts = db.get_tracked_posts()
        return posts
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/tracked-posts/{post_id}")
def get_tracked_post(post_id: str):
    """Получить пост по ID"""
    try:
        post = db.get_tracked_post(post_id)
        if not post:
            raise HTTPException(status_code=404, detail="Пост не найден")
        return post
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/tracked-posts")
def create_tracked_post(post: TrackedPostCreate):
    """Создать новый отслеживаемый пост"""
    try:
        # Определяем UTM URL
        utm_url = post.postUrl
        
        # Если передана готовая UTM-ссылка, используем её
        if post.utmUrl:
            utm_url = post.utmUrl
        # Иначе генерируем UTM URL на основе шаблона
        elif post.utmTemplate:
            template = db.get_utm_template(post.utmTemplate)
            if template:
                # Генерируем UTM параметры
                params = []
                params.append(f"utm_source={template['source']}")
                params.append(f"utm_medium={template['medium']}")
                params.append(f"utm_campaign={template['campaign']}")
                if template.get('term'):
                    params.append(f"utm_term={template['term']}")
                if template.get('content'):
                    params.append(f"utm_content={template['content']}")
                
                # Добавляем параметры к URL
                separator = '&' if '?' in post.postUrl else '?'
                utm_url = f"{post.postUrl}{separator}{'&'.join(params)}"
        
        new_post = db.create_tracked_post({
            "platform": post.platform,
            "postUrl": post.postUrl,
            "title": post.title,
            "utmTemplate": post.utmTemplate,
            "utmUrl": utm_url,
            "clicks": post.clicks,
            "views": post.views,
            "conversions": post.conversions,
            "users": post.users,
            "frequency": post.frequency,
            "avgTime": post.avgTime,
            "createdAt": datetime.utcnow().isoformat()
        })
        return new_post
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/tracked-posts/{post_id}")
def update_tracked_post(post_id: str, post: TrackedPostUpdate):
    """Обновить отслеживаемый пост"""
    try:
        update_data = post.model_dump(exclude_unset=True)
        updated_post = db.update_tracked_post(post_id, update_data)
        if not updated_post:
            raise HTTPException(status_code=404, detail="Пост не найден")
        return updated_post
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/tracked-posts/{post_id}")
def delete_tracked_post(post_id: str):
    """Удалить отслеживаемый пост"""
    try:
        success = db.delete_tracked_post(post_id)
        if not success:
            raise HTTPException(status_code=404, detail="Пост не найден")
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============== Tracked Folders ==============

@app.get("/api/tracked-folders")
def get_tracked_folders():
    """Получить список папок для ссылок"""
    try:
        folders = db.data.get('trackedFolders', [])
        return folders
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/tracked-folders")
def create_tracked_folder(folder: dict):
    """Создать новую папку"""
    import uuid
    try:
        if 'trackedFolders' not in db.data:
            db.data['trackedFolders'] = []
        
        new_folder = {
            "id": str(uuid.uuid4()),
            "name": folder.get("name", "Новая папка"),
            "color": folder.get("color", "blue"),
            "createdAt": datetime.now().isoformat()
        }
        
        db.data['trackedFolders'].append(new_folder)
        db._save()
        return new_folder
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/tracked-folders/{folder_id}")
def delete_tracked_folder(folder_id: str):
    """Удалить папку"""
    try:
        folders = db.data.get('trackedFolders', [])
        db.data['trackedFolders'] = [f for f in folders if f['id'] != folder_id]
        
        # Убираем folderId у постов в этой папке
        posts = db.data.get('trackedPosts', [])
        for post in posts:
            if post.get('folderId') == folder_id:
                post['folderId'] = None
        
        db._save()
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# UTM History endpoints
@app.get("/api/utm-history")
def get_utm_history():
    """Получить историю генераций UTM"""
    try:
        history = db.get_utm_history()
        return history
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/utm-history")
def create_utm_history_item(item: UTMHistoryItem):
    """Добавить запись в историю UTM"""
    try:
        new_item = db.create_utm_history_item({
            "url": item.url,
            "source": item.source,
            "medium": item.medium,
            "campaign": item.campaign,
            "term": item.term,
            "content": item.content,
            "username": item.username,
            "createdAt": datetime.utcnow().isoformat()
        })
        return new_item
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/utm-history/{item_id}")
def delete_utm_history_item(item_id: str):
    """Удалить запись из истории"""
    try:
        db.delete_utm_history_item(item_id)
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/refresh-metrics")
def refresh_metrics():
    """Обновить метрики из Яндекс.Метрики"""
    try:
        # TODO: Интеграция с Яндекс.Метрикой
        return {"status": "ok", "message": "Метрики обновлены"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Competitors API endpoints
@app.get("/api/competitors/sources")
def get_competitor_sources():
    """Получить список источников данных конкурентов + наш источник"""
    try:
        # Источники конкурентов
        competitor_sources = competitor_manager.get_sources()
        
        # Добавляем ОДИН источник для всех наших туров
        all_products = db.get_products()
        products_with_dates = sum(1 for p in all_products if p.get('dates'))
        
        our_source = {
            'id': 'own_tours',
            'name': 'Наши туры',
            'type': 'own',
            'file': 'database.json',
            'enabled': True,
            'lastSync': datetime.now().isoformat(),
            'itemsCount': len(all_products),
            'itemsWithDates': products_with_dates,
            'itemsWithoutDates': len(all_products) - products_with_dates,
            'status': 'success'
        }
        
        # Наш источник первым
        result = [our_source] + competitor_sources
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/competitors/programs")
def get_competitor_programs():
    """Получить все программы конкурентов"""
    try:
        programs = competitor_manager.get_all_programs()
        # Преобразуем в формат для Timeline компонента
        timeline_programs = []
        for prog in programs:
            timeline_programs.append({
                "id": prog.get("id"),
                "name": prog["content"].get("name", ""),
                "short": prog["content"].get("short", ""),
                "priceMin": {
                    "brutto": prog["content"]["priceMin"].get("brutto", 0),
                    "currency": prog["content"]["priceMin"].get("currency", "руб")
                },
                "duration": {
                    "days": prog["content"]["duration"].get("days", 1),
                    "hours": prog["content"]["duration"].get("hours", 0)
                },
                "route": prog.get("route", []),
                "dates": prog.get("dates", []),
                "mainPhoto": prog.get("mainPhoto"),
                "source": prog.get("source"),
                "sourceId": prog.get("sourceId"),
                "sourceName": prog.get("sourceName")
            })
        return timeline_programs
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/competitors/timeline")
def get_competitor_timeline(limit: int = 50, offset: int = 0):
    """Получить данные для таймлайна: наши товары + конкуренты"""
    try:
        # Получаем данные конкурентов
        competitor_data = competitor_manager.get_timeline_data(limit=limit, offset=offset)
        
        # Получаем наши товары с датами
        our_products = db.get_products()
        our_timeline = []
        
        for product in our_products:
            if product.get('dates'):  # Только товары с датами
                for date in product['dates']:
                    our_timeline.append({
                        'id': f"{product['id']}_{date['date_from']}",
                        'productId': product['id'],
                        'name': product.get('name', ''),
                        'date_from': date['date_from'],
                        'date_to': date['date_to'],
                        'weekdays': date.get('weekdays', ''),
                        'price': date['price'],
                        'seats': date.get('seats', 0),
                        'available': date.get('available', True),
                        'source': 'own',
                        'sourceId': product.get('sourceId'),
                        'image': product.get('image'),
                        'route': product.get('route', ''),
                        'days': product.get('days', 1)
                    })
        
        # Объединяем данные
        combined_timeline = {
            'own': our_timeline,
            'competitors': competitor_data.get('programs', []) if isinstance(competitor_data, dict) else competitor_data,
            'total': len(our_timeline) + (len(competitor_data.get('programs', [])) if isinstance(competitor_data, dict) else len(competitor_data))
        }
        
        return combined_timeline
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/competitors/products")
def get_competitor_products():
    """Получить список уникальных продуктов конкурентов"""
    try:
        products = competitor_manager.get_products()
        return products
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/competitors/sources/{source_id}/parse")
async def parse_competitor_source(source_id: str, background_tasks: BackgroundTasks):
    """Запустить парсинг источника конкурентов"""
    try:
        # Проверяем, не идет ли уже парсинг
        current_state = db.get_parsing_state(source_id)
        if current_state and current_state.get("status") == "parsing":
            return {
                "success": False,
                "message": "Парсинг уже выполняется",
                "state": current_state
            }
        
        # Запускаем парсинг в фоновой задаче
        background_tasks.add_task(
            parse_competitor_source_task,
            source_id
        )
        
        return {
            "success": True,
            "message": f"Парсинг источника {source_id} запущен"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/competitors/sources/{source_id}/parsing-state")
def get_competitor_parsing_state(source_id: str):
    """Получить состояние парсинга источника"""
    try:
        state = db.get_parsing_state(source_id)
        if not state:
            return {
                "status": "idle",
                "message": "Парсинг не запущен"
            }
        return state
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/competitors/sources/{source_id}/stop-parse")
def stop_competitor_parsing(source_id: str):
    """Остановить парсинг источника"""
    try:
        db.clear_parsing_state(source_id)
        return {
            "success": True,
            "message": "Парсинг остановлен"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def parse_competitor_source_task(source_id: str):
    """Фоновая задача парсинга источника конкурентов"""
    try:
        await competitor_manager.parse_source(source_id, db)
    except Exception as e:
        logger.error(f"Ошибка фоновой задачи парсинга {source_id}: {str(e)}", exc_info=True)


# ====================================================================================
# Direct Parser API - Яндекс.Директ парсер рекламы конкурентов
# ====================================================================================

class DirectAdCreate(BaseModel):
    platform: str = "Яндекс"
    type: str
    query: str
    title: str
    description: Optional[str] = ""
    url: str
    display_url: Optional[str] = ""
    timestamp: Optional[str] = None
    position: Optional[int] = None
    is_premium: Optional[bool] = False
    sitelinks: Optional[List[Dict[str, str]]] = []
    extensions: Optional[Dict[str, Any]] = {}

class DirectAdsBatchCreate(BaseModel):
    ads: List[DirectAdCreate]
    session_id: Optional[str] = None
    source_info: Optional[Dict[str, Any]] = {}

class DirectSearchCreate(BaseModel):
    query: str
    pages_parsed: int = 1
    ads_found: int = 0
    timestamp: Optional[str] = None
    status: str = "completed"

@app.get("/api/direct-parser/ads")
def get_direct_ads(
    query: Optional[str] = None,
    platform: Optional[str] = None,
    domain: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None
):
    """Получить все рекламные объявления из Direct Parser"""
    try:
        ads = db.data.get('direct_ads', [])
        
        # Фильтрация
        if query:
            ads = [a for a in ads if query.lower() in a.get('query', '').lower()]
        if platform:
            ads = [a for a in ads if a.get('platform', '').lower() == platform.lower()]
        if domain:
            ads = [a for a in ads if domain.lower() in a.get('display_url', '').lower()]
        if date_from:
            ads = [a for a in ads if a.get('timestamp', '') >= date_from]
        if date_to:
            ads = [a for a in ads if a.get('timestamp', '') <= date_to]
        
        # Сортировка по времени (новые первые)
        ads = sorted(ads, key=lambda x: x.get('timestamp', ''), reverse=True)
        
        total = len(ads)
        ads = ads[offset:offset + limit]
        
        return {
            "ads": ads,
            "total": total,
            "limit": limit,
            "offset": offset
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/direct-parser/ads")
def create_direct_ad(ad: DirectAdCreate):
    """Создать одно рекламное объявление"""
    try:
        if 'direct_ads' not in db.data:
            db.data['direct_ads'] = []
        
        ad_data = ad.dict()
        ad_data['id'] = db._generate_id()
        if not ad_data.get('timestamp'):
            ad_data['timestamp'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        db.data['direct_ads'].append(ad_data)
        db._save()
        
        return {"success": True, "ad": ad_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/direct-parser/ads/batch")
def create_direct_ads_batch(batch: DirectAdsBatchCreate):
    """Создать множество рекламных объявлений (от локального парсера)"""
    try:
        if 'direct_ads' not in db.data:
            db.data['direct_ads'] = []
        
        created = []
        for ad in batch.ads:
            ad_data = ad.dict()
            ad_data['id'] = db._generate_id()
            if not ad_data.get('timestamp'):
                ad_data['timestamp'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            if batch.session_id:
                ad_data['session_id'] = batch.session_id
            
            db.data['direct_ads'].append(ad_data)
            created.append(ad_data)
        
        db._save()
        
        # Логируем
        db.add_log('info', f'Direct Parser: добавлено {len(created)} объявлений', 'success')
        
        return {
            "success": True,
            "created": len(created),
            "session_id": batch.session_id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/direct-parser/ads/{ad_id}")
def delete_direct_ad(ad_id: str):
    """Удалить рекламное объявление"""
    try:
        ads = db.data.get('direct_ads', [])
        db.data['direct_ads'] = [a for a in ads if a.get('id') != ad_id]
        db._save()
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/direct-parser/ads")
def delete_all_direct_ads(query: Optional[str] = None, date_before: Optional[str] = None):
    """Удалить все рекламные объявления (с фильтрами)"""
    try:
        ads = db.data.get('direct_ads', [])
        original_count = len(ads)
        
        if query:
            db.data['direct_ads'] = [a for a in ads if a.get('query', '').lower() != query.lower()]
        elif date_before:
            db.data['direct_ads'] = [a for a in ads if a.get('timestamp', '') >= date_before]
        else:
            db.data['direct_ads'] = []
        
        deleted = original_count - len(db.data['direct_ads'])
        db._save()
        
        return {"success": True, "deleted": deleted}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/direct-parser/ads/remove-duplicates")
def remove_duplicate_ads():
    """Удалить дубликаты объявлений по URL"""
    try:
        ads = db.data.get('direct_ads', [])
        original_count = len(ads)
        
        seen_urls = set()
        unique_ads = []
        for ad in ads:
            url = ad.get('url', '')
            if url and url not in seen_urls:
                seen_urls.add(url)
                unique_ads.append(ad)
            elif not url:
                unique_ads.append(ad)
        
        db.data['direct_ads'] = unique_ads
        db._save()
        
        removed = original_count - len(unique_ads)
        return {"success": True, "removed": removed, "remaining": len(unique_ads)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/direct-parser/searches")
def get_direct_searches():
    """Получить историю поисковых запросов"""
    try:
        searches = db.data.get('direct_searches', [])
        searches = sorted(searches, key=lambda x: x.get('timestamp', ''), reverse=True)
        return {"searches": searches}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/direct-parser/searches")
def create_direct_search(search: DirectSearchCreate):
    """Сохранить информацию о поисковом запросе"""
    try:
        if 'direct_searches' not in db.data:
            db.data['direct_searches'] = []
        
        search_data = search.dict()
        search_data['id'] = db._generate_id()
        if not search_data.get('timestamp'):
            search_data['timestamp'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        db.data['direct_searches'].append(search_data)
        db._save()
        
        return {"success": True, "search": search_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/direct-parser/stats")
def get_direct_parser_stats():
    """Получить статистику Direct Parser"""
    try:
        ads = db.data.get('direct_ads', [])
        searches = db.data.get('direct_searches', [])
        
        # Уникальные домены
        domains = set()
        for ad in ads:
            url = ad.get('url', '')
            if url:
                try:
                    from urllib.parse import urlparse
                    domain = urlparse(url).netloc
                    if domain:
                        domains.add(domain)
                except:
                    pass
        
        # Статистика по запросам
        queries = {}
        for ad in ads:
            q = ad.get('query', '')
            queries[q] = queries.get(q, 0) + 1
        
        top_queries = sorted(queries.items(), key=lambda x: x[1], reverse=True)[:10]
        
        return {
            "total_ads": len(ads),
            "total_searches": len(searches),
            "unique_domains": len(domains),
            "domains_list": list(domains)[:50],
            "top_queries": top_queries,
            "last_update": ads[0].get('timestamp') if ads else None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Словарь для хранения последней активности агентов
agent_last_activity = {}

@app.post("/api/direct-parser/agent/heartbeat")
def agent_heartbeat(agent_id: str = "default"):
    """Агент сообщает о своей активности"""
    agent_last_activity[agent_id] = datetime.now()
    return {"success": True}

@app.get("/api/direct-parser/agent/status")
def get_agent_status():
    """Проверить статус агентов"""
    now = datetime.now()
    agents = []
    
    for agent_id, last_seen in agent_last_activity.items():
        seconds_ago = (now - last_seen).total_seconds()
        agents.append({
            "agent_id": agent_id,
            "last_seen": last_seen.strftime("%Y-%m-%d %H:%M:%S"),
            "seconds_ago": int(seconds_ago),
            "online": seconds_ago < 30
        })
    
    # Также проверяем активные задачи
    tasks = db.data.get('direct_parser_tasks', [])
    running_tasks = [t for t in tasks if t.get('status') in ('running', 'assigned')]
    
    return {
        "agents": agents,
        "any_online": any(a["online"] for a in agents),
        "running_tasks": len(running_tasks)
    }

@app.get("/api/direct-parser/domains")
def get_direct_domains():
    """Получить список уникальных доменов рекламодателей"""
    try:
        ads = db.data.get('direct_ads', [])
        
        domains = {}
        for ad in ads:
            url = ad.get('url', '')
            if url:
                try:
                    from urllib.parse import urlparse
                    domain = urlparse(url).netloc
                    if domain:
                        if domain not in domains:
                            domains[domain] = {
                                'domain': domain,
                                'count': 0,
                                'queries': set(),
                                'titles': []
                            }
                        domains[domain]['count'] += 1
                        domains[domain]['queries'].add(ad.get('query', ''))
                        if len(domains[domain]['titles']) < 3:
                            domains[domain]['titles'].append(ad.get('title', ''))
                except:
                    pass
        
        # Конвертируем sets в lists
        result = []
        for d in domains.values():
            d['queries'] = list(d['queries'])
            result.append(d)
        
        result = sorted(result, key=lambda x: x['count'], reverse=True)
        
        return {"domains": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============== Direct Parser Agent API ==============
# API для управления локальным агентом парсинга

class DirectParserTask(BaseModel):
    """Задача на парсинг"""
    queries: List[str]
    max_pages: int = 2
    headless: bool = False

class TaskStatusUpdate(BaseModel):
    """Обновление статуса задачи"""
    status: str
    message: str = ""
    progress: int = 0

class TaskResults(BaseModel):
    """Результаты парсинга"""
    results: List[Dict[str, Any]]
    completed_at: str

# Хранилище задач (в памяти, можно перенести в БД)
direct_parser_tasks = {}

@app.get("/api/direct-parser/agent/ping")
def agent_ping():
    """Проверка подключения агента к API"""
    return {"status": "ok", "timestamp": datetime.now().isoformat()}

@app.post("/api/direct-parser/tasks")
def create_direct_parser_task(task: DirectParserTask):
    """Создать задачу на парсинг (из веб-интерфейса)"""
    import uuid
    task_id = str(uuid.uuid4())[:8]
    
    direct_parser_tasks[task_id] = {
        'id': task_id,
        'queries': task.queries,
        'max_pages': task.max_pages,
        'headless': task.headless,
        'status': 'pending',
        'message': 'Ожидает агента',
        'progress': 0,
        'created_at': datetime.now().isoformat(),
        'results': []
    }
    
    # Сохраняем в историю поисков
    for query in task.queries:
        searches = db.data.get('direct_searches', [])
        existing = next((s for s in searches if s.get('query') == query), None)
        if existing:
            existing['lastSearched'] = datetime.now().isoformat()
            existing['searchCount'] = existing.get('searchCount', 0) + 1
        else:
            searches.append({
                'id': task_id + '_' + query[:10],
                'query': query,
                'lastSearched': datetime.now().isoformat(),
                'searchCount': 1,
                'resultsCount': 0
            })
        db.data['direct_searches'] = searches
        db.save()
    
    return {"task_id": task_id, "status": "created"}

@app.get("/api/direct-parser/tasks")
def get_direct_parser_tasks():
    """Получить все задачи"""
    return {"tasks": list(direct_parser_tasks.values())}

@app.get("/api/direct-parser/tasks/{task_id}")
def get_direct_parser_task(task_id: str):
    """Получить задачу по ID"""
    if task_id not in direct_parser_tasks:
        raise HTTPException(status_code=404, detail="Задача не найдена")
    return direct_parser_tasks[task_id]

@app.delete("/api/direct-parser/tasks/{task_id}")
def delete_direct_parser_task(task_id: str):
    """Удалить задачу"""
    if task_id not in direct_parser_tasks:
        raise HTTPException(status_code=404, detail="Задача не найдена")
    del direct_parser_tasks[task_id]
    return {"success": True}

@app.get("/api/direct-parser/agent/task")
def get_pending_task_for_agent():
    """Получить следующую задачу для выполнения агентом"""
    for task_id, task in direct_parser_tasks.items():
        if task['status'] == 'pending':
            task['status'] = 'assigned'
            task['message'] = 'Назначена агенту'
            return task
    return {}

@app.post("/api/direct-parser/agent/task/{task_id}/status")
def update_task_status(task_id: str, update: TaskStatusUpdate):
    """Обновить статус задачи от агента"""
    if task_id not in direct_parser_tasks:
        raise HTTPException(status_code=404, detail="Задача не найдена")
    
    direct_parser_tasks[task_id]['status'] = update.status
    direct_parser_tasks[task_id]['message'] = update.message
    direct_parser_tasks[task_id]['progress'] = update.progress
    direct_parser_tasks[task_id]['updated_at'] = datetime.now().isoformat()
    
    return {"success": True}

@app.post("/api/direct-parser/agent/task/{task_id}/results")
def submit_task_results(task_id: str, data: TaskResults):
    """Отправить результаты парсинга от агента"""
    if task_id not in direct_parser_tasks:
        raise HTTPException(status_code=404, detail="Задача не найдена")
    
    task = direct_parser_tasks[task_id]
    task['results'] = data.results
    task['status'] = 'completed'
    task['completed_at'] = data.completed_at
    
    # Сохраняем результаты в БД
    ads = db.data.get('direct_ads', [])
    for result in data.results:
        # Проверяем дубликаты по URL
        existing = next((a for a in ads if a.get('url') == result.get('url')), None)
        if not existing:
            result['id'] = str(len(ads) + 1)
            result['createdAt'] = datetime.now().isoformat()
            result['taskId'] = task_id
            ads.append(result)
    
    db.data['direct_ads'] = ads
    
    # Обновляем счётчики в истории поисков
    for query in task.get('queries', []):
        searches = db.data.get('direct_searches', [])
        for s in searches:
            if s.get('query') == query:
                s['resultsCount'] = len([r for r in data.results if r.get('query') == query])
        db.data['direct_searches'] = searches
    
    db.save()
    
    return {"success": True, "saved": len(data.results)}


# API ключи для парсера
@app.post("/api/direct-parser/api-key/generate")
def generate_api_key():
    """Генерация нового API ключа для парсера"""
    import secrets
    
    api_key = secrets.token_urlsafe(32)
    
    # Сохраняем ключ в настройки
    settings = db.get_settings()
    settings['directParserApiKey'] = api_key
    settings['directParserApiKeyCreated'] = datetime.now().isoformat()
    db.update_settings(settings)
    
    return {"api_key": api_key}


@app.get("/api/direct-parser/api-key")
def get_api_key():
    """Получить текущий API ключ"""
    settings = db.get_settings()
    api_key = settings.get('directParserApiKey')
    created = settings.get('directParserApiKeyCreated')
    
    return {
        "api_key": api_key,
        "created": created,
        "is_set": bool(api_key)
    }


@app.delete("/api/direct-parser/api-key")
def revoke_api_key():
    """Отозвать API ключ"""
    settings = db.get_settings()
    settings['directParserApiKey'] = None
    settings['directParserApiKeyCreated'] = None
    db.update_settings(settings)
    
    return {"success": True}


# ============== Direct Parser File Downloads ==============

import zipfile
import io

# Путь к direct-parser относительно backend
DIRECT_PARSER_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'direct-parser')

@app.get("/api/direct-parser/download/archive")
def download_archive():
    """Скачать архив с файлами парсера"""
    files_to_include = ['direct_agent.py', 'ad_parser.py', 'requirements.txt']
    
    # Проверяем наличие директории
    if not os.path.exists(DIRECT_PARSER_PATH):
        raise HTTPException(
            status_code=404, 
            detail=f"Директория direct-parser не найдена: {DIRECT_PARSER_PATH}"
        )
    
    # Проверяем наличие хотя бы одного файла
    found_files = []
    for filename in files_to_include:
        file_path = os.path.join(DIRECT_PARSER_PATH, filename)
        if os.path.exists(file_path):
            found_files.append((filename, file_path))
        else:
            print(f"File not found: {file_path}")
    
    if not found_files:
        raise HTTPException(
            status_code=404, 
            detail=f"Файлы парсера не найдены в {DIRECT_PARSER_PATH}"
        )
    
    # Создаём ZIP в памяти
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        for filename, file_path in found_files:
            zip_file.write(file_path, filename)
    
    zip_buffer.seek(0)
    
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": "attachment; filename=direct-parser.zip"}
    )

@app.get("/api/direct-parser/download/agent")
def download_agent():
    """Скачать файл direct_agent.py"""
    file_path = os.path.join(DIRECT_PARSER_PATH, 'direct_agent.py')
    print(f"Looking for file: {file_path}, exists: {os.path.exists(file_path)}")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"Файл не найден: {file_path}")
    return FileResponse(
        path=file_path,
        filename="direct_agent.py",
        media_type="text/x-python"
    )

@app.get("/api/direct-parser/download/parser")
def download_parser():
    """Скачать файл ad_parser.py"""
    file_path = os.path.join(DIRECT_PARSER_PATH, 'ad_parser.py')
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"Файл не найден: {file_path}")
    return FileResponse(
        path=file_path,
        filename="ad_parser.py",
        media_type="text/x-python"
    )

@app.get("/api/direct-parser/download/requirements")
def download_requirements():
    """Скачать файл requirements.txt для Direct Parser"""
    file_path = os.path.join(DIRECT_PARSER_PATH, 'requirements.txt')
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"Файл не найден: {file_path}")
    return FileResponse(
        path=file_path,
        filename="requirements.txt",
        media_type="text/plain"
    )


# ============== Direct Parser API Keys Management ==============

@app.get("/api/direct-parser/api-keys")
def get_direct_parser_api_keys():
    """Получить список всех API ключей"""
    settings = db.get_settings()
    api_keys = settings.get('directParserApiKeys', [])
    return api_keys

@app.post("/api/direct-parser/api-keys")
def create_direct_parser_api_key(data: dict):
    """Создать новый API ключ"""
    settings = db.get_settings()
    api_keys = settings.get('directParserApiKeys', [])
    
    # Генерируем новый ключ
    import uuid
    new_key = {
        "id": str(uuid.uuid4()),
        "name": data.get("name", "Unnamed Key"),
        "key": secrets.token_urlsafe(32),
        "createdAt": datetime.now().isoformat(),
        "lastUsed": None,
        "requestCount": 0
    }
    
    api_keys.append(new_key)
    settings['directParserApiKeys'] = api_keys
    db.update_settings(settings)
    
    return new_key

@app.delete("/api/direct-parser/api-keys/{key_id}")
def delete_direct_parser_api_key(key_id: str):
    """Удалить API ключ"""
    settings = db.get_settings()
    api_keys = settings.get('directParserApiKeys', [])
    
    # Фильтруем ключи
    api_keys = [k for k in api_keys if k['id'] != key_id]
    settings['directParserApiKeys'] = api_keys
    db.update_settings(settings)
    
    return {"success": True}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
