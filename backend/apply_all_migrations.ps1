# Применение всех миграций для новых функций
Write-Host "Applying database migrations..." -ForegroundColor Cyan

$env:PGPASSWORD = 'Traplord999!'
$psqlPath = "C:\Program Files\PostgreSQL\16\bin\psql.exe"

$migrations = @(
    "add_department_head.sql",
    "add_navigation_settings.sql",
    "add_calculator_history.sql"
)

if (Test-Path $psqlPath) {
    foreach ($migration in $migrations) {
        $migrationFile = "migrations/$migration"
        if (Test-Path $migrationFile) {
            Write-Host "Applying $migration..." -ForegroundColor Yellow
            & $psqlPath -U postgres -d shar_messenger -f $migrationFile
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  ✓ $migration applied successfully" -ForegroundColor Green
            } else {
                Write-Host "  ✗ Failed to apply $migration" -ForegroundColor Red
            }
        } else {
            Write-Host "  ! Migration file not found: $migrationFile" -ForegroundColor Yellow
        }
    }
    Write-Host "`nAll migrations completed!" -ForegroundColor Green
} else {
    Write-Host "psql not found at $psqlPath" -ForegroundColor Red
    Write-Host "Please run these SQL files manually in pgAdmin or DBeaver:" -ForegroundColor Yellow
    Write-Host ""
    foreach ($migration in $migrations) {
        $migrationFile = "migrations/$migration"
        if (Test-Path $migrationFile) {
            Write-Host "=== $migration ===" -ForegroundColor Cyan
            Get-Content $migrationFile
            Write-Host ""
        }
    }
}
