# .shar-deploy.ps1
# Full deploy: Electron app + server update
# Usage:
#   .\.shar-deploy.ps1              # Patch bump (0.2.6 -> 0.2.7)
#   .\.shar-deploy.ps1 -Minor       # Minor bump (0.2.6 -> 0.3.0)
#   .\.shar-deploy.ps1 -Major       # Major bump (0.2.6 -> 1.0.0)
#   .\.shar-deploy.ps1 -Version 1.0.0  # Specific version

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

function Write-Step($msg) { Write-Host "`n>> $msg" -ForegroundColor Cyan }
function Write-Success($msg) { Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Info($msg) { Write-Host " >> $msg" -ForegroundColor Gray }
function Write-Fail($msg) { Write-Host "[!!] $msg" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  Shar OS - Full Deploy (Electron + Server)" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# === 1. Load .env and check SSH ===
Write-Step "Loading configuration..."
$envFile = "$RootDir\.env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]*?)\s*=\s*(.*)\s*$') {
            [System.Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'Process')
        }
    }
    Write-Success ".env loaded"
}

$sshPassword = $env:SSH_PASSWORD
if (-not $sshPassword) { Write-Fail "SSH_PASSWORD not set. Add SSH_PASSWORD=<password> to .env" }

if (-not (Get-Module -ListAvailable -Name "Posh-SSH")) {
    Write-Info "Installing Posh-SSH module..."
    Install-Module -Name Posh-SSH -Force -Scope CurrentUser -AllowClobber
}
Import-Module Posh-SSH -ErrorAction Stop
Write-Success "SSH module loaded"

$sshCred = New-Object PSCredential($ServerUser, (ConvertTo-SecureString $sshPassword -AsPlainText -Force))

function Invoke-Remote($cmd, $timeout = 60) {
    $session = New-SSHSession -ComputerName $ServerHost -Credential $sshCred -AcceptKey -Force -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
    $result = Invoke-SSHCommand -SessionId $session.SessionId -Command $cmd -TimeOut $timeout
    Remove-SSHSession -SessionId $session.SessionId -WarningAction SilentlyContinue | Out-Null
    return $result
}

function Upload-File($localPath, $remoteDest) {
    $session = New-SSHSession -ComputerName $ServerHost -Credential $sshCred -AcceptKey -Force -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
    Set-SCPItem -ComputerName $ServerHost -Credential $sshCred -Path $localPath -Destination $remoteDest -AcceptKey -Force -WarningAction SilentlyContinue -ErrorAction SilentlyContinue | Out-Null
    Remove-SSHSession -SessionId $session.SessionId -WarningAction SilentlyContinue | Out-Null
}

# === 2. Version bump ===
Write-Step "Determining version..."
$pkgPath = "$ElectronDir\package.json"
if (-not (Test-Path $pkgPath)) {
    Write-Fail "package.json not found: $pkgPath"
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

Write-Info "Current version: $currentVersion"
Write-Info "New version:     $newVersion"
$pkg.version = $newVersion
$jsonContent = $pkg | ConvertTo-Json -Depth 10
[System.IO.File]::WriteAllText($pkgPath, $jsonContent, [System.Text.UTF8Encoding]::new($false))
Write-Success "package.json updated -> v$newVersion"

# === 3. Build Electron app ===
Write-Step "Building Electron application..."
Push-Location $ElectronDir

Write-Info "npm install..."
npm install --prefer-offline --silent --no-audit 2>&1 | Out-Null

Write-Info "electron-builder (this will take ~1 minute)..."
npm run build:win 2>&1 | Out-Null

if ($LASTEXITCODE -ne 0) {
    Pop-Location
    Write-Fail "electron-builder failed with code $LASTEXITCODE"
}

if (Test-Path "release\nsis-web\latest.yml") {
    Copy-Item "release\nsis-web\latest.yml" "release\latest.yml" -Force
    Write-Success "latest.yml synced"
}

Pop-Location
Write-Success "Build completed"

# === 4. Upload to server ===
Write-Step "Uploading to server $ServerHost..."

$mkdirResult = Invoke-Remote "mkdir -p $RemotePath"
if ($mkdirResult.ExitStatus -ne 0) { Write-Fail "Failed to create $RemotePath" }

if (-not (Test-Path "$ReleaseDir\latest.yml")) {
    Write-Fail "latest.yml not found in $ReleaseDir"
}
Upload-File "$ReleaseDir\latest.yml" $RemotePath
Write-Success "latest.yml uploaded"

$exeFiles = Get-ChildItem "$ReleaseDir\*.exe" -ErrorAction SilentlyContinue
foreach ($f in $exeFiles) {
    Write-Info "Uploading $($f.Name) ($([Math]::Round($f.Length/1MB,1)) MB)..."
    Upload-File $f.FullName $RemotePath
}
Write-Success "Installers uploaded"

$blockmaps = Get-ChildItem "$ReleaseDir\*.blockmap" -ErrorAction SilentlyContinue
foreach ($f in $blockmaps) {
    Upload-File $f.FullName $RemotePath
}

if (Test-Path "$ReleaseDir\nsis-web") {
    $chunks = Get-ChildItem "$ReleaseDir\nsis-web\*" -ErrorAction SilentlyContinue
    foreach ($f in $chunks) {
        Upload-File $f.FullName $RemotePath
    }
    Write-Success "NSIS-web files uploaded"
}

# === 5. Update server (shar pull) ===
Write-Step "Updating server..."
Write-Info "Running command: shar pull (timeout: 5 minutes)"

$pullResult = Invoke-Remote "cd /root && /usr/local/bin/shar pull" -timeout 300
if ($pullResult.ExitStatus -eq 0) {
    Write-Success "Server updated successfully"
    if ($pullResult.Output) {
        Write-Host "`n$($pullResult.Output)" -ForegroundColor Gray
    }
} else {
    Write-Host "`nWarning: shar pull exited with code $($pullResult.ExitStatus)" -ForegroundColor Yellow
    if ($pullResult.Error) {
        Write-Host $pullResult.Error -ForegroundColor Yellow
    }
}

# === 6. Git commit ===
Write-Step "Saving to Git..."
Push-Location $RootDir

git add "$pkgPath" 2>&1 | Out-Null
git commit -m "chore: release v$newVersion" 2>&1 | Out-Null
git push origin main 2>&1 | Out-Null

Pop-Location
Write-Success "Commit created and pushed"

# === Done! ===
Write-Host ""
Write-Host "=============================================" -ForegroundColor Green
Write-Host "  Release v$newVersion published!" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Electron app:" -ForegroundColor Cyan
Write-Host "    Installer: https://vokrug-sveta.shar-os.ru/updates/Shar%20setup.exe" -ForegroundColor Gray
Write-Host "    Updates:   https://vokrug-sveta.shar-os.ru/updates/latest.yml" -ForegroundColor Gray
Write-Host ""
Write-Host "  Web app:" -ForegroundColor Cyan
Write-Host "    URL: https://vokrug-sveta.shar-os.ru" -ForegroundColor Gray
Write-Host ""