# Инструкции для сервера: Миграция на PostgreSQL

## 🎯 Цель
Перенести все данные из JSON (database.json) на PostgreSQL без потерь

---

## 📋 ШАГ ЗА ШАГОМ

### ШАГ 1: Подготовка (30 мин)

#### 1.1 На локальной машине - создать резервную копию
```bash
cd vs-tools/backend
cp database.json database.json.backup.$(date +%Y%m%d_%H%M%S)
echo "✅ Резервная копия создана"
```

#### 1.2 Убедиться что никто не работает с приложением
- Отправить сообщение в чат о техническом обслуживании
- Подождать пока все закроют приложение
- Остановить парсеры (если они работают)

#### 1.3 На сервере - установить PostgreSQL (если его нет)

**Для Ubuntu/Debian:**
```bash
# SSH на сервер
ssh user@server.com

# Обновить пакеты
sudo apt update

# Установить PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Проверить что работает
sudo systemctl status postgresql
```

**Для CentOS/RHEL:**
```bash
sudo yum install -y postgresql-server postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### 1.4 На сервере - создать БД и пользователя
```bash
# Подключиться к PostgreSQL
sudo -u postgres psql

# В psql консоли выполнить:
CREATE DATABASE shar_messenger;
CREATE USER shar_app WITH PASSWORD 'SuperSecurePassword123!';
GRANT ALL PRIVILEGES ON DATABASE shar_messenger TO shar_app;
ALTER ROLE shar_app CREATEDB;

# Выход
\q
```

#### 1.5 На сервере - инициализировать схему БД
```bash
# Скопировать schema.sql на сервер
scp vs-tools/backend/schema.sql user@server.com:/tmp/

# На сервере - выполнить SQL
psql -h localhost -U shar_app -d shar_messenger < /tmp/schema.sql

# Проверить что таблицы созданы
psql -h localhost -U shar_app -d shar_messenger -c "\dt"
```

---

### ШАГ 2: Установка зависимостей (10 мин)

#### 2.1 На локальной машине - установить пакеты
```bash
cd vs-tools/backend

# Обновить requirements.txt (уже сделано)
# psycopg2-binary, asyncpg, sqlalchemy должны быть там

# Установить
pip install -r requirements.txt
```

#### 2.2 На сервере - установить те же пакеты
```bash
cd ~/shar-messenger/vs-tools/backend
pip install -r requirements.txt
```

---

### ШАГ 3: Конфигурация (5 мин)

#### 3.1 На локальной машине - создать `.env` для миграции
```bash
cd vs-tools/backend

cat > .env << 'EOF'
# PostgreSQL подключение к СЕРВЕРУ
DB_HOST=server.com              # или IP адрес сервера
DB_PORT=5432
DB_NAME=shar_messenger
DB_USER=shar_app
DB_PASSWORD=SuperSecurePassword123!

# Не переключаться пока не закончим миграцию!
USE_POSTGRES=false

# Сохранить JSON как резервную копию
KEEP_JSON_BACKUP=true
EOF
```

#### 3.2 Проверить подключение
```bash
python3 << 'EOF'
import psycopg2
try:
    conn = psycopg2.connect(
        host="server.com",
        port=5432,
        database="shar_messenger",
        user="shar_app",
        password="SuperSecurePassword123!"
    )
    print("✅ Подключение успешно!")
    conn.close()
except Exception as e:
    print(f"❌ Ошибка подключения: {e}")
EOF
```

---

### ШАГ 4: Запуск миграции (5-30 мин в зависимости от объёма)

#### 4.1 На локальной машине - запустить скрипт миграции
```bash
cd vs-tools/backend

# ГЛАВНАЯ КОМАНДА - миграция
python migrate_to_postgres.py

# На экране появится:
# ✅ Loaded JSON database from database.json
# 🔌 Connecting to PostgreSQL...
# ✅ Connected to PostgreSQL: shar_app@server.com:5432/shar_messenger
# 📝 Creating database schema...
# 📦 Migrating X users...
# 📦 Migrating X chats...
# 📦 Migrating X messages...
# ... и т.д.
#
# 📊 MIGRATION SUMMARY
# =====================
# Users:          X
# Chats:          X
# Messages:       X
# Products:       X
# ... итого
#
# ✅ Migration completed successfully!
```

#### 4.2 Проверить что всё перенеслось
```bash
# На локальной машине
python db_switch.py status

# Результат должен показать:
# ✓ Current Database: JSON
# ✓ Record Counts:
#   - users: X
#   - chats: X
#   - messages: X
#   - products: X
#   - data_sources: X
#   - feeds: X

# На сервере - подключиться и проверить
psql -h localhost -U shar_app -d shar_messenger << 'EOF'
SELECT 'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'chats', COUNT(*) FROM chats
UNION ALL
SELECT 'messages', COUNT(*) FROM messages
UNION ALL
SELECT 'products', COUNT(*) FROM products;
EOF
```

---

### ШАГ 5: Тестирование (15 мин)

#### 5.1 На сервере - обновить .env для использования PostgreSQL
```bash
cd ~/shar-messenger/vs-tools/backend

cat > .env << 'EOF'
# PostgreSQL подключение
DB_HOST=localhost           # На сервере используем localhost
DB_PORT=5432
DB_NAME=shar_messenger
DB_USER=shar_app
DB_PASSWORD=SuperSecurePassword123!

# ВКЛЮЧИТЬ использование PostgreSQL
USE_POSTGRES=true

# Сохранить JSON как резервную копию
KEEP_JSON_BACKUP=true
EOF
```

#### 5.2 На сервере - перезапустить приложение
```bash
# Остановить старое приложение
sudo systemctl stop shar-backend    # или как у вас называется сервис

# Или если запущено вручную
pkill -f "uvicorn main:app"

# Подождать 2-3 секунды
sleep 3

# Запустить снова (может быть разными способами)
# Способ 1: systemd сервис
sudo systemctl start shar-backend

# Способ 2: PM2
pm2 restart backend

# Способ 3: вручную (для тестирования)
python main.py

# Способ 4: Нohup для фонового запуска
nohup python main.py > backend.log 2>&1 &
```

#### 5.3 Проверить что приложение работает
```bash
# Проверить что процесс запущен
ps aux | grep "uvicorn main:app"

# Проверить логи
tail -50 backend.log | grep -i error

# Проверить API
curl http://localhost:8000/api/users

# Результат должен быть JSON со списком пользователей
# Если вместо JSON - ошибка, значит что-то не так
```

#### 5.4 Протестировать в браузере
- Открыть приложение: http://server.com:8000
- Проверить что видны все чаты
- Проверить что видны все сообщения
- Отправить тестовое сообщение
- Проверить что оно появилось в БД:
  ```bash
  psql -h localhost -U shar_app -d shar_messenger -c "SELECT * FROM messages ORDER BY created_at DESC LIMIT 1;"
  ```

---

### ШАГ 6: После успешного переключения

#### 6.1 На локальной машине - обновить свой .env для локального использования
```bash
cd vs-tools/backend

cat > .env.local << 'EOF'
# Для локальной разработки с локальным PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=shar_messenger
DB_USER=postgres
DB_PASSWORD=postgres
USE_POSTGRES=true
EOF

# Использовать при необходимости:
# cp .env.local .env
```

#### 6.2 На сервере - настроить автоматические резервные копии
```bash
# Создать скрипт backup
sudo mkdir -p /backups/postgres

sudo cat > /usr/local/bin/backup-postgres.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backups/postgres"
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -h localhost -U shar_app shar_messenger | gzip > $BACKUP_DIR/shar_messenger_$DATE.sql.gz
# Удалить старые бэкапы старше 30 дней
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
EOF

sudo chmod +x /usr/local/bin/backup-postgres.sh

# Добавить в cron (ежедневно в 2 часа ночи)
sudo crontab -e
# Добавить строку:
# 0 2 * * * /usr/local/bin/backup-postgres.sh
```

#### 6.3 На сервере - включить SSL для PostgreSQL (опционально, но рекомендуется)
```bash
# Для дополнительной безопасности - см. PostgreSQL документацию
# Для начала можно оставить как есть
```

---

## ⚠️ ЕСЛИ ЧТО-ТО ПОШЛО НЕ ТАК

### Проблема: "psycopg2: connection refused"
```bash
# Проверить что PostgreSQL работает
sudo systemctl status postgresql

# Если не работает - перезапустить
sudo systemctl restart postgresql

# Проверить логи
sudo tail -50 /var/log/postgresql/postgresql.log
```

### Проблема: "permission denied"
```bash
# Проверить права пользователя
sudo -u postgres psql -d shar_messenger -c "\du"

# Если прав нет - дать
sudo -u postgres psql << 'EOF'
GRANT ALL ON SCHEMA public TO shar_app;
GRANT ALL ON ALL TABLES IN SCHEMA public TO shar_app;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO shar_app;
EOF
```

### Проблема: Данные не перенеслись
```bash
# Проверить логи миграции
grep ERROR migrate_to_postgres.log

# Повторить миграцию
python migrate_to_postgres.py 2>&1 | tee migration_retry.log

# Если проблемы с Foreign Keys - пересоздать таблицы
# (требует осторожности, сначала бэкап!)
```

### Срочный откат на JSON
```bash
# На сервере - остановить приложение
sudo systemctl stop shar-backend

# Обновить .env
sudo nano ~/shar-messenger/vs-tools/backend/.env
# Изменить USE_POSTGRES=false

# Перезапустить
sudo systemctl start shar-backend

# Проверить
curl http://localhost:8000/api/users
```

---

## 📊 Мониторинг после переключения

### Первые 24 часа
```bash
# Каждый час проверять логи
tail -100 backend.log | grep ERROR

# Проверить размер БД
du -sh /var/lib/postgresql/13/main/

# Проверить количество подключений
psql -h localhost -U shar_app -d shar_messenger -c "SELECT count(*) FROM pg_stat_activity;"
```

### Первую неделю
```bash
# Проверять статистику
python db_switch.py status

# Проверять что парсеры работают
# Проверять что пользователи активны

# Если всё хорошо неделю - удалить старые JSON бэкапы (опционально)
```

---

## ✅ Финальный чек-лист

- [ ] Создана резервная копия database.json
- [ ] PostgreSQL установлена на сервере
- [ ] База и пользователь созданы в PostgreSQL
- [ ] Schema.sql выполнен
- [ ] Все зависимости установлены
- [ ] .env правильно настроен
- [ ] Миграция запущена и завершена
- [ ] Проверены количества записей в таблицах
- [ ] .env обновлён для использования PostgreSQL
- [ ] Приложение перезапущено
- [ ] API endpoints работают
- [ ] Функции работают в браузере
- [ ] Отправлено тестовое сообщение
- [ ] Логи проверены на ошибки
- [ ] Всё работает минимум 1 час без проблем
- [ ] Резервные копии настроены

---

## 🎉 Готово!

После успешной миграции:
- ✅ Все данные надёжно хранятся в PostgreSQL
- ✅ Приложение работает быстрее
- ✅ Можно делать сложные SQL запросы
- ✅ Есть автоматические резервные копии
- ✅ Можно масштабировать систему

**Поздравляем с успешной миграцией!** 🚀
