# Инструкция по установке PostgreSQL

## Вариант 1: Через установщик (Рекомендуется)

1. Скачайте PostgreSQL 15: https://www.postgresql.org/download/windows/
2. Запустите установщик
3. Пароль для postgres: **postgres**
4. Порт: **5432**
5. После установки запустите миграцию: `python migrate_to_postgres.py`

## Вариант 2: Docker (если установлен)

```bash
docker-compose up -d postgres
python migrate_to_postgres.py
```

## Вариант 3: Portable PostgreSQL

1. Скачайте portable версию: https://get.enterprisedb.com/postgresql/
2. Распакуйте в D:\PostgreSQL\
3. Настройте переменные окружения
4. Запустите сервер

## После установки:

1. Проверьте подключение:
```bash
psql -U postgres -h localhost
```

2. Создайте базу данных:
```bash
createdb -U postgres shar_messenger
```

3. Примените схему:
```bash
psql -U postgres -d shar_messenger -f schema.sql
```

4. Мигрируйте данные:
```bash
python migrate_to_postgres.py
```

5. Включите PostgreSQL в .env:
```
USE_POSTGRES=true
```

6. Перезапустите backend:
```bash
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
