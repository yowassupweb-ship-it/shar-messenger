# Финальная настройка PostgreSQL после установки через winget
# Запустите этот скрипт ПОСЛЕ завершения установки PostgreSQL

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "🚀 Настройка PostgreSQL для shar-messenger" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host ""

# Пути к PostgreSQL (стандартная установка через winget)
$PG_DIR = "C:\Program Files\PostgreSQL\15"
$PG_BIN = "$PG_DIR\bin"
$PSQL = "$PG_BIN\psql.exe"
$BACKEND_DIR = "D:\Desktop\shar-messenger\backend"

# Проверка установки PostgreSQL
Write-Host "📍 Проверка установки PostgreSQL..." -ForegroundColor Yellow
if (-not (Test-Path $PSQL)) {
    Write-Host "❌ PostgreSQL не найден в $PG_DIR" -ForegroundColor Red
    Write-Host "Возможно установка еще не завершена или PostgreSQL установлен в другую папку" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Проверьте путь установки и обновите переменную PG_DIR в скрипте" -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ PostgreSQL найден: $PG_DIR" -ForegroundColor Green

# Добавление PostgreSQL в PATH для текущей сессии
$env:PATH += ";$PG_BIN"

# Проверка сервиса PostgreSQL
Write-Host ""
Write-Host "🔍 Проверка сервиса PostgreSQL..." -ForegroundColor Yellow
$service = Get-Service -Name "postgresql-x64-15" -ErrorAction SilentlyContinue
if ($service) {
    if ($service.Status -ne "Running") {
        Write-Host "▶️ Запуск сервиса PostgreSQL..." -ForegroundColor Yellow
        Start-Service "postgresql-x64-15"
        Start-Sleep -Seconds 3
    }
    Write-Host "✅ Сервис PostgreSQL запущен" -ForegroundColor Green
} else {
    Write-Host "⚠️ Сервис postgresql-x64-15 не найден" -ForegroundColor Yellow
    Write-Host "PostgreSQL может быть запущен вручную" -ForegroundColor Yellow
}

# Создание базы данных
Write-Host ""
Write-Host "🗄️ Создание базы данных shar_messenger..." -ForegroundColor Yellow

# Устанавливаем переменную окружения для пароля
$env:PGPASSWORD = "postgres"

try {
    # Проверяем подключение
    & $PSQL -U postgres -c "SELECT version();" 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Не удалось подключиться к PostgreSQL"
    }
    
    # Удаляем старую базу если есть
    Write-Host "  Удаление старой базы (если существует)..." -ForegroundColor Gray
    & $PSQL -U postgres -c "DROP DATABASE IF EXISTS shar_messenger;" 2>&1 | Out-Null
    
    # Создаем новую базу
    Write-Host "  Создание новой базы данных..." -ForegroundColor Gray
    & $PSQL -U postgres -c "CREATE DATABASE shar_messenger WITH ENCODING='UTF8' LC_COLLATE='en_US.UTF-8' LC_CTYPE='en_US.UTF-8';" 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ База данных shar_messenger создана" -ForegroundColor Green
    } else {
        throw "Ошибка создания базы данных"
    }
} catch {
    Write-Host "❌ Ошибка: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Возможные причины:" -ForegroundColor Yellow
    Write-Host "  1. Неверный пароль для пользователя postgres" -ForegroundColor Yellow
    Write-Host "  2. Сервер PostgreSQL не запущен" -ForegroundColor Yellow
    Write-Host "  3. Проблемы с правами доступа" -ForegroundColor Yellow
    exit 1
}

# Применение схемы
Write-Host ""
Write-Host "📋 Применение схемы базы данных..." -ForegroundColor Yellow
$SCHEMA_FILE = "$BACKEND_DIR\schema.sql"

if (Test-Path $SCHEMA_FILE) {
    try {
        & $PSQL -U postgres -d shar_messenger -f $SCHEMA_FILE 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Схема применена успешно" -ForegroundColor Green
        } else {
            Write-Host "⚠️ Возможны ошибки при применении схемы" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "❌ Ошибка применения схемы: $_" -ForegroundColor Red
    }
} else {
    Write-Host "⚠️ Файл schema.sql не найден: $SCHEMA_FILE" -ForegroundColor Yellow
}

# Обновление .env файла
Write-Host ""
Write-Host "⚙️ Обновление конфигурации (.env)..." -ForegroundColor Yellow
$ENV_FILE = "$BACKEND_DIR\.env"

$envContent = @"
# PostgreSQL Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=shar_messenger
DB_USER=postgres
DB_PASSWORD=postgres

# Use PostgreSQL instead of JSON
USE_POSTGRES=true

# Keep JSON database as backup
KEEP_JSON_BACKUP=true
"@

$envContent | Set-Content $ENV_FILE -Force -Encoding UTF8
Write-Host "✅ Файл .env обновлен" -ForegroundColor Green

# Миграция данных из JSON в PostgreSQL
Write-Host ""
Write-Host "🔄 Миграция данных из database.json в PostgreSQL..." -ForegroundColor Yellow
$MIGRATE_SCRIPT = "$BACKEND_DIR\migrate_to_postgres.py"

if (Test-Path $MIGRATE_SCRIPT) {
    try {
        Set-Location $BACKEND_DIR
        python $MIGRATE_SCRIPT
        Write-Host "✅ Миграция завершена" -ForegroundColor Green
    } catch {
        Write-Host "❌ Ошибка миграции: $_" -ForegroundColor Red
        Write-Host "Вы можете запустить миграцию позже командой:" -ForegroundColor Yellow
        Write-Host "  cd $BACKEND_DIR" -ForegroundColor Cyan
        Write-Host "  python migrate_to_postgres.py" -ForegroundColor Cyan
    }
} else {
    Write-Host "⚠️ Скрипт миграции не найден: $MIGRATE_SCRIPT" -ForegroundColor Yellow
}

# Итоговая информация
Write-Host ""
Write-Host "=" * 60 -ForegroundColor Green
Write-Host "✅ PostgreSQL успешно настроен!" -ForegroundColor Green
Write-Host "=" * 60 -ForegroundColor Green
Write-Host ""
Write-Host "📌 Информация о подключении:" -ForegroundColor Cyan
Write-Host "  🔹 Host:     localhost" -ForegroundColor White
Write-Host "  🔹 Port:     5432" -ForegroundColor White
Write-Host "  🔹 Database: shar_messenger" -ForegroundColor White
Write-Host "  🔹 User:     postgres" -ForegroundColor White
Write-Host "  🔹 Password: postgres" -ForegroundColor White
Write-Host ""
Write-Host "🔧 Управление сервисом PostgreSQL:" -ForegroundColor Cyan
Write-Host "  Запуск:      Start-Service postgresql-x64-15" -ForegroundColor White
Write-Host "  Остановка:   Stop-Service postgresql-x64-15" -ForegroundColor White
Write-Host "  Статус:      Get-Service postgresql-x64-15" -ForegroundColor White
Write-Host ""
Write-Host "🚀 Запуск backend:" -ForegroundColor Cyan
Write-Host "  cd $BACKEND_DIR" -ForegroundColor White
Write-Host "  python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000" -ForegroundColor White
Write-Host ""
Write-Host "Путь к PostgreSQL: $PG_DIR" -ForegroundColor Gray
Write-Host ""

# Удаление переменной окружения с паролем
Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
