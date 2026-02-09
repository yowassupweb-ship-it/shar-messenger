@echo off
echo ================================================
echo    Парсер Яндекс Рекламы - Запуск
echo ================================================
echo.

REM Проверка Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ОШИБКА] Python не найден!
    echo Установите Python с https://www.python.org/
    pause
    exit /b 1
)

echo [OK] Python найден
echo.

REM Проверка установки зависимостей
echo Проверка зависимостей...
pip show flask >nul 2>&1
if errorlevel 1 (
    echo [!] Flask не установлен. Устанавливаю зависимости...
    pip install -r requirements.txt
) else (
    echo [OK] Зависимости установлены
)

echo.
echo ================================================
echo Запускаю веб-сервер...
echo Откройте браузер: http://127.0.0.1:5000
echo Для остановки нажмите Ctrl+C
echo ================================================
echo.

python app.py

pause
