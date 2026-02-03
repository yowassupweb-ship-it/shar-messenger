# Деплой PostgreSQL на сервер
# Автоматическая настройка единой базы данных

param(
    [string]$ServerPassword = "Traplord999!",
    [switch]$SkipInstall,
    [switch]$SkipMigration
)

$SERVER = "root@81.90.31.129"
$BACKEND_PATH = "/var/www/feed-editor/backend"

Write-Host "🚀 Деплой PostgreSQL на сервер" -ForegroundColor Cyan
Write-Host "=" * 70

# 1. Установка PostgreSQL на сервере
if (-not $SkipInstall) {
    Write-Host "`n📦 Установка PostgreSQL на сервере..." -ForegroundColor Yellow
    
    ssh $SERVER @"
apt update
apt install -y postgresql postgresql-contrib
systemctl enable postgresql
systemctl start postgresql
"@
    
    Write-Host "✅ PostgreSQL установлен" -ForegroundColor Green
    
    # Создание базы данных
    Write-Host "`n🗄️ Создание базы данных..." -ForegroundColor Yellow
    
    ssh $SERVER @"
sudo -u postgres psql -c "SELECT 1 FROM pg_database WHERE datname = 'shar_messenger'" | grep -q 1 || \
sudo -u postgres psql <<EOF
CREATE DATABASE shar_messenger;
CREATE USER shar_user WITH PASSWORD '$ServerPassword';
GRANT ALL PRIVILEGES ON DATABASE shar_messenger TO shar_user;
ALTER DATABASE shar_messenger OWNER TO shar_user;
EOF
"@
    
    Write-Host "✅ База данных создана" -ForegroundColor Green
}

# 2. Копирование схемы и скриптов
Write-Host "`n📋 Копирование файлов на сервер..." -ForegroundColor Yellow

scp backend/schema.sql ${SERVER}:${BACKEND_PATH}/
scp backend/migrate_full.py ${SERVER}:${BACKEND_PATH}/
scp backend/database.json ${SERVER}:${BACKEND_PATH}/
scp -r frontend/data ${SERVER}:/var/www/feed-editor/frontend/

Write-Host "✅ Файлы скопированы" -ForegroundColor Green

# 3. Инициализация схемы
Write-Host "`n🏗️ Инициализация схемы базы данных..." -ForegroundColor Yellow

ssh $SERVER @"
cd $BACKEND_PATH
sudo -u postgres psql -d shar_messenger < schema.sql
"@

Write-Host "✅ Схема инициализирована" -ForegroundColor Green

# 4. Миграция данных
if (-not $SkipMigration) {
    Write-Host "`n🔄 Миграция данных..." -ForegroundColor Yellow
    
    ssh $SERVER @"
cd $BACKEND_PATH
# Обновить пароль в скрипте
sed -i "s/DB_PASSWORD = 'Traplord999!'/DB_PASSWORD = '$ServerPassword'/" migrate_full.py
python3 migrate_full.py
"@
    
    Write-Host "✅ Данные мигрированы" -ForegroundColor Green
}

# 5. Обновление .env
Write-Host "`n⚙️ Обновление конфигурации..." -ForegroundColor Yellow

ssh $SERVER @"
cd $BACKEND_PATH
# Обновить или создать .env
cat > .env << 'EOF'
DB_HOST=localhost
DB_PORT=5432
DB_NAME=shar_messenger
DB_USER=postgres
DB_PASSWORD=$ServerPassword
USE_POSTGRES=true
KEEP_JSON_BACKUP=true
EOF
"@

Write-Host "✅ Конфигурация обновлена" -ForegroundColor Green

# 6. Установка зависимостей Python
Write-Host "`n📚 Установка Python зависимостей..." -ForegroundColor Yellow

ssh $SERVER @"
cd $BACKEND_PATH
pip3 install psycopg2-binary python-dotenv
"@

Write-Host "✅ Зависимости установлены" -ForegroundColor Green

# 7. Перезапуск сервисов
Write-Host "`n🔄 Перезапуск сервисов..." -ForegroundColor Yellow

ssh $SERVER @"
systemctl restart feed-editor-backend.service
systemctl restart feed-editor-frontend.service
"@

Write-Host "✅ Сервисы перезапущены" -ForegroundColor Green

# 8. Проверка
Write-Host "`n✅ Проверка работы..." -ForegroundColor Yellow

ssh $SERVER @"
cd $BACKEND_PATH
python3 -c "from db_adapter import db; users = db.get_users(); print(f'✅ PostgreSQL работает! Пользователей в БД: {len(users)}')"
"@

Write-Host "`n" + ("=" * 70)
Write-Host "🎉 ДЕПЛОЙ ЗАВЕРШЕН!" -ForegroundColor Green
Write-Host ("=" * 70)
Write-Host ""
Write-Host "📝 Что дальше:" -ForegroundColor Cyan
Write-Host "   1. Проверьте работу приложения: https://your-domain.com"
Write-Host "   2. JSON файлы сохранены как backup"
Write-Host "   3. PostgreSQL теперь единая база для всего"
Write-Host ""
Write-Host "🔧 Полезные команды:" -ForegroundColor Cyan
Write-Host "   - Подключиться к БД: ssh $SERVER 'sudo -u postgres psql -d shar_messenger'"
Write-Host "   - Просмотреть логи: ssh $SERVER 'journalctl -u feed-editor-backend -f'"
Write-Host "   - Сделать бэкап: ssh $SERVER 'pg_dump -U postgres shar_messenger > backup.sql'"
Write-Host ""
