# Деплой только измененных файлов через SCP
# Использование: .\deploy-changes.ps1

$ErrorActionPreference = "Stop"

$SERVER = "root@81.90.31.129"
$FRONTEND_LOCAL = "C:\Users\a.nikolyuk\Desktop\slovolov-pro\new-yml\frontend"
$BACKEND_LOCAL = "C:\Users\a.nikolyuk\Desktop\slovolov-pro\new-yml\backend"
$FRONTEND_REMOTE = "/var/www/feed-editor/frontend"
$BACKEND_REMOTE = "/var/www/feed-editor/backend"

Write-Host "=== Deploy Changed Files to Production ===" -ForegroundColor Cyan
Write-Host ""

# Получаем список измененных файлов через git
Write-Host "Получаем список измененных файлов..." -ForegroundColor Yellow
Set-Location "C:\Users\a.nikolyuk\Desktop\slovolov-pro\new-yml"

# Получаем измененные и новые файлы
$changedFiles = git diff --name-only HEAD
$untrackedFiles = git ls-files --others --exclude-standard

# Объединяем списки
$allChangedFiles = @()
if ($changedFiles) {
    $allChangedFiles += $changedFiles -split "`n" | Where-Object { $_ -ne "" }
}
if ($untrackedFiles) {
    $allChangedFiles += $untrackedFiles -split "`n" | Where-Object { $_ -ne "" }
}

if ($allChangedFiles.Count -eq 0) {
    Write-Host "Нет измененных файлов для деплоя" -ForegroundColor Green
    exit 0
}

Write-Host "Найдено измененных файлов: $($allChangedFiles.Count)" -ForegroundColor Green
Write-Host ""

# Фильтруем по frontend и backend
$frontendFiles = $allChangedFiles | Where-Object { $_ -like "frontend/*" }
$backendFiles = $allChangedFiles | Where-Object { $_ -like "backend/*" }

# Деплой Frontend файлов
if ($frontendFiles.Count -gt 0) {
    Write-Host "=== Деплой Frontend файлов ($($frontendFiles.Count)) ===" -ForegroundColor Cyan
    
    foreach ($file in $frontendFiles) {
        $relativePath = $file -replace "^frontend/", ""
        $localFile = Join-Path $FRONTEND_LOCAL $relativePath
        $remoteDir = Split-Path "$FRONTEND_REMOTE/$relativePath" -Parent
        
        if (Test-Path $localFile) {
            Write-Host "  → $relativePath" -ForegroundColor Gray
            
            # Создаем директорию на сервере если нужно
            ssh $SERVER "mkdir -p '$remoteDir'"
            
            # Копируем файл
            scp "$localFile" "${SERVER}:$FRONTEND_REMOTE/$relativePath"
            
            if ($LASTEXITCODE -ne 0) {
                Write-Host "    ✗ Ошибка копирования" -ForegroundColor Red
            } else {
                Write-Host "    ✓ Скопировано" -ForegroundColor Green
            }
        }
    }
    
    Write-Host ""
}

# Деплой Backend файлов
if ($backendFiles.Count -gt 0) {
    Write-Host "=== Деплой Backend файлов ($($backendFiles.Count)) ===" -ForegroundColor Cyan
    
    foreach ($file in $backendFiles) {
        $relativePath = $file -replace "^backend/", ""
        $localFile = Join-Path $BACKEND_LOCAL $relativePath
        $remoteDir = Split-Path "$BACKEND_REMOTE/$relativePath" -Parent
        
        if (Test-Path $localFile) {
            Write-Host "  → $relativePath" -ForegroundColor Gray
            
            # Создаем директорию на сервере если нужно
            ssh $SERVER "mkdir -p '$remoteDir'"
            
            # Копируем файл
            scp "$localFile" "${SERVER}:$BACKEND_REMOTE/$relativePath"
            
            if ($LASTEXITCODE -ne 0) {
                Write-Host "    ✗ Ошибка копирования" -ForegroundColor Red
            } else {
                Write-Host "    ✓ Скопировано" -ForegroundColor Green
            }
        }
    }
    
    Write-Host ""
}

# Перезапуск сервисов
Write-Host "=== Перезапуск сервисов ===" -ForegroundColor Cyan
        
        if (Test-Path $localFile) {
            Write-Host "  → $relativePath" -ForegroundColor Gray
            
            # Создаем директорию на сервере если нужно
            ssh $SERVER "mkdir -p '$remoteDir'"
            
            # Копируем файл
            scp "$localFile" "${SERVER}:$BACKEND_REMOTE/$relativePath"
            
            if ($LASTEXITCODE -ne 0) {
                Write-Host "    ✗ Ошибка копирования" -ForegroundColor Red
            } else {
                Write-Host "    ✓ Скопировано" -ForegroundColor Green
            }
        }
    }
    
    Write-Host ""
}

# Перезапуск сервисов
Write-Host "=== Перезапуск сервисов ===" -ForegroundColor Cyan

if ($backendFiles.Count -gt 0) {
    Write-Host "Перезапуск backend..." -ForegroundColor Yellow
    ssh $SERVER "systemctl restart feed-editor-backend.service"
    Write-Host "✓ Backend перезапущен" -ForegroundColor Green
}

if ($frontendFiles.Count -gt 0) {
    Write-Host "Пересборка и перезапуск frontend..." -ForegroundColor Yellow
    ssh $SERVER "cd $FRONTEND_REMOTE && npm run build && systemctl restart feed-editor-frontend.service"
    Write-Host "✓ Frontend пересобран и перезапущен" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== Деплой завершен ===" -ForegroundColor Green
Write-Host ""
Write-Host "Проверить статус:"
Write-Host "  ssh $SERVER 'systemctl status feed-editor-backend.service'" -ForegroundColor Gray
Write-Host "  ssh $SERVER 'systemctl status feed-editor-frontend.service'" -ForegroundColor Gray
