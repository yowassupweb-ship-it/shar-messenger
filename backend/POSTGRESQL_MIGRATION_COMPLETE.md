# Настройка единой базы данных PostgreSQL

## ✅ Что сделано

1. **Мигрированы все данные** из JSON в PostgreSQL:
   - 20 пользователей
   - 1 событие
   - 4 ссылки
   - 49 задач
   - Все источники данных и продукты

2. **Создана полная схема БД** с таблицами:
   - users, events, links, tasks
   - data_sources, feeds, products
   - chats, messages, chat_participants
   - templates, collections, analytics
   - и другие

3. **Приложение переключено на PostgreSQL** через `.env`:
   ```
   USE_POSTGRES=true
   ```

## 🔧 Конфигурация

### Локальная разработка
Файл: `backend/.env`
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=shar_messenger
DB_USER=postgres
DB_PASSWORD=Traplord999!
USE_POSTGRES=true
```

### Продакшн (сервер)
Вариант 1: **Локальная БД на сервере** (рекомендуется для начала)
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=shar_messenger
DB_USER=postgres
DB_PASSWORD=<ваш_пароль>
USE_POSTGRES=true
```

Вариант 2: **Удаленное подключение** (для доступа с локальной машины к серверной БД)
```env
DB_HOST=81.90.31.129
DB_PORT=5432
DB_NAME=shar_messenger
DB_USER=postgres
DB_PASSWORD=<ваш_пароль>
USE_POSTGRES=true
```

## 🚀 Следующие шаги

### 1. Установка PostgreSQL на сервере
```bash
ssh root@81.90.31.129

# Установка PostgreSQL
apt update
apt install postgresql postgresql-contrib

# Создание базы данных
sudo -u postgres psql
CREATE DATABASE shar_messenger;
CREATE USER shar_user WITH PASSWORD 'сильный_пароль';
GRANT ALL PRIVILEGES ON DATABASE shar_messenger TO shar_user;
\q
```

### 2. Инициализация схемы на сервере
```bash
# Скопировать schema.sql на сервер
scp backend/schema.sql root@81.90.31.129:/tmp/

# На сервере
ssh root@81.90.31.129
sudo -u postgres psql -d shar_messenger < /tmp/schema.sql
```

### 3. Миграция данных на сервер
```bash
# Вариант A: Скопировать и запустить скрипт миграции на сервере
scp backend/database.json root@81.90.31.129:/var/www/feed-editor/backend/
scp backend/migrate_full.py root@81.90.31.129:/var/www/feed-editor/backend/

ssh root@81.90.31.129
cd /var/www/feed-editor/backend
python3 migrate_full.py

# Вариант B: Создать дамп локальной БД и загрузить на сервер
pg_dump -h localhost -U postgres -d shar_messenger > dump.sql
scp dump.sql root@81.90.31.129:/tmp/
ssh root@81.90.31.129 "sudo -u postgres psql -d shar_messenger < /tmp/dump.sql"
```

### 4. Обновить .env на сервере
```bash
ssh root@81.90.31.129
cd /var/www/feed-editor/backend
nano .env

# Добавить:
USE_POSTGRES=true
DB_HOST=localhost
DB_PORT=5432
DB_NAME=shar_messenger
DB_USER=postgres
DB_PASSWORD=<пароль>
```

### 5. Перезапустить сервисы
```bash
systemctl restart feed-editor-backend.service
systemctl restart feed-editor-frontend.service
```

## 🔒 Настройка удаленного доступа (опционально)

Если нужен доступ к PostgreSQL на сервере с локальной машины:

### На сервере:

1. Редактировать `postgresql.conf`:
```bash
sudo nano /etc/postgresql/16/main/postgresql.conf
# Раскомментировать и изменить:
listen_addresses = '*'
```

2. Редактировать `pg_hba.conf`:
```bash
sudo nano /etc/postgresql/16/main/pg_hba.conf
# Добавить:
host    shar_messenger    postgres    0.0.0.0/0    scram-sha-256
```

3. Перезапустить PostgreSQL:
```bash
systemctl restart postgresql
```

4. Открыть порт в файрволе:
```bash
ufw allow 5432/tcp
```

## 📊 Проверка работы

### Локально
```bash
cd backend
python test_postgres.py
```

### На сервере
```bash
ssh root@81.90.31.129
cd /var/www/feed-editor/backend
python3 -c "from db_adapter import db; print(f'Users: {len(db.get_users())}')"
```

## 🎯 Преимущества

✅ **Единая база данных** - нет разрозненных JSON файлов  
✅ **Целостность данных** - внешние ключи, транзакции  
✅ **Производительность** - индексы, оптимизированные запросы  
✅ **Надежность** - резервное копирование, репликация  
✅ **Масштабируемость** - готовность к росту данных  
✅ **Безопасность** - контроль доступа, шифрование  

## 🔄 Резервное копирование

### Автоматический бэкап (настроить на сервере)
```bash
# Создать скрипт /usr/local/bin/backup-postgres.sh
#!/bin/bash
BACKUP_DIR="/var/backups/postgres"
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -U postgres shar_messenger > $BACKUP_DIR/shar_messenger_$DATE.sql
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete

# Добавить в crontab
crontab -e
0 2 * * * /usr/local/bin/backup-postgres.sh
```

## ⚠️ Важно

- JSON файлы сохранены как `.backup` для безопасности
- Адаптер `db_adapter.py` автоматически выбирает БД по `USE_POSTGRES`
- При `USE_POSTGRES=false` приложение вернется к JSON
- Рекомендуется держать `USE_POSTGRES=true` постоянно
