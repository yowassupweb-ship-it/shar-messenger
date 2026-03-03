# Backend - Shar Messenger

Бэкенд приложения на FastAPI с поддержкой JSON и PostgreSQL баз данных.

## 🚀 Быстрый старт

### Развёртывание с JSON (по умолчанию)
```bash
cd vs-tools/backend
pip install -r requirements.txt
python main.py
```

### Развёртывание с PostgreSQL
```bash
cd vs-tools/backend

# 1. Запустить PostgreSQL
docker-compose up -d

# 2. Запустить миграцию
python db_switch.py migrate

# 3. Переключиться на PostgreSQL
python db_switch.py to-postgres

# 4. Перезапустить приложение
pkill -f "uvicorn main:app"
python main.py
```

---

## 📚 Документация

### Миграция на PostgreSQL
- **Быстрый старт:** [POSTGRES_QUICKSTART.md](./POSTGRES_QUICKSTART.md) ⚡ (5 мин)
- **Полный гайд:** [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) 📚 (30 мин)
- **Для сервера:** [SERVER_MIGRATION_STEPS.md](./SERVER_MIGRATION_STEPS.md) 🖥️
- **Описание файлов:** [FILES_OVERVIEW.md](./FILES_OVERVIEW.md) 📋

---

## 🏗️ Структура проекта

```
backend/
├── main.py                      # Главное приложение FastAPI
├── database.py                  # JSON база данных (оригинальная)
├── db_postgres.py               # PostgreSQL модуль
├── db_adapter.py                # Адаптер JSON/PostgreSQL
├── schema.sql                   # SQL схема для PostgreSQL
├── migrate_to_postgres.py       # Скрипт миграции
├── db_switch.py                 # Утилита переключения БД
├── docker-compose.yml           # Docker конфиг для PostgreSQL
├── .env.example                 # Пример конфигурации
├── requirements.txt             # Python зависимости
│
├── parser/                      # Парсеры данных
│   ├── tour_parser.py
│   ├── tour_dates_parser.py
│   └── ...
│
├── uploads/                     # Загруженные файлы
├── data/                        # Кеш и временные данные
│
├── database.json                # JSON база (автоматически создаётся)
└── DOCUMENTATION/               # Документация
    ├── POSTGRES_QUICKSTART.md
    ├── MIGRATION_GUIDE.md
    ├── SERVER_MIGRATION_STEPS.md
    └── FILES_OVERVIEW.md
```

---

## ⚙️ Конфигурация

### Переменные окружения (.env)

```env
# PostgreSQL подключение
DB_HOST=localhost
DB_PORT=5432
DB_NAME=shar_messenger
DB_USER=postgres
DB_PASSWORD=postgres

# Использовать PostgreSQL
USE_POSTGRES=false  # true для PostgreSQL, false для JSON

# Сохранить JSON как резервную копию
KEEP_JSON_BACKUP=true

# ВАЖНО: постоянное хранилище вложений/аватаров (вне папки релиза)
# Пример Linux: /var/lib/shar/uploads
# Пример Windows: D:/shar/uploads
SHAR_UPLOADS_DIR=/var/lib/shar/uploads
```

### Защита вложений от передеплоев

- Файлы из `POST /api/upload` и `POST /api/avatars` сохраняются в директорию `SHAR_UPLOADS_DIR`.
- Для продакшена указывайте путь **вне** `backend/` и **вне** каталога сборки/релиза.
- Если `SHAR_UPLOADS_DIR` не задан, используется локальная папка `backend/uploads` (подходит только для dev).

---

## 🔄 Переключение между БД

### Проверить текущий статус
```bash
python db_switch.py status
```

### Переключиться на PostgreSQL
```bash
python db_switch.py to-postgres
```

### Вернуться на JSON
```bash
python db_switch.py to-json
```

### Запустить миграцию
```bash
python db_switch.py migrate
```

---

## 🗄️ API Endpoints

### Пользователи
- `GET /api/users` - Все пользователи
- `GET /api/users/{user_id}` - Конкретный пользователь
- `POST /api/users` - Создать пользователя
- `PUT /api/users/{user_id}` - Обновить пользователя

### Чаты
- `GET /api/chats` - Все чаты
- `GET /api/chats/{chat_id}` - Конкретный чат
- `POST /api/chats` - Создать чат
- `DELETE /api/chats/{chat_id}` - Удалить чат

### Сообщения
- `GET /api/chats/{chat_id}/messages` - Сообщения чата
- `POST /api/chats/{chat_id}/messages` - Отправить сообщение
- `PATCH /api/chats/{chat_id}/messages/{message_id}` - Редактировать
- `DELETE /api/chats/{chat_id}/messages/{message_id}` - Удалить

### Источники данных
- `GET /api/data-sources` - Все источники
- `POST /api/data-sources` - Создать источник
- `PUT /api/data-sources/{source_id}` - Обновить источник
- `DELETE /api/data-sources/{source_id}` - Удалить источник

### Продукты
- `GET /api/products` - Все продукты
- `GET /api/products/{product_id}` - Конкретный продукт
- `PUT /api/products/{product_id}` - Обновить продукт

### Другое
- `GET /api/settings` - Настройки
- `PUT /api/settings` - Обновить настройки
- `POST /api/upload` - Загрузить файл
- `POST /api/avatars` - Загрузить аватар

---

## 🛠️ Разработка

### Установка зависимостей
```bash
pip install -r requirements.txt
```

### Запуск в режиме разработки
```bash
python main.py
# или
uvicorn main:app --reload
```

### Запуск с горячей перезагрузкой
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Отладка
```bash
python -m pdb main.py
```

---

## 🐳 Docker

### Запустить PostgreSQL локально
```bash
docker-compose up -d
```

### Остановить
```bash
docker-compose down
```

### Удалить все (включая данные)
```bash
docker-compose down -v
```

### Подключиться к базе через PgAdmin
- Адрес: http://localhost:5050
- Email: admin@local.dev
- Пароль: admin123

---

## 📊 Мониторинг

### Логи приложения
```bash
tail -f backend.log
```

### Проверить статус БД
```bash
python db_switch.py status
```

### Проверить записи в таблице
```bash
# PostgreSQL
psql -h localhost -U postgres -d shar_messenger -c "SELECT COUNT(*) FROM users;"

# Или через Python
python3 << 'EOF'
from db_adapter import db
users = db.get_users()
print(f"Всего пользователей: {len(users)}")
EOF
```

---

## 🔐 Безопасность

### На продакшене
- Используй переменные окружения для всех секретов
- Включи SSL для PostgreSQL
- Ограничь доступ к БД
- Используй сильные пароли
- Регулярно делай резервные копии

### Пример .env для продакшена
```env
DB_HOST=prod-db.example.com
DB_PORT=5432
DB_NAME=shar_messenger
DB_USER=shar_app
DB_PASSWORD=SuperSecurePassword123!@#
USE_POSTGRES=true
```

---

## 🚨 Откат

### Если что-то пошло не так
```bash
# 1. Остановить приложение
pkill -f "uvicorn main:app"

# 2. Переключиться на JSON
python db_switch.py to-json

# 3. Перезапустить
python main.py
```

### Восстановление из резервной копии
```bash
# Для PostgreSQL
psql -h localhost -U postgres -d shar_messenger < backup.sql

# Для JSON
cp database.json.backup.20260203_120000 database.json
```

---

## 📞 Поддержка

### Проблемы с подключением
- Проверить что PostgreSQL запущен: `docker ps`
- Проверить .env переменные
- Проверить логи: `docker-compose logs postgres`

### Проблемы с миграцией
- Прочитай [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)
- Проверь логи миграции: `tail migrate_to_postgres.log`
- Попробуй запустить снова

### Проблемы с API
- Проверить что приложение запущено: `curl http://localhost:8000/`
- Проверить логи: `tail backend.log | grep ERROR`
- Проверить конфигурацию БД: `python db_switch.py status`

---

## 📝 Лицензия

Проект Shar Messenger

---

## 🎉 Готово!

Приложение готово к использованию!

**Советуем:**
1. Прочитать [POSTGRES_QUICKSTART.md](./POSTGRES_QUICKSTART.md) для быстрого старта
2. Настроить мониторинг
3. Сделать резервную копию
4. Начать разработку!

Happy coding! 🚀
