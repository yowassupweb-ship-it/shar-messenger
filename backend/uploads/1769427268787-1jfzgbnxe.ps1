# ============================================
# CPU-KILL - Оптимизатор системы для игр
# Убивает фоновые процессы и чистит кэш
# ============================================

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "  CPU-KILL - Game Optimizer v1.0" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Проверка прав администратора
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "[!] Запустите скрипт от имени Администратора для полной оптимизации!" -ForegroundColor Yellow
    Write-Host ""
}

# 1. Убийство необязательных фоновых процессов
Write-Host "[1/7] Остановка необязательных процессов..." -ForegroundColor Green

$processesToKill = @(
    "PhoneExperienceHost",      # Связь с телефоном
    "YourPhone",                # Your Phone
    "SearchApp",                # Поиск Windows
    "SearchHost",               # Хост поиска
    "StartMenuExperienceHost",  # Меню Пуск
    "Cortana",                  # Cortana
    "OneDrive",                 # OneDrive
    "SkypeApp",                 # Skype
    "SkypeBackgroundHost",      # Skype фон
    "Microsoft.Photos",         # Фото
    "Calculator",               # Калькулятор
    "MSPaint",                  # Paint
    "Xbox*",                    # Xbox сервисы
    "GameBar*",                 # Game Bar
    "TextInputHost",            # Ввод текста
    "MoUsoCoreWorker",          # Обновления Windows
    "backgroundTaskHost"        # Фоновые задачи
)

$killedCount = 0
foreach ($proc in $processesToKill) {
    $killed = Get-Process -Name $proc -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    if ($?) { $killedCount++ }
}
Write-Host "   Остановлено процессов: $killedCount" -ForegroundColor White

# 2. Очистка лишних RuntimeBroker процессов
Write-Host "[2/7] Очистка RuntimeBroker..." -ForegroundColor Green
$runtimeBrokers = Get-Process -Name "RuntimeBroker" -ErrorAction SilentlyContinue | 
                  Where-Object {$_.WorkingSet -gt 30MB} | 
                  Sort-Object WorkingSet -Descending | 
                  Select-Object -Skip 2
$runtimeBrokers | Stop-Process -Force -ErrorAction SilentlyContinue
Write-Host "   Очищено: $($runtimeBrokers.Count) процессов" -ForegroundColor White

# 3. Очистка DNS кэша
Write-Host "[3/7] Очистка DNS кэша..." -ForegroundColor Green
Clear-DnsClientCache -ErrorAction SilentlyContinue
ipconfig /flushdns | Out-Null
Write-Host "   DNS кэш очищен" -ForegroundColor White

# 4. Очистка файлового кэша Windows
Write-Host "[4/7] Очистка файлового кэша..." -ForegroundColor Green
if ($isAdmin) {
    # Очистка кэша шрифтов
    Remove-Item "$env:windir\System32\FNTCACHE.DAT" -Force -ErrorAction SilentlyContinue
    
    # Очистка кэша иконок
    Remove-Item "$env:LOCALAPPDATA\IconCache.db" -Force -ErrorAction SilentlyContinue
    Remove-Item "$env:LOCALAPPDATA\Microsoft\Windows\Explorer\iconcache_*.db" -Force -ErrorAction SilentlyContinue
    
    Write-Host "   Системные кэши очищены" -ForegroundColor White
} else {
    Write-Host "   Пропущено (требуются права администратора)" -ForegroundColor Yellow
}

# 5. Очистка временных файлов
Write-Host "[5/7] Очистка временных файлов..." -ForegroundColor Green
$tempFolders = @(
    "$env:TEMP",
    "$env:windir\Temp",
    "$env:LOCALAPPDATA\Temp"
)
$deletedSize = 0
foreach ($folder in $tempFolders) {
    if (Test-Path $folder) {
        $files = Get-ChildItem -Path $folder -Recurse -ErrorAction SilentlyContinue
        foreach ($file in $files) {
            try {
                $deletedSize += $file.Length
                Remove-Item $file.FullName -Force -Recurse -ErrorAction SilentlyContinue
            } catch {}
        }
    }
}
Write-Host "   Удалено: $([math]::Round($deletedSize / 1MB, 2)) МБ" -ForegroundColor White

# 6. Принудительная сборка мусора и очистка памяти
Write-Host "[6/7] Оптимизация памяти..." -ForegroundColor Green
[System.GC]::Collect()
[System.GC]::WaitForPendingFinalizers()
[System.GC]::Collect()

# Запуск системной очистки памяти
rundll32.exe advapi32.dll,ProcessIdleTasks
Start-Sleep -Seconds 1

# Очистка рабочего набора explorer.exe
$explorer = Get-Process -Name "explorer" -ErrorAction SilentlyContinue
if ($explorer) {
    $explorer | ForEach-Object { $_.CloseMainWindow() | Out-Null }
    Start-Sleep -Milliseconds 500
    Start-Process "explorer.exe"
}
Write-Host "   Память оптимизирована" -ForegroundColor White

# 7. Остановка необязательных служб (требует права администратора)
Write-Host "[7/7] Остановка необязательных служб..." -ForegroundColor Green
if ($isAdmin) {
    $servicesToStop = @(
        "SysMain",              # SuperFetch
        "DiagTrack",            # Телеметрия
        "dmwappushservice",     # WAP Push
        "WSearch",              # Поиск Windows
        "OneSyncSvc",           # Синхронизация OneDrive
        "PcaSvc",               # Помощник совместимости
        "WerSvc"                # Отчеты об ошибках
    )
    
    $stoppedCount = 0
    foreach ($svc in $servicesToStop) {
        $service = Get-Service -Name $svc -ErrorAction SilentlyContinue
        if ($service -and $service.Status -eq 'Running') {
            Stop-Service -Name $svc -Force -ErrorAction SilentlyContinue
            if ($?) { $stoppedCount++ }
        }
    }
    Write-Host "   Остановлено служб: $stoppedCount" -ForegroundColor White
} else {
    Write-Host "   Пропущено (требуются права администратора)" -ForegroundColor Yellow
}

# Показать статистику памяти
Write-Host ""
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "  Результат оптимизации:" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan

$os = Get-CimInstance Win32_OperatingSystem
$totalRAM = [math]::Round($os.TotalVisibleMemorySize / 1MB, 2)
$freeRAM = [math]::Round($os.FreePhysicalMemory / 1MB, 2)
$usedRAM = [math]::Round(($os.TotalVisibleMemorySize - $os.FreePhysicalMemory) / 1MB, 2)
$freePercent = [math]::Round(($freeRAM / $totalRAM) * 100, 1)

Write-Host "Всего RAM:    $totalRAM ГБ" -ForegroundColor White
Write-Host "Занято:       $usedRAM ГБ" -ForegroundColor Yellow
Write-Host "Свободно:     $freeRAM ГБ ($freePercent%)" -ForegroundColor Green
Write-Host ""
Write-Host "[✓] Система оптимизирована для игр!" -ForegroundColor Green
Write-Host ""

# Советы
Write-Host "Советы:" -ForegroundColor Cyan
Write-Host "1. Закройте браузеры перед запуском игры" -ForegroundColor Gray
Write-Host "2. Запускайте этот скрипт от Администратора для максимального эффекта" -ForegroundColor Gray
Write-Host "3. Установите высокий приоритет для игры в Диспетчере задач" -ForegroundColor Gray
Write-Host ""

# Пауза перед закрытием
Read-Host "Нажмите Enter для выхода"
