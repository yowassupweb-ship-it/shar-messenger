# Полный гайд миграции с database.json на PostgreSQL

## ⚠️ Предварительная подготовка

### 1️⃣ Создать резервную копию текущих данных
```bash
# На сервере
cp database.json database.json.backup.$(date +%Y%m%d_%H%M%S)
```

### 2️⃣ Убедиться что никто не использует приложение
- Предупредить всех пользователей о техническом обслуживании
- Приостановить автоматические синхронизации парсеров
- Убедиться что нет активных операций в БД

---

## 🔧 Установка PostgreSQL

### На локальной машине (для разработки):
```bash
# Запустить PostgreSQL через Docker Compose
cd vs-tools/backend
docker-compose up -d

# Проверить что БД работает
docker ps | grep postgres

# Подключиться и проверить
psql -h localhost -U postgres -d postgres -c "SELECT 1"
```

### На боевом сервере:
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# Создать БД и пользователя
sudo -u postgres psql <<EOF
CREATE DATABASE shar_messenger;
CREATE USER shar_user WITH PASSWORD 'strong_password_here';
GRANT ALL PRIVILEGES ON DATABASE shar_messenger TO shar_user;
EOF

# Проверить подключение
psql -h localhost -U shar_user -d shar_messenger -c "SELECT 1"
```

---

## 📋 Инициализация схемы

```bash
# На машине где вы будете запускать миграцию
cd vs-tools/backend

# Создать все таблицы в PostgreSQL
psql -h localhost -U postgres -d shar_messenger < schema.sql

# Проверить что таблицы созданы
psql -h localhost -U postgres -d shar_messenger -c "\dt"
```

---

## 🚀 Миграция данных (основной процесс)

### Шаг 1: Убедиться что все зависимости установлены
```bash
cd vs-tools/backend

# Установить psycopg2 и другие зависимости
pip install -r requirements.txt

# Или если уже установлены
pip install psycopg2-binary
```

### Шаг 2: Настроить переменные окружения
```bash
# Создать или обновить .env файл
cat > .env << 'EOF'
DB_HOST=localhost          # или IP сервера
DB_PORT=5432
DB_NAME=shar_messenger
DB_USER=postgres           # или shar_user на продакшене
DB_PASSWORD=postgres       # используй правильный пароль
USE_POSTGRES=false         # НЕ меняй на true ДО миграции!
EOF
```

### Шаг 3: Запустить скрипт миграции (СУХОЙ ЗАПУСК)
```bash
# Сначала проверить что всё работает правильно
python migrate_to_postgres.py

# Скрипт выведет:
# ✅ Loaded JSON database from database.json
# 🔌 Connecting to PostgreSQL...
# ✅ Connected to PostgreSQL: postgres@localhost:5432/shar_messenger
# 📝 Creating database schema...
# 📦 Migrating X users...
# 📦 Migrating X data sources...
# и т.д.
```

### Шаг 4: Проверить что данные перенеслись
```bash
# Проверить количество пользователей
psql -h localhost -U postgres -d shar_messenger -c "SELECT COUNT(*) FROM users;"

# Проверить количество сообщений
psql -h localhost -U postgres -d shar_messenger -c "SELECT COUNT(*) FROM messages;"

# Проверить количество чатов
psql -h localhost -U postgres -d shar_messenger -c "SELECT COUNT(*) FROM chats;"

# Полная статистика
psql -h localhost -U postgres -d shar_messenger << 'EOF'
SELECT 'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'chats', COUNT(*) FROM chats
UNION ALL
SELECT 'messages', COUNT(*) FROM messages
UNION ALL
SELECT 'products', COUNT(*) FROM products
UNION ALL
SELECT 'data_sources', COUNT(*) FROM data_sources;
EOF
```

---

## 🔄 Переключение приложения на PostgreSQL

### Шаг 1: Обновить main.py для использования PostgreSQL
```bash
# В vs-tools/backend/main.py измени строку:
# from database import db
# НА:
# from db_adapter import db

# Или используй переменную окружения:
# if os.getenv('USE_POSTGRES', 'false') == 'true':
#     from db_adapter import db
# else:
#     from database import Database
#     db = Database('database.json')
```

### Шаг 2: Обновить .env файл
```bash
# Измени USE_POSTGRES с false на true
cat > .env << 'EOF'
DB_HOST=localhost
DB_PORT=5432
DB_NAME=shar_messenger
DB_USER=postgres
DB_PASSWORD=postgres
USE_POSTGRES=true        # ✅ ВКЛЮЧИ ЭТО
KEEP_JSON_BACKUP=true    # Держи JSON как резервную копию
EOF
```

### Шаг 3: Перезапустить приложение
```bash
# Остановить старое приложение
pkill -f "uvicorn main:app"

# Или если используется PM2
pm2 stop backend

# Запустить с новыми настройками
cd vs-tools/backend
python main.py

# Или через PM2
pm2 start main.py --name backend
```

---

## ✅ Проверка после миграции

### 1. Проверить API endpoints
```bash
# Получить пользователей
curl http://localhost:8000/api/users

# Получить чаты
curl http://localhost:8000/api/chats?user_id=user_1769584624.933692

# Получить сообщения конкретного чата
curl http://localhost:8000/api/chats/chat_id/messages

# Получить источники данных
curl http://localhost:8000/api/data-sources
```

### 2. Проверить в UI (фронтенде)
- Загрузить приложение в браузер
- Проверить что видны все чаты
- Проверить что видны все сообщения
- Отправить тестовое сообщение
- Проверить что оно сохранилось в БД

### 3. Проверить логи на предмет ошибок
```bash
# Смотреть логи приложения
tail -f /var/log/shar-messenger/backend.log

# Или если запущено в консоли
# Искать строки с ERROR или Exception
```

---

## 🛡️ Откат на JSON (если что-то пошло не так)

### Быстрый откат
```bash
# 1. Остановить приложение
pkill -f "uvicorn main:app"

# 2. Обновить .env
sed -i 's/USE_POSTGRES=true/USE_POSTGRES=false/' .env

# 3. Перезапустить (вернётся к JSON)
python main.py
```

### Полный откат (если БД повреждена)
```bash
# 1. Удалить PostgreSQL контейнер (если Docker)
docker-compose down

# 2. Восстановить JSON из резервной копии
cp database.json.backup.20260203_120000 database.json

# 3. Перезапустить приложение с JSON
cat > .env << 'EOF'
USE_POSTGRES=false
EOF
python main.py
```

---

## 📊 Мониторинг после переключения

### Запустить регулярные проверки (1 неделю)
```bash
# Скрипт для ежедневной проверки целостности
cat > health_check.sh << 'EOF'
#!/bin/bash
echo "=== PostgreSQL Health Check ==="
psql -h localhost -U postgres -d shar_messenger << 'SQL'
SELECT 
  'Users: ' || COUNT(*) FROM users
UNION ALL
SELECT 'Chats: ' || COUNT(*) FROM chats
UNION ALL
SELECT 'Messages: ' || COUNT(*) FROM messages
UNION ALL
SELECT 'Products: ' || COUNT(*) FROM products;
SQL

# Проверить что нет ошибок в логах
grep ERROR /var/log/shar-messenger/backend.log | tail -10
EOF

chmod +x health_check.sh
./health_check.sh
```

---

## 🔐 На продакшене (отличия)

### Дополнительная безопасность
```bash
# 1. Использовать отдельного пользователя БД (не postgres)
sudo -u postgres psql << 'EOF'
CREATE USER shar_app WITH PASSWORD 'very_strong_password_123!@#';
GRANT CONNECT ON DATABASE shar_messenger TO shar_app;
GRANT USAGE ON SCHEMA public TO shar_app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO shar_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO shar_app;
EOF

# 2. Включить SSL для подключения
# В postgresql.conf: ssl = on

# 3. Ограничить подключения
# В pg_hba.conf: только с определённых IP

# 4. Включить автоматическое резервное копирование
# Через pg_dump или tools like pgBackRest

# 5. Отключить доступ с фронтенда напрямую к БД
# Все запросы ТОЛЬКО через API backend
```

### Мониторинг на продакшене
```bash
# Установить pgAdmin для удаленного мониторинга
docker run --name pgadmin -p 5050:80 \
  -e PGADMIN_DEFAULT_EMAIL=admin@example.com \
  -e PGADMIN_DEFAULT_PASSWORD=admin \
  -d dpage/pgadmin4

# Установить prometheus для метрик
# Установить grafana для графиков
```

---

## 📝 Чек-лист миграции

- [ ] Создана резервная копия database.json
- [ ] PostgreSQL установлена и работает
- [ ] Таблицы созданы через schema.sql
- [ ] Все зависимости (psycopg2) установлены
- [ ] .env файл настроен правильно
- [ ] Запущен скрипт migrate_to_postgres.py
- [ ] Проверены количества записей в каждой таблице
- [ ] Обновлён main.py для использования db_adapter
- [ ] USE_POSTGRES=true в .env файле
- [ ] Приложение перезапущено
- [ ] Проверены API endpoints
- [ ] Проверены функции в UI
- [ ] Отправлено тестовое сообщение
- [ ] Проверены логи на ошибки
- [ ] Все работает 24 часа без проблем
- [ ] JSON база удалена (опционально, после подтверждения)

---

## 🚨 Что НЕ делать

❌ Не удаляй database.json сразу - держи как резервную копию неделю  
❌ Не меняй USE_POSTGRES=true ДО завершения полной миграции  
❌ Не отключай авто-синхронизацию парсеров ДО завершения тестирования  
❌ Не даёшь доступ фронтенду напрямую к PostgreSQL - ТОЛЬКО через API  
❌ Не забываешь делать резервные копии перед переходом  
❌ Не используешь пароль "postgres" на продакшене  

---

## 📞 Если что-то пошло не так

### Частые проблемы

**1. "psycopg2: connection refused"**
```bash
# Проверить что PostgreSQL работает
docker ps
# Или
sudo systemctl status postgresql
```

**2. "table users does not exist"**
```bash
# Проверить что schema.sql выполнен
psql -h localhost -U postgres -d shar_messenger -c "\dt"
# Если таблиц нет - запустить
psql -h localhost -U postgres -d shar_messenger < schema.sql
```

**3. "permission denied for schema public"**
```bash
# Дать права пользователю
sudo -u postgres psql shar_messenger << 'EOF'
GRANT ALL ON SCHEMA public TO shar_user;
GRANT ALL ON ALL TABLES IN SCHEMA public TO shar_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO shar_user;
EOF
```

**4. Данные не перенеслись**
```bash
# Проверить логи миграции
python migrate_to_postgres.py 2>&1 | tee migration.log

# Если есть ошибки - посмотреть их в migration.log
cat migration.log | grep ERROR
```

---

## ✨ После успешной миграции

```bash
# 1. Сделать новую резервную копию PostgreSQL
pg_dump -h localhost -U postgres shar_messenger > shar_messenger.sql

# 2. Архивировать старый JSON
tar czf database.json.backup.tar.gz database.json*

# 3. Переместить резервные копии на другой сервер
scp shar_messenger.sql backup@backup-server:/backups/

# 4. Включить автоматическое резервное копирование PostgreSQL
# Например через крон или pgBackRest

# 5. Удалить старый JSON (опционально)
# rm database.json
```

Готово! 🎉
