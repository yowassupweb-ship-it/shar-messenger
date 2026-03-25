# Финальная настройка переменных окружения
Write-Host "Setting up environment variables..." -ForegroundColor Cyan
Write-Host ""

# Android SDK
$androidHome = "C:\Users\anton\AppData\Local\Android\Sdk"
[System.Environment]::SetEnvironmentVariable("ANDROID_HOME", $androidHome, "User")
Write-Host "ANDROID_HOME = $androidHome" -ForegroundColor Green

# Java JDK
$jdkPath = "E:\JDK\bin"

# Rust/Cargo
$cargoPath = "$env:USERPROFILE\.cargo\bin"

# Get current user PATH
$userPath = [System.Environment]::GetEnvironmentVariable("Path", "User")

# Add paths if not already present
$pathsToAdd = @($jdkPath, $cargoPath, "$androidHome\platform-tools", "$androidHome\build-tools\36.1.0")

foreach ($path in $pathsToAdd) {
    if ($userPath -notlike "*$path*") {
        Write-Host "Adding to PATH: $path" -ForegroundColor Yellow
        $userPath = "$userPath;$path"
    } else {
        Write-Host "Already in PATH: $path" -ForegroundColor Gray
    }
}

[System.Environment]::SetEnvironmentVariable("Path", $userPath, "User")

Write-Host ""
Write-Host "Environment variables updated!" -ForegroundColor Green
Write-Host ""
Write-Host "IMPORTANT:" -ForegroundColor Yellow
Write-Host "1. Close and reopen PowerShell for permanent changes" -ForegroundColor Cyan
Write-Host "2. Or run this to update current session:" -ForegroundColor Cyan
Write-Host '   $env:Path = [Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [Environment]::GetEnvironmentVariable("Path","User")' -ForegroundColor White
Write-Host '   $env:ANDROID_HOME = "C:\Users\anton\AppData\Local\Android\Sdk"' -ForegroundColor White
Write-Host ""
