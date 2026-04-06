# publish-electron.ps1
# Сборка Electron инсталлера на Windows + загрузка на сервер
# Запуск: .\publish-electron.ps1
# С версией: .\publish-electron.ps1 -Version 1.2.0
# Только загрузка (без сборки): .\publish-electron.ps1 -UploadOnly

param(
    [string]$Version = "",
    [switch]$UploadOnly,
    [string]$Server = "root@81.90.31.129",
    [string]$RemotePath = "/var/www/shar/updates"
)

$ErrorActionPreference = "Stop"
$ElectronDir = "$PSScriptRoot\frontend\native\electron"
$ReleaseDir = "$ElectronDir\release"

function Write-Ok($msg)   { Write-Host "✓ $msg" -ForegroundColor Green }
function Write-Info($msg) { Write-Host "→ $msg" -ForegroundColor Cyan }
function Write-Warn($msg) { Write-Host "! $msg" -ForegroundColor Yellow }
function Write-Fail($msg) { Write-Host "✗ $msg" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "  Shar OS — публикация Electron обновления" -ForegroundColor Cyan -NoNewline
Write-Host " (Windows → Server)" -ForegroundColor DarkGray
Write-Host ""

# ─── Bump version ─────────────────────────────────────────────────────────────
if ($Version -ne "" -and -not $UploadOnly) {
    Write-Info "Обновляем версию до $Version..."
    $pkgPath = "$ElectronDir\package.json"
    $pkg = Get-Content $pkgPath -Raw | ConvertFrom-Json
    $pkg.version = $Version
    $pkg | ConvertTo-Json -Depth 10 | Set-Content $pkgPath -Encoding UTF8
    Write-Ok "package.json → version=$Version"
}

# ─── Build ────────────────────────────────────────────────────────────────────
if (-not $UploadOnly) {
    Write-Info "npm install..."
    Push-Location $ElectronDir
    npm install --prefer-offline
    if ($LASTEXITCODE -ne 0) { Write-Fail "npm install завершился с ошибкой" }

    Write-Info "Сборка NSIS Web инсталлера..."
    npm run build:win
    if ($LASTEXITCODE -ne 0) { Write-Fail "electron-builder завершился с ошибкой" }
    Pop-Location
    Write-Ok "Инсталлер собран"
}

# ─── Verify release files ─────────────────────────────────────────────────────
if (-not (Test-Path "$ReleaseDir\latest.yml")) {
    Write-Fail "latest.yml не найден в $ReleaseDir\nВыполни сборку без -UploadOnly"
}

$latestYml = Get-Content "$ReleaseDir\latest.yml" -Raw
$builtVersion = ($latestYml | Select-String "^version:\s*(.+)").Matches[0].Groups[1].Value.Trim()
Write-Info "Версия релиза: $builtVersion"

# ─── Upload to server ─────────────────────────────────────────────────────────
Write-Info "Загружаем файлы на $Server`:$RemotePath ..."

# Создаём папку на сервере
ssh $Server "mkdir -p $RemotePath"
if ($LASTEXITCODE -ne 0) { Write-Fail "Не удалось создать $RemotePath на сервере" }

# latest.yml — главный файл метаданных (без кэша)
scp "$ReleaseDir\latest.yml" "${Server}:${RemotePath}/latest.yml"
Write-Ok "latest.yml загружен"

# .exe инсталлер(ы)
$exeFiles = Get-ChildItem "$ReleaseDir\*.exe" -ErrorAction SilentlyContinue
foreach ($f in $exeFiles) {
    Write-Info "Загружаем $($f.Name) ($('{0:F1} MB' -f ($f.Length/1MB)))..."
    scp $f.FullName "${Server}:${RemotePath}/$($f.Name)"
    Write-Ok "$($f.Name) загружен"
}

# .blockmap
$blockmaps = Get-ChildItem "$ReleaseDir\*.blockmap" -ErrorAction SilentlyContinue
foreach ($f in $blockmaps) {
    scp $f.FullName "${Server}:${RemotePath}/$($f.Name)"
    Write-Ok "$($f.Name) загружен"
}

# nsis-web chunks
if (Test-Path "$ReleaseDir\nsis-web") {
    $chunks = Get-ChildItem "$ReleaseDir\nsis-web\*" -ErrorAction SilentlyContinue
    foreach ($f in $chunks) {
        scp $f.FullName "${Server}:${RemotePath}/$($f.Name)"
        Write-Ok "nsis-web/$($f.Name) загружен"
    }
}

Write-Host ""
Write-Ok "Обновление v$builtVersion опубликовано!"
Write-Host "  Инсталлер : https://vokrug-sveta.shar-os.ru/updates/Shar%20setup.exe" -ForegroundColor Gray
Write-Host "  Авто-апдейт URL : https://vokrug-sveta.shar-os.ru/updates/latest.yml" -ForegroundColor Gray
Write-Host ""
