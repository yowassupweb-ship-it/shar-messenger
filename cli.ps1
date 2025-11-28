# CLI Management Tool for "Вокруг света"
# Convenient command-line interface for project management

param(
    [Parameter(Position=0)]
    [string]$Command,
    
    [Parameter(Position=1, ValueFromRemainingArguments=$true)]
    [string[]]$Args
)

$ErrorActionPreference = "Stop"
$ProjectRoot = $PSScriptRoot

# Color output
function Write-Info { param([string]$msg) Write-Host $msg -ForegroundColor Cyan }
function Write-Success { param([string]$msg) Write-Host $msg -ForegroundColor Green }
function Write-Error { param([string]$msg) Write-Host $msg -ForegroundColor Red }
function Write-Warning { param([string]$msg) Write-Host $msg -ForegroundColor Yellow }

function Show-Help {
    Write-Info "`n╔════════════════════════════════════════════════════════════╗"
    Write-Info "║         Вокруг света - CLI Management Tool              ║"
    Write-Info "╚════════════════════════════════════════════════════════════╝"
    
    Write-Host @"

ИСПОЛЬЗОВАНИЕ:
  .\cli.ps1 <команда> [аргументы]

КОМАНДЫ УПРАВЛЕНИЯ СЕРВИСАМИ:
  start [backend|frontend|both]   Запустить сервисы
  stop  [backend|frontend|both]   Остановить сервисы  
  restart [backend|frontend|both] Перезапустить сервисы
  status                          Показать статус сервисов
  logs   [backend|frontend]       Показать логи

КОМАНДЫ РАЗРАБОТКИ:
  dev                             Запустить в режиме разработки
  build                           Собрать проект для продакшена
  test  [backend|frontend]        Запустить тесты
  lint  [backend|frontend]        Проверить код линтером
  format [backend|frontend]       Отформатировать код

КОМАНДЫ БАЗЫ ДАННЫХ:
  db:backup                       Создать резервную копию БД
  db:restore <файл>               Восстановить БД из копии
  db:reset                        Сбросить БД к начальному состоянию
  db:seed                         Заполнить БД тестовыми данными

КОМАНДЫ УПРАВЛЕНИЯ ЗАВИСИМОСТЯМИ:
  install                         Установить все зависимости
  update                          Обновить зависимости
  clean                           Очистить кеш и временные файлы

ПРОЧИЕ КОМАНДЫ:
  info                            Показать информацию о проекте
  health                          Проверить здоровье системы
  help                            Показать эту справку

ПРИМЕРЫ:
  .\cli.ps1 start both            # Запустить весь проект
  .\cli.ps1 dev                   # Режим разработки
  .\cli.ps1 logs backend          # Посмотреть логи бэкенда
  .\cli.ps1 db:backup             # Сделать бэкап БД
  .\cli.ps1 test frontend         # Запустить тесты фронтенда

"@
}

function Invoke-Start {
    param([string]$Target = "both")
    
    $scriptPath = Join-Path $ProjectRoot "start-server.ps1"
    
    switch ($Target.ToLower()) {
        "backend"  { & $scriptPath -Backend }
        "frontend" { & $scriptPath -Frontend }
        "both"     { & $scriptPath -Both }
        default    { & $scriptPath -Both }
    }
}

function Invoke-Stop {
    param([string]$Target = "both")
    
    $scriptPath = Join-Path $ProjectRoot "start-server.ps1"
    
    switch ($Target.ToLower()) {
        "backend"  { & $scriptPath -Stop -Backend }
        "frontend" { & $scriptPath -Stop -Frontend }
        "both"     { & $scriptPath -Stop -Both }
        default    { & $scriptPath -Stop -Both }
    }
}

function Invoke-Restart {
    param([string]$Target = "both")
    
    $scriptPath = Join-Path $ProjectRoot "start-server.ps1"
    
    switch ($Target.ToLower()) {
        "backend"  { & $scriptPath -Restart -Backend }
        "frontend" { & $scriptPath -Restart -Frontend }
        "both"     { & $scriptPath -Restart -Both }
        default    { & $scriptPath -Restart -Both }
    }
}

function Invoke-Status {
    $scriptPath = Join-Path $ProjectRoot "start-server.ps1"
    & $scriptPath -Status
}

function Invoke-Dev {
    Write-Info "Запуск в режиме разработки..."
    Invoke-Start "both"
}

function Invoke-Build {
    Write-Info "Сборка проекта для продакшена..."
    
    # Build frontend
    Write-Info "`nСборка Frontend..."
    Push-Location (Join-Path $ProjectRoot "frontend")
    npm run build
    Pop-Location
    
    Write-Success "✓ Сборка завершена"
}

function Invoke-Test {
    param([string]$Target = "both")
    
    Write-Info "Запуск тестов: $Target"
    
    if ($Target -eq "backend" -or $Target -eq "both") {
        Write-Info "`nТесты Backend..."
        Push-Location (Join-Path $ProjectRoot "backend")
        python -m pytest
        Pop-Location
    }
    
    if ($Target -eq "frontend" -or $Target -eq "both") {
        Write-Info "`nТесты Frontend..."
        Push-Location (Join-Path $ProjectRoot "frontend")
        npm test
        Pop-Location
    }
}

function Invoke-Lint {
    param([string]$Target = "both")
    
    Write-Info "Проверка кода: $Target"
    
    if ($Target -eq "backend" -or $Target -eq "both") {
        Write-Info "`nЛинтинг Backend..."
        Push-Location (Join-Path $ProjectRoot "backend")
        python -m pylint *.py
        Pop-Location
    }
    
    if ($Target -eq "frontend" -or $Target -eq "both") {
        Write-Info "`nЛинтинг Frontend..."
        Push-Location (Join-Path $ProjectRoot "frontend")
        npm run lint
        Pop-Location
    }
}

function Invoke-DbBackup {
    $backupDir = Join-Path $ProjectRoot "backups"
    if (-not (Test-Path $backupDir)) {
        New-Item -ItemType Directory -Path $backupDir | Out-Null
    }
    
    $timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
    $backupFile = Join-Path $backupDir "database_$timestamp.json"
    
    $dbFile = Join-Path $ProjectRoot "backend\database.json"
    
    Write-Info "Создание резервной копии БД..."
    Copy-Item $dbFile $backupFile
    Write-Success "✓ Бэкап создан: $backupFile"
}

function Invoke-DbRestore {
    param([string]$BackupFile)
    
    if (-not $BackupFile) {
        Write-Error "Укажите файл для восстановления"
        return
    }
    
    if (-not (Test-Path $BackupFile)) {
        Write-Error "Файл не найден: $BackupFile"
        return
    }
    
    $dbFile = Join-Path $ProjectRoot "backend\database.json"
    
    Write-Warning "ВНИМАНИЕ: Текущая БД будет перезаписана!"
    $confirm = Read-Host "Продолжить? (yes/no)"
    
    if ($confirm -eq "yes") {
        Copy-Item $BackupFile $dbFile -Force
        Write-Success "✓ БД восстановлена из: $BackupFile"
    } else {
        Write-Info "Операция отменена"
    }
}

function Invoke-Install {
    Write-Info "Установка зависимостей..."
    
    # Backend
    Write-Info "`nBackend зависимости..."
    Push-Location (Join-Path $ProjectRoot "backend")
    python -m pip install -r requirements.txt
    Pop-Location
    
    # Frontend
    Write-Info "`nFrontend зависимости..."
    Push-Location (Join-Path $ProjectRoot "frontend")
    npm install
    Pop-Location
    
    Write-Success "✓ Все зависимости установлены"
}

function Invoke-Clean {
    Write-Info "Очистка временных файлов..."
    
    # Clean Python cache
    Get-ChildItem -Path $ProjectRoot -Include "__pycache__","*.pyc" -Recurse -Force | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
    
    # Clean node_modules and build artifacts (optional)
    # Remove-Item (Join-Path $ProjectRoot "frontend\.next") -Recurse -Force -ErrorAction SilentlyContinue
    
    Write-Success "✓ Очистка завершена"
}

function Invoke-Info {
    Write-Info "`n╔════════════════════════════════════════════════════════════╗"
    Write-Info "║              Информация о проекте                        ║"
    Write-Info "╚════════════════════════════════════════════════════════════╝"
    
    Write-Host "`nНазвание: " -NoNewline
    Write-Success "Вокруг света"
    
    Write-Host "Описание: " -NoNewline
    Write-Host "Feed editor с React/Next.js фронтендом и Python FastAPI бэкендом"
    
    Write-Host "`nТехнологии:"
    Write-Host "  Frontend:  " -NoNewline
    Write-Success "Next.js 15, React 19, TypeScript"
    Write-Host "  Backend:   " -NoNewline
    Write-Success "Python 3.x, FastAPI, Uvicorn"
    Write-Host "  Database:  " -NoNewline
    Write-Success "JSON file-based storage"
    
    Write-Host "`nСервисы:"
    Write-Host "  Backend:   " -NoNewline
    Write-Success "http://localhost:8000"
    Write-Host "  Frontend:  " -NoNewline
    Write-Success "http://localhost:3000"
    Write-Host "  API Docs:  " -NoNewline
    Write-Success "http://localhost:8000/docs"
    
    Write-Host ""
}

function Invoke-Health {
    Write-Info "Проверка здоровья системы..."
    
    # Check Python
    Write-Host "`nPython:    " -NoNewline
    try {
        $pythonVersion = python --version 2>&1
        Write-Success "✓ $pythonVersion"
    } catch {
        Write-Error "✗ Не установлен"
    }
    
    # Check Node.js
    Write-Host "Node.js:   " -NoNewline
    try {
        $nodeVersion = node --version 2>&1
        Write-Success "✓ $nodeVersion"
    } catch {
        Write-Error "✗ Не установлен"
    }
    
    # Check npm
    Write-Host "npm:       " -NoNewline
    try {
        $npmVersion = npm --version 2>&1
        Write-Success "✓ v$npmVersion"
    } catch {
        Write-Error "✗ Не установлен"
    }
    
    # Check services status
    Write-Host ""
    Invoke-Status
}

# Main command dispatcher
switch ($Command.ToLower()) {
    "start"     { Invoke-Start ($Args[0]) }
    "stop"      { Invoke-Stop ($Args[0]) }
    "restart"   { Invoke-Restart ($Args[0]) }
    "status"    { Invoke-Status }
    "dev"       { Invoke-Dev }
    "build"     { Invoke-Build }
    "test"      { Invoke-Test ($Args[0]) }
    "lint"      { Invoke-Lint ($Args[0]) }
    "db:backup" { Invoke-DbBackup }
    "db:restore" { Invoke-DbRestore ($Args[0]) }
    "install"   { Invoke-Install }
    "clean"     { Invoke-Clean }
    "info"      { Invoke-Info }
    "health"    { Invoke-Health }
    "help"      { Show-Help }
    default     { 
        if ($Command) {
            Write-Error "Неизвестная команда: $Command"
        }
        Show-Help 
    }
}
