import json
import os
import re
from typing import Any, Dict, List, Optional
from datetime import datetime

def transliterate(text: str) -> str:
    """Транслитерация кириллицы в латиницу для slug"""
    translit_dict = {
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
        'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
        'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
        'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sh', 'ъ': '',
        'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
    }
    
    text = text.lower()
    result = []
    
    for char in text:
        if char in translit_dict:
            result.append(translit_dict[char])
        elif char.isalnum():
            result.append(char)
        elif char in ' -_':
            result.append('-')
    
    slug = ''.join(result)
    slug = re.sub(r'-+', '-', slug)  # Убираем множественные дефисы
    slug = slug.strip('-')  # Убираем дефисы в начале и конце
    
    return slug

class Database:
    def __init__(self, db_path: str = "database.json"):
        self.db_path = db_path
        print(f"Database __init__ called with path: {db_path}")
        print(f"Current working directory: {os.getcwd()}")
        print(f"File exists: {os.path.exists(db_path)}")
        self.data = self._load()
    
    def _load(self) -> Dict[str, Any]:
        """Загрузка данных из JSON файла"""
        if os.path.exists(self.db_path):
            with open(self.db_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                print(f"Database loaded. Users count: {len(data.get('users', []))}")
                if data.get('users'):
                    print(f"First user: {data['users'][0]}")
                return data
        return self._get_default_structure()
    
    def reload(self):
        """Перезагрузить данные из файла (для синхронизации с внешними изменениями)"""
        self.data = self._load()
        print(f"Database reloaded. Users count: {len(self.data.get('users', []))}")
    
    def _save(self):
        """Сохранение данных в JSON файл с защитой от потери данных"""
        import shutil
        from datetime import datetime as dt
        
        # ЗАЩИТА: Не сохраняем если users пустой, а был не пустой
        current_users = len(self.data.get('users', []))
        
        # Читаем текущее состояние файла
        if os.path.exists(self.db_path):
            try:
                with open(self.db_path, 'r', encoding='utf-8') as f:
                    existing_data = json.load(f)
                    existing_users = len(existing_data.get('users', []))
                    
                    # Если пытаемся записать пустых users когда было >0 - БЛОКИРУЕМ
                    if existing_users > 0 and current_users == 0:
                        print(f"⛔ БЛОКИРОВКА ЗАПИСИ: Попытка стереть {existing_users} пользователей!")
                        print(f"   Стек вызова: ", end="")
                        import traceback
                        traceback.print_stack()
                        return  # НЕ сохраняем!
                    
                    # Создаём бэкап если users уменьшается более чем на 50%
                    if existing_users > 2 and current_users < existing_users * 0.5:
                        backup_path = f"{self.db_path}.backup_{dt.now().strftime('%Y%m%d_%H%M%S')}"
                        shutil.copy2(self.db_path, backup_path)
                        print(f"⚠️ ВНИМАНИЕ: Users уменьшается с {existing_users} до {current_users}. Бэкап: {backup_path}")
            except Exception as e:
                print(f"Ошибка при проверке защиты: {e}")
        
        # Сохраняем
        with open(self.db_path, 'w', encoding='utf-8') as f:
            json.dump(self.data, f, ensure_ascii=False, indent=2)
        
        print(f"💾 База сохранена. Users: {current_users}")
    
    def save_to_disk(self):
        """Alias for _save for backward compatibility"""
        self._save()
    
    def _get_default_structure(self) -> Dict[str, Any]:
        """Структура БД по умолчанию"""
        return {
            "settings": {},
            "dataSources": [],
            "feeds": [],
            "products": [],
            "users": [],
            "templates": [],  # Объединенные шаблоны фидов и UTM
            "collections": [],  # Каталоги/подборки товаров для Яндекс
            "logs": [],  # Детальные логи системы
            "analytics": [],  # Статистика из Яндекс.Метрики
            "wordstatSearches": [],  # История поисков Словолова
            "wordstatCache": [],  # Кеш запросов к Yandex Wordstat API
            "trackedPosts": [],  # Отслеживаемые посты с UTM метками
            "parsingState": {},  # Состояние активных процессов парсинга {sourceId: {status, progress, ...}}
            "chats": [],  # Чаты пользователей
            "messages": []  # Сообщения в чатах
        }
    
    # Settings
    def get_settings(self) -> Dict[str, Any]:
        return self.data.get("settings", {})
    
    def update_settings(self, settings: Dict[str, Any]):
        self.data["settings"] = {**self.data.get("settings", {}), **settings}
        self.data["settings"]["updatedAt"] = datetime.now().isoformat()
        self._save()
    
    # Data Sources
    def get_data_sources(self) -> List[Dict[str, Any]]:
        return self.data.get("dataSources", [])
    
    def get_data_source(self, source_id: str) -> Optional[Dict[str, Any]]:
        sources = self.data.get("dataSources", [])
        return next((s for s in sources if s["id"] == source_id), None)
    
    def add_data_source(self, source: Dict[str, Any]) -> Dict[str, Any]:
        if "id" not in source:
            # Generate ID
            sources = self.data.get("dataSources", [])
            max_id = max([int(s["id"].split("_")[1]) for s in sources], default=0)
            source["id"] = f"source_{str(max_id + 1).zfill(3)}"
        
        source["lastSync"] = datetime.now().isoformat()
        self.data.setdefault("dataSources", []).append(source)
        self._save()
        return source
        return source
    
    def update_data_source(self, source_id: str, updates: Dict[str, Any]):
        sources = self.data.get("dataSources", [])
        for i, source in enumerate(sources):
            if source["id"] == source_id:
                sources[i] = {**source, **updates}
                self._save()
                return sources[i]
        return None
    
    def delete_data_source(self, source_id: str) -> bool:
        sources = self.data.get("dataSources", [])
        initial_len = len(sources)
        self.data["dataSources"] = [s for s in sources if s["id"] != source_id]
        if len(self.data["dataSources"]) < initial_len:
            self._save()
            return True
        return False
    
    # Feeds
    def get_feeds(self) -> List[Dict[str, Any]]:
        return self.data.get("feeds", [])
    
    def get_feed(self, feed_id: str) -> Optional[Dict[str, Any]]:
        feeds = self.data.get("feeds", [])
        # Поиск по id или slug
        return next((f for f in feeds if f["id"] == feed_id or f.get("slug") == feed_id), None)
    
    def add_feed(self, feed: Dict[str, Any]) -> Dict[str, Any]:
        if "id" not in feed:
            feeds = self.data.get("feeds", [])
            max_id = max([int(f["id"].split("_")[1]) for f in feeds], default=0)
            feed["id"] = f"feed_{str(max_id + 1).zfill(3)}"
        
        # Генерируем slug из названия если не указан
        if "slug" not in feed or not feed["slug"]:
            feed["slug"] = transliterate(feed.get("name", "feed"))
        
        feed["lastUpdate"] = datetime.now().isoformat()
        self.data.setdefault("feeds", []).append(feed)
        self._save()
        return feed
    
    def update_feed(self, feed_id: str, updates: Dict[str, Any]):
        feeds = self.data.get("feeds", [])
        for i, feed in enumerate(feeds):
            if feed["id"] == feed_id:
                feeds[i] = {**feed, **updates}
                feeds[i]["lastUpdate"] = datetime.now().isoformat()
                self._save()
                return feeds[i]
        return None
    
    def delete_feed(self, feed_id: str) -> bool:
        feeds = self.data.get("feeds", [])
        initial_len = len(feeds)
        self.data["feeds"] = [f for f in feeds if f["id"] != feed_id]
        if len(self.data["feeds"]) < initial_len:
            self._save()
            return True
        return False
    
    # Products
    def get_products(self, source_id: Optional[str] = None) -> List[Dict[str, Any]]:
        products = self.data.get("products", [])
        if source_id:
            return [p for p in products if p.get("sourceId") == source_id]
        return products
    
    def get_product(self, product_id: str) -> Optional[Dict[str, Any]]:
        """Получить товар по ID"""
        products = self.data.get("products", [])
        return next((p for p in products if p["id"] == product_id), None)
    
    def add_products(self, products: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Массовое добавление товаров из парсера"""
        current_time = datetime.now().isoformat()
        
        for product in products:
            # Помечаем как новый товар, если его нет в базе
            existing = next((p for p in self.data.get("products", []) if p["id"] == product["id"]), None)
            if not existing:
                product["isNew"] = True
                product["addedAt"] = current_time
            else:
                # Обновляем существующий товар
                product["isNew"] = False
                product["updatedAt"] = current_time
        
        self.data.setdefault("products", []).extend(products)
        self._save()
        return products
    
    def update_product(self, product_id: str, updates: Dict[str, Any]):
        products = self.data.get("products", [])
        for i, product in enumerate(products):
            if product["id"] == product_id:
                products[i] = {**product, **updates}
                self._save()
                return products[i]
        return None
    
    def update_product_dates(self, product_id: str, dates: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """Обновляет расписание дат для продукта"""
        products = self.data.get("products", [])
        for i, product in enumerate(products):
            if product["id"] == product_id:
                products[i]["dates"] = dates
                products[i]["datesUpdatedAt"] = datetime.now().isoformat()
                self._save()
                return products[i]
        return None
    
    def delete_product(self, product_id: str) -> bool:
        """Удалить товар по ID"""
        products = self.data.get("products", [])
        initial_len = len(products)
        self.data["products"] = [p for p in products if p["id"] != product_id]
        if len(self.data["products"]) < initial_len:
            self._save()
            return True
        return False
    
    def delete_products_by_source(self, source_id: str) -> int:
        """Удаление всех товаров источника перед обновлением"""
        products = self.data.get("products", [])
        initial_len = len(products)
        self.data["products"] = [p for p in products if p.get("sourceId") != source_id]
        deleted = initial_len - len(self.data["products"])
        if deleted > 0:
            self._save()
        return deleted
    
    def mark_missing_products(self, source_id: str, current_product_ids: List[str]):
        """Помечает товары как отсутствующие (скрытые), если они пропали из источника"""
        products = self.data.get("products", [])
        current_time = datetime.now().isoformat()
        
        for product in products:
            if product.get("sourceId") == source_id:
                if product["id"] not in current_product_ids:
                    # Товар пропал - помечаем как скрытый
                    product["hidden"] = True
                    product["hiddenAt"] = current_time
                else:
                    # Товар есть - убираем отметку скрытого, если была
                    product["hidden"] = False
                    if "hiddenAt" in product:
                        del product["hiddenAt"]
        
        self._save()
    
    def sync_products(self, source_id: str, new_products: List[Dict[str, Any]]):
        """Синхронизация товаров: добавляет новые, обновляет существующие, скрывает пропавшие"""
        current_time = datetime.now().isoformat()
        new_product_ids = {p["id"]: p for p in new_products}
        
        # Обрабатываем существующие товары источника
        products = self.data.get("products", [])
        updated_composite_ids = set()
        
        for product in products:
            if product.get("sourceId") == source_id:
                if product["id"] in new_product_ids:
                    # Обновляем существующий товар
                    new_data = new_product_ids[product["id"]]
                    for key, value in new_data.items():
                        product[key] = value
                    product["sourceId"] = source_id
                    product["updatedAt"] = current_time
                    product["hidden"] = False
                    product["isNew"] = False
                    # Используем составной ключ: id + sourceId
                    updated_composite_ids.add((product["id"], source_id))
                else:
                    # Товар пропал - помечаем как скрытый
                    product["hidden"] = True
                    product["hiddenAt"] = current_time
        
        # Добавляем новые товары
        if "products" not in self.data:
            self.data["products"] = []
            
        for product_id, new_product in new_product_ids.items():
            # Проверяем по составному ключу: id + sourceId
            if (product_id, source_id) not in updated_composite_ids:
                # Это новый товар для данного источника
                new_product["sourceId"] = source_id
                new_product["isNew"] = True
                new_product["addedAt"] = current_time
                new_product["hidden"] = False
                self.data["products"].append(new_product)
        
        self._save()
    
    # Users
    def get_user(self, username: str) -> Optional[Dict[str, Any]]:
        # Перезагружаем данные чтобы получить свежих пользователей
        self.reload()
        print(f"=== get_user called ===")
        print(f"Looking for username: '{username}'")
        print(f"Total users in self.data: {len(self.data.get('users', []))}")
        users = self.data.get("users", [])
        for user in users:
            # Ищем по username ИЛИ по email ИЛИ по name ИЛИ по части username до @
            user_username = user.get("username", "")
            user_email = user.get("email", "")
            user_name = user.get("name", "")
            # Также проверяем часть до @ в username
            user_username_prefix = user_username.split('@')[0] if '@' in user_username else user_username
            print(f"Checking user: username='{user_username}', email='{user_email}', name='{user_name}', prefix='{user_username_prefix}' vs '{username}'")
            if user_username == username or user_email == username or user_name == username or user_username_prefix == username:
                print(f"MATCH FOUND: {user}")
                return user
        print(f"NO MATCH FOUND")
        return None
    
    def verify_user(self, username: str, password: str) -> bool:
        print(f"=== verify_user called ===")
        print(f"Username: '{username}', Password: '{password}'")
        user = self.get_user(username)
        print(f"get_user returned: {user}")
        if user is None:
            print("User is None - returning False")
            return False
        result = user["password"] == password
        print(f"Password match: {result} (user password: '{user['password']}' vs provided: '{password}')")
        return result
    
    # Templates
    def get_templates(self) -> List[Dict[str, Any]]:
        """Получить все шаблоны (feed и utm)"""
        return self.data.get("templates", [])
    
    def get_template(self, template_id: str) -> Optional[Dict[str, Any]]:
        """Получить шаблон по ID"""
        templates = self.data.get("templates", [])
        return next((t for t in templates if t["id"] == template_id), None)
    
    def add_template(self, template: Dict[str, Any]) -> Dict[str, Any]:
        """Добавить новый шаблон"""
        self.data.setdefault("templates", []).append(template)
        self._save()
        return template
    
    def update_template(self, template_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Обновить шаблон"""
        templates = self.data.get("templates", [])
        for template in templates:
            if template["id"] == template_id:
                template.update(updates)
                self._save()
                return template
        return None
    
    def delete_template(self, template_id: str) -> bool:
        """Удалить шаблон"""
        templates = self.data.get("templates", [])
        initial_len = len(templates)
        self.data["templates"] = [t for t in templates if t["id"] != template_id]
        if len(self.data["templates"]) < initial_len:
            self._save()
            return True
        return False
    
    # Users
    def get_users(self) -> List[Dict[str, Any]]:
        """Получить список всех пользователей"""
        return self.data.get("users", [])
    
    def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Получить пользователя по ID"""
        users = self.data.get("users", [])
        return next((u for u in users if u["id"] == user_id), None)
    
    def add_user(self, user: Dict[str, Any]) -> Dict[str, Any]:
        """Добавить нового пользователя"""
        # Перезагружаем данные перед добавлением чтобы не потерять внешние изменения
        self.reload()
        if "id" not in user:
            users = self.data.get("users", [])
            max_id = max([int(u["id"].split("_")[1]) if "_" in u["id"] else 0 for u in users], default=0)
            user["id"] = f"user_{str(max_id + 1).zfill(3)}"
        
        user["createdAt"] = datetime.now().isoformat()
        self.data.setdefault("users", []).append(user)
        self._save()
        return user
    
    def update_user(self, user_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Обновить пользователя"""
        # Логируем состояние ДО reload
        old_users = self.data.get("users", [])
        old_user = next((u for u in old_users if u["id"] == user_id), None)
        print(f"🔄 update_user({user_id}): ДО reload - enabledTools: {old_user.get('enabledTools') if old_user else 'NOT FOUND'}")
        
        # Перезагружаем данные перед обновлением чтобы не потерять внешние изменения
        self.reload()
        
        # Логируем состояние ПОСЛЕ reload
        users = self.data.get("users", [])
        user_after = next((u for u in users if u["id"] == user_id), None)
        print(f"🔄 update_user({user_id}): ПОСЛЕ reload - enabledTools: {user_after.get('enabledTools') if user_after else 'NOT FOUND'}")
        print(f"🔄 update_user({user_id}): updates = {updates}")
        
        for user in users:
            if user["id"] == user_id:
                user.update(updates)
                print(f"🔄 update_user({user_id}): ПОСЛЕ update - enabledTools: {user.get('enabledTools')}")
                self._save()
                return user
        return None
    
    def delete_user(self, user_id: str) -> bool:
        """Удалить пользователя"""
        users = self.data.get("users", [])
        initial_len = len(users)
        self.data["users"] = [u for u in users if u["id"] != user_id]
        if len(self.data["users"]) < initial_len:
            self._save()
            return True
        return False
    
    # Logs
    def get_logs(self) -> List[Dict[str, Any]]:
        """Получить все логи"""
        return self.data.get("logs", [])
    
    def add_log(self, log: Dict[str, Any]) -> Dict[str, Any]:
        """Добавить запись в лог"""
        if "id" not in log:
            logs = self.data.get("logs", [])
            log["id"] = f"log_{int(datetime.now().timestamp() * 1000)}"
        
        if "timestamp" not in log:
            log["timestamp"] = datetime.now().isoformat()
        
        self.data.setdefault("logs", []).insert(0, log)  # Новые логи в начале
        
        # Ограничиваем количество логов (храним последние 1000)
        if len(self.data["logs"]) > 1000:
            self.data["logs"] = self.data["logs"][:1000]
        
        self._save()
        
        # Отправляем уведомление в Telegram если включено
        try:
            from telegram_notifier import telegram
            telegram.notify_log(
                log_type=log.get("type", "system"),
                message=log.get("message", ""),
                status=log.get("status", "info")
            )
        except Exception as e:
            print(f"Failed to send Telegram notification: {str(e)}")
        
        return log
    
    def clear_logs(self) -> bool:
        """Очистить все логи"""
        self.data["logs"] = []
        self._save()
        return True
    
    def clear_old_logs(self, days: int = 30):
        """Удалить логи старше указанного количества дней"""
        from datetime import timedelta
        cutoff_date = datetime.now() - timedelta(days=days)
        
        logs = self.data.get("logs", [])
        self.data["logs"] = [
            log for log in logs 
            if datetime.fromisoformat(log["timestamp"]) > cutoff_date
        ]
        self._save()
    
    # Analytics
    def add_analytics_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Добавить данные аналитики из Яндекс.Метрики"""
        analytics = self.data.get("analytics", [])
        
        # Проверяем на дубликаты (по productId, feedId, utm_term, date)
        existing = next(
            (a for a in analytics 
             if a.get("productId") == data.get("productId") 
             and a.get("feedId") == data.get("feedId")
             and a.get("utm_term") == data.get("utm_term")
             and a.get("date") == data.get("date")),
            None
        )
        
        if existing:
            # Обновляем существующую запись
            for i, a in enumerate(analytics):
                if a == existing:
                    analytics[i] = {**existing, **data, "updatedAt": datetime.now().isoformat()}
                    break
        else:
            # Добавляем новую запись
            data["id"] = f"analytics_{int(datetime.now().timestamp() * 1000)}"
            data["createdAt"] = datetime.now().isoformat()
            analytics.append(data)
        
        self.data["analytics"] = analytics
        self._save()
        return data
    
    def get_analytics(self, filters: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """Получить данные аналитики с фильтрацией"""
        analytics = self.data.get("analytics", [])
        
        if not filters:
            return analytics
        
        # Фильтрация
        if "feedId" in filters:
            analytics = [a for a in analytics if a.get("feedId") == filters["feedId"]]
        
        if "productId" in filters:
            analytics = [a for a in analytics if a.get("productId") == filters["productId"]]
        
        if "dateFrom" in filters:
            analytics = [a for a in analytics if a.get("date") >= filters["dateFrom"]]
        
        if "dateTo" in filters:
            analytics = [a for a in analytics if a.get("date") <= filters["dateTo"]]
        
        return analytics
    
    def clear_analytics(self) -> bool:
        """Очистить все данные аналитики"""
        self.data["analytics"] = []
        self._save()
        return True
    
    # Collections (Каталоги товаров)
    def get_collections(self) -> List[Dict[str, Any]]:
        """Получить все каталоги"""
        return self.data.get("collections", [])
    
    def get_collection(self, collection_id: str) -> Optional[Dict[str, Any]]:
        """Получить каталог по ID"""
        collections = self.data.get("collections", [])
        return next((c for c in collections if c["id"] == collection_id), None)
    
    def add_collection(self, collection: Dict[str, Any]) -> Dict[str, Any]:
        """Добавить новый каталог"""
        if "id" not in collection:
            collections = self.data.get("collections", [])
            max_id = max([int(c["id"].split("_")[1]) if "_" in c["id"] else 0 for c in collections], default=0)
            collection["id"] = f"collection_{str(max_id + 1).zfill(3)}"
        
        collection["createdAt"] = datetime.now().isoformat()
        collection["updatedAt"] = datetime.now().isoformat()
        self.data.setdefault("collections", []).append(collection)
        self._save()
        return collection
    
    def update_collection(self, collection_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Обновить каталог"""
        collections = self.data.get("collections", [])
        for collection in collections:
            if collection["id"] == collection_id:
                collection.update(updates)
                collection["updatedAt"] = datetime.now().isoformat()
                self._save()
                return collection
        return None
    
    def delete_collection(self, collection_id: str) -> bool:
        """Удалить каталог"""
        collections = self.data.get("collections", [])
        initial_len = len(collections)
        self.data["collections"] = [c for c in collections if c["id"] != collection_id]
        if len(self.data["collections"]) < initial_len:
            self._save()
            return True
        return False
    
    def add_product_to_collection(self, collection_id: str, product_id: str) -> bool:
        """Добавить товар в каталог"""
        products = self.data.get("products", [])
        for product in products:
            if product["id"] == product_id:
                collection_ids = product.get("collectionIds", [])
                if collection_id not in collection_ids:
                    collection_ids.append(collection_id)
                    product["collectionIds"] = collection_ids
                    self._save()
                    return True
        return False
    
    def remove_product_from_collection(self, collection_id: str, product_id: str) -> bool:
        """Удалить товар из каталога"""
        products = self.data.get("products", [])
        for product in products:
            if product["id"] == product_id:
                collection_ids = product.get("collectionIds", [])
                if collection_id in collection_ids:
                    collection_ids.remove(collection_id)
                    product["collectionIds"] = collection_ids
                    self._save()
                    return True
        return False
    
    # Analytics
    def save_analytics_data(self, analytics_data: Dict[str, Any]) -> None:
        """Сохранить данные аналитики из Яндекс.Метрики"""
        analytics = self.data.get("analytics", [])
        analytics.append(analytics_data)
        # Оставляем только последние 100 записей
        self.data["analytics"] = analytics[-100:]
        self._save()
    
    def get_analytics_history(self) -> List[Dict[str, Any]]:
        """Получить историю аналитических данных"""
        return self.data.get("analytics", [])
    
    # UTM Templates
    def get_utm_templates(self) -> List[Dict[str, Any]]:
        """Получить все UTM шаблоны"""
        templates = self.data.get("templates", [])
        return [t for t in templates if t.get("type") == "utm"]
    
    def get_utm_template(self, template_id: str) -> Optional[Dict[str, Any]]:
        """Получить UTM шаблон по ID"""
        templates = self.get_utm_templates()
        for template in templates:
            if template.get("id") == template_id:
                return template
        return None
    
    def create_utm_template(self, template_data: Dict[str, Any]) -> Dict[str, Any]:
        """Создать новый UTM шаблон"""
        templates = self.data.get("templates", [])
        
        # Генерируем ID
        import uuid
        template_id = str(uuid.uuid4())
        
        new_template = {
            "id": template_id,
            "type": "utm",
            **template_data
        }
        
        templates.append(new_template)
        self.data["templates"] = templates
        self._save()
        
        return new_template
    
    def update_utm_template(self, template_id: str, update_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Обновить UTM шаблон"""
        templates = self.data.get("templates", [])
        
        for i, template in enumerate(templates):
            if template.get("id") == template_id and template.get("type") == "utm":
                templates[i] = {**template, **update_data}
                self.data["templates"] = templates
                self._save()
                return templates[i]
        
        return None
    
    def delete_utm_template(self, template_id: str) -> bool:
        """Удалить UTM шаблон"""
        templates = self.data.get("templates", [])
        initial_length = len(templates)
        
        templates = [t for t in templates if not (t.get("id") == template_id and t.get("type") == "utm")]
        
        if len(templates) < initial_length:
            self.data["templates"] = templates
            self._save()
            return True
        
        return False

    # Tracked Posts
    def get_tracked_posts(self) -> List[Dict[str, Any]]:
        """Получить все отслеживаемые посты"""
        return self.data.get("trackedPosts", [])
    
    def get_tracked_post(self, post_id: str) -> Optional[Dict[str, Any]]:
        """Получить пост по ID"""
        posts = self.get_tracked_posts()
        for post in posts:
            if post.get("id") == post_id:
                return post
        return None
    
    def create_tracked_post(self, post_data: Dict[str, Any]) -> Dict[str, Any]:
        """Создать новый отслеживаемый пост"""
        posts = self.data.get("trackedPosts", [])
        
        # Генерируем ID
        import uuid
        post_id = str(uuid.uuid4())
        
        new_post = {
            "id": post_id,
            **post_data
        }
        
        posts.append(new_post)
        self.data["trackedPosts"] = posts
        self._save()
        
        return new_post
    
    def update_tracked_post(self, post_id: str, update_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Обновить отслеживаемый пост"""
        posts = self.data.get("trackedPosts", [])
        
        for i, post in enumerate(posts):
            if post.get("id") == post_id:
                posts[i] = {**post, **update_data}
                self.data["trackedPosts"] = posts
                self._save()
                return posts[i]
        
        return None
    
    def delete_tracked_post(self, post_id: str) -> bool:
        """Удалить отслеживаемый пост"""
        posts = self.data.get("trackedPosts", [])
        initial_length = len(posts)
        
        posts = [p for p in posts if p.get("id") != post_id]
        
        if len(posts) < initial_length:
            self.data["trackedPosts"] = posts
            self._save()
            return True
        
        return False
    
    # UTM History methods
    def get_utm_history(self) -> List[Dict[str, Any]]:
        """Получить историю генераций UTM"""
        return self.data.get("utmHistory", [])
    
    def create_utm_history_item(self, item_data: Dict[str, Any]) -> Dict[str, Any]:
        """Создать запись в истории UTM"""
        history = self.data.get("utmHistory", [])
        
        import uuid
        item_id = str(uuid.uuid4())
        
        new_item = {
            "id": item_id,
            **item_data
        }
        
        history.insert(0, new_item)  # Новые записи в начало
        self.data["utmHistory"] = history
        self._save()
        
        return new_item
    
    def delete_utm_history_item(self, item_id: str) -> bool:
        """Удалить запись из истории"""
        history = self.data.get("utmHistory", [])
        initial_length = len(history)
        
        history = [item for item in history if item.get("id") != item_id]
        
        if len(history) < initial_length:
            self.data["utmHistory"] = history
            self._save()
            return True
        
        return False
    
    # Parsing State Management
    def get_parsing_state(self, source_id: str) -> Optional[Dict[str, Any]]:
        """Получить состояние парсинга для источника"""
        parsing_state = self.data.get("parsingState", {})
        return parsing_state.get(source_id)
    
    def set_parsing_state(self, source_id: str, state: Dict[str, Any]):
        """Установить состояние парсинга для источника"""
        if "parsingState" not in self.data:
            self.data["parsingState"] = {}
        
        self.data["parsingState"][source_id] = {
            **state,
            "updatedAt": datetime.now().isoformat()
        }
        self._save()
    
    def clear_parsing_state(self, source_id: str):
        """Очистить состояние парсинга для источника"""
        if "parsingState" in self.data and source_id in self.data["parsingState"]:
            del self.data["parsingState"][source_id]
            self._save()
    
    def get_all_parsing_states(self) -> Dict[str, Any]:
        """Получить все активные состояния парсинга"""
        return self.data.get("parsingState", {})
    
    # Messaging System
    def get_chat(self, chat_id: str) -> Optional[Dict[str, Any]]:
        """Получить чат по ID"""
        chats = self.data.get("chats", [])
        return next((c for c in chats if c["id"] == chat_id), None)
    
    def get_user_chats(self, user_id: str) -> List[Dict[str, Any]]:
        """Получить все чаты пользователя"""
        chats = self.data.get("chats", [])
        return [c for c in chats if user_id in c.get("participantIds", [])]
    
    def create_chat(self, chat_data: Dict[str, Any]) -> Dict[str, Any]:
        """Создать новый чат"""
        if "chats" not in self.data:
            self.data["chats"] = []
        
        self.data["chats"].append(chat_data)
        self._save()
        return chat_data
    
    def get_chat_messages(self, chat_id: str) -> List[Dict[str, Any]]:
        """Получить все сообщения чата"""
        messages = self.data.get("messages", [])
        chat_messages = [msg for msg in messages if msg.get("chatId") == chat_id]
        chat_messages.sort(key=lambda x: x.get("createdAt", ""))
        return chat_messages
    
    def add_message(self, message_data: Dict[str, Any]) -> Dict[str, Any]:
        """Добавить сообщение"""
        # Перезагружаем данные перед добавлением чтобы не потерять внешние изменения
        self.reload()
        if "messages" not in self.data:
            self.data["messages"] = []
        
        self.data["messages"].append(message_data)
        self._save()
        return message_data
    
    def update_message(self, message_id: str, update_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Обновить сообщение"""
        messages = self.data.get("messages", [])
        message = next((msg for msg in messages if msg["id"] == message_id), None)
        
        if message:
            message.update(update_data)
            message["updatedAt"] = datetime.now().isoformat()
            self._save()
            return message
        
        return None
    
    def delete_message(self, message_id: str) -> bool:
        """Удалить сообщение"""
        messages = self.data.get("messages", [])
        initial_length = len(messages)
        
        messages = [msg for msg in messages if msg["id"] != message_id]
        
        if len(messages) < initial_length:
            self.data["messages"] = messages
            self._save()
            return True
        
        return False

# Singleton instance
print("Creating Database singleton instance...")
db = Database()
print(f"Database singleton created. Users: {len(db.data.get('users', []))}")
