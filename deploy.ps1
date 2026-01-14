# Deploy script for Feed Editor
# Деплой на сервер 81.90.31.129

param(
    [switch]$SkipStop,
    [switch]$SkipBuild,
    [switch]$SkipStart
)

$SERVER = "root@81.90.31.129"
$FRONTEND_PATH = "/var/www/feed-editor/frontend"
$BACKEND_PATH = "/var/www/feed-editor/backend"
$LOCAL_FRONTEND = "C:\Users\a.nikolyuk\Desktop\slovolov-pro\new-yml\frontend"
$LOCAL_BACKEND = "C:\Users\a.nikolyuk\Desktop\slovolov-pro\new-yml\backend"

Write-Host "🚀 Starting deployment to $SERVER" -ForegroundColor Cyan
Write-Host ""

# 1. Остановить сервисы
if (-not $SkipStop) {
    Write-Host "⏸️  Stopping services..." -ForegroundColor Yellow
    ssh $SERVER 'systemctl stop feed-editor-frontend.service'
    ssh $SERVER 'systemctl stop feed-editor-backend.service'
    Write-Host "✅ Services stopped" -ForegroundColor Green
    Write-Host ""
}

# 2. Создать бэкап на сервере
Write-Host "💾 Creating backup on server..." -ForegroundColor Yellow
ssh $SERVER 'cd /var/www/feed-editor && cp -r frontend frontend.bak.$(date +%Y%m%d_%H%M%S) && cp -r backend backend.bak.$(date +%Y%m%d_%H%M%S)'
Write-Host "✅ Backup created" -ForegroundColor Green
Write-Host ""

# 3. Деплой фронтенда
Write-Host "📦 Deploying frontend..." -ForegroundColor Yellow

# Создаем временную копию без ненужных файлов
$tempFrontend = "$env:TEMP\deploy-frontend"
if (Test-Path $tempFrontend) { Remove-Item $tempFrontend -Recurse -Force }
robocopy $LOCAL_FRONTEND $tempFrontend /MIR /XD node_modules .next data .git /XF .env.local *.json.backup *.db *.sqlite /NFL /NDL /NJH /NJS

# Копируем на сервер
Write-Host "   Uploading files..." -ForegroundColor Gray
scp -r $tempFrontend\* ${SERVER}:${FRONTEND_PATH}/

# Восстанавливаем data (НЕ ТРОГАЕМ БАЗУ)
ssh $SERVER 'if [ -d /var/www/feed-editor/frontend.bak.*/data ]; then cp -r /var/www/feed-editor/frontend.bak.*/data /var/www/feed-editor/frontend/; fi'

Remove-Item $tempFrontend -Recurse -Force
Write-Host "✅ Frontend deployed" -ForegroundColor Green
Write-Host ""

# 4. Деплой бэкенда
Write-Host "📦 Deploying backend..." -ForegroundColor Yellow

# Создаем временную копию без ненужных файлов
$tempBackend = "$env:TEMP\deploy-backend"
if (Test-Path $tempBackend) { Remove-Item $tempBackend -Recurse -Force }
robocopy $LOCAL_BACKEND $tempBackend /MIR /XD __pycache__ data venv .git /XF *.pyc .env database.json database.json.backup *.db *.sqlite /NFL /NDL /NJH /NJS

# Копируем на сервер
Write-Host "   Uploading files..." -ForegroundColor Gray
scp -r $tempBackend\* ${SERVER}:${BACKEND_PATH}/

# Восстанавливаем data (НЕ ТРОГАЕМ БАЗУ)
ssh $SERVER 'if [ -d /var/www/feed-editor/backend.bak.*/data ]; then cp -r /var/www/feed-editor/backend.bak.*/data /var/www/feed-editor/backend/; fi'

Remove-Item $tempBackend -Recurse -Force
Write-Host "✅ Backend deployed" -ForegroundColor Green
Write-Host ""

# 5. Установить зависимости и собрать
if (-not $SkipBuild) {
    Write-Host "🔨 Building..." -ForegroundColor Yellow
    
    Write-Host "   Frontend: npm install..." -ForegroundColor Gray
    ssh $SERVER 'cd /var/www/feed-editor/frontend && npm install --production=false'
    
    Write-Host "   Frontend: npm build..." -ForegroundColor Gray
    ssh $SERVER 'cd /var/www/feed-editor/frontend && npm run build'
    
    Write-Host "   Backend: pip install..." -ForegroundColor Gray
    ssh $SERVER 'cd /var/www/feed-editor/backend && python3 -m pip install -r requirements.txt'
    
    Write-Host "✅ Build completed" -ForegroundColor Green
    Write-Host ""
}

# 6. Запустить сервисы
if (-not $SkipStart) {
    Write-Host "▶️  Starting services..." -ForegroundColor Yellow
    ssh $SERVER 'systemctl start feed-editor-backend.service'
    ssh $SERVER 'systemctl start feed-editor-frontend.service'
    
    Start-Sleep -Seconds 3
    
    Write-Host ""
    Write-Host "📊 Services status:" -ForegroundColor Cyan
    ssh $SERVER 'systemctl status feed-editor-backend.service --no-pager | head -5'
    ssh $SERVER 'systemctl status feed-editor-frontend.service --no-pager | head -5'
    
    Write-Host ""
    Write-Host "✅ Services started" -ForegroundColor Green
}

Write-Host ""
Write-Host "🎉 Deployment completed!" -ForegroundColor Green
Write-Host "🌐 https://tools.connecting-server.ru" -ForegroundColor Cyan

