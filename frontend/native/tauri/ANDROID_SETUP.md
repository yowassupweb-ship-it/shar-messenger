# Установка инструментов для сборки Android APK с Tauri

## Необходимые инструменты:

### 1. Rust (обязательно)
Скачайте и установите с: https://rustup.rs/

Или выполните в PowerShell:
```powershell
# Скачать установщик Rust
Invoke-WebRequest -Uri "https://win.rustup.rs/x86_64" -OutFile "$env:TEMP\rustup-init.exe"

# Запустить установку
& "$env:TEMP\rustup-init.exe" -y

# Обновить PATH в текущей сессии
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
```

После установки перезапустите PowerShell и проверьте:
```powershell
cargo --version
rustc --version
```

### 2. Java JDK 17+ (для Android)
Скачайте и установите OpenJDK: https://adoptium.net/

Или используйте winget:
```powershell
winget install Microsoft.OpenJDK.17
```

Проверьте установку:
```powershell
java -version
```

### 3. Android Studio (для Android SDK)
Скачайте и установите: https://developer.android.com/studio

Или используйте winget:
```powershell
winget install Google.AndroidStudio
```

После установки Android Studio:
1. Откройте Android Studio
2. Перейдите в Settings → Appearance & Behavior → System Settings → Android SDK
3. Установите последнюю версию Android SDK (например, Android 14)
4. В SDK Tools установите:
   - Android SDK Build-Tools
   - Android SDK Command-line Tools
   - Android SDK Platform-Tools
   - NDK (Side by side)

5. Настройте переменные окружения:
```powershell
# Добавьте в System Environment Variables
$androidHome = "$env:LOCALAPPDATA\Android\Sdk"  # Или путь где установлен SDK
[System.Environment]::SetEnvironmentVariable("ANDROID_HOME", $androidHome, "User")
[System.Environment]::SetEnvironmentVariable("NDK_HOME", "$androidHome\ndk\<version>", "User")

# Обновите PATH
$currentPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
$newPath = "$currentPath;$androidHome\platform-tools;$androidHome\cmdline-tools\latest\bin"
[System.Environment]::SetEnvironmentVariable("Path", $newPath, "User")
```

### 4. Rust targets для Android
После установки Rust выполните:
```powershell
rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android
```

## Быстрая проверка

После установки всех инструментов, перезапустите PowerShell и выполните:

```powershell
cd E:\Projects\shar-messenger\frontend\native\tauri
.\check-android-setup.ps1
```

## Сборка APK

После успешной установки:

```powershell
cd E:\Projects\shar-messenger\frontend\native\tauri

# Инициализация Android проекта (первый раз)
npm run android:init

# Сборка APK
npm run android:build

# Или для отладки (запуск на устройстве/эмуляторе)
npm run android:dev
```

APK файл будет создан в:
`src-tauri/gen/android/app/build/outputs/apk/`

## Альтернативный вариант: Использовать GitHub Actions

Если установка локально слишком сложна, можно настроить автоматическую сборку через GitHub Actions.
Создайте файл `.github/workflows/build-android.yml` с конфигурацией для сборки.

## Troubleshooting

### Ошибка "cargo not found"
- Перезапустите PowerShell после установки Rust
- Проверьте что cargo добавлен в PATH: `$env:Path`

### Ошибка "ANDROID_HOME not set"
- Убедитесь что переменная окружения ANDROID_HOME установлена
- Перезапустите PowerShell после установки

### Ошибка "NDK not found"
- Установите NDK через Android Studio SDK Manager
- Установите переменную NDK_HOME

### Долгая первая сборка
- Первая сборка может занять 20-30 минут из-за компиляции всех зависимостей Rust
- Последующие сборки будут намного быстрее
