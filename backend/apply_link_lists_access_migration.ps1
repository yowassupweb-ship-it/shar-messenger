# Apply migration: link_lists access fields
Write-Host "Applying migration: 003_link_lists_access_fields.sql..." -ForegroundColor Cyan

$env:PGPASSWORD = 'Traplord999!'
$psqlCandidates = @(
    "C:\Program Files\PostgreSQL\17\bin\psql.exe",
    "C:\Program Files\PostgreSQL\16\bin\psql.exe",
    "C:\Program Files\PostgreSQL\15\bin\psql.exe",
    "C:\Program Files\PostgreSQL\14\bin\psql.exe"
)
$psqlPath = $psqlCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $psqlPath) {
    $cmd = Get-Command psql -ErrorAction SilentlyContinue
    if ($cmd) {
        $psqlPath = $cmd.Source
    }
}
$migrationFile = "migrations/003_link_lists_access_fields.sql"

if (Test-Path $psqlPath) {
    if (Test-Path $migrationFile) {
        & $psqlPath -U postgres -d shar_messenger -f $migrationFile
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Migration applied successfully" -ForegroundColor Green
        } else {
            Write-Host "Migration failed" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "Migration file not found: $migrationFile" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "psql not found at $psqlPath" -ForegroundColor Red
    Write-Host "Run migration manually:" -ForegroundColor Yellow
    Get-Content $migrationFile
    exit 1
}
