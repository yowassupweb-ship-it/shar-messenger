# Script to add installed tools to PATH
Write-Host "Adding installed tools to PATH..." -ForegroundColor Cyan
Write-Host ""

# Paths to add
$jdkPath = "E:\JDK\bin"
$cargoPath = "$env:USERPROFILE\.cargo\bin"

# Get current user PATH
$userPath = [System.Environment]::GetEnvironmentVariable("Path", "User")

# Check and add JDK
if ($userPath -notlike "*$jdkPath*") {
    Write-Host "Adding JDK to PATH: $jdkPath" -ForegroundColor Yellow
    $newPath = "$userPath;$jdkPath"
    [System.Environment]::SetEnvironmentVariable("Path", $newPath, "User")
    Write-Host "  OK JDK added to User PATH" -ForegroundColor Green
} else {
    Write-Host "  OK JDK already in PATH" -ForegroundColor Green
}

# Check and add Cargo
if ($userPath -notlike "*$cargoPath*") {
    Write-Host "Adding Rust/Cargo to PATH: $cargoPath" -ForegroundColor Yellow
    $userPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
    $newPath = "$userPath;$cargoPath"
    [System.Environment]::SetEnvironmentVariable("Path", $newPath, "User")
    Write-Host "  OK Cargo added to User PATH" -ForegroundColor Green
} else {
    Write-Host "  OK Cargo already in PATH" -ForegroundColor Green
}

# Update PATH for current session
$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

Write-Host ""
Write-Host "PATH updated!" -ForegroundColor Green
Write-Host ""
Write-Host "Checking installations..." -ForegroundColor Cyan

# Test Java
try {
    $javaVersion = & "$jdkPath\java.exe" -version 2>&1 | Select-Object -First 1
    Write-Host "  OK Java: $javaVersion" -ForegroundColor Green
} catch {
    Write-Host "  ERROR Java not working" -ForegroundColor Red
}

# Test Cargo
try {
    $cargoVersion = & "$cargoPath\cargo.exe" --version
    Write-Host "  OK Cargo: $cargoVersion" -ForegroundColor Green
} catch {
    Write-Host "  ERROR Cargo not working" -ForegroundColor Red
}

# Test Rustc
try {
    $rustcVersion = & "$cargoPath\rustc.exe" --version
    Write-Host "  OK Rustc: $rustcVersion" -ForegroundColor Green
} catch {
    Write-Host "  ERROR Rustc not working" -ForegroundColor Red
}

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "IMPORTANT: Close and reopen PowerShell for changes to take effect!" -ForegroundColor Yellow
Write-Host "Then run: .\check-android-setup.ps1" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
