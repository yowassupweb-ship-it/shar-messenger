# Скрипт для скачивания PostgreSQL базы с сервера
# Требуется SSH доступ к серверу

$SERVER = "81.90.31.129"
$USER = "root"
$DB_NAME = "shar_messenger"
$DUMP_FILE = "server_dump_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql"

Write-Host "Downloading database from server $SERVER" -ForegroundColor Cyan
Write-Host ""

# Step 1: Create dump on server
Write-Host "Creating dump on server..." -ForegroundColor Yellow
$sshCommand = "sudo -u postgres pg_dump -d $DB_NAME --clean --if-exists > /tmp/$DUMP_FILE"
ssh "${USER}@${SERVER}" $sshCommand

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error creating dump on server" -ForegroundColor Red
    exit 1
}
Write-Host "Dump created: /tmp/$DUMP_FILE" -ForegroundColor Green

# Step 2: Download dump
Write-Host "Downloading dump..." -ForegroundColor Yellow
scp "${USER}@${SERVER}:/tmp/$DUMP_FILE" ".\$DUMP_FILE"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error downloading dump" -ForegroundColor Red
    exit 1
}
Write-Host "Dump downloaded: $DUMP_FILE" -ForegroundColor Green

# Step 3: Clean temp file on server
Write-Host "Cleaning temp files on server..." -ForegroundColor Yellow
ssh "${USER}@${SERVER}" "rm /tmp/$DUMP_FILE"

# Step 4: Restore to local PostgreSQL
Write-Host ""
Write-Host "Restoring to local database..." -ForegroundColor Yellow
Write-Host "WARNING: This will delete current local database!" -ForegroundColor Red
$confirmation = Read-Host "Продолжить? (yes/no)"

if ($confirmation -ne "yes") {
    Write-Host "Cancelled by user" -ForegroundColor Yellow
    exit 0
}

$env:PGPASSWORD = "Traplord999!"
$PSQL = "C:\Program Files\PostgreSQL\15\bin\psql.exe"

# Удалить существующие подключения
Write-Host "Closing connections..." -ForegroundColor Yellow
$terminateQuery = "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid != pg_backend_pid();"
& $PSQL -U postgres -c $terminateQuery 2>$null

# Пересоздать базу
Write-Host "Recreating database..." -ForegroundColor Yellow
& $PSQL -U postgres -c "DROP DATABASE IF EXISTS $DB_NAME;" 2>$null
& $PSQL -U postgres -c "CREATE DATABASE $DB_NAME;"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error creating database" -ForegroundColor Red
    exit 1
}

# Restore dump
Write-Host "Restoring data..." -ForegroundColor Yellow
& $PSQL -U postgres -d $DB_NAME -f ".\$DUMP_FILE" 2>&1 | Out-File -FilePath ".\restore_log.txt" -Encoding UTF8

if ($LASTEXITCODE -eq 0) {
    Write-Host "Database restored successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Checking data..." -ForegroundColor Yellow
    
    # Проверить количество записей
    & $PSQL -U postgres -d $DB_NAME -c "SELECT 'Users: ' || COUNT(*) FROM users;"
    & $PSQL -U postgres -d $DB_NAME -c "SELECT 'Chats: ' || COUNT(*) FROM chats;"
    & $PSQL -U postgres -d $DB_NAME -c "SELECT 'Messages: ' || COUNT(*) FROM messages;"
    & $PSQL -U postgres -d $DB_NAME -c "SELECT 'Tasks: ' || COUNT(*) FROM todos;"
    
    Write-Host ""
    Write-Host "Done! Dump saved: $DUMP_FILE" -ForegroundColor Green
    Write-Host "Restore log: restore_log.txt" -ForegroundColor Cyan
} else {
    Write-Host "Error restoring database" -ForegroundColor Red
    Write-Host "Check log: restore_log.txt" -ForegroundColor Yellow
    exit 1
}

Remove-Item env:PGPASSWORD
