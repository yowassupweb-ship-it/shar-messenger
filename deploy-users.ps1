# Deploy only users to server
# Деплой только пользователей на сервер 81.90.31.129

$SERVER = "root@81.90.31.129"
$LOCAL_DB = "C:\Users\a.nikolyuk\Desktop\slovolov-pro\new-yml\backend\database.json"

Write-Host "👥 Deploying users to $SERVER" -ForegroundColor Cyan
Write-Host ""

# 1. Извлекаем пользователей из локальной базы
Write-Host "📖 Reading local users..." -ForegroundColor Yellow
$localDb = Get-Content $LOCAL_DB -Raw | ConvertFrom-Json
$localUsers = $localDb.users
Write-Host "   Found $($localUsers.Count) local users" -ForegroundColor Gray

# 2. Сохраняем пользователей во временный файл
$tempFile = "$env:TEMP\users-to-deploy.json"
$localUsers | ConvertTo-Json -Depth 10 | Out-File -FilePath $tempFile -Encoding UTF8
Write-Host "✅ Users saved to temp file" -ForegroundColor Green

# 3. Копируем на сервер
Write-Host ""
Write-Host "📤 Uploading users to server..." -ForegroundColor Yellow
scp $tempFile ${SERVER}:/tmp/users-to-deploy.json
Write-Host "✅ File uploaded" -ForegroundColor Green

# 4. Копируем скрипт мержа на сервер
Write-Host ""
Write-Host "🔄 Merging users on server..." -ForegroundColor Yellow
$LOCAL_MERGE_SCRIPT = "C:\Users\a.nikolyuk\Desktop\slovolov-pro\new-yml\merge_users.py"
scp $LOCAL_MERGE_SCRIPT ${SERVER}:/tmp/merge_users.py

# 5. Запускаем скрипт мержа на сервере
ssh $SERVER "python3 /tmp/merge_users.py"

Write-Host "✅ Users merged" -ForegroundColor Green

# 6. Рестарт бэкенда для применения изменений
Write-Host ""
Write-Host "🔄 Restarting backend..." -ForegroundColor Yellow
ssh $SERVER 'systemctl restart feed-editor-backend.service'
Start-Sleep -Seconds 2
ssh $SERVER 'systemctl status feed-editor-backend.service --no-pager | head -3'
Write-Host "✅ Backend restarted" -ForegroundColor Green

# Очистка
Remove-Item $tempFile -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "🎉 Users deployment completed!" -ForegroundColor Green
