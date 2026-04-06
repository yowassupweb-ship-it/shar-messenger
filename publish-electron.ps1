# publish-electron.ps1
# Сборка Electron инсталлера на Windows + загрузка на сервер
# Запуск: .\publish-electron.ps1
# Буmп patch-версии (0.1.0 -> 0.1.1): .\publish-electron.ps1
# Указать версию явно:                .\publish-electron.ps1 -Version 1.2.0
# Только загрузка без сборки:         .\publish-electron.ps1 -UploadOnly

param(
    [string]$Version = "",
    [ValidateSet("major","minor","patch")]
    [string]$Bump = "patch",
    [switch]$UploadOnly,
    [string]$Server = "root@81.90.31.129",
    [string]$RemotePath = "/var/www/shar/updates"
)

$ErrorActionPreference = "Stop"
$ElectronDir = "$PSScriptRoot\frontend\native\electron"
$ReleaseDir = "$ElectronDir\release"

function Write-Ok($msg)   { Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Info($msg) { Write-Host " >>  $msg" -ForegroundColor Cyan }
function Write-Warn($msg) { Write-Host " !   $msg" -ForegroundColor Yellow }
function Write-Fail($msg) { Write-Host "[!!] $msg" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "  Shar OS -- publikatsiia Electron-obnovleniia (Windows -> Server)" -ForegroundColor Cyan
Write-Host ""

# --- Version bump -------------------------------------------------------
$pkgPath = "$ElectronDir\package.json"
$pkg = Get-Content $pkgPath -Raw | ConvertFrom-Json
$currentVersion = $pkg.version

if (-not $UploadOnly) {
    if ($Version -ne "") {
        $newVersion = $Version
    } else {
        $parts = $currentVersion -split '\.'
        $major = [int]$parts[0]; $minor = [int]$parts[1]; $patch = [int]$parts[2]
        switch ($Bump) {
            "major" { $major++; $minor = 0; $patch = 0 }
            "minor" { $minor++; $patch = 0 }
            "patch" { $patch++ }
        }
        $newVersion = "$major.$minor.$patch"
    }

    Write-Info "Versiya: $currentVersion -> $newVersion"
    $pkg.version = $newVersion
    $pkg | ConvertTo-Json -Depth 10 | Set-Content $pkgPath -Encoding UTF8
    Write-Ok "package.json: version=$newVersion"
}

# --- Build --------------------------------------------------------------
if (-not $UploadOnly) {
    Write-Info "npm install..."
    Push-Location $ElectronDir
    npm install --prefer-offline
    if ($LASTEXITCODE -ne 0) { Pop-Location; Write-Fail "npm install failed" }

    Write-Info "electron-builder --win nsis-web ..."
    npm run build:win
    if ($LASTEXITCODE -ne 0) { Pop-Location; Write-Fail "electron-builder failed" }
    Pop-Location
    Write-Ok "Installer built"
}

# --- Verify release files -----------------------------------------------
if (-not (Test-Path "$ReleaseDir\latest.yml")) {
    Write-Fail "latest.yml not found in $ReleaseDir -- run without -UploadOnly first"
}

$latestYml = Get-Content "$ReleaseDir\latest.yml" -Raw
$builtVersion = ($latestYml | Select-String "^version:\s*(.+)").Matches[0].Groups[1].Value.Trim()
Write-Info "Release version: $builtVersion"

# --- Upload to server ---------------------------------------------------
Write-Info "Uploading to $Server : $RemotePath ..."

ssh $Server "mkdir -p $RemotePath"
if ($LASTEXITCODE -ne 0) { Write-Fail "Could not create $RemotePath on server" }

scp "$ReleaseDir\latest.yml" "${Server}:${RemotePath}/latest.yml"
Write-Ok "latest.yml uploaded"

$exeFiles = Get-ChildItem "$ReleaseDir\*.exe" -ErrorAction SilentlyContinue
foreach ($f in $exeFiles) {
    Write-Info "Uploading $($f.Name) ($([Math]::Round($f.Length/1MB,1)) MB) ..."
    scp $f.FullName "${Server}:${RemotePath}/$($f.Name)"
    Write-Ok "$($f.Name) uploaded"
}

$blockmaps = Get-ChildItem "$ReleaseDir\*.blockmap" -ErrorAction SilentlyContinue
foreach ($f in $blockmaps) {
    scp $f.FullName "${Server}:${RemotePath}/$($f.Name)"
    Write-Ok "$($f.Name) uploaded"
}

if (Test-Path "$ReleaseDir\nsis-web") {
    $chunks = Get-ChildItem "$ReleaseDir\nsis-web\*" -ErrorAction SilentlyContinue
    foreach ($f in $chunks) {
        scp $f.FullName "${Server}:${RemotePath}/$($f.Name)"
        Write-Ok "nsis-web/$($f.Name) uploaded"
    }
}

# --- Commit version bump ------------------------------------------------
if (-not $UploadOnly) {
    Write-Info "Committing version bump..."
    Push-Location $PSScriptRoot
    git add "$pkgPath"
    git commit -m "chore: bump electron version to $builtVersion"
    git push origin main
    Pop-Location
    Write-Ok "Version committed & pushed"
}

Write-Host ""
Write-Host "  Done! v$builtVersion published." -ForegroundColor Green
Write-Host "  Installer : https://vokrug-sveta.shar-os.ru/updates/Shar%20setup.exe"
Write-Host "  Auto-update: https://vokrug-sveta.shar-os.ru/updates/latest.yml"
Write-Host ""