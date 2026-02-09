@echo off
:: Применение миграции через Docker PostgreSQL Client
echo ============================================================
echo   ПРИМЕНЕНИЕ МИГРАЦИИ: СИСТЕМА ПРАВ ДОСТУПА (через Docker)
echo ============================================================
echo.

:: Проверка наличия Docker
docker --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker не установлен или недоступен
    exit /b 1
)

:: Проверка наличия контейнера PostgreSQL
echo Проверка PostgreSQL контейнера...
docker ps | findstr shar-messenger-db >nul
if errorlevel 1 (
    echo [INFO] Контейнер shar-messenger-db не запущен. Запускаю...
    docker-compose up -d postgres
    timeout /t 5 /nobreak >nul
)

:: Применение миграции
echo.
echo Применяю миграцию...
docker exec -i shar-messenger-db psql -U postgres -d shar_messenger < migrations\001_access_control_system.sql

if errorlevel 1 (
    echo.
    echo [ERROR] Ошибка при применении миграции
    exit /b 1
)

echo.
echo ============================================================
echo   МИГРАЦИЯ УСПЕШНО ПРИМЕНЕНА!
echo ============================================================
echo.
echo Проверка созданных таблиц...
docker exec -it shar-messenger-db psql -U postgres -d shar_messenger -c "\dt"

echo.
echo Проверка функций...
docker exec -it shar-messenger-db psql -U postgres -d shar_messenger -c "\df check_*"

echo.
pause
