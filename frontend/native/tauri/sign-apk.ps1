# Sign APK with debug keystore
param(
    [string]$ApkPath = "E:\Projects\shar-messenger\frontend\native\tauri\src-tauri\gen\android\app\build\outputs\apk\universal\release\app-universal-release-unsigned.apk"
)

Write-Host "Signing APK..." -ForegroundColor Cyan
Write-Host ""

$buildToolsPath = "E:\Android SDK\build-tools\36.1.0"
$keystorePath = "$env:USERPROFILE\.android\debug.keystore"
$outputApk = $ApkPath -replace "-unsigned", "-signed"

# Check if debug keystore exists
if (!(Test-Path $keystorePath)) {
    Write-Host "Creating debug keystore..." -ForegroundColor Yellow
    $androidFolder = "$env:USERPROFILE\.android"
    if (!(Test-Path $androidFolder)) {
        New-Item -ItemType Directory -Path $androidFolder | Out-Null
    }
    
    & "$env:JAVA_HOME\bin\keytool.exe" -genkey -v -keystore $keystorePath -alias androiddebugkey -keyalg RSA -keysize 2048 -validity 10000 -storepass android -keypass android -dname "CN=Android Debug,O=Android,C=US"
}

# Align APK 
Write-Host "Aligning APK..." -ForegroundColor Yellow
$alignedApk = $ApkPath -replace "\.apk$", "-aligned.apk"
& "$buildToolsPath\zipalign.exe" -v -p 4 $ApkPath $alignedApk

# Sign APK
Write-Host "Signing APK..." -ForegroundColor Yellow
& "$buildToolsPath\apksigner.bat" sign --ks $keystorePath --ks-key-alias androiddebugkey --ks-pass pass:android --key-pass pass:android --out $outputApk $alignedApk

# Verify signature
Write-Host ""
Write-Host "Verifying signature..." -ForegroundColor Yellow
& "$buildToolsPath\apksigner.bat" verify $outputApk

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "APK signed successfully!" -ForegroundColor Green
    Write-Host "Signed APK: $outputApk" -ForegroundColor Cyan
    
    # Clean up aligned APK
    Remove-Item $alignedApk -ErrorAction SilentlyContinue
    
    Write-Host ""
    Write-Host "You can now install it on your device:" -ForegroundColor Yellow
    Write-Host "adb install $outputApk" -ForegroundColor Cyan
} else {
    Write-Host "Failed to sign APK" -ForegroundColor Red
}
