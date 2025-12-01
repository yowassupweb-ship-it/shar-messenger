# VS-Tools Management Script
# Usage: .\tools.ps1 [update|restart|status]

param([Parameter(Position=0)][string]$Command)

$Root = $PSScriptRoot

switch ($Command) {
    "update" {
        Write-Host "=== UPDATE ===" -ForegroundColor Cyan
        
        # Frontend rebuild
        Write-Host "[1/2] Rebuilding frontend..." -ForegroundColor Yellow
        Push-Location "$Root\frontend"
        Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
        npm run build
        Pop-Location
        
        Write-Host "[2/2] Done!" -ForegroundColor Green
        Write-Host "Run: .\tools.ps1 restart" -ForegroundColor Cyan
    }
    
    "restart" {
        Write-Host "=== RESTART ===" -ForegroundColor Cyan
        
        # Kill existing processes on ports
        Write-Host "Stopping services..." -ForegroundColor Yellow
        
        # Kill process on port 8000
        $pid8000 = (Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue).OwningProcess | Select-Object -First 1
        if ($pid8000) { Stop-Process -Id $pid8000 -Force -ErrorAction SilentlyContinue }
        
        # Kill process on port 3000
        $pid3000 = (Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue).OwningProcess | Select-Object -First 1
        if ($pid3000) { Stop-Process -Id $pid3000 -Force -ErrorAction SilentlyContinue }
        
        Start-Sleep -Seconds 2
        
        # Check for venv
        $venvPath = "$Root\backend\venv"
        $venvActivate = "$venvPath\Scripts\Activate.ps1"
        
        # Start backend in new window (with venv if exists)
        Write-Host "Starting backend (port 8000)..." -ForegroundColor Yellow
        if (Test-Path $venvActivate) {
            Write-Host "  Using venv: $venvPath" -ForegroundColor DarkGray
            Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$Root\backend'; & '$venvActivate'; python -m uvicorn main:app --host 0.0.0.0 --port 8000"
        } else {
            Write-Host "  No venv found, using global Python" -ForegroundColor Yellow
            Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$Root\backend'; python -m uvicorn main:app --host 0.0.0.0 --port 8000"
        }
        
        # Start frontend in new window
        Write-Host "Starting frontend (port 3000)..." -ForegroundColor Yellow
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$Root\frontend'; npm start"
        
        Start-Sleep -Seconds 5
        Write-Host "Services started!" -ForegroundColor Green
        & $PSCommandPath status
    }
    
    "status" {
        Write-Host "=== STATUS ===" -ForegroundColor Cyan
        
        Write-Host "Backend (8000): " -NoNewline
        try {
            $null = Invoke-WebRequest "http://localhost:8000/health" -TimeoutSec 2 -UseBasicParsing
            Write-Host "OK" -ForegroundColor Green
        } catch { Write-Host "DOWN" -ForegroundColor Red }
        
        Write-Host "Frontend (3000): " -NoNewline
        try {
            $null = Invoke-WebRequest "http://localhost:3000" -TimeoutSec 2 -UseBasicParsing
            Write-Host "OK" -ForegroundColor Green
        } catch { Write-Host "DOWN" -ForegroundColor Red }
    }
    
    "logs" {
        Write-Host "=== LOGS ===" -ForegroundColor Cyan
        Write-Host "Fetching logs from API..." -ForegroundColor Yellow
        Write-Host ""
        
        try {
            $response = Invoke-WebRequest "http://localhost:8000/api/logs?limit=20" -TimeoutSec 5 -UseBasicParsing
            $logs = $response.Content | ConvertFrom-Json
            
            foreach ($log in $logs) {
                $color = switch ($log.type) {
                    "error" { "Red" }
                    "warning" { "Yellow" }
                    "success" { "Green" }
                    default { "Gray" }
                }
                $time = if ($log.timestamp) { $log.timestamp.Substring(11, 8) } else { "??:??:??" }
                Write-Host "[$time] " -NoNewline -ForegroundColor DarkGray
                Write-Host "$($log.type.ToUpper()): " -NoNewline -ForegroundColor $color
                Write-Host $log.message
            }
        } catch {
            Write-Host "Backend not available. Check if server is running." -ForegroundColor Red
            Write-Host ""
            Write-Host "Local log files:" -ForegroundColor Yellow
            
            # Show recent Python errors if any
            $backendLog = "$Root\backend\error.log"
            if (Test-Path $backendLog) {
                Write-Host "--- backend/error.log ---" -ForegroundColor Cyan
                Get-Content $backendLog -Tail 20
            }
        }
    }
    
    default {
        Write-Host ""
        Write-Host "VS-Tools Management" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Commands:"
        Write-Host "  update   - Rebuild frontend after git pull"
        Write-Host "  restart  - Restart backend + frontend"
        Write-Host "  status   - Check services"
        Write-Host "  logs     - Show recent logs"
        Write-Host ""
        Write-Host "Example:"
        Write-Host "  git pull"
        Write-Host "  .\tools.ps1 update"
        Write-Host "  .\tools.ps1 restart"
        Write-Host ""
    }
}
