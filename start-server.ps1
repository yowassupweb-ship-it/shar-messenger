# Production Server Startup Script for "Вокруг света"
# This script starts both backend and frontend services

param(
    [switch]$Backend,
    [switch]$Frontend,
    [switch]$Both,
    [switch]$Stop,
    [switch]$Restart,
    [switch]$Status
)

$ErrorActionPreference = "Stop"
$ProjectRoot = $PSScriptRoot
$BackendPath = Join-Path $ProjectRoot "backend"
$FrontendPath = Join-Path $ProjectRoot "frontend"

# Color output functions
function Write-ColorOutput {
    param([string]$Message, [string]$Color = "White")
    Write-Host $Message -ForegroundColor $Color
}

function Show-Usage {
    Write-ColorOutput "`n=== Вокруг света - Управление сервером ===" "Cyan"
    Write-Host @"

ИСПОЛЬЗОВАНИЕ:
  .\start-server.ps1 [-Backend] [-Frontend] [-Both] [-Stop] [-Restart] [-Status]

ОПЦИИ:
  -Backend    Управление только бэкендом
  -Frontend   Управление только фронтендом  
  -Both       Управление обоими сервисами (по умолчанию)
  -Stop       Остановить сервисы
  -Restart    Перезапустить сервисы
  -Status     Показать статус сервисов

ПРИМЕРЫ:
  .\start-server.ps1 -Both           # Запустить все
  .\start-server.ps1 -Backend        # Запустить только бэкенд
  .\start-server.ps1 -Stop -Both     # Остановить все
  .\start-server.ps1 -Status         # Проверить статус

"@
}

function Test-ProcessRunning {
    param([int]$Port)
    $connection = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    return $null -ne $connection
}

function Stop-Service {
    param([string]$Name, [int]$Port)
    
    Write-ColorOutput "`n[STOP] Останавливаем $Name..." "Yellow"
    
    if (Test-ProcessRunning -Port $Port) {
        $connection = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
        if ($connection) {
            $processId = $connection.OwningProcess
            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 2
            Write-ColorOutput "[OK] $Name остановлен" "Green"
        }
    } else {
        Write-ColorOutput "[INFO] $Name не запущен" "Gray"
    }
}

function Start-BackendService {
    Write-ColorOutput "`n[START] Запускаем Backend (FastAPI)..." "Cyan"
    
    if (Test-ProcessRunning -Port 8000) {
        Write-ColorOutput "[ERROR] Порт 8000 уже занят. Остановите существующий процесс." "Red"
        return
    }
    
    Push-Location $BackendPath
    try {
        # Activate virtual environment if exists
        if (Test-Path ".venv\Scripts\Activate.ps1") {
            Write-ColorOutput "[INFO] Активируем виртуальное окружение..." "Gray"
            & .\.venv\Scripts\Activate.ps1
        }
        
        Write-ColorOutput "[INFO] Устанавливаем зависимости..." "Gray"
        python -m pip install -r requirements.txt --quiet
        
        Write-ColorOutput "[START] Запускаем uvicorn на порту 8000..." "Green"
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$BackendPath'; python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload" -WindowStyle Normal
        
        Start-Sleep -Seconds 3
        
        if (Test-ProcessRunning -Port 8000) {
            Write-ColorOutput "[SUCCESS] Backend запущен: http://localhost:8000" "Green"
        } else {
            Write-ColorOutput "[ERROR] Не удалось запустить Backend" "Red"
        }
    } finally {
        Pop-Location
    }
}

function Start-FrontendService {
    Write-ColorOutput "`n[START] Запускаем Frontend (Next.js)..." "Cyan"
    
    if (Test-ProcessRunning -Port 3000) {
        Write-ColorOutput "[ERROR] Порт 3000 уже занят. Остановите существующий процесс." "Red"
        return
    }
    
    Push-Location $FrontendPath
    try {
        Write-ColorOutput "[INFO] Устанавливаем зависимости..." "Gray"
        npm install --silent
        
        Write-ColorOutput "[START] Запускаем Next.js на порту 3000..." "Green"
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$FrontendPath'; npm run dev" -WindowStyle Normal
        
        Start-Sleep -Seconds 5
        
        if (Test-ProcessRunning -Port 3000) {
            Write-ColorOutput "[SUCCESS] Frontend запущен: http://localhost:3000" "Green"
        } else {
            Write-ColorOutput "[ERROR] Не удалось запустить Frontend" "Red"
        }
    } finally {
        Pop-Location
    }
}

function Show-Status {
    Write-ColorOutput "`n=== Статус сервисов ===" "Cyan"
    
    $backendRunning = Test-ProcessRunning -Port 8000
    $frontendRunning = Test-ProcessRunning -Port 3000
    
    Write-Host "`nBackend (FastAPI):  " -NoNewline
    if ($backendRunning) {
        Write-ColorOutput "✓ Запущен (http://localhost:8000)" "Green"
    } else {
        Write-ColorOutput "✗ Остановлен" "Red"
    }
    
    Write-Host "Frontend (Next.js): " -NoNewline
    if ($frontendRunning) {
        Write-ColorOutput "✓ Запущен (http://localhost:3000)" "Green"
    } else {
        Write-ColorOutput "✗ Остановлен" "Red"
    }
    
    Write-Host ""
}

# Main execution logic
if ($Status) {
    Show-Status
    exit 0
}

if (-not ($Backend -or $Frontend -or $Both)) {
    $Both = $true
}

if ($Stop) {
    if ($Backend -or $Both) {
        Stop-Service -Name "Backend" -Port 8000
    }
    if ($Frontend -or $Both) {
        Stop-Service -Name "Frontend" -Port 3000
    }
    Show-Status
    exit 0
}

if ($Restart) {
    # Stop first
    if ($Backend -or $Both) {
        Stop-Service -Name "Backend" -Port 8000
    }
    if ($Frontend -or $Both) {
        Stop-Service -Name "Frontend" -Port 3000
    }
    
    Start-Sleep -Seconds 2
}

# Start services
Write-ColorOutput "`n=== Запуск сервисов Вокруг света ===" "Cyan"
Write-ColorOutput "Корневая папка: $ProjectRoot" "Gray"

if ($Backend -or $Both) {
    Start-BackendService
}

if ($Frontend -or $Both) {
    Start-FrontendService
}

Write-ColorOutput "`n=== Все сервисы запущены ===" "Green"
Show-Status

Write-ColorOutput "`nДля остановки используйте: .\start-server.ps1 -Stop -Both" "Yellow"
