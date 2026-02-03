# Применение миграции is_department_head
Write-Host "Applying migration: add_department_head..."

$env:PGPASSWORD = 'Traplord999!'
$psqlPath = "C:\Program Files\PostgreSQL\16\bin\psql.exe"

if (Test-Path $psqlPath) {
    & $psqlPath -U postgres -d shar_messenger -f "migrations/add_department_head.sql"
    Write-Host "Migration applied successfully!" -ForegroundColor Green
} else {
    Write-Host "psql not found. Please ensure PostgreSQL is installed." -ForegroundColor Red
    Write-Host "Alternative: Run this SQL manually in pgAdmin or DBeaver:" -ForegroundColor Yellow
    Write-Host ""
    Get-Content "migrations/add_department_head.sql"
}
