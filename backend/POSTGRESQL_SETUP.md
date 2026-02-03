# PostgreSQL Setup для Windows

## Шаг 1: Установка PostgreSQL

### Вариант A: Installer (рекомендуется)
1. Скачать: https://www.postgresql.org/download/windows/
2. Запустить установщик
3. При установке:
   - **Password** для postgres: `postgres` (по умолчанию)
   - **Port**: `5432` (по умолчанию)
   - **Locale**: English, United States

### Вариант B: Windows Subsystem for Linux (WSL)
```powershell
# В WSL терминале:
wsl
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo service postgresql start
```

### Вариант C: Chocolatey (если установлен)
```powershell
choco install postgresql
```

---

## Шаг 2: Проверка установки

```powershell
# Должна вывести версию
psql --version

# Должно подключиться (пароль: postgres)
psql -U postgres -h localhost
# Если подключилось, вводим: \q
```

---

## Шаг 3: Миграция БД

Вариант A (Windows):
```powershell
cd backend
.\migrate.bat
```

Вариант B (Manual):
```powershell
cd backend

# 1. Создаем БД
psql -U postgres -c "CREATE DATABASE shar_messenger;"

# 2. Применяем схему
psql -U postgres -d shar_messenger -f schema.sql

# 3. Мигрируем данные
python migrate_to_postgres.py

# 4. Проверяем
psql -U postgres -d shar_messenger -c "SELECT COUNT(*) FROM users;"
```

---

## Если что-то не работает

**"psql: command not found"**
- PostgreSQL не добавлен в PATH
- Решение: Добавить `C:\Program Files\PostgreSQL\16\bin` в PATH

**"FATAL: password authentication failed"**
- Неправильный пароль
- Решение: Выполнить `psql -U postgres` и задать пароль заново через pgAdmin

**"Cannot connect to database"**
- PostgreSQL не запущен
- Решение: 
  ```powershell
  # Windows Services -> PostgreSQL -> Start
  # Или для WSL:
  wsl sudo service postgresql start
  ```

---

## Полезные команды

```powershell
# Запустить psql
psql -U postgres -d shar_messenger

# Проверить количество записей
psql -U postgres -d shar_messenger -c "SELECT COUNT(*) FROM users;"

# Сделать backup
pg_dump -U postgres -d shar_messenger > backup.sql

# Восстановить из backup
psql -U postgres -d shar_messenger < backup.sql
```

---

## Откат на JSON

Если нужно вернуться на JSON:
```powershell
# Отредактировать .env:
USE_POSTGRES=false

# Перезагрузить Python сервер
```
