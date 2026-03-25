# Enable Windows Developer Mode
Write-Host "Enabling Windows Developer Mode..." -ForegroundColor Cyan
Write-Host ""

try {
    # Set registry key for Developer Mode
    $registryPath = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\AppModelUnlock"
    
    if (!(Test-Path $registryPath)) {
        New-Item -Path $registryPath -Force | Out-Null
    }
    
    Set-ItemProperty -Path $registryPath -Name "AllowDevelopmentWithoutDevLicense" -Value 1 -Type DWord
    
    Write-Host "Developer Mode enabled!" -ForegroundColor Green
    Write-Host ""
    Write-Host "You may need to restart PowerShell." -ForegroundColor Yellow
    Write-Host "Then run: npm run android:build" -ForegroundColor Cyan
    
} catch {
    Write-Host "Failed to enable Developer Mode automatically." -ForegroundColor Red
    Write-Host ""
    Write-Host "Please enable manually:" -ForegroundColor Yellow
    Write-Host "1. Open Settings (Win + I)" -ForegroundColor Cyan
    Write-Host "2. Go to: Privacy & security > For developers" -ForegroundColor Cyan
    Write-Host "3. Turn ON 'Developer Mode'" -ForegroundColor Cyan
    Write-Host "4. Restart PowerShell and run: npm run android:build" -ForegroundColor Cyan
}
