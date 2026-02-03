@echo off
REM Скрипт миграции JSON -> PostgreSQL
REM Требует установленный PostgreSQL

setlocal enabledelayedexpansion

echo.
echo ========================================
echo PostgreSQL Migration Script
echo ========================================
echo.

REM Проверяем PostgreSQL
echo [1/5] Checking PostgreSQL installation...
where psql >nul 2>nul
if errorlevel 1 (
    echo ERROR: PostgreSQL не найден в PATH
    echo.
    echo Установите PostgreSQL с https://www.postgresql.org/download/windows/
    echo и добавьте путь bin в переменную PATH
    echo.
    pause
    exit /b 1
)

psql --version
echo [OK] PostgreSQL найден

REM Создаем базу данных
echo.
echo [2/5] Creating PostgreSQL database...
psql -U postgres -h localhost -c "DROP DATABASE IF EXISTS shar_messenger;" 2>nul
psql -U postgres -h localhost -c "CREATE DATABASE shar_messenger WITH ENCODING utf8;" 2>nul

if errorlevel 1 (
    echo ERROR: Не удалось подключиться к PostgreSQL
    echo Убедитесь, что PostgreSQL запущен и пароль по умолчанию 'postgres'
    pause
    exit /b 1
)
echo [OK] База данных создана

REM Применяем схему
echo.
echo [3/5] Applying database schema...
psql -U postgres -d shar_messenger -h localhost -f schema.sql >nul 2>&1
if errorlevel 1 (
    echo ERROR: Ошибка при применении схемы
    pause
    exit /b 1
)
echo [OK] Схема применена

REM Обновляем .env
echo.
echo [4/5] Updating .env configuration...
(
    echo DB_HOST=localhost
    echo DB_PORT=5432
    echo DB_NAME=shar_messenger
    echo DB_USER=postgres
    echo DB_PASSWORD=postgres
    echo USE_POSTGRES=true
    echo KEEP_JSON_BACKUP=true
) > .env
echo [OK] .env обновлен

REM Запускаем миграцию
echo.
echo [5/5] Running data migration...
python migrate_to_postgres.py
if errorlevel 1 (
    echo ERROR: Ошибка при миграции данных
    pause
    exit /b 1
)

echo.
echo ========================================
echo Migration completed successfully!
echo ========================================
echo.
echo Приложение теперь использует PostgreSQL
echo Перезагрузите Python сервер:
echo   cd backend
echo   python main.py
echo.
pause
