from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends, status, Body, UploadFile, File, Form
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, FileResponse, StreamingResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
from contextlib import asynccontextmanager
import sys
import os
import re
import secrets
import asyncio
import logging
import uuid
import shutil
from pathlib import Path
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

# Используем адаптер, который поддерживает и JSON и PostgreSQL
from db_adapter import db
logger.info(f"Database adapter loaded: {type(db).__name__} from {type(db).__module__}")

from parser.tour_parser import TourParser
from parser.tour_dates_parser import TourDatesParser
from yandex_metrica import YandexMetricaClient
from feed_generator import generate_yml_feed
from competitor_data import competitor_manager
import xml.etree.ElementTree as ET
from xml.dom import minidom
from telegram_notifier import telegram

# Утилита для преобразования snake_case → camelCase
def snake_to_camel(data):
    """Рекурсивно преобразует ключи из snake_case в camelCase"""
    if isinstance(data, dict):
        new_dict = {}
        for key, value in data.items():
            # Преобразуем ключ
            parts = key.split('_')
            camel_key = parts[0] + ''.join(word.capitalize() for word in parts[1:])
            
            # Специальная обработка для author_id: если None, заменяем на 'system'
            if camel_key == 'authorId' and value is None:
                new_dict[camel_key] = 'system'
            else:
                new_dict[camel_key] = snake_to_camel(value)
        
        # Обратная совместимость: isCompleted -> completed
        if 'isCompleted' in new_dict:
            new_dict['completed'] = new_dict['isCompleted']
        
        # Если есть metadata (задача из PostgreSQL), извлекаем поля в корень
        if 'metadata' in new_dict and isinstance(new_dict['metadata'], dict):
            metadata = new_dict['metadata']
            # Извлекаем важные поля из metadata в корень объекта
            if 'listId' in metadata:
                new_dict['listId'] = metadata['listId']
            if 'tags' in metadata:
                new_dict['tags'] = metadata['tags']
            if 'order' in metadata:
                new_dict['order'] = metadata['order']
            if 'archived' in metadata and 'archived' not in new_dict:
                new_dict['archived'] = metadata['archived']
            if 'completed' in metadata and 'completed' not in new_dict and 'isCompleted' not in new_dict:
                new_dict['completed'] = metadata['completed']
            if 'comments' in metadata:
                new_dict['comments'] = metadata['comments']
        
        return new_dict
    elif isinstance(data, list):
        return [snake_to_camel(item) for item in data]
    else:
        return data

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
    allow_origins=[
        "*",
        "https://vokrug-sveta.shar-os.ru",
        "http://vokrug-sveta.shar-os.ru",
    ],
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

# Создаем папку для загрузок
UPLOAD_DIR = Path(__file__).parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# Upload файлов
@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    """Загрузка файла на сервер"""
    try:
        # Генерируем уникальное имя файла
        file_ext = Path(file.filename).suffix
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        file_path = UPLOAD_DIR / unique_filename
        
        # Сохраняем файл
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Возвращаем URL файла
        file_url = f"/api/uploads/{unique_filename}"
        
        return {
            "success": True,
            "url": file_url,
            "filename": file.filename,
            "size": file_path.stat().st_size
        }
    except Exception as e:
        print(f"Error uploading file: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Отдача загруженных файлов
@app.get("/api/uploads/{filename}")
async def get_uploaded_file(filename: str):
    """Получить загруженный файл"""
    file_path = UPLOAD_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path)

# Папка для аватаров
AVATARS_DIR = UPLOAD_DIR / "avatars"
AVATARS_DIR.mkdir(exist_ok=True)

# Загрузка аватара пользователя
@app.post("/api/avatars")
async def upload_avatar(file: UploadFile = File(...), userId: str = Form(...)):
    """Загрузка аватара пользователя"""
    try:
        # Проверяем тип файла
        allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        if file.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail="Неподдерживаемый формат файла")
        
        # Генерируем уникальное имя файла
        file_ext = Path(file.filename).suffix if file.filename else '.jpg'
        unique_filename = f"{userId}_{uuid.uuid4()}{file_ext}"
        file_path = AVATARS_DIR / unique_filename
        
        # Удаляем старый аватар пользователя если есть
        for old_file in AVATARS_DIR.glob(f"{userId}_*"):
            old_file.unlink()
        
        # Сохраняем файл
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # URL аватара
        avatar_url = f"/api/avatars/{unique_filename}"
        
        # Обновляем пользователя в БД
        db.update_user(userId, {"avatar": avatar_url})
        
        return {
            "success": True,
            "avatarUrl": avatar_url
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error uploading avatar: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Удаление аватара пользователя
@app.delete("/api/avatars")
async def delete_avatar(userId: str):
    """Удаление аватара пользователя"""
    try:
        # Удаляем файлы аватара пользователя
        deleted = False
        for old_file in AVATARS_DIR.glob(f"{userId}_*"):
            old_file.unlink()
            deleted = True
        
        # Обновляем пользователя в БД - убираем аватар
        db.update_user(userId, {"avatar": None})
        
        return {"success": True, "deleted": deleted}
    except Exception as e:
        print(f"Error deleting avatar: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Отдача файла аватара
@app.get("/api/avatars/{filename}")
async def get_avatar(filename: str):
    """Получить файл аватара"""
    file_path = AVATARS_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Avatar not found")
    return FileResponse(file_path)

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

@app.get("/api/database/size")
def get_database_size():
    """Получить размер базы данных PostgreSQL или JSON"""
    if hasattr(db, 'pg') and db.pg:
        try:
            result = db.pg.fetch_one("""
                SELECT pg_size_pretty(pg_database_size(current_database())) as size,
                       pg_database_size(current_database()) as size_bytes
            """)
            if result:
                return {
                    "size": result.get('size'),
                    "sizeBytes": result.get('size_bytes')
                }
        except Exception as e:
            print(f"Error getting PostgreSQL database size: {e}")
            return {"size": "N/A", "sizeBytes": 0, "error": str(e)}
    
    # Для JSON базы данных возвращаем размер файла
    try:
        import os
        if hasattr(db, 'db_path') and os.path.exists(db.db_path):
            size_bytes = os.path.getsize(db.db_path)
            size_mb = size_bytes / (1024 * 1024)
            if size_mb < 1:
                size_kb = size_bytes / 1024
                return {"size": f"{size_kb:.2f} KB", "sizeBytes": size_bytes}
            else:
                return {"size": f"{size_mb:.2f} MB", "sizeBytes": size_bytes}
    except Exception as e:
        print(f"Error getting JSON database size: {e}")
    
    return {"size": "N/A", "sizeBytes": 0}

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
    print(f"Получен запрос на создание источника: {source.model_dump()}")
    source_data = source.model_dump()
    source_data["id"] = f"src_{datetime.now().timestamp()}"
    source_data["createdAt"] = datetime.now().isoformat()
    source_data["updatedAt"] = datetime.now().isoformat()
    result = db.add_data_source(source_data)
    print(f"Источник создан: {result}")
    return result

@app.put("/api/data-sources/{source_id}")
def update_data_source(source_id: str, updates: DataSourceUpdate):
    result = db.update_data_source(source_id, updates.model_dump(exclude_unset=True))
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
    
    feed_data = feed.model_dump()
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
        # Получаем пользователя для его реальной роли И реального username
        user = db.get_user(credentials.username)
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user_role = user.get("role", "user")
        # Возвращаем РЕАЛЬНЫЙ username из базы, не введённый
        real_username = user.get("username", credentials.username)
        print(f"User role: {user_role}, Real username: {real_username}")
        return {
            "status": "success",
            "user": {
                "id": user.get("id"),
                "username": real_username,
                "name": user.get("name", ""),
                "role": user_role
            }
        }
    raise HTTPException(status_code=401, detail="Invalid credentials")

@app.get("/api/auth/me")
def get_current_user(username: str):
    """Получить информацию о текущем пользователе"""
    user = db.get_user(username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "id": user.get("id"),
        "username": user.get("username"),
        "name": user.get("name", ""),
        "role": user.get("role", "user"),
        "telegramId": user.get("telegramId"),
        "todoPersonId": user.get("todoPersonId"),
        "canSeeAllTasks": user.get("canSeeAllTasks", False)
    }

# Fallback-хранилище кодов Telegram (если БД недоступна/миграция не применена)
telegram_auth_codes_cache: Dict[str, Dict[str, Any]] = {}

# Telegram авторизация
@app.post("/api/auth/telegram/generate-code")
def generate_telegram_auth_code():
    """Генерация одноразового кода для авторизации через Telegram"""
    import random

    # ВАЖНО: бот ожидает 6-значный код (историческая совместимость)
    code = None
    for _ in range(20):
        candidate = str(random.randint(100000, 999999))
        exists = False
        try:
            exists = bool(db.get_telegram_auth_code(candidate))
        except Exception:
            exists = candidate in telegram_auth_codes_cache
        if not exists:
            code = candidate
            break

    if not code:
        # Крайний fallback (практически недостижимо)
        code = str(random.randint(100000, 999999))
    payload = {
        "authenticated": False,
        "user": None,
        "created_at": datetime.now().isoformat()
    }

    try:
        db.add_telegram_auth_code(code, payload)
        # Очистка старых кодов (старше 24 часов)
        db.cleanup_old_telegram_codes(hours=24)
    except Exception as e:
        logger.error(f"Telegram auth DB storage failed, using in-memory fallback: {e}")
        telegram_auth_codes_cache[code] = payload
    
    return {"code": code}

@app.get("/api/auth/telegram/check")
def check_telegram_auth(code: str):
    """Проверка статуса авторизации по коду"""
    auth_data = None
    source = "db"

    try:
        auth_data = db.get_telegram_auth_code(code)
    except Exception as e:
        logger.error(f"Telegram auth DB read failed, checking fallback cache: {e}")
        source = "cache"

    if not auth_data:
        auth_data = telegram_auth_codes_cache.get(code)
        if auth_data:
            source = "cache"
    
    if not auth_data:
        raise HTTPException(status_code=404, detail="Code not found")
    
    if auth_data.get("authenticated"):
        # Код использован, удаляем
        user_data = auth_data.get("user")
        if source == "db":
            try:
                db.delete_telegram_auth_code(code)
            except Exception as e:
                logger.error(f"Telegram auth DB delete failed: {e}")
                telegram_auth_codes_cache.pop(code, None)
        else:
            telegram_auth_codes_cache.pop(code, None)
        return {"authenticated": True, "user": user_data}
    
    return {"authenticated": False}

@app.post("/api/auth/telegram/verify")
@app.post("/api/auth/telegram/confirm")
def verify_telegram_auth(
    code: Optional[str] = None,
    telegram_id: Optional[str] = None,
    telegramId: Optional[str] = None,
    payload: Optional[Dict[str, Any]] = Body(None)
):
    """Верификация пользователя по Telegram ID (вызывается ботом)"""
    resolved_code = code or (payload or {}).get("code")
    resolved_telegram_id = telegram_id or telegramId or (payload or {}).get("telegram_id") or (payload or {}).get("telegramId")

    if not resolved_code or not resolved_telegram_id:
        raise HTTPException(status_code=400, detail="code and telegram_id are required")

    auth_data = None
    code_in_cache = False

    try:
        auth_data = db.get_telegram_auth_code(resolved_code)
    except Exception as e:
        logger.error(f"Telegram auth DB read failed in verify: {e}")

    if not auth_data:
        auth_data = telegram_auth_codes_cache.get(resolved_code)
        code_in_cache = bool(auth_data)
    
    if not auth_data:
        raise HTTPException(status_code=404, detail="Code not found")
    
    # Находим пользователя по telegram_id
    users = db.get_users()
    user = next(
        (
            u for u in users
            if str(u.get("telegramId") or u.get("telegram_id") or "") == str(resolved_telegram_id)
        ),
        None
    )
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Обновляем код с данными пользователя
    auth_payload = {
        "authenticated": True,
        "user": {
            "id": user.get("id"),
            "username": user.get("username"),
            "name": user.get("name", ""),
            "role": user.get("role", "user"),
            "telegramId": resolved_telegram_id
        }
    }

    if code_in_cache:
        telegram_auth_codes_cache[resolved_code] = {
            **telegram_auth_codes_cache.get(resolved_code, {}),
            **auth_payload
        }
    else:
        try:
            db.update_telegram_auth_code(resolved_code, auth_payload)
        except Exception as e:
            logger.error(f"Telegram auth DB update failed, writing to fallback cache: {e}")
            telegram_auth_codes_cache[resolved_code] = {
                "created_at": datetime.now().isoformat(),
                **auth_payload
            }
    
    return {"status": "success"}

def _send_telegram_message(chat_id: int, text: str, bot_token: str) -> bool:
    """Отправка сообщения в Telegram"""
    try:
        import json
        import urllib.request

        payload = {
            "chat_id": chat_id,
            "text": text,
            "parse_mode": "HTML"
        }
        req = urllib.request.Request(
            f"https://api.telegram.org/bot{bot_token}/sendMessage",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            return 200 <= response.status < 300
    except Exception as e:
        logger.error(f"Telegram sendMessage failed: {e}")
        return False


@app.post("/api/telegram/webhook")
def telegram_webhook(update: Dict[str, Any] = Body(...)):
    """Webhook Telegram бота (backend-версия)"""
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN") or os.getenv("BOT_TOKEN")
    if not bot_token:
        logger.error("TELEGRAM_BOT_TOKEN is not configured")
        return {"ok": True}

    message = update.get("message") or {}
    text = (message.get("text") or "").strip()
    from_user = message.get("from") or {}
    chat = message.get("chat") or {}

    telegram_id = from_user.get("id")
    chat_id = chat.get("id")

    if not text or not telegram_id or not chat_id:
        return {"ok": True}

    code = None

    # /start <code>
    if text.startswith("/start"):
        parts = text.split(" ", 1)
        if len(parts) > 1 and parts[1].isdigit() and len(parts[1]) == 6:
            code = parts[1]
        else:
            _send_telegram_message(
                chat_id,
                "👋 <b>Привет!</b>\n\n"
                "Для входа нажмите «Войти через Telegram» на странице логина, "
                "после этого откройте бота по кнопке из интерфейса.",
                bot_token
            )
            return {"ok": True}
    elif text.isdigit() and len(text) == 6:
        code = text
    else:
        return {"ok": True}

    # Сначала проверяем, что Telegram ID привязан к пользователю
    users = db.get_users()
    user = next(
        (
            u for u in users
            if str(u.get("telegramId") or u.get("telegram_id") or "") == str(telegram_id)
        ),
        None
    )

    if not user:
        _send_telegram_message(
            chat_id,
            "❌ <b>Пользователь не найден</b>\n\n"
            "Ваш Telegram ID не привязан к аккаунту в системе.\n"
            "Обратитесь к администратору для привязки аккаунта.\n\n"
            f"Ваш Telegram ID: <code>{telegram_id}</code>",
            bot_token
        )
        return {"ok": True}

    try:
        verify_telegram_auth(code=code, telegram_id=str(telegram_id), telegramId=None, payload=None)
        _send_telegram_message(
            chat_id,
            "✅ <b>Авторизация успешна!</b>\n\n"
            f"Добро пожаловать, {user.get('username', '')}!\n"
            "Теперь вы можете закрыть это окно и вернуться в браузер.",
            bot_token
        )
    except HTTPException as e:
        if e.status_code == 404 and e.detail == "Code not found":
            _send_telegram_message(
                chat_id,
                "❌ <b>Код не найден</b>\n\n"
                "Этот код не существует или истёк.\n"
                "Запросите новый код на странице входа.",
                bot_token
            )
        elif e.status_code == 404 and e.detail == "User not found":
            _send_telegram_message(
                chat_id,
                "❌ <b>Пользователь не найден</b>\n\n"
                "Ваш Telegram ID не привязан к аккаунту в системе.\n"
                "Обратитесь к администратору для привязки аккаунта.\n\n"
                f"Ваш Telegram ID: <code>{telegram_id}</code>",
                bot_token
            )
        else:
            logger.error(f"Telegram webhook verify failed: {e.detail}")
            _send_telegram_message(
                chat_id,
                "⚠️ <b>Ошибка авторизации</b>\n\n"
                "Попробуйте ещё раз через страницу входа.",
                bot_token
            )
    except Exception as e:
        logger.error(f"Telegram webhook unexpected error: {e}")
        _send_telegram_message(
            chat_id,
            "⚠️ <b>Временная ошибка</b>\n\n"
            "Попробуйте ещё раз через минуту.",
            bot_token
        )

    return {"ok": True}

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
    
    update_data = template.model_dump(exclude_unset=True)
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
    username: Optional[str] = None  # Логин пользователя
    name: str
    email: str
    password: str
    role: str = "user"
    todoRole: str = "executor"  # executor, customer, universal
    position: Optional[str] = None  # Должность
    department: Optional[str] = None  # Отдел
    phone: Optional[str] = None  # Телефон
    workSchedule: Optional[str] = None  # График работы
    telegramId: Optional[str] = None  # Telegram ID
    telegramUsername: Optional[str] = None  # Telegram username
    isDepartmentHead: Optional[bool] = None  # Руководитель отдела
    canSeeAllTasks: Optional[bool] = None  # Может видеть все задачи
    enabledTools: List[str] = []

class UserUpdate(BaseModel):
    username: Optional[str] = None  # Логин пользователя
    name: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    todoRole: Optional[str] = None
    position: Optional[str] = None  # Должность
    department: Optional[str] = None  # Отдел
    phone: Optional[str] = None  # Телефон
    workSchedule: Optional[str] = None  # График работы
    telegramId: Optional[str] = None  # Telegram ID
    telegramUsername: Optional[str] = None  # Telegram username
    enabledTools: Optional[List[str]] = None
    avatar: Optional[str] = None  # URL аватара пользователя
    canSeeAllTasks: Optional[bool] = None  # Может видеть все задачи
    isActive: Optional[bool] = None  # Активен ли пользователь
    isDepartmentHead: Optional[bool] = None  # Руководитель отдела
    pinnedTools: Optional[List[str]] = None  # Закрепленные инструменты
    visibleTabs: Optional[Dict[str, bool]] = None  # Видимые вкладки навигации
    toolsOrder: Optional[List[str]] = None  # Порядок инструментов

@app.post("/api/users/batch")
def create_users_batch(users: List[Dict[str, Any]] = Body(...)):
    """Массовое создание пользователей"""
    created_users = []
    
    for user_data in users:
        # Проверяем, не существует ли уже пользователь
        existing = db.get_user_by_id(user_data.get('id'))
        if existing:
            continue
            
        created_user = db.add_user(user_data)
        created_users.append(created_user)
    
    return {"created": len(created_users), "users": created_users}

@app.get("/api/users")
def get_users():
    """Получить список всех пользователей с динамическим isOnline"""
    users = db.get_users()
    now = datetime.now()
    
    # Вычисляем isOnline динамически на основе last_seen
    for user in users:
        is_online = False
        last_seen = user.get("last_seen") or user.get("lastSeen")
        
        if last_seen:
            try:
                if isinstance(last_seen, str):
                    last_seen_date = datetime.fromisoformat(last_seen.replace('Z', '+00:00'))
                else:
                    last_seen_date = last_seen
                diff = (now - last_seen_date).total_seconds()
                is_online = diff < 120  # Онлайн если активность была менее 2 минут назад
            except:
                pass
        
        user["is_online"] = is_online
    
    return [snake_to_camel(user) for user in users]

@app.get("/api/users/statuses")
def get_user_statuses():
    """Получить статусы всех пользователей"""
    users = db.get_users()
    statuses = []
    now = datetime.now()
    
    for user in users:
        is_online = False
        last_seen = user.get("last_seen") or user.get("lastSeen")
        
        # Проверяем онлайн ли пользователь (если last_seen был в последние 60 секунд)
        if last_seen:
            try:
                if isinstance(last_seen, str):
                    last_seen_date = datetime.fromisoformat(last_seen.replace('Z', '+00:00'))
                else:
                    last_seen_date = last_seen
                diff = (now - last_seen_date).total_seconds()
                is_online = diff < 60  # Онлайн если активность была менее минуты назад
            except:
                pass
        
        statuses.append({
            "id": user["id"],
            "isOnline": is_online,
            "lastSeen": last_seen.isoformat() if isinstance(last_seen, datetime) else last_seen
        })
    
    return statuses

@app.get("/api/departments")
def get_departments():
    """Получить список отделов из базы пользователей"""
    try:
        departments = db.get_departments()
        return {"departments": [snake_to_camel(dept) for dept in departments]}
    except Exception as e:
        logger.error(f"Error fetching departments: {e}")
        return {"departments": []}

@app.get("/api/users/{user_id}")
def get_user(user_id: str):
    """Получить пользователя по ID с динамическим isOnline"""
    user = db.get_user_by_id(user_id)
    
    # Если не нашли по ID, попробуем найти по telegramId
    if not user:
        all_users = db.get_users()
        user = next((u for u in all_users if u.get("telegramId") == user_id), None)
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Вычисляем isOnline динамически
    is_online = False
    last_seen = user.get("last_seen") or user.get("lastSeen")
    
    if last_seen:
        try:
            now = datetime.now()
            if isinstance(last_seen, str):
                last_seen_date = datetime.fromisoformat(last_seen.replace('Z', '+00:00'))
            else:
                last_seen_date = last_seen
            diff = (now - last_seen_date).total_seconds()
            is_online = diff < 120  # Онлайн если активность была менее 2 минут назад
        except:
            pass
    
    user["is_online"] = is_online
    return snake_to_camel(user)

@app.post("/api/users")
def create_user(user: UserCreate):
    """Создать нового пользователя"""
    user_data = user.model_dump()
    # Используем telegramId если есть, иначе генерируем
    if 'telegramId' in user_data and user_data['telegramId']:
        user_data["id"] = str(user_data['telegramId'])
    else:
        user_data["id"] = f"user_{int(datetime.now().timestamp() * 1000)}"
    user_data["createdAt"] = datetime.now().isoformat()
    result = db.add_user(user_data)
    if not result:
        raise HTTPException(status_code=500, detail="Failed to create user")
    return snake_to_camel(result)

@app.put("/api/users/{user_id}")
def update_user(user_id: str, user: UserUpdate):
    """Обновить пользователя"""
    user_data = user.model_dump(exclude_unset=True)
    result = db.update_user(user_id, user_data)
    if not result:
        raise HTTPException(status_code=404, detail="User not found")
    return snake_to_camel(result)

@app.delete("/api/users/{user_id}")
def delete_user(user_id: str):
    """Удалить пользователя"""
    result = db.delete_user(user_id)
    if not result:
        raise HTTPException(status_code=404, detail="User not found")
    return {"status": "deleted"}

@app.post("/api/users/{user_id}/status")
def update_user_status(user_id: str, status_data: Dict[str, Any]):
    """Обновить статус пользователя (онлайн/оффлайн и lastSeen)"""
    existing_user = db.get_user_by_id(user_id)

    if not existing_user:
        all_users = db.get_users()
        existing_user = next((u for u in all_users if u.get("telegramId") == user_id), None)

    if not existing_user:
        raise HTTPException(status_code=404, detail="User not found")

    def parse_dt(value: Any) -> Optional[datetime]:
        if not value:
            return None
        if isinstance(value, datetime):
            return value
        if isinstance(value, str):
            try:
                return datetime.fromisoformat(value.replace('Z', '+00:00'))
            except Exception:
                return None
        return None

    now_dt = datetime.now()
    update_data = {}

    if "isOnline" in status_data:
        update_data["isOnline"] = status_data["isOnline"]
    elif "is_online" in status_data:
        update_data["isOnline"] = status_data["is_online"]

    incoming_last_seen = None
    if "lastSeen" in status_data:
        incoming_last_seen = status_data["lastSeen"]
    elif "last_seen" in status_data:
        incoming_last_seen = status_data["last_seen"]

    existing_last_seen = existing_user.get("lastSeen") or existing_user.get("last_seen")
    existing_dt = parse_dt(existing_last_seen)
    incoming_dt = parse_dt(incoming_last_seen)

    # Защитная логика: lastSeen никогда не уходит назад во времени,
    # а при активности online фиксируется не раньше времени текущего запроса.
    candidate_dt = incoming_dt or existing_dt
    if update_data.get("isOnline") is True:
        if not candidate_dt or candidate_dt < now_dt:
            candidate_dt = now_dt

    if existing_dt and candidate_dt and candidate_dt < existing_dt:
        candidate_dt = existing_dt

    if candidate_dt:
        update_data["lastSeen"] = candidate_dt.isoformat()
    
    target_user_id = existing_user.get("id") or user_id
    result = db.update_user(target_user_id, update_data)
    if not result:
        raise HTTPException(status_code=404, detail="User not found")
    return result

@app.put("/api/users/{user_id}/tools")
def update_user_tools(user_id: str, tools: Dict[str, List[str]]):
    """Обновить доступные инструменты пользователя"""
    result = db.update_user(user_id, {"enabledTools": tools.get("enabledTools", [])})
    if not result:
        raise HTTPException(status_code=404, detail="User not found")
    return result

@app.put("/api/users/{user_id}/navigation")
def update_user_navigation(user_id: str, navigation: Dict[str, Any]):
    """Обновить настройки навигации пользователя (видимые вкладки и порядок инструментов)"""
    update_data = {}
    if "visibleTabs" in navigation:
        update_data["visibleTabs"] = navigation["visibleTabs"]
    if "toolsOrder" in navigation:
        update_data["toolsOrder"] = navigation["toolsOrder"]
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No navigation data provided")
    
    result = db.update_user(user_id, update_data)
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
    collection_data = collection.model_dump()
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
    result = db.update_collection(collection_id, collection.model_dump(exclude_unset=True))
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
        selected_goal_ids = settings.get("selectedGoalIds", [])  # Выбранные цели для подсчёта
        
        if not counter_id or not token:
            raise HTTPException(
                status_code=400,
                detail="Настройте Яндекс.Метрику (ID счетчика и токен)"
            )
        
        client = YandexMetricaClient(counter_id=counter_id, token=token)
        data = client.get_utm_statistics(
            date_from=date_from,
            date_to=date_to,
            utm_term=utm_term,
            selected_goal_ids=selected_goal_ids
        )
        
        parsed = client.parse_utm_data(data, selected_goal_ids=selected_goal_ids)
        
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
        selected_goal_ids = settings.get("selectedGoalIds", [])  # Выбранные цели для подсчёта
        
        if not counter_id or not token:
            raise HTTPException(
                status_code=400,
                detail="Настройте Яндекс.Метрику (ID счетчика и токен)"
            )
        
        client = YandexMetricaClient(counter_id=counter_id, token=token)
        data = client.get_campaigns_by_source(
            date_from=date_from,
            date_to=date_to,
            selected_goal_ids=selected_goal_ids
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


# ============== Calculator History API ==============

@app.get("/api/calculator/history/{user_id}")
def get_calculator_history(user_id: str):
    """Получить историю калькулятора для пользователя"""
    query = "SELECT history FROM calculator_history WHERE user_id = %s"
    result = db.conn.fetch_one(query, (user_id,))
    
    if result:
        return {"history": result["history"]}
    return {"history": []}

@app.put("/api/calculator/history/{user_id}")
def save_calculator_history(user_id: str, data: Dict[str, Any]):
    """Сохранить историю калькулятора для пользователя"""
    history = data.get("history", [])
    
    query = """
        INSERT INTO calculator_history (user_id, history, updated_at)
        VALUES (%s, %s, NOW())
        ON CONFLICT (user_id) 
        DO UPDATE SET history = %s, updated_at = NOW()
    """
    
    from psycopg2.extras import Json
    db.conn.execute(query, (user_id, Json(history), Json(history)))
    
    return {"success": True, "history": history}


# ============== Todos & Links API ==============

@app.get("/api/todos")
def get_todos(userId: Optional[str] = None):
    """Получить список задач"""
    todos = db.get_tasks(user_id=userId) if userId else db.get_tasks()
    lists = db.get_todo_lists(user_id=userId) if userId else db.get_todo_lists()
    categories = db.get_todo_categories()

    stage_keys = {
        'stagesEnabled',
        'technicalSpecTabs',
        'stageMeta',
        'stageDefaultAssigneeId',
        'stageDefaultAssigneeName',
        'recurrence',
        'versionHistory',
        'delegatedById',
        'delegatedBy',
        'chatId'  # Добавляем chatId для индикатора обсуждения
    }

    def hydrate_task(task: dict):
        data = snake_to_camel(task)
        metadata = data.get('metadata') or {}
        if isinstance(metadata, dict):
            for key in stage_keys:
                if key in metadata:
                    # ALWAYS use metadata value as source of truth (не проверяем key not in data)
                    data[key] = metadata[key]
        
        # Log stageMeta extraction
        if task.get('id') and metadata.get('stageMeta'):
            print(f"[GET /api/todos] 📊 Task {task.get('id')[:20]}... has stageMeta in metadata: {metadata.get('stageMeta')}")
            print(f"[GET /api/todos] 📊 After extraction, data.stageMeta: {data.get('stageMeta')}")
        
        return data
    
    # Преобразуем snake_case в camelCase
    todos = [hydrate_task(todo) for todo in todos]
    lists = [snake_to_camel(list_item) for list_item in lists]
    categories = [snake_to_camel(cat) for cat in categories]
    
    return {
        "todos": todos,
        "lists": lists,
        "categories": categories
    }

@app.post("/api/todos")
def create_todo(todo_data: dict = Body(...)):
    """Создать новую задачу, список или категорию"""
    import uuid
    
    print(f"[POST /api/todos] === START ===")
    print(f"[POST /api/todos] Received data keys: {list(todo_data.keys())}")
    print(f"[POST /api/todos] Full data: {todo_data}")
    
    todo_type = todo_data.get('type', 'todo')
    print(f"[POST /api/todos] Type: {todo_type}")
    
    if todo_type == 'list':
        allowed_users = todo_data.get('allowedUsers', todo_data.get('allowed_users', [])) or []
        allowed_departments = todo_data.get('allowedDepartments', todo_data.get('allowed_departments', [])) or []
        new_list = {
            'id': str(uuid.uuid4()),
            'name': todo_data.get('name', 'Новый список'),
            'color': todo_data.get('color', '#3b82f6'),
            'icon': todo_data.get('icon', 'folder'),
            'department': todo_data.get('department'),
            'order': todo_data.get('order', 0),
            'creatorId': todo_data.get('creatorId') or todo_data.get('creator_id'),
            'defaultExecutorId': todo_data.get('defaultExecutorId') or todo_data.get('default_executor_id') or todo_data.get('defaultAssigneeId'),
            'defaultCustomerId': todo_data.get('defaultCustomerId') or todo_data.get('default_customer_id'),
            'defaultAddToCalendar': todo_data.get('defaultAddToCalendar', todo_data.get('default_add_to_calendar', False)),
            'stagesEnabled': todo_data.get('stagesEnabled', todo_data.get('stages_enabled', False)),
            'allowedUsers': allowed_users,
            'allowedDepartments': allowed_departments,
        }
        print(f"[POST /api/todos] Creating list: {new_list['name']} by creator: {new_list.get('creatorId')}")
        result = db.add_todo_list(new_list)
        print(f"[POST /api/todos] List created: {result.get('id') if result else 'FAILED'}")
        if not result:
            raise HTTPException(status_code=500, detail="Failed to create list")
        return snake_to_camel(result)
    
    elif todo_type == 'category':
        new_category = {
            'id': str(uuid.uuid4()),
            'name': todo_data.get('name', 'Новая категория'),
            'color': todo_data.get('color', '#6366f1'),
            'icon': todo_data.get('icon', 'tag'),
            'order': todo_data.get('order', 0)
        }
        print(f"[POST /api/todos] Creating category: {new_category['name']}")
        result = db.add_todo_category(new_category)
        print(f"[POST /api/todos] Category created: {result.get('id') if result else 'FAILED'}")
        if not result:
            raise HTTPException(status_code=500, detail="Failed to create category")
        return snake_to_camel(result)
    
    else:
        stage_keys = {
            'stagesEnabled',
            'technicalSpecTabs',
            'stageMeta',
            'stageDefaultAssigneeId',
            'stageDefaultAssigneeName',
            'recurrence',
            'versionHistory',
            'delegatedById',
            'delegatedBy',
            'chatId'  # Добавляем chatId для индикатора обсуждения
        }
        metadata = todo_data.get('metadata') or {}
        if isinstance(metadata, dict):
            for key in stage_keys:
                if key in todo_data:
                    metadata[key] = todo_data.get(key)

        # Преобразуем camelCase в snake_case для БД
        new_todo = {
            'id': str(uuid.uuid4()),
            'title': todo_data.get('title', ''),
            'description': todo_data.get('description', ''),
            'status': todo_data.get('status', 'todo'),
            'review_comment': todo_data.get('reviewComment') or todo_data.get('review_comment'),
            'priority': todo_data.get('priority', 'medium'),
            'author_id': todo_data.get('authorId') or todo_data.get('author_id'),
            'assigned_to': todo_data.get('assignedTo') or todo_data.get('assigned_to'),
            'assigned_to_ids': todo_data.get('assignedToIds', []) or todo_data.get('assigned_to_ids', []),
            'assigned_by_id': todo_data.get('assignedById') or todo_data.get('assigned_by_id'),
            'due_date': todo_data.get('dueDate') or todo_data.get('due_date'),
            'list_id': todo_data.get('listId') or todo_data.get('list_id'),
            'category_id': todo_data.get('categoryId') or todo_data.get('category_id'),
            'tags': todo_data.get('tags', []),
            'is_completed': todo_data.get('isCompleted', False) or todo_data.get('is_completed', False),
            'calendar_event_id': todo_data.get('calendarEventId') or todo_data.get('calendar_event_id'),
            'calendar_list_id': todo_data.get('calendarListId') or todo_data.get('calendar_list_id'),
            'add_to_calendar': todo_data.get('addToCalendar', False) or todo_data.get('add_to_calendar', False),
            'task_order': todo_data.get('order', 0) or todo_data.get('task_order', 0),
            'metadata': metadata
        }
        
        print(f"[POST /api/todos] Creating task: {new_todo['title']}")
        print(f"[POST /api/todos] Task data: list_id={new_todo['list_id']}, assigned_to={new_todo['assigned_to']}")
        
        result = db.add_task(new_todo)
        
        if result:
            print(f"[POST /api/todos] Task created successfully: {result.get('id')}")
            print(f"[POST /api/todos] === SUCCESS ===")
            data = snake_to_camel(result)
            if isinstance(data.get('metadata'), dict):
                for key in stage_keys:
                    if key in data['metadata']:
                        data[key] = data['metadata'][key]
            return data
        else:
            print(f"[POST /api/todos] ERROR: Failed to create task")
            print(f"[POST /api/todos] === FAILED ===")
            raise HTTPException(status_code=500, detail="Failed to create task")

@app.put("/api/todos")
def update_todo(todo_data: dict = Body(...)):
    """Обновить задачу, список или категорию"""
    todo_id = todo_data.get('id')
    todo_type = todo_data.get('type', 'todo')
    stage_keys = {
        'stagesEnabled',
        'technicalSpecTabs',
        'stageMeta',
            'stageDefaultAssigneeId',
            'stageDefaultAssigneeName',
            'recurrence',
            'versionHistory',
            'delegatedById',
            'delegatedBy',
            'chatId'  # Добавляем chatId для индикатора обсуждения
    }
    
    print(f"[PUT /api/todos] Received update request for {todo_type} ID: {todo_id}")
    print(f"[PUT /api/todos] Update data keys: {list(todo_data.keys())}")
    
    if not todo_id:
        raise HTTPException(status_code=400, detail="ID is required")
    
    updates = {k: v for k, v in todo_data.items() if k not in ['id', 'type']}
    print(f"[PUT /api/todos] Processing updates: {list(updates.keys())}")
    
    if todo_type == 'list':
        result = db.update_todo_list(todo_id, updates)

        # Fallback для прода с частично несовместимой схемой:
        # если обновление не прошло, пробуем только безопасные базовые поля.
        if not result:
            safe_keys = {'name', 'color', 'icon', 'department', 'order'}
            safe_updates = {k: v for k, v in updates.items() if k in safe_keys}
            if safe_updates:
                print(f"[PUT /api/todos] List update fallback with safe fields: {list(safe_updates.keys())}")
                result = db.update_todo_list(todo_id, safe_updates)
    elif todo_type == 'category':
        result = db.update_todo_category(todo_id, updates)
    else:
        if any(key in updates for key in stage_keys) or 'metadata' in updates:
            existing = db.get_task(todo_id)
            existing_metadata = existing.get('metadata') if existing else {}
            if not isinstance(existing_metadata, dict):
                existing_metadata = {}
            incoming_metadata = updates.get('metadata') or {}
            if not isinstance(incoming_metadata, dict):
                incoming_metadata = {}
            
            # Log existing metadata
            print(f"[PUT /api/todos] 📦 Existing metadata from DB: {existing_metadata}")
            print(f"[PUT /api/todos] 📦 Incoming metadata from client: {incoming_metadata}")
            
            # Log stageMeta before moving to metadata
            if 'stageMeta' in updates:
                print(f"[PUT /api/todos] 📊 stageMeta from client (root level): {updates.get('stageMeta')}")
            
            if 'technicalSpecTabs' in updates:
                print(f"[PUT /api/todos] 📋 technicalSpecTabs from client: {updates.get('technicalSpecTabs')}")
            
            for key in stage_keys:
                if key in updates:
                    value = updates.pop(key)
                    incoming_metadata[key] = value
                    print(f"[PUT /api/todos] 📌 Moved {key} to incoming_metadata: {value if key != 'stageMeta' else 'stageMeta object'}")
            
            merged_metadata = {**existing_metadata, **incoming_metadata}
            updates['metadata'] = merged_metadata
            
            print(f"[PUT /api/todos] 📦 Final merged metadata to save:")
            print(f"[PUT /api/todos]    stageMeta keys: {list(merged_metadata.get('stageMeta', {}).keys()) if merged_metadata.get('stageMeta') else 'None'}")
            print(f"[PUT /api/todos]    technicalSpecTabs: {merged_metadata.get('technicalSpecTabs')}")

        # Log assignedToIds specifically
        if 'assignedToIds' in updates or 'assigned_to_ids' in updates:
            print(f"[PUT /api/todos] 👥 Multiple executors update:")
            print(f"[PUT /api/todos]    assignedToIds: {updates.get('assignedToIds')}")
            print(f"[PUT /api/todos]    assigned_to_ids: {updates.get('assigned_to_ids')}")
        
        print(f"[PUT /api/todos] Calling db.update_task({todo_id}, {list(updates.keys())})")
        result = db.update_task(todo_id, updates)
        if result:
            print(f"[PUT /api/todos] Task updated successfully in DB: {result.get('id')}")
            print(f"[PUT /api/todos] 📦 metadata from DB: {result.get('metadata')}")
            if 'assigned_to_ids' in result:
                print(f"[PUT /api/todos] 👥 DB returned assigned_to_ids: {result.get('assigned_to_ids')}")

            # Синхронная архивация task-чата при архиве/завершении задачи
            # НЕ удаляем чат при архивировании/завершении задачи
            # Чат остается доступным даже после завершения задачи
            if False:  # Disabled: keep chats alive
                linked_chat = db.find_chat_by_todo(todo_id)

                if not linked_chat:
                    metadata = result.get('metadata') if isinstance(result.get('metadata'), dict) else {}
                    chat_id = (
                        updates.get('chatId')
                        or updates.get('chat_id')
                        or metadata.get('chatId')
                        or metadata.get('chat_id')
                    )
                    if chat_id:
                        linked_chat = db.get_chat(chat_id)

                if linked_chat and linked_chat.get('id'):
                    try:
                        db.delete_chat(linked_chat['id'])
                        print(f"[PUT /api/todos] 🗑️ Linked chat {linked_chat['id']} removed for task {todo_id}")
                    except Exception as chat_err:
                        print(f"[PUT /api/todos] ⚠️ Failed to remove linked chat for task {todo_id}: {chat_err}")
        else:
            print(f"[PUT /api/todos] ERROR: Task not found or update failed for ID: {todo_id}")
    
    if not result:
        print(f"[PUT /api/todos] 404 - {todo_type.capitalize()} not found")
        raise HTTPException(status_code=404, detail=f"{todo_type.capitalize()} not found")
    
    print(f"[PUT /api/todos] Returning successful response")
    data = snake_to_camel(result)
    metadata = data.get('metadata') or {}
    if isinstance(metadata, dict):
        for key in stage_keys:
            if key in metadata:
                data[key] = metadata[key]
    
    print(f"[PUT /api/todos] 📊 Final stageMeta in response: {data.get('stageMeta')}")
    return data

@app.delete("/api/todos")
def delete_todo(id: str, type: str = 'todo'):
    """Удалить задачу, список или категорию"""
    if not id:
        raise HTTPException(status_code=400, detail="ID is required")
    
    if type == 'list':
        success = db.delete_todo_list(id)
    elif type == 'category':
        success = db.delete_todo_category(id)
    else:
        success = db.delete_task(id)
    
    if not success:
        raise HTTPException(status_code=404, detail=f"{type.capitalize()} not found")
    
    return {"success": True}

@app.get("/api/todos/people")
def get_todo_people():
    """Получить список людей для назначения задач"""
    users = db.get_users()
    # Возвращаем все нужные поля из users для фронтенда
    people = []
    for user in users:
        person = {
            'id': user.get('id'),
            'username': user.get('username'),
            'name': user.get('name') or user.get('username'),  # fallback to username
            'telegramId': user.get('telegram_id'),
            'todoPersonId': user.get('todo_person_id'),
            'canSeeAllTasks': user.get('can_see_all_tasks', False),
            'role': user.get('todo_role') or 'universal',  # используем todo_role
            'lastSeen': user.get('last_seen'),
            'isOnline': user.get('is_online', False)
        }
        people.append(person)
    return {"people": people}

@app.get("/api/todos/telegram") 
def get_todo_telegram():
    """Получить telegram настройки для задач"""
    settings = db.get_settings()
    return {
        'enabled': settings.get('telegramNotifications', False),
        'botToken': settings.get('telegramBotToken', ''),
        'chatId': settings.get('telegramChatId', '')
    }

@app.get("/api/links")
def get_links(userId: Optional[str] = None, department: Optional[str] = None):
    """Получить список ссылок"""
    links = db.get_links(user_id=userId, department=department)
    lists = db.get_link_lists(department=department)
    
    # Преобразуем snake_case в camelCase
    links = [snake_to_camel(link) for link in links]
    lists = [snake_to_camel(list_item) for list_item in lists]
    
    return {
        "links": links,
        "lists": lists
    }

@app.post("/api/links")
def create_link(link_data: dict = Body(...)):
    """Создать новую ссылку или список"""
    import uuid
    
    item_type = link_data.get('type', 'link')
    
    if item_type == 'list':
        # Создание списка
        allowed_users = link_data.get('allowedUsers', link_data.get('allowed_users', [])) or []
        allowed_departments = link_data.get('allowedDepartments', link_data.get('allowed_departments', [])) or []
        is_public = link_data.get('isPublic', link_data.get('is_public'))
        if is_public is None:
            is_public = len(allowed_users) == 0 and len(allowed_departments) == 0

        new_list = {
            'id': str(uuid.uuid4()),
            'name': link_data.get('name', ''),
            'color': link_data.get('color', '#3b82f6'),
            'icon': link_data.get('icon', ''),
            'department': link_data.get('department'),
            'order': link_data.get('order', 0),
            'created_by': link_data.get('createdBy', link_data.get('created_by')),
            'allowed_users': allowed_users,
            'allowed_departments': allowed_departments,
            'is_public': is_public,
        }
        
        result = db.add_link_list(new_list)
        return snake_to_camel(result) if result else new_list
    else:
        # Создание ссылки
        new_link = {
            'id': str(uuid.uuid4()),
            'url': link_data.get('url', ''),
            'title': link_data.get('title', ''),
            'description': link_data.get('description', ''),
            'listId': link_data.get('listId'),
            'categoryId': link_data.get('categoryId'),
            'tags': link_data.get('tags', []),
            'userId': link_data.get('userId'),
            'department': link_data.get('department'),
            'clicks': 0,
            'isBookmarked': False,
            'isPinned': False,
            'order': link_data.get('order', 0)
        }
        
        result = db.add_link(new_link)
        return snake_to_camel(result) if result else new_link

@app.put("/api/links")
def update_link(link_data: dict = Body(...)):
    """Обновить ссылку или список"""
    item_type = link_data.get('type', 'link')
    item_id = link_data.get('id')
    
    if not item_id:
        raise HTTPException(status_code=400, detail="ID is required")
    
    if item_type == 'list':
        # Обновление списка
        updates = {}
        if 'name' in link_data:
            updates['name'] = link_data['name']
        if 'color' in link_data:
            updates['color'] = link_data['color']
        if 'icon' in link_data:
            updates['icon'] = link_data['icon']
        if 'department' in link_data:
            updates['department'] = link_data['department']
        if 'order' in link_data:
            updates['order'] = link_data['order']
        if 'allowedUsers' in link_data:
            updates['allowedUsers'] = link_data['allowedUsers']
        if 'allowedDepartments' in link_data:
            updates['allowedDepartments'] = link_data['allowedDepartments']
        if 'createdBy' in link_data:
            updates['createdBy'] = link_data['createdBy']
        if 'isPublic' in link_data:
            updates['isPublic'] = link_data['isPublic']
        
        result = db.update_link_list(item_id, updates)
        if not result:
            raise HTTPException(status_code=404, detail="List not found")
        return snake_to_camel(result)
    else:
        # Обновление ссылки
        updates = {}
        for key in ['url', 'title', 'description', 'listId', 'categoryId', 'tags', 'isBookmarked', 'isPinned', 'clicks', 'department', 'order']:
            if key in link_data:
                updates[key] = link_data[key]
        
        result = db.update_link(item_id, updates)
        if not result:
            raise HTTPException(status_code=404, detail="Link not found")
        return snake_to_camel(result)

@app.delete("/api/links")
def delete_link(id: str, type: str = 'link'):
    """Удалить ссылку или список"""
    if type == 'list':
        success = db.delete_link_list(id)
    else:
        success = db.delete_link(id)
    
    if not success:
        raise HTTPException(status_code=404, detail=f"{type} not found")
    return {"status": "deleted"}


# ============== Content Plans ==============

@app.get("/api/content-plans")
def get_content_plans(userId: Optional[str] = None, status: Optional[str] = None):
    """Получить контент-планы"""
    plans = db.get_content_plans(user_id=userId, status=status)
    plans = [snake_to_camel(plan) for plan in plans]
    return {"plans": plans}

@app.post("/api/content-plans")
def create_content_plan(plan_data: dict = Body(...)):
    """Создать новый контент-план"""
    import uuid
    
    new_plan = {
        'id': str(uuid.uuid4()),
        'title': plan_data.get('title', ''),
        'description': plan_data.get('description', ''),
        'content': plan_data.get('content', ''),
        'status': plan_data.get('status', 'draft'),
        'postType': plan_data.get('postType'),
        'scheduledDate': plan_data.get('scheduledDate'),
        'platform': plan_data.get('platform'),
        'tags': plan_data.get('tags', []),
        'authorId': plan_data.get('authorId'),
        'assignedToIds': plan_data.get('assignedToIds', []),
        'attachments': plan_data.get('attachments', []),
        'metadata': plan_data.get('metadata', {})
    }
    
    result = db.add_content_plan(new_plan)
    return snake_to_camel(result) if result else new_plan

@app.put("/api/content-plans/{plan_id}")
def update_content_plan(plan_id: str, plan_data: dict = Body(...)):
    """Обновить контент-план"""
    updates = {}
    for key in ['title', 'description', 'content', 'status', 'postType', 'scheduledDate', 
                'publishedDate', 'platform', 'tags', 'authorId', 'assignedToIds', 'attachments', 'metadata']:
        if key in plan_data:
            updates[key] = plan_data[key]
    
    result = db.update_content_plan(plan_id, updates)
    if not result:
        raise HTTPException(status_code=404, detail="Content plan not found")
    return snake_to_camel(result)

@app.delete("/api/content-plans/{plan_id}")
def delete_content_plan(plan_id: str):
    """Удалить контент-план"""
    success = db.delete_content_plan(plan_id)
    if not success:
        raise HTTPException(status_code=404, detail="Content plan not found")
    return {"status": "deleted"}


# ============== Link Lists API ==============

@app.get("/api/link-lists")
def get_link_lists(department: Optional[str] = None, userId: Optional[str] = None):
    """Получить списки ссылок"""
    lists = db.get_link_lists(department=department, user_id=userId)
    return [snake_to_camel(list_item) for list_item in lists]

@app.post("/api/link-lists")
def create_link_list(list_data: dict = Body(...)):
    """Создать список ссылок"""
    import uuid
    from datetime import datetime
    
    new_list = {
        'id': str(uuid.uuid4()),
        'name': list_data.get('name', ''),
        'color': list_data.get('color', '#3B82F6'),
        'created_by': list_data.get('createdBy', ''),
        'allowed_users': list_data.get('allowedUsers', []),
        'allowed_departments': list_data.get('allowedDepartments', []),
        'is_public': list_data.get('isPublic', len(list_data.get('allowedUsers', [])) == 0 and len(list_data.get('allowedDepartments', [])) == 0),
        'created_at': datetime.utcnow().isoformat(),
        'order': list_data.get('order', 0)
    }
    
    result = db.add_link_list(new_list)
    return snake_to_camel(result) if result else snake_to_camel(new_list)

@app.put("/api/link-lists")
def update_link_list(list_data: dict = Body(...)):
    """Обновить список ссылок"""
    list_id = list_data.get('id')
    if not list_id:
        raise HTTPException(status_code=400, detail="ID is required")
    
    # Преобразуем camelCase обратно в snake_case для БД
    updates = {}
    if 'name' in list_data:
        updates['name'] = list_data['name']
    if 'color' in list_data:
        updates['color'] = list_data['color']
    if 'allowedUsers' in list_data:
        updates['allowed_users'] = list_data['allowedUsers']
    if 'allowedDepartments' in list_data:
        updates['allowed_departments'] = list_data['allowedDepartments']
    if 'isPublic' in list_data:
        updates['is_public'] = list_data['isPublic']
    
    result = db.update_link_list(list_id, updates)
    if not result:
        raise HTTPException(status_code=404, detail="Link list not found")
    return snake_to_camel(result)

@app.delete("/api/link-lists")
def delete_link_list(id: str):
    """Удалить список ссылок"""
    if not id:
        raise HTTPException(status_code=400, detail="ID is required")
    
    success = db.delete_link_list(id)
    if not success:
        raise HTTPException(status_code=404, detail="Link list not found")
    return {"success": True}


# ============== Messaging System ==============

class ChatCreate(BaseModel):
    participantIds: List[str]
    title: Optional[str] = None
    isGroup: bool = False
    creatorId: Optional[str] = None
    todoId: Optional[str] = None  # Связь с задачей

class MessageCreate(BaseModel):
    authorId: str
    content: str
    mentions: Optional[List[str]] = []
    replyToId: Optional[str] = None
    attachments: Optional[List[Dict[str, Any]]] = []

@app.get("/api/chats")
def get_chats(user_id: Optional[str] = None):
    """Получить список всех чатов пользователя"""
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id is required")
    
    import uuid
    chats = db.get_user_chats(user_id)
    
    # Автоматически создаем служебные чаты при первом запросе
    notifications_chat = next((c for c in chats if c.get('is_notifications_chat') and user_id in c.get('participant_ids', [])), None)
    if not notifications_chat:
        notifications_chat = {
            "id": f"notifications-{user_id}",
            "title": "Уведомления",
            "is_group": False,
            "is_notifications_chat": True,
            "is_system_chat": True,
            "participant_ids": [user_id],
            "creator_id": user_id,
            "created_at": datetime.now().isoformat(),
            "read_messages_by_user": {}
        }
        db.create_chat(notifications_chat)
    
    favorites_chat = next((c for c in chats if c.get('is_favorites_chat') and user_id in c.get('participant_ids', [])), None)
    if not favorites_chat:
        favorites_chat = {
            "id": f"favorites_{user_id}",
            "title": "Избранное",
            "is_group": False,
            "is_favorites_chat": True,
            "is_system_chat": True,
            "participant_ids": [user_id],
            "creator_id": user_id,
            "created_at": datetime.now().isoformat(),
            "read_messages_by_user": {}
        }
        db.create_chat(favorites_chat)
    
    # Перезагружаем чаты после добавления новых
    chats = db.get_user_chats(user_id)
    
    # Фильтрация уже сделана в db.get_user_chats(user_id), не нужно делать заново
    user_chats = chats

    # Скрываем task-чаты для архивных/выполненных задач
    filtered_chats = []
    for chat in user_chats:
        todo_id = chat.get('todo_id')
        if todo_id:
            task = db.get_task(todo_id)
            if task and (task.get('archived') or task.get('completed')):
                continue
        filtered_chats.append(chat)
    user_chats = filtered_chats
    
    # Добавляем информацию о последнем сообщении и непрочитанных
    def parse_message_time(value):
        if isinstance(value, datetime):
            return value
        if isinstance(value, str) and value:
            try:
                return datetime.fromisoformat(value.replace('Z', '+00:00'))
            except Exception:
                return datetime.min
        return datetime.min

    for chat in user_chats:
        chat_messages = db.get_chat_messages(chat['id'])
        
        if chat_messages:
            # Берем реально последнее сообщение по времени, независимо от порядка выдачи из БД
            last_message = max(chat_messages, key=lambda msg: parse_message_time(msg.get('created_at', '')))
            chat['lastMessage'] = last_message
            last_msg_time = parse_message_time(last_message.get('created_at', ''))
        else:
            chat['unreadCount'] = 0
            continue
        
        # Подсчитываем непрочитанные
        last_read_at = chat.get('read_messages_by_user', {}).get(user_id)
        
        # Парсим даты для сравнения
        if isinstance(last_read_at, str):
            try:
                last_read_at = datetime.fromisoformat(last_read_at.replace('Z', '+00:00'))
            except:
                pass
        
        # Простая логика: если прочитал после последнего сообщения - всё прочитано
        if last_read_at and last_read_at >= last_msg_time:
            chat['unreadCount'] = 0
        elif last_read_at:
            # Считаем сообщения после last_read_at
            is_system_chat = chat.get('is_notifications_chat') or chat.get('is_system_chat')
            if is_system_chat:
                # Для системных чатов считаем ВСЕ сообщения после last_read_at
                unread = sum(1 for msg in chat_messages 
                            if parse_message_time(msg.get('created_at', '')) > last_read_at)
            else:
                # Для обычных чатов - только сообщения от других пользователей
                unread = sum(1 for msg in chat_messages 
                            if msg.get('author_id') != user_id 
                            and parse_message_time(msg.get('created_at', '')) > last_read_at)
            chat['unreadCount'] = unread
        else:
            # Если не читал - считаем непрочитанные
            is_system_chat = chat.get('is_notifications_chat') or chat.get('is_system_chat')
            if is_system_chat:
                chat['unreadCount'] = len(chat_messages)
            else:
                chat['unreadCount'] = sum(1 for msg in chat_messages if msg.get('author_id') != user_id)
    
    # Функция для безопасного извлечения времени создания для сортировки
    def get_sort_time(chat):
        created_at = chat.get('lastMessage', {}).get('created_at', '')
        if isinstance(created_at, datetime):
            return created_at
        elif isinstance(created_at, str) and created_at:
            try:
                return datetime.fromisoformat(created_at.replace('Z', '+00:00'))
            except:
                return datetime.min
        return datetime.min
    
    # Сортируем по последнему сообщению
    user_chats.sort(key=get_sort_time, reverse=True)
    
    # Преобразуем snake_case → camelCase для frontend
    return [snake_to_camel(chat) for chat in user_chats]

@app.post("/api/chats")
def create_chat(chat_data: ChatCreate):
    """Создать новый чат"""
    import uuid

    def sync_todo_chat_id(todo_id: Optional[str], chat_id: str):
        if not todo_id or not chat_id:
            return
        try:
            task = db.get_task(todo_id)
            if not task:
                return
            metadata = task.get('metadata') if isinstance(task.get('metadata'), dict) else {}
            if metadata.get('chatId') == chat_id or metadata.get('chat_id') == chat_id:
                return
            merged_metadata = {**metadata, 'chatId': chat_id}
            db.update_task(todo_id, {'metadata': merged_metadata})
        except Exception as sync_err:
            print(f"[POST /api/chats] ⚠️ Failed to sync todo chatId for task {todo_id}: {sync_err}")
    
    # Проверяем, не существует ли уже личный чат с этими участниками
    if not chat_data.isGroup and len(chat_data.participantIds) == 2:
        existing_chat = db.find_private_chat(chat_data.participantIds[0], chat_data.participantIds[1])
        if existing_chat:
            if chat_data.todoId:
                sync_todo_chat_id(chat_data.todoId, existing_chat.get('id'))
            return snake_to_camel(existing_chat)
    
    # Если указан todoId, проверяем существование чата для этой задачи
    if chat_data.todoId:
        existing_chat = db.find_chat_by_todo(chat_data.todoId)
        if existing_chat:
            sync_todo_chat_id(chat_data.todoId, existing_chat.get('id'))
            return snake_to_camel(existing_chat)
    
    new_chat = {
        "id": str(uuid.uuid4()),
        "title": chat_data.title,
        "is_group": chat_data.isGroup,
        "participant_ids": chat_data.participantIds,
        "created_at": datetime.now().isoformat(),
        "read_messages_by_user": {}
    }
    
    # Добавляем creatorId для групповых чатов
    if chat_data.isGroup and chat_data.creatorId:
        new_chat["creator_id"] = chat_data.creatorId
    
    # Добавляем todoId если указан
    if chat_data.todoId:
        new_chat["todo_id"] = chat_data.todoId
    
    result = db.create_chat(new_chat)

    if chat_data.todoId and result and result.get('id'):
        sync_todo_chat_id(chat_data.todoId, result.get('id'))
    
    return snake_to_camel(result)

@app.get("/api/chats/{chat_id}")
def get_chat(chat_id: str):
    """Получить информацию о чате"""
    chat = db.get_chat(chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    return snake_to_camel(chat)

@app.delete("/api/chats/{chat_id}")
def delete_chat(chat_id: str):
    """Удалить чат и все его сообщения"""
    chat = db.get_chat(chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")

    # Синхронная архивация задачи при удалении связанного task-чата
    todo_id = chat.get('todo_id')
    if todo_id:
        try:
            task = db.get_task(todo_id)
            if task and not task.get('archived'):
                db.update_task(todo_id, {'archived': True})
                print(f"[DELETE /api/chats/{chat_id}] 📦 Archived linked task {todo_id}")
        except Exception as task_err:
            print(f"[DELETE /api/chats/{chat_id}] ⚠️ Failed to archive linked task {todo_id}: {task_err}")
    
    # Удаляем чат (CASCADE удалит сообщения и участников)
    db.delete_chat(chat_id)
    
    return {"success": True}

@app.get("/api/chats/{chat_id}/messages")
def get_chat_messages(chat_id: str):
    """Получить все сообщения чата"""
    chat_messages = db.get_chat_messages(chat_id)
    return [snake_to_camel(msg) for msg in chat_messages]

@app.post("/api/chats/{chat_id}/messages")
def send_message(chat_id: str, message_data: MessageCreate):
    """Отправить сообщение в чат"""
    import uuid
    
    # Проверяем существование чата
    chat = db.get_chat(chat_id)
    
    # Если чат не найден и это favorites чат - создаём его автоматически
    if not chat and chat_id.startswith('favorites_'):
        user_id = chat_id.replace('favorites_', '')
        new_chat = {
            "id": chat_id,
            "title": "Избранное",
            "is_group": False,
            "is_favorites_chat": True,
            "participant_ids": [user_id],
            "creator_id": user_id,
            "created_at": datetime.now().isoformat(),
            "read_messages_by_user": {},
            "pinned_by_user": {user_id: True}
        }
        chat = db.create_chat(new_chat)
    
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    # Получаем информацию об авторе
    author = db.get_user_by_id(message_data.authorId)
    if not author:
        raise HTTPException(status_code=404, detail="Author not found")
    
    # Получаем имя автора, игнорируя строку "null"
    author_name = author.get('name')
    if not author_name or author_name == 'null':
        author_name = author.get('username')
    if not author_name or author_name == 'null':
        author_name = 'Unknown'
    
    new_message = {
        "id": str(uuid.uuid4()),
        "chat_id": chat_id,
        "author_id": message_data.authorId,
        "author_name": author_name,
        "content": message_data.content,
        "mentions": message_data.mentions or [],
        "reply_to_id": message_data.replyToId,
        "created_at": datetime.now().isoformat(),
        "updated_at": None,
        "is_edited": False,
        "attachments": message_data.attachments or []
    }
    
    result = db.add_message(new_message)
    
    # Уведомления о сообщениях НЕ отправляем - чат "Уведомления" только для задач, событий и т.д.
    
    return snake_to_camel(result)

@app.patch("/api/chats/{chat_id}/messages/{message_id}")
def update_message(chat_id: str, message_id: str, update_data: dict):
    """Обновить сообщение"""
    if 'content' not in update_data:
        raise HTTPException(status_code=400, detail="No content to update")

    # PostgreSQL path: обновляем и возвращаем запись атомарно
    if hasattr(db, 'conn'):
        row = db.conn.fetch_one(
            """
            UPDATE messages
            SET content = %s, is_edited = true, updated_at = NOW()
            WHERE id = %s
            RETURNING *
            """,
            (update_data['content'], message_id)
        )
        if not row:
            raise HTTPException(status_code=404, detail="Message not found")
        return snake_to_camel(dict(row))

    # JSON fallback path
    chat_messages = db.get_chat_messages(chat_id) or []
    message = next((msg for msg in chat_messages if str(msg.get('id')) == message_id), None)
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    success = db.update_message(message_id, update_data['content'])
    if not success:
        raise HTTPException(status_code=404, detail="Message not found")

    refreshed_messages = db.get_chat_messages(chat_id) or []
    updated_message = next((msg for msg in refreshed_messages if str(msg.get('id')) == message_id), None)
    if not updated_message:
        raise HTTPException(status_code=404, detail="Message not found")

    return snake_to_camel(updated_message)

@app.post("/api/chats/{chat_id}/messages/{message_id}/forward")
def forward_message(chat_id: str, message_id: str, forward_data: dict = Body(...)):
    """Переслать сообщение в другие чаты"""
    import uuid
    from datetime import datetime
    
    print(f"DEBUG - Forward request: chat_id={chat_id}, message_id={message_id}")
    print(f"DEBUG - Target chats: {forward_data.get('targetChatIds', [])}")
    
    # Получаем оригинальное сообщение (PostgreSQL/JSON совместимо)
    chat_messages = db.get_chat_messages(chat_id) or []
    print(f"DEBUG - Messages in source chat: {len(chat_messages)}")

    original_message = next((msg for msg in chat_messages if str(msg.get('id')) == message_id), None)

    if not original_message and hasattr(db, 'conn'):
        row = db.conn.fetch_one("SELECT * FROM messages WHERE id = %s", (message_id,))
        original_message = dict(row) if row else None

    if not original_message:
        raise HTTPException(status_code=404, detail="Message not found")

    def pick(msg: dict, snake_key: str, camel_key: str, default=None):
        value = msg.get(snake_key)
        if value is None:
            value = msg.get(camel_key)
        return default if value is None else value
    
    target_chat_ids = forward_data.get('targetChatIds', [])
    if not target_chat_ids:
        raise HTTPException(status_code=400, detail="No target chats specified")
    
    forwarded_messages = []
    
    # Создаем копию сообщения для каждого целевого чата
    for target_chat_id in target_chat_ids:
        new_message = {
            'id': str(uuid.uuid4()),
            'chat_id': target_chat_id,
            'author_id': pick(original_message, 'author_id', 'authorId'),
            'author_name': pick(original_message, 'author_name', 'authorName', 'Unknown'),
            'content': pick(original_message, 'content', 'content', ''),
            'mentions': pick(original_message, 'mentions', 'mentions', []),
            'createdAt': datetime.now().isoformat(),
            'isEdited': False,
            'isDeleted': False,
            'attachments': pick(original_message, 'attachments', 'attachments', []),
            'isSystemMessage': False
        }

        saved_message = db.add_message(new_message)
        forwarded_messages.append(snake_to_camel(saved_message) if saved_message else snake_to_camel(new_message))
    
    return {"success": True, "forwardedMessages": forwarded_messages}

@app.delete("/api/chats/{chat_id}/messages/{message_id}")
def delete_message(chat_id: str, message_id: str):
    """Мягкое удаление сообщения - помечает как удаленное"""
    chat_messages = db.get_chat_messages(chat_id) or []
    message = next((msg for msg in chat_messages if str(msg.get('id')) == message_id), None)

    if not message and hasattr(db, 'conn'):
        row = db.conn.fetch_one("SELECT id FROM messages WHERE id = %s", (message_id,))
        message = dict(row) if row else None

    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    success = db.delete_message(message_id)
    if not success:
        raise HTTPException(status_code=404, detail="Message not found")

    return {"success": True}

@app.post("/api/chats/{chat_id}/mark-read")
def mark_messages_as_read(chat_id: str, data_payload: dict):
    """Отметить сообщения как прочитанные"""
    from datetime import datetime
    
    user_id = data_payload.get('userId')
    last_message_id = data_payload.get('lastMessageId')
    
    if not user_id:
        raise HTTPException(status_code=400, detail="userId is required")
    
    chat = db.get_chat(chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    # Обновляем время последнего прочтения для пользователя
    read_messages_by_user = chat.get('read_messages_by_user', {})
    read_messages_by_user[user_id] = datetime.now().isoformat()
    
    db.update_chat(chat_id, {'read_messages_by_user': read_messages_by_user})
    
    return {"success": True}

@app.post("/api/chats/{chat_id}/pin")
def pin_chat(chat_id: str, data_payload: dict):
    """Закрепить/открепить чат для пользователя"""
    user_id = data_payload.get('userId')
    raw_is_pinned = data_payload.get('isPinned', True)
    if isinstance(raw_is_pinned, str):
        is_pinned = raw_is_pinned.strip().lower() in ('1', 'true', 'yes', 'on')
    else:
        is_pinned = bool(raw_is_pinned)
    
    if not user_id:
        raise HTTPException(status_code=400, detail="userId is required")

    chat = db.get_chat(chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")

    pinned_by_user = chat.get('pinned_by_user')
    if pinned_by_user is None:
        pinned_by_user = chat.get('pinnedByUser')
    if not isinstance(pinned_by_user, dict):
        pinned_by_user = {}

    pinned_by_user[user_id] = is_pinned

    updated = db.update_chat(chat_id, {'pinned_by_user': pinned_by_user})
    if not updated:
        raise HTTPException(status_code=500, detail="Failed to update chat pin state")
    
    return {"success": True, "isPinned": is_pinned}

@app.get("/api/chats/notifications/{user_id}")
def get_or_create_notifications_chat(user_id: str):
    """Получить или создать чат уведомлений для пользователя"""
    resolved_user_id = user_id
    try:
        user = db.get_user(user_id)
        if user and user.get('id'):
            resolved_user_id = user['id']
    except Exception as exc:
        print(f"[notifications] Failed to resolve user id for {user_id}: {exc}")

    chats = db.get_user_chats(resolved_user_id)
    
    # Ищем существующий чат уведомлений для этого пользователя
    notifications_chat = next(
        (chat for chat in chats 
         if chat.get('is_notifications_chat', False)),
        None
    )
    
    if notifications_chat:
        return snake_to_camel(notifications_chat)
    
    # Создаем новый чат уведомлений
    new_chat = {
        "id": f"notifications-{resolved_user_id}",
        "title": "Уведомления",
        "is_group": False,
        "is_notifications_chat": True,
        "is_system_chat": True,
        "participant_ids": [resolved_user_id],
        "creator_id": resolved_user_id,
        "created_at": datetime.now().isoformat(),
        "read_messages_by_user": {},
        "pinned_by_user": {resolved_user_id: True}  # Автоматически закрепляем
    }
    
    db.create_chat(new_chat)
    
    return snake_to_camel(new_chat)

@app.post("/api/chats/notifications/{user_id}/send")
def send_notification_message(user_id: str, notification_data: dict):
    """Отправить уведомление в чат уведомлений пользователя"""
    import uuid
    
    # Получаем или создаем чат уведомлений
    notifications_chat = get_or_create_notifications_chat(user_id)
    
    content = str(notification_data.get('content', '') or '').strip()
    content = re.sub(r'<[^>]*>', '', content)
    content = content.replace('\r\n', '\n')
    content = re.sub(r'[ \t]+', ' ', content)
    content = re.sub(r'\n{3,}', '\n\n', content).strip()
    if not content:
        raise HTTPException(status_code=400, detail="content is required")

    notification_type = notification_data.get('notificationType') or notification_data.get('notification_type') or 'info'

    message_author_id = user_id
    try:
        resolved_user = db.get_user(user_id)
        if resolved_user and resolved_user.get('id'):
            message_author_id = resolved_user['id']
        else:
            fallback_author_id = notifications_chat.get('creator_id')
            if fallback_author_id and db.get_user(fallback_author_id):
                message_author_id = fallback_author_id
            else:
                users = db.get_users() or []
                first_valid_user = next((u for u in users if u and u.get('id')), None)
                if first_valid_user:
                    message_author_id = first_valid_user['id']
    except Exception as exc:
        print(f"[notifications] author resolve failed for {user_id}: {exc}")

    new_message = {
        "id": str(uuid.uuid4()),
        "chat_id": notifications_chat['id'],
        "author_id": message_author_id,
        "author_name": "Система",
        "content": content,
        "mentions": [],
        "reply_to_id": None,
        "created_at": datetime.now().isoformat(),
        "updated_at": None,
        "is_edited": False,
        "is_system_message": True,
        "linked_chat_id": notification_data.get('linkedChatId') or notification_data.get('linked_chat_id'),
        "linked_message_id": notification_data.get('linkedMessageId') or notification_data.get('linked_message_id'),
        "linked_task_id": notification_data.get('linkedTaskId') or notification_data.get('linked_task_id'),
        "linked_post_id": notification_data.get('linkedPostId') or notification_data.get('linked_post_id'),
        "linked_event_id": notification_data.get('linkedEventId') or notification_data.get('linked_event_id'),
        "notification_type": notification_type,
        "metadata": {
            "linkedEventId": notification_data.get('linkedEventId') or notification_data.get('linked_event_id'),
            "linkedEventTitle": notification_data.get('linkedEventTitle') or notification_data.get('linked_event_title'),
            "fromUserName": notification_data.get('fromUserName') or notification_data.get('from_user_name'),
        }
    }

    saved_message = None
    try:
        saved_message = db.add_message(new_message)
    except Exception as exc:
        if new_message.get("linked_event_id"):
            print(f"[notifications] add_message failed with linked_event_id, fallback without it: {exc}")
            fallback_message = dict(new_message)
            fallback_message.pop("linked_event_id", None)
            saved_message = db.add_message(fallback_message)
        else:
            raise

    if not saved_message and new_message.get("linked_event_id"):
        fallback_message = dict(new_message)
        fallback_message.pop("linked_event_id", None)
        saved_message = db.add_message(fallback_message)

    if not saved_message:
        raise HTTPException(status_code=500, detail="Failed to save notification message")

    return snake_to_camel(saved_message)


# Типы уведомлений
class NotificationType:
    NEW_TASK = "new_task"
    TASK_UPDATED = "task_updated"
    TASK_STATUS_CHANGED = "task_status_changed"
    NEW_EXECUTOR = "new_executor"
    REMOVED_EXECUTOR = "removed_executor"
    NEW_COMMENT = "new_comment"
    MENTION = "mention"
    POST_UPDATED = "post_updated"
    POST_STATUS_CHANGED = "post_status_changed"
    POST_NEW_COMMENT = "post_new_comment"


def create_notification_content(notification_type: str, data: dict) -> str:
    """Создать текст уведомления с Emoji"""
    
    from_user = data.get('fromUserName', 'Кто-то')
    task_title = data.get('taskTitle', data.get('postTitle', 'Без названия'))
    old_status = data.get('oldStatus', '')
    new_status = data.get('newStatus', '')
    executor_name = data.get('executorName', '')
    
    templates = {
        NotificationType.NEW_TASK: f"Новая задача — {from_user}: «{task_title}»",
        NotificationType.TASK_UPDATED: f"Задача изменена — {from_user}: «{task_title}»",
        NotificationType.TASK_STATUS_CHANGED: f"Статус изменён — {from_user}: «{task_title}» ({old_status} → {new_status})",
        NotificationType.NEW_EXECUTOR: f"Новый исполнитель — {executor_name}: «{task_title}»",
        NotificationType.REMOVED_EXECUTOR: f"Исполнитель удалён — {executor_name}: «{task_title}»",
        NotificationType.NEW_COMMENT: f"Новый комментарий — {from_user}: «{task_title}»",
        NotificationType.MENTION: f"Вас упомянули — {from_user}: «{task_title}»",
        NotificationType.POST_UPDATED: f"Публикация изменена — {from_user}: «{task_title}»",
        NotificationType.POST_STATUS_CHANGED: f"Статус публикации — {from_user}: «{task_title}» ({old_status} → {new_status})",
        NotificationType.POST_NEW_COMMENT: f"Комментарий к публикации — {from_user}: «{task_title}»",
    }

    return templates.get(notification_type, f"Уведомление — {from_user}: {task_title}")


@app.post("/api/notifications/send-to-users")
def send_notification_to_multiple_users(notification_data: dict = Body(...)):
    """Отправить уведомление нескольким пользователям в их чаты уведомлений"""
    import uuid
    
    user_ids = notification_data.get('userIds', [])
    notification_type = notification_data.get('type', 'info')
    data = notification_data.get('data', {})
    
    print(f"[Notifications] Sending to users: {user_ids}, type: {notification_type}")
    
    # Генерируем контент уведомления
    content = create_notification_content(notification_type, data)
    print(f"[Notifications] Content: {content}")
    
    results = []
    success_count = 0
    for user_id in user_ids:
        try:
            notifications_chat = get_or_create_notifications_chat(user_id)
            print(f"[Notifications] Chat for {user_id}: {notifications_chat.get('id', 'NO ID')}")

            message_author_id = user_id
            resolved_user = db.get_user(user_id)
            if resolved_user and resolved_user.get('id'):
                message_author_id = resolved_user['id']
            else:
                fallback_author_id = notifications_chat.get('creatorId') or notifications_chat.get('creator_id')
                if fallback_author_id:
                    fallback_user = db.get_user(fallback_author_id)
                    if fallback_user and fallback_user.get('id'):
                        message_author_id = fallback_user['id']
            
            new_message = {
                "id": str(uuid.uuid4()),
                "chatId": notifications_chat['id'],
                "authorId": message_author_id,
                "authorName": "Система",
                "content": content,
                "mentions": [],
                "replyToId": None,
                "createdAt": datetime.now().isoformat(),
                "updatedAt": None,
                "isEdited": False,
                "isSystemMessage": True,
                "linkedTaskId": data.get('taskId'),
                "linkedPostId": data.get('postId'),
                "notificationType": notification_type,
                "metadata": {
                    "fromUserName": data.get('fromUserName'),
                    "taskTitle": data.get('taskTitle'),
                    "postTitle": data.get('postTitle'),
                    "oldStatus": data.get('oldStatus'),
                    "newStatus": data.get('newStatus'),
                    "executorName": data.get('executorName'),
                }
            }
            
            db.add_message(new_message)
            print(f"[Notifications] Message sent: {new_message['id']}")
            success_count += 1
            results.append({"userId": user_id, "success": True, "messageId": new_message['id']})
        except Exception as e:
            print(f"[Notifications] Error for {user_id}: {str(e)}")
            results.append({"userId": user_id, "success": False, "error": str(e)})
    
    print(f"[Notifications] Results: {results}")
    if success_count == 0:
        raise HTTPException(status_code=500, detail={"results": results, "count": 0, "error": "No notifications were sent"})

    return {"results": results, "count": success_count}


# ==================== SHARED LINKS ====================
@app.post("/api/share")
def create_share_link(share_data: dict = Body(...)):
    """Create shared link for resource"""
    import secrets
    import uuid
    
    # Generate unique token
    token = secrets.token_urlsafe(32)
    link_id = str(uuid.uuid4())
    
    link_data = {
        'id': link_id,
        'token': token,
        'resource_type': share_data.get('resourceType'),
        'resource_id': share_data.get('resourceId'),
        'permission': share_data.get('permission', 'viewer'),
        'created_by': share_data.get('createdBy'),
        'expires_at': share_data.get('expiresAt'),
        'metadata': share_data.get('metadata', {})
    }
    
    result = db.create_shared_link(link_data)
    if not result:
        raise HTTPException(status_code=500, detail="Failed to create share link")
    
    return snake_to_camel(result)

@app.get("/api/share/token/{token}")
def get_share_by_token(token: str, user_id: Optional[str] = None):
    """Get shared link info by token with access check for user"""
    result = db.get_shared_link_by_token(token)
    if not result:
        raise HTTPException(status_code=404, detail="Share link not found or expired")
    
    response = snake_to_camel(result)
    
    # Если передан user_id и это задача с типом доступа viewer, проверяем связь пользователя с задачей
    if user_id and result.get('resource_type') == 'task' and result.get('permission') == 'viewer':
        resource_id = result.get('resource_id')
        if resource_id:
            # Получаем задачу
            task = db.get_todo(resource_id)
            if task:
                # Проверяем, является ли пользователь исполнителем или заказчиком
                assigned_to_ids = task.get('assigned_to_ids', []) or []
                if isinstance(assigned_to_ids, str):
                    import json
                    try:
                        assigned_to_ids = json.loads(assigned_to_ids)
                    except:
                        assigned_to_ids = []
                
                is_related = (
                    task.get('assigned_to_id') == user_id or
                    task.get('assigned_by_id') == user_id or
                    user_id in assigned_to_ids
                )
                
                # Если пользователь связан с задачей, даем ему права редактора
                response['effectivePermission'] = 'editor' if is_related else 'viewer'
            else:
                response['effectivePermission'] = result.get('permission')
        else:
            response['effectivePermission'] = result.get('permission')
    else:
        response['effectivePermission'] = result.get('permission')
    
    return response

@app.get("/api/share/{resource_type}")
def get_shares_by_resource(resource_type: str, resource_id: Optional[str] = None):
    """Get all shared links for a resource"""
    results = db.get_shared_links_by_resource(resource_type, resource_id)
    return [snake_to_camel(r) for r in results]

@app.put("/api/share/{link_id}")
def update_share_link(link_id: str, updates: dict = Body(...)):
    """Update shared link"""
    result = db.update_shared_link(link_id, updates)
    if not result:
        raise HTTPException(status_code=404, detail="Share link not found")
    
    return snake_to_camel(result)

@app.delete("/api/share/{link_id}")
def delete_share_link(link_id: str):
    """Delete shared link"""
    success = db.delete_shared_link(link_id)
    if not success:
        raise HTTPException(status_code=404, detail="Share link not found")
    
    return {"success": True}


# ==================== DIRECT ACCESS ====================
@app.post("/api/direct-access")
def create_direct_access(
    resource_type: str = Body(...),
    resource_id: str = Body(...),
    user_ids: List[str] = Body(default=[]),
    department_ids: List[str] = Body(default=[]),
    permission: str = Body(default='viewer')
):
    """Create direct access for resource"""
    access_id = str(uuid.uuid4())
    
    access_data = {
        'id': access_id,
        'resource_type': resource_type,
        'resource_id': resource_id,
        'user_ids': user_ids,
        'department_ids': department_ids,
        'permission': permission
    }
    
    result = db.create_direct_access(access_data)
    if not result:
        raise HTTPException(status_code=500, detail="Failed to create direct access")
    
    return result


@app.get("/api/direct-access")
def get_direct_access(resource_type: str, resource_id: str):
    """Get direct access for resource"""
    result = db.get_direct_access(resource_type, resource_id)
    if not result:
        raise HTTPException(status_code=404, detail="Direct access not found")
    
    return result


@app.put("/api/direct-access/{access_id}")
def update_direct_access(
    access_id: str,
    user_ids: Optional[List[str]] = Body(default=None),
    department_ids: Optional[List[str]] = Body(default=None),
    permission: Optional[str] = Body(default=None)
):
    """Update direct access"""
    updates = {}
    
    if user_ids is not None:
        updates['user_ids'] = user_ids
    if department_ids is not None:
        updates['department_ids'] = department_ids
    if permission is not None:
        updates['permission'] = permission
    
    result = db.update_direct_access(access_id, updates)
    if not result:
        raise HTTPException(status_code=404, detail="Direct access not found")
    
    return result


@app.delete("/api/direct-access/{access_id}")
def delete_direct_access(access_id: str):
    """Delete direct access"""
    success = db.delete_direct_access(access_id)
    if not success:
        raise HTTPException(status_code=404, detail="Direct access not found")
    
    return {"success": True}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
