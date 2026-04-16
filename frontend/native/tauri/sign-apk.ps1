# Sign APK for release/debug distribution.
param(
    [string]$ApkPath = "E:\Projects\shar-messenger\frontend\native\tauri\src-tauri\gen\android\app\build\outputs\apk\universal\release\app-universal-release-unsigned.apk",
    [switch]$Release,
    [string]$BuildToolsPath = "E:\Android SDK\build-tools\36.1.0"
)

$ErrorActionPreference = "Stop"

function Assert-FileExists {
    param([string]$PathValue, [string]$Message)
    if (!(Test-Path $PathValue)) {
        throw $Message
    }
}

Write-Host "Preparing APK signing..." -ForegroundColor Cyan
Write-Host "APK: $ApkPath"

Assert-FileExists -PathValue $ApkPath -Message "APK not found: $ApkPath"
Assert-FileExists -PathValue "$BuildToolsPath\zipalign.exe" -Message "zipalign not found in $BuildToolsPath"
Assert-FileExists -PathValue "$BuildToolsPath\apksigner.bat" -Message "apksigner not found in $BuildToolsPath"

$keystorePath = ""
$keyAlias = ""
$storePass = ""
$keyPass = ""

if ($Release) {
    $keystorePath = $env:ANDROID_RELEASE_KEYSTORE_PATH
    $keyAlias = $env:ANDROID_RELEASE_KEY_ALIAS
    $storePass = $env:ANDROID_RELEASE_STORE_PASSWORD
    $keyPass = $env:ANDROID_RELEASE_KEY_PASSWORD

    if ([string]::IsNullOrWhiteSpace($keystorePath) -or
        [string]::IsNullOrWhiteSpace($keyAlias) -or
        [string]::IsNullOrWhiteSpace($storePass) -or
        [string]::IsNullOrWhiteSpace($keyPass)) {
        throw "Release mode requires env vars: ANDROID_RELEASE_KEYSTORE_PATH, ANDROID_RELEASE_KEY_ALIAS, ANDROID_RELEASE_STORE_PASSWORD, ANDROID_RELEASE_KEY_PASSWORD"
    }

    Assert-FileExists -PathValue $keystorePath -Message "Release keystore not found: $keystorePath"
    Write-Host "Mode: RELEASE" -ForegroundColor Green
} else {
    $keystorePath = "$env:USERPROFILE\.android\debug.keystore"
    $keyAlias = "androiddebugkey"
    $storePass = "android"
    $keyPass = "android"

    if (!(Test-Path $keystorePath)) {
        Write-Host "Debug keystore not found, creating one..." -ForegroundColor Yellow
        $androidFolder = "$env:USERPROFILE\.android"
        if (!(Test-Path $androidFolder)) {
            New-Item -ItemType Directory -Path $androidFolder | Out-Null
        }

        if ([string]::IsNullOrWhiteSpace($env:JAVA_HOME)) {
            throw "JAVA_HOME is required to create debug keystore"
        }

        & "$env:JAVA_HOME\bin\keytool.exe" -genkey -v -keystore $keystorePath -alias $keyAlias -keyalg RSA -keysize 2048 -validity 10000 -storepass $storePass -keypass $keyPass -dname "CN=Android Debug,O=Android,C=US"
    }
    Write-Host "Mode: DEBUG" -ForegroundColor Yellow
}

$alignedApk = $ApkPath -replace "\.apk$", "-aligned.apk"
$outputApk = $ApkPath -replace "-unsigned", "-signed"

Write-Host "Aligning APK..." -ForegroundColor Yellow
if (Test-Path $alignedApk) {
    Remove-Item $alignedApk -Force
}
& "$BuildToolsPath\zipalign.exe" -p 4 $ApkPath $alignedApk

Write-Host "Signing APK..." -ForegroundColor Yellow
& "$BuildToolsPath\apksigner.bat" sign --ks $keystorePath --ks-key-alias $keyAlias --ks-pass "pass:$storePass" --key-pass "pass:$keyPass" --out $outputApk $alignedApk

Write-Host "Verifying signature..." -ForegroundColor Yellow
& "$BuildToolsPath\apksigner.bat" verify $outputApk

if ($LASTEXITCODE -ne 0) {
    throw "Signature verification failed"
}

$hashInfo = Get-FileHash -Algorithm SHA256 -Path $outputApk
$hashFile = "$outputApk.sha256"
"$($hashInfo.Hash)  $([System.IO.Path]::GetFileName($outputApk))" | Set-Content -Path $hashFile -Encoding ASCII

Remove-Item $alignedApk -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "APK signed successfully" -ForegroundColor Green
Write-Host "Signed APK: $outputApk" -ForegroundColor Cyan
Write-Host "SHA256: $($hashInfo.Hash)" -ForegroundColor Cyan
Write-Host "Hash file: $hashFile" -ForegroundColor Cyan

if ($Release) {
    Write-Host "This APK is release-signed and ready for distribution." -ForegroundColor Green
} else {
    Write-Host "This APK is debug-signed (not for Play Store)." -ForegroundColor Yellow
}
