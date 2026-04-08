# .shar-deploy.ps1
# Полный деплой Electron приложения + обновление на сервере
# Использование:
#   .\.shar-deploy.ps1              # Patch bump (0.2.6 -> 0.2.7)
#   .\.shar-deploy.ps1 -Minor       # Minor bump (0.2.6 -> 0.3.0)
#   .\.shar-deploy.ps1 -Major       # Major bump (0.2.6 -> 1.0.0)
#   .\.shar-deploy.ps1 -Version 1.0.0  # Конкретная версия

param(
    [string]$Version = "",
    [switch]$Minor,
    [switch]$Major,
    [string]$ServerHost = "81.90.31.129",
    [string]$ServerUser = "root",
    [string]$RemotePath = "/var/www/shar/updates"
)

$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent $PSScriptRoot
$ElectronDir = "$RootDir\frontend\native\electron"
$ReleaseDir = "$ElectronDir\release"

function Write-Step($msg) { Write-Host "`n▶ $msg" -ForegroundColor Cyan }
function Write-Success($msg) { Write-Host "✓ $msg" -ForegroundColor Green }
function Write-Info($msg) { Write-Host "  $msg" -ForegroundColor Gray }
function Write-Fail($msg) { Write-Host "✗ $msg" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Shar OS — Полный деплой (Electron + Server)" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan

# ═══════════════════════════════════════════════════════════════
# 1. Загрузка .env и проверка SSH
# ═══════════════════════════════════════════════════════════════
Write-Step "Загрузка конфигурации..."
$envFile = "$RootDir\.env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]*?)\s*=\s*(.*)\s*$') {
            [System.Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'Process')
        }
    }
    Write-Success ".env загружен"
}

$sshPassword = $env:SSH_PASSWORD
if (-not $sshPassword) { Write-Fail "SSH_PASSWORD не задан. Добавьте SSH_PASSWORD=<пароль> в .env" }

# Установка Posh-SSH если нужно
if (-not (Get-Module -ListAvailable -Name "Posh-SSH")) {
    Write-Info "Установка Posh-SSH модуля..."
    Install-Module -Name Posh-SSH -Force -Scope CurrentUser -AllowClobber
}
Import-Module Posh-SSH -ErrorAction Stop
Write-Success "SSH модуль загружен"

$sshCred = New-Object PSCredential($ServerUser, (ConvertTo-SecureString $sshPassword -AsPlainText -Force))

function Invoke-Remote($cmd) {
    $session = New-SSHSession -ComputerName $ServerHost -Credential $sshCred -AcceptKey -Force -WarningAction SilentlyContinue
    $result = Invoke-SSHCommand -SessionId $session.SessionId -Command $cmd
    Remove-SSHSession -SessionId $session.SessionId | Out-Null
    return $result
}

function Upload-File($localPath, $remoteDest) {
    $session = New-SSHSession -ComputerName $ServerHost -Credential $sshCred -AcceptKey -Force -WarningAction SilentlyContinue
    Set-SCPItem -ComputerName $ServerHost -Credential $sshCred -Path $localPath -Destination $remoteDest -AcceptKey -Force | Out-Null
    Remove-SSHSession -SessionId $session.SessionId | Out-Null
}

# ═══════════════════════════════════════════════════════════════
# 2. Определение новой версии
# ═══════════════════════════════════════════════════════════════
Write-Step "Определение версии..."
$pkgPath = "$ElectronDir\package.json"
if (-not (Test-Path $pkgPath)) {
    Write-Fail "package.json не найден: $pkgPath"
}

$pkg = Get-Content $pkgPath -Raw | ConvertFrom-Json
$currentVersion = $pkg.version
$parts = $currentVersion -split '\.'
$maj = [int]$parts[0]
$min = [int]$parts[1]
$pat = [int]$parts[2]

if ($Version) {
    $newVersion = $Version
} elseif ($Major) {
    $newVersion = "$($maj + 1).0.0"
} elseif ($Minor) {
    $newVersion = "$maj.$($min + 1).0"
} else {
    $newVersion = "$maj.$min.$($pat + 1)"
}

Write-Info "Текущая версия: $currentVersion"
Write-Info "Новая версия:   $newVersion"
$pkg.version = $newVersion
$jsonContent = $pkg | ConvertTo-Json -Depth 10
[System.IO.File]::WriteAllText($pkgPath, $jsonContent, [System.Text.UTF8Encoding]::new($false))
Write-Success "package.json обновлён → v$newVersion"

# ═══════════════════════════════════════════════════════════════
# 3. Сборка Electron приложения
# ═══════════════════════════════════════════════════════════════
Write-Step "Сборка Electron приложения..."
Push-Location $ElectronDir

Write-Info "npm install..."
npm install --prefer-offline --silent --no-audit 2>&1 | Out-Null

Write-Info "electron-builder (это займёт ~1 минуту)..."
npm run build:win 2>&1 | Out-Null

if ($LASTEXITCODE -ne 0) {
    Pop-Location
    Write-Fail "electron-builder завершился с ошибкой (код $LASTEXITCODE)"
}

# Фикс: синхронизация latest.yml из nsis-web
if (Test-Path "release\nsis-web\latest.yml") {
    Copy-Item "release\nsis-web\latest.yml" "release\latest.yml" -Force
    Write-Success "latest.yml синхронизирован"
}

Pop-Location
Write-Success "Сборка завершена"

# ═══════════════════════════════════════════════════════════════
# 4. Загрузка файлов на сервер
# ═══════════════════════════════════════════════════════════════
Write-Step "Загрузка на сервер $ServerHost..."

# Создание директории
$mkdirResult = Invoke-Remote "mkdir -p $RemotePath"
if ($mkdirResult.ExitStatus -ne 0) { Write-Fail "Не удалось создать $RemotePath" }

# Загрузка latest.yml
if (-not (Test-Path "$ReleaseDir\latest.yml")) {
    Write-Fail "latest.yml не найден в $ReleaseDir"
}
Upload-File "$ReleaseDir\latest.yml" $RemotePath
Write-Success "latest.yml загружен"

# Загрузка .exe файлов
$exeFiles = Get-ChildItem "$ReleaseDir\*.exe" -ErrorAction SilentlyContinue
foreach ($f in $exeFiles) {
    Write-Info "Загрузка $($f.Name) ($([Math]::Round($f.Length/1MB,1)) MB)..."
    Upload-File $f.FullName $RemotePath
}
Write-Success "Установщики загружены"

# Загрузка .blockmap файлов
$blockmaps = Get-ChildItem "$ReleaseDir\*.blockmap" -ErrorAction SilentlyContinue
foreach ($f in $blockmaps) {
    Upload-File $f.FullName $RemotePath
}

# Загрузка nsis-web файлов
if (Test-Path "$ReleaseDir\nsis-web") {
    $chunks = Get-ChildItem "$ReleaseDir\nsis-web\*" -ErrorAction SilentlyContinue
    foreach ($f in $chunks) {
        Upload-File $f.FullName $RemotePath
    }
    Write-Success "NSIS-web файлы загружены"
}

# ═══════════════════════════════════════════════════════════════
# 5. Обновление сервера (shar pull)
# ═══════════════════════════════════════════════════════════════
Write-Step "Обновление сервера..."
Write-Info "Выполнение команды: shar pull"

$pullResult = Invoke-Remote "cd /root && /root/.cargo/bin/shar pull"
if ($pullResult.ExitStatus -eq 0) {
    Write-Success "Сервер обновлён успешно"
    if ($pullResult.Output) {
        Write-Host "`n$($pullResult.Output)" -ForegroundColor Gray
    }
} else {
    Write-Host "`nВнимание: shar pull завершился с кодом $($pullResult.ExitStatus)" -ForegroundColor Yellow
    if ($pullResult.Error) {
        Write-Host $pullResult.Error -ForegroundColor Yellow
    }
}

# ═══════════════════════════════════════════════════════════════
# 6. Коммит изменений в Git
# ═══════════════════════════════════════════════════════════════
Write-Step "Сохранение в Git..."
Push-Location $RootDir

git add "$pkgPath" 2>&1 | Out-Null
git commit -m "chore: release v$newVersion" 2>&1 | Out-Null
git push origin main 2>&1 | Out-Null

Pop-Location
Write-Success "Коммит создан и отправлен"

# ═══════════════════════════════════════════════════════════════
# Готово!
# ═══════════════════════════════════════════════════════════════
Write-Host ""
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  ✓ Релиз v$newVersion успешно опубликован!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "  Electron приложение:" -ForegroundColor Cyan
Write-Host "    Установщик: https://vokrug-sveta.shar-os.ru/updates/Shar%20setup.exe" -ForegroundColor Gray
Write-Host "    Обновление: https://vokrug-sveta.shar-os.ru/updates/latest.yml" -ForegroundColor Gray
Write-Host ""
Write-Host "  Веб-приложение:" -ForegroundColor Cyan
Write-Host "    URL: https://vokrug-sveta.shar-os.ru" -ForegroundColor Gray
Write-Host ""
