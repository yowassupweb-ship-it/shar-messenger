# Apply direct_access table migration to PostgreSQL
# Usage: .\apply_direct_access_migration.ps1

$ErrorActionPreference = "Stop"

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Direct Access Table Migration" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Check if psql is available
if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: psql command not found" -ForegroundColor Red
    Write-Host "Please install PostgreSQL and add it to PATH" -ForegroundColor Yellow
    exit 1
}

# Get database credentials from environment or use defaults
$DB_HOST = if ($env:DB_HOST) { $env:DB_HOST } else { "localhost" }
$DB_PORT = if ($env:DB_PORT) { $env:DB_PORT } else { "5432" }
$DB_NAME = if ($env:DB_NAME) { $env:DB_NAME } else { "feed_editor" }
$DB_USER = if ($env:DB_USER) { $env:DB_USER } else { "postgres" }

Write-Host "Database: $DB_HOST:$DB_PORT/$DB_NAME" -ForegroundColor Cyan
Write-Host "User: $DB_USER" -ForegroundColor Cyan
Write-Host ""

# Apply migration
$SQL_FILE = Join-Path $PSScriptRoot "add_direct_access_table.sql"

if (-not (Test-Path $SQL_FILE)) {
    Write-Host "ERROR: Migration file not found: $SQL_FILE" -ForegroundColor Red
    exit 1
}

Write-Host "Applying migration..." -ForegroundColor Yellow

try {
    $env:PGPASSWORD = Read-Host "Enter PostgreSQL password" -AsSecureString | ConvertFrom-SecureString -AsPlainText
    
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f $SQL_FILE
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "SUCCESS: Migration applied successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Table 'direct_access' created with columns:" -ForegroundColor Cyan
        Write-Host "  - id (VARCHAR(255) PRIMARY KEY)" -ForegroundColor White
        Write-Host "  - resource_type (VARCHAR(100))" -ForegroundColor White
        Write-Host "  - resource_id (VARCHAR(255))" -ForegroundColor White
        Write-Host "  - user_ids (TEXT[])" -ForegroundColor White
        Write-Host "  - department_ids (TEXT[])" -ForegroundColor White
        Write-Host "  - permission (VARCHAR(50))" -ForegroundColor White
        Write-Host "  - created_at (TIMESTAMP)" -ForegroundColor White
        Write-Host "  - updated_at (TIMESTAMP)" -ForegroundColor White
    } else {
        Write-Host ""
        Write-Host "ERROR: Migration failed" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host ""
    Write-Host "ERROR: $_" -ForegroundColor Red
    exit 1
} finally {
    Remove-Variable PGPASSWORD -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "You can now use the direct access API endpoints:" -ForegroundColor Cyan
Write-Host "  POST   /api/direct-access" -ForegroundColor White
Write-Host "  GET    /api/direct-access?resource_type=X&resource_id=Y" -ForegroundColor White
Write-Host "  PUT    /api/direct-access/{id}" -ForegroundColor White
Write-Host "  DELETE /api/direct-access/{id}" -ForegroundColor White
Write-Host ""
