# Автоматическая установка и настройка PostgreSQL для shar-messenger

$ErrorActionPreference = "Stop"

Write-Host "🚀 Начало установки PostgreSQL..." -ForegroundColor Green

# Пути
$PG_DIR = "D:\PostgreSQL"
$PG_ZIP = "$PG_DIR\postgresql.zip"
$PG_INSTALL = "$PG_DIR\pgsql"
$PG_DATA = "$PG_DIR\data"
$PG_BIN = "$PG_INSTALL\bin"

# 1. Проверка скачанного архива
Write-Host "📦 Проверка архива PostgreSQL..."
if (-not (Test-Path $PG_ZIP)) {
    Write-Host "❌ Архив не найден. Скачиваем..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Force -Path $PG_DIR | Out-Null
    $ProgressPreference = 'SilentlyContinue'
    try {
        Invoke-WebRequest -Uri 'https://get.enterprisedb.com/postgresql/postgresql-15.10-1-windows-x64-binaries.zip' -OutFile $PG_ZIP -UseBasicParsing -TimeoutSec 60
        Write-Host "✅ Архив скачан" -ForegroundColor Green
    } catch {
        Write-Host "❌ Не удалось скачать PostgreSQL: $_" -ForegroundColor Red
        Write-Host "Скачайте вручную: https://www.enterprisedb.com/download-postgresql-binaries" -ForegroundColor Yellow
        exit 1
    }
}

# 2. Распаковка
Write-Host "📂 Распаковка PostgreSQL..."
if (-not (Test-Path $PG_INSTALL)) {
    Expand-Archive -Path $PG_ZIP -DestinationPath $PG_DIR -Force
    Write-Host "✅ PostgreSQL распакован в $PG_INSTALL" -ForegroundColor Green
} else {
    Write-Host "✅ PostgreSQL уже распакован" -ForegroundColor Green
}

# 3. Инициализация базы данных
Write-Host "🔧 Инициализация базы данных..."
if (-not (Test-Path $PG_DATA)) {
    & "$PG_BIN\initdb.exe" -D $PG_DATA -U postgres -E UTF8 --locale=en_US.UTF-8 -A trust
    Write-Host "✅ База данных инициализирована" -ForegroundColor Green
} else {
    Write-Host "✅ База данных уже существует" -ForegroundColor Green
}

# 4. Настройка postgresql.conf
Write-Host "⚙️ Настройка postgresql.conf..."
$PG_CONF = "$PG_DATA\postgresql.conf"
(Get-Content $PG_CONF) -replace "#port = 5432", "port = 5432" | Set-Content $PG_CONF
(Get-Content $PG_CONF) -replace "#listen_addresses = 'localhost'", "listen_addresses = 'localhost'" | Set-Content $PG_CONF
Write-Host "✅ Конфигурация обновлена" -ForegroundColor Green

# 5. Запуск PostgreSQL
Write-Host "🚀 Запуск PostgreSQL сервера..."
$PG_PROCESS = Get-Process postgres -ErrorAction SilentlyContinue
if ($PG_PROCESS) {
    Write-Host "✅ PostgreSQL уже запущен (PID: $($PG_PROCESS.Id))" -ForegroundColor Green
} else {
    Start-Process -FilePath "$PG_BIN\pg_ctl.exe" -ArgumentList "start -D $PG_DATA -l $PG_DIR\logfile.log" -NoNewWindow -Wait
    Start-Sleep -Seconds 3
    Write-Host "✅ PostgreSQL запущен" -ForegroundColor Green
}

# 6. Создание базы данных
Write-Host "🗄️ Создание базы данных shar_messenger..."
$env:PATH += ";$PG_BIN"
& "$PG_BIN\psql.exe" -U postgres -c "DROP DATABASE IF EXISTS shar_messenger;" 2>$null
& "$PG_BIN\psql.exe" -U postgres -c "CREATE DATABASE shar_messenger;"
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ База данных shar_messenger создана" -ForegroundColor Green
} else {
    Write-Host "❌ Ошибка создания базы данных" -ForegroundColor Red
    exit 1
}

# 7. Применение схемы
Write-Host "📋 Применение схемы базы данных..."
$SCHEMA_PATH = "D:\Desktop\shar-messenger\backend\schema.sql"
if (Test-Path $SCHEMA_PATH) {
    & "$PG_BIN\psql.exe" -U postgres -d shar_messenger -f $SCHEMA_PATH
    Write-Host "✅ Схема применена" -ForegroundColor Green
} else {
    Write-Host "⚠️ Файл schema.sql не найден" -ForegroundColor Yellow
}

# 8. Обновление переменных окружения
Write-Host "🔧 Обновление .env файла..."
$ENV_PATH = "D:\Desktop\shar-messenger\backend\.env"
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
$envContent | Set-Content $ENV_PATH -Force
Write-Host "✅ .env файл обновлён" -ForegroundColor Green

# 9. Запуск миграции
Write-Host "🔄 Запуск миграции данных из JSON в PostgreSQL..."
$MIGRATE_SCRIPT = "D:\Desktop\shar-messenger\backend\migrate_to_postgres.py"
if (Test-Path $MIGRATE_SCRIPT) {
    Set-Location "D:\Desktop\shar-messenger\backend"
    python migrate_to_postgres.py
    Write-Host "✅ Миграция завершена" -ForegroundColor Green
} else {
    Write-Host "⚠️ Скрипт миграции не найден" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✅ PostgreSQL успешно настроен!" -ForegroundColor Green
Write-Host ""
Write-Host "📌 Информация о подключении:" -ForegroundColor Cyan
Write-Host "  Host: localhost"
Write-Host "  Port: 5432"
Write-Host "  Database: shar_messenger"
Write-Host "  User: postgres"
Write-Host "  Password: postgres"
Write-Host ""
Write-Host "🔧 Управление PostgreSQL:" -ForegroundColor Cyan
Write-Host "  Остановка: $PG_BIN\pg_ctl.exe stop -D $PG_DATA"
Write-Host "  Запуск:    $PG_BIN\pg_ctl.exe start -D $PG_DATA"
Write-Host "  Статус:    $PG_BIN\pg_ctl.exe status -D $PG_DATA"
Write-Host ""
Write-Host "📍 Путь к PostgreSQL: $PG_INSTALL" -ForegroundColor Cyan
Write-Host "📍 Путь к данным: $PG_DATA" -ForegroundColor Cyan
