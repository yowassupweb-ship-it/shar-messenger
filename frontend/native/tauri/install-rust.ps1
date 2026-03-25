# Quick install script for Rust
Write-Host "Installing Rust..." -ForegroundColor Cyan

$rustupUrl = "https://win.rustup.rs/x86_64"
$rustupPath = "$env:TEMP\rustup-init.exe"

try {
    Write-Host "Downloading Rust installer..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri $rustupUrl -OutFile $rustupPath -UseBasicParsing
    
    Write-Host "Running Rust installer..." -ForegroundColor Yellow
    Write-Host "Press 1 when prompted to proceed with installation" -ForegroundColor Green
    & $rustupPath
    
    Write-Host ""
    Write-Host "Rust installed!" -ForegroundColor Green
    Write-Host "Please restart PowerShell and run:" -ForegroundColor Yellow
    Write-Host "  rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android" -ForegroundColor Cyan
    
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Manual installation:" -ForegroundColor Yellow
    Write-Host "1. Download from: https://rustup.rs/" -ForegroundColor Cyan
    Write-Host "2. Run the installer" -ForegroundColor Cyan
    Write-Host "3. Restart PowerShell" -ForegroundColor Cyan
}
