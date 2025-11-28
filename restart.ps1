# Restart script for frontend and backend

Write-Host "=== Stopping all processes ===" -ForegroundColor Yellow

# Stop processes on ports
$ports = @(3000, 8000)
foreach ($port in $ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connections) {
        $connections | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object {
            Write-Host "Stopping process $_ on port $port" -ForegroundColor Cyan
            Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue
        }
    }
}

# Additional cleanup
Write-Host "Cleaning node and python processes..." -ForegroundColor Cyan
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Process -Name python -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*new-yml*" } | Stop-Process -Force -ErrorAction SilentlyContinue

Start-Sleep -Seconds 2

Write-Host "`n=== Starting backend ===" -ForegroundColor Green
$backendPath = Join-Path $PSScriptRoot "backend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"

Write-Host "Waiting for backend to start (10 seconds)..." -ForegroundColor Cyan
Start-Sleep -Seconds 10

# Check backend availability
$backendReady = $false
for ($i = 1; $i -le 5; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8000" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            Write-Host "Backend started successfully" -ForegroundColor Green
            $backendReady = $true
            break
        }
    } catch {
        Write-Host "Attempt $i/5: Backend not ready yet..." -ForegroundColor Yellow
        Start-Sleep -Seconds 2
    }
}

if (-not $backendReady) {
    Write-Host "Backend may not be ready, but continuing..." -ForegroundColor Yellow
}

Write-Host "`n=== Starting frontend ===" -ForegroundColor Green
$frontendPath = Join-Path $PSScriptRoot "frontend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; npm run dev"

Write-Host "`n=== Done! ===" -ForegroundColor Green
Write-Host "Backend: http://localhost:8000" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "API Docs: http://localhost:8000/docs" -ForegroundColor Cyan
