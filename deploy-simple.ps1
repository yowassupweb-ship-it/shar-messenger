# Простой деплой фронтенда (без node_modules и .next)
# Использование: .\deploy-simple.ps1

$SERVER = "root@81.90.31.129"
$FRONTEND_PATH = "/var/www/feed-editor/frontend"
$LOCAL_FRONTEND = "C:\Users\a.nikolyuk\Desktop\slovolov-pro\new-yml\frontend"

Write-Host "🚀 Deploying frontend to $SERVER" -ForegroundColor Cyan

# Останавливаем сервис
Write-Host "⏸️  Stopping service..." -ForegroundColor Yellow
ssh $SERVER 'systemctl stop feed-editor-frontend.service'

# Создаем временную копию БЕЗ node_modules, .next, data
Write-Host "📦 Preparing files..." -ForegroundColor Yellow
$temp = "$env:TEMP\frontend-deploy"
if (Test-Path $temp) { Remove-Item $temp -Recurse -Force }

# Копируем только нужное
robocopy $LOCAL_FRONTEND $temp /MIR /XD node_modules .next data .git /XF .env.local /NFL /NDL /NJH /NJS

# Копируем на сервер
Write-Host "⬆️  Uploading..." -ForegroundColor Yellow
scp -r $temp\* ${SERVER}:${FRONTEND_PATH}/

# Удаляем временную папку
Remove-Item $temp -Recurse -Force

# Собираем на сервере
Write-Host "🔨 Building on server..." -ForegroundColor Yellow
ssh $SERVER "cd ${FRONTEND_PATH} && npm install && npm run build"

# Запускаем сервис
Write-Host "▶️  Starting service..." -ForegroundColor Yellow
ssh $SERVER 'systemctl start feed-editor-frontend.service'

Start-Sleep -Seconds 2

# Проверяем статус
Write-Host ""
Write-Host "✅ Deployment completed!" -ForegroundColor Green
ssh $SERVER 'systemctl status feed-editor-frontend.service --no-pager | head -8'

Write-Host ""
Write-Host "🌐 https://tools.connecting-server.ru" -ForegroundColor Cyan
