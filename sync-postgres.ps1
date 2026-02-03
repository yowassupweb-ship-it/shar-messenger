# Синхронизация PostgreSQL баз данных
# Перенос данных между локальной машиной и сервером

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("ToServer", "FromServer")]
    [string]$Direction,
    
    [string]$ServerPassword = "Traplord999!"
)

$SERVER = "root@81.90.31.129"
$LOCAL_DB = "shar_messenger"
$REMOTE_DB = "shar_messenger"

Write-Host "🔄 Синхронизация PostgreSQL" -ForegroundColor Cyan
Write-Host "=" * 70
Write-Host ""

if ($Direction -eq "ToServer") {
    # Локальная -> Сервер
    Write-Host "📤 Перенос данных: Локальная БД → Сервер" -ForegroundColor Yellow
    Write-Host ""
    
    # 1. Создать дамп локальной БД
    Write-Host "   1. Создание дампа локальной БД..." -ForegroundColor Gray
    $dumpFile = "shar_messenger_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql"
    
    $env:PGPASSWORD = "Traplord999!"
    & "C:\Program Files\PostgreSQL\16\bin\pg_dump.exe" -h localhost -U postgres -d $LOCAL_DB > $dumpFile
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "   ❌ Ошибка создания дампа" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "   ✅ Дамп создан: $dumpFile" -ForegroundColor Green
    
    # 2. Скопировать на сервер
    Write-Host "   2. Копирование дампа на сервер..." -ForegroundColor Gray
    scp $dumpFile ${SERVER}:/tmp/
    Write-Host "   ✅ Дамп скопирован" -ForegroundColor Green
    
    # 3. Создать бэкап на сервере
    Write-Host "   3. Создание бэкапа на сервере..." -ForegroundColor Gray
    ssh $SERVER @"
sudo -u postgres pg_dump $REMOTE_DB > /tmp/backup_before_sync_`$(date +%Y%m%d_%H%M%S).sql
"@
    Write-Host "   ✅ Бэкап создан" -ForegroundColor Green
    
    # 4. Восстановить на сервере
    Write-Host "   4. Восстановление БД на сервере..." -ForegroundColor Gray
    ssh $SERVER @"
# Очистить базу
sudo -u postgres psql -d $REMOTE_DB -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
# Восстановить из дампа
sudo -u postgres psql -d $REMOTE_DB < /tmp/$dumpFile
# Удалить временный файл
rm /tmp/$dumpFile
"@
    Write-Host "   ✅ БД восстановлена на сервере" -ForegroundColor Green
    
    # 5. Перезапустить сервисы
    Write-Host "   5. Перезапуск сервисов..." -ForegroundColor Gray
    ssh $SERVER @"
systemctl restart feed-editor-backend.service
systemctl restart feed-editor-frontend.service
"@
    Write-Host "   ✅ Сервисы перезапущены" -ForegroundColor Green
    
    # Удалить локальный дамп
    Remove-Item $dumpFile
    
    Write-Host ""
    Write-Host "✅ Данные успешно перенесены на сервер!" -ForegroundColor Green
    
} else {
    # Сервер -> Локальная
    Write-Host "📥 Перенос данных: Сервер → Локальная БД" -ForegroundColor Yellow
    Write-Host ""
    
    # 1. Создать дамп на сервере
    Write-Host "   1. Создание дампа на сервере..." -ForegroundColor Gray
    $dumpFile = "shar_messenger_server_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql"
    
    ssh $SERVER @"
sudo -u postgres pg_dump $REMOTE_DB > /tmp/$dumpFile
"@
    Write-Host "   ✅ Дамп создан на сервере" -ForegroundColor Green
    
    # 2. Скопировать локально
    Write-Host "   2. Копирование дампа на локальную машину..." -ForegroundColor Gray
    scp ${SERVER}:/tmp/$dumpFile .
    ssh $SERVER "rm /tmp/$dumpFile"
    Write-Host "   ✅ Дамп скопирован" -ForegroundColor Green
    
    # 3. Создать бэкап локальной БД
    Write-Host "   3. Создание бэкапа локальной БД..." -ForegroundColor Gray
    $env:PGPASSWORD = "Traplord999!"
    & "C:\Program Files\PostgreSQL\16\bin\pg_dump.exe" -h localhost -U postgres -d $LOCAL_DB > "backup_before_sync_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql"
    Write-Host "   ✅ Бэкап создан" -ForegroundColor Green
    
    # 4. Восстановить локально
    Write-Host "   4. Восстановление БД локально..." -ForegroundColor Gray
    
    # Очистить локальную базу
    & "C:\Program Files\PostgreSQL\16\bin\psql.exe" -h localhost -U postgres -d $LOCAL_DB -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
    
    # Восстановить из дампа
    & "C:\Program Files\PostgreSQL\16\bin\psql.exe" -h localhost -U postgres -d $LOCAL_DB -f $dumpFile
    
    Write-Host "   ✅ БД восстановлена локально" -ForegroundColor Green
    
    # Удалить дамп
    Remove-Item $dumpFile
    
    Write-Host ""
    Write-Host "✅ Данные успешно перенесены с сервера!" -ForegroundColor Green
}

Write-Host ""
Write-Host "=" * 70
Write-Host "🎉 СИНХРОНИЗАЦИЯ ЗАВЕРШЕНА!" -ForegroundColor Green
Write-Host "=" * 70
Write-Host ""
Write-Host "📊 Проверка данных:" -ForegroundColor Cyan
if ($Direction -eq "ToServer") {
    Write-Host "   Сервер: ssh $SERVER 'cd /var/www/feed-editor/backend && python3 test_postgres.py'"
} else {
    Write-Host "   Локально: cd backend && python test_postgres.py"
}
Write-Host ""
