# Проверка настройки окружения для Android сборки
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Проверка окружения для Android" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

$allGood = $true

# Проверка Rust
Write-Host "1. Проверка Rust..." -ForegroundColor Yellow
$cargoCmd = Get-Command cargo -ErrorAction SilentlyContinue
if ($cargoCmd) {
    $cargoVersion = & cargo --version 2>&1
    $rustcVersion = & rustc --version 2>&1
    Write-Host "   OK Cargo: $cargoVersion" -ForegroundColor Green
    Write-Host "   OK Rustc: $rustcVersion" -ForegroundColor Green
} else {
    Write-Host "   ERROR Rust not installed" -ForegroundColor Red
    Write-Host "     Install from: https://rustup.rs/" -ForegroundColor Yellow
    $allGood = $false
}
Write-Host ""

# Проверка Java
Write-Host "2. Проверка Java JDK..." -ForegroundColor Yellow  
$javaCmd = Get-Command java -ErrorAction SilentlyContinue
if ($javaCmd) {
    $javaVersion = & java -version 2>&1 | Select-Object -First 1
    Write-Host "   OK Java: $javaVersion" -ForegroundColor Green
} else {
    Write-Host "   ERROR Java not installed" -ForegroundColor Red
    Write-Host "     Install OpenJDK 17+: https://adoptium.net/" -ForegroundColor Yellow
    $allGood = $false
}
Write-Host ""

# Проверка Android SDK
Write-Host "3. Проверка Android SDK..." -ForegroundColor Yellow
if ($env:ANDROID_HOME) {
    Write-Host "   OK ANDROID_HOME: $env:ANDROID_HOME" -ForegroundColor Green
    
    $platformTools = Join-Path $env:ANDROID_HOME "platform-tools"
    $buildTools = Join-Path $env:ANDROID_HOME "build-tools"
    
    if (Test-Path $platformTools) {
        Write-Host "   OK Platform Tools" -ForegroundColor Green
    } else {
        Write-Host "   ERROR Platform Tools not found" -ForegroundColor Red
        $allGood = $false
    }
    
    if (Test-Path $buildTools) {
        Write-Host "   OK Build Tools" -ForegroundColor Green
    } else {
        Write-Host "   ERROR Build Tools not found" -ForegroundColor Red
        $allGood = $false
    }
} else {
    Write-Host "   ERROR ANDROID_HOME not set" -ForegroundColor Red
    Write-Host "     Install Android Studio and set ANDROID_HOME" -ForegroundColor Yellow
    $allGood = $false
}
Write-Host ""

# Проверка NDK
Write-Host "4. Проверка Android NDK..." -ForegroundColor Yellow
if ($env:NDK_HOME) {
    Write-Host "   OK NDK_HOME: $env:NDK_HOME" -ForegroundColor Green
} elseif ($env:ANDROID_HOME) {
    $ndkPath = Join-Path $env:ANDROID_HOME "ndk"
    if (Test-Path $ndkPath) {
        $ndkVersions = Get-ChildItem $ndkPath | Select-Object -First 1
        if ($ndkVersions) {
            Write-Host "   WARNING NDK found but NDK_HOME not set" -ForegroundColor Yellow
            Write-Host "     Set with: `$env:NDK_HOME = '$($ndkVersions.FullName)'" -ForegroundColor Yellow
        }
    } else {
        Write-Host "   ERROR NDK not installed" -ForegroundColor Red
        Write-Host "     Install via Android Studio SDK Manager" -ForegroundColor Yellow
        $allGood = $false
    }
} else {
    Write-Host "   ERROR NDK not found" -ForegroundColor Red
    $allGood = $false
}
Write-Host ""

# Проверка Rust targets для Android
Write-Host "5. Проверка Rust targets..." -ForegroundColor Yellow
$rustupCmd = Get-Command rustup -ErrorAction SilentlyContinue
if ($rustupCmd) {
    $targets = & rustup target list --installed 2>&1
    $androidTargets = @(
        "aarch64-linux-android",
        "armv7-linux-androideabi", 
        "i686-linux-android",
        "x86_64-linux-android"
    )
    
    $missingTargets = @()
    foreach ($target in $androidTargets) {
        if ($targets -match $target) {
            Write-Host "   OK $target" -ForegroundColor Green
        } else {
            Write-Host "   ERROR $target not installed" -ForegroundColor Red
            $missingTargets += $target
        }
    }
    
    if ($missingTargets.Count -gt 0) {
        Write-Host ""
        Write-Host "   Install missing targets:" -ForegroundColor Yellow
        Write-Host "   rustup target add $($missingTargets -join ' ')" -ForegroundColor Cyan
        $allGood = $false
    }
} else {
    Write-Host "   ERROR Rustup not found" -ForegroundColor Red
    $allGood = $false
}
Write-Host ""

# Результат
Write-Host "================================" -ForegroundColor Cyan
if ($allGood) {
    Write-Host "All checks passed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Ready to build:" -ForegroundColor Green
    Write-Host "  npm run android:init" -ForegroundColor Cyan
    Write-Host "  npm run android:build" -ForegroundColor Cyan
} else {
    Write-Host "Installation required" -ForegroundColor Red
    Write-Host ""
    Write-Host "See instructions in ANDROID_SETUP.md" -ForegroundColor Yellow
}
Write-Host "================================" -ForegroundColor Cyan
