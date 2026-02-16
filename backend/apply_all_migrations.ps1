# Применение всех безопасных/idempotent миграций
Write-Host "Applying database migrations..." -ForegroundColor Cyan

$env:PGPASSWORD = 'Traplord999!'
$psqlPath = "C:\Program Files\PostgreSQL\16\bin\psql.exe"

$migrations = @(
    "add_department_head.sql",
    "add_navigation_settings.sql",
    "add_telegram_auth_codes.sql",
    "003_link_lists_access_fields.sql"
)

if (Test-Path $psqlPath) {
    foreach ($migration in $migrations) {
        $migrationFile = "migrations/$migration"
        if (Test-Path $migrationFile) {
            Write-Host "Applying $migration..." -ForegroundColor Yellow
            & $psqlPath -v ON_ERROR_STOP=1 -U postgres -d shar_messenger -f $migrationFile
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  [OK] $migration applied successfully" -ForegroundColor Green
            } else {
                Write-Host "  [FAIL] Failed to apply $migration" -ForegroundColor Red
                exit 1
            }
        } else {
            Write-Host "  [WARN] Migration file not found: $migrationFile" -ForegroundColor Yellow
        }
    }

    # add_calculator_history.sql иногда падает из-за кодировки комментариев в файле.
    # Применяем SQL без комментариев напрямую.
    Write-Host "Applying add_calculator_history (safe inline)..." -ForegroundColor Yellow
    & $psqlPath -v ON_ERROR_STOP=1 -U postgres -d shar_messenger -c "CREATE TABLE IF NOT EXISTS calculator_history (user_id VARCHAR(255) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, history JSONB DEFAULT '[]', updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);"
    & $psqlPath -v ON_ERROR_STOP=1 -U postgres -d shar_messenger -c "CREATE INDEX IF NOT EXISTS idx_calculator_history_user_id ON calculator_history(user_id);"

    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [OK] add_calculator_history applied successfully" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] Failed to apply add_calculator_history" -ForegroundColor Red
        exit 1
    }

    Write-Host "`nAll migrations completed!" -ForegroundColor Green
} else {
    Write-Host "psql not found at $psqlPath" -ForegroundColor Red
    Write-Host "Please run these SQL files manually in pgAdmin or DBeaver." -ForegroundColor Yellow
    exit 1
}
