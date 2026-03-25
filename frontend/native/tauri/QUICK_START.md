# Краткая инструкция по установке всех компонентов

## 1. Установить Rust (5-10 минут)
```powershell
.\install-rust.ps1
# После установки перезапустить PowerShell и выполнить:
rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android
```

## 2. Установить Java JDK (2-5 минут)
```powershell
winget install Microsoft.OpenJDK.17
```
Или скачать с https://adoptium.net/

## 3. Установить Android Studio (30-60 минут)
1. Скачать с https://developer.android.com/studio
2. Или установить через winget:
```powershell
winget install Google.AndroidStudio
```
3. Запустить Android Studio
4. Пройти setup wizard
5. Открыть SDK Manager (Settings → Appearance & Behavior → System Settings → Android SDK)
6. Установить:
   - Android SDK Platform (latest)
   - Android SDK Build-Tools
   - Android SDK Command-line Tools
   - Android SDK Platform-Tools
   - NDK (Side by side)

7. Настроить переменные окружения:
```powershell
# Найдите путь к SDK (обычно)
$androidHome = "$env:LOCALAPPDATA\Android\Sdk"

# Установите переменные (перезапустите PowerShell от имени администратора)
[System.Environment]::SetEnvironmentVariable("ANDROID_HOME", $androidHome, "User")

# Найдите версию NDK
$ndkVersion = Get-ChildItem "$androidHome\ndk" | Select-Object -First 1 -ExpandProperty Name
[System.Environment]::SetEnvironmentVariable("NDK_HOME", "$androidHome\ndk\$ndkVersion", "User")

# Добавьте в PATH
$currentPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
$newPath = "$currentPath;$androidHome\platform-tools;$androidHome\cmdline-tools\latest\bin"
[System.Environment]::SetEnvironmentVariable("Path", $newPath, "User")
```

8. Перезапустите PowerShell и проверьте:
```powershell
.\check-android-setup.ps1
```

## 4. Сборка APK
После успешной проверки:
```powershell
npm run android:init     # Первый раз
npm run android:build    # Создаст APK
```

APK будет в: `src-tauri\gen\android\app\build\outputs\apk\`

## Альтернатива: GitHub Actions
Если локальная установка слишком сложная, можно настроить CI/CD для автоматической сборки в облаке.

## Примерное время установки
- Rust: 5-10 минут
- Java: 2-5 минут  
- Android Studio + SDK: 30-60 минут
- Первая сборка APK: 20-30 минут
- Последующие сборки: 2-5 минут
