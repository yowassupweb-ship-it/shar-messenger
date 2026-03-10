# Настройка сервера обновлений для Electron App

## Структура на сервере

На сервере `vokrug-sveta.shar-os.ru` нужно создать директорию для обновлений:

```bash
mkdir -p /var/www/shar/updates
chmod 755 /var/www/shar/updates
```

## Файлы для размещения

После сборки приложения (`npm run build`), файлы из папки `release` нужно загрузить на сервер:

### 1. latest.yml
Файл с информацией о последней версии:
```yaml
version: 0.1.0
files:
  - url: Shar-Messenger-Electron-Setup-0.1.0.exe
    sha512: [хеш файла]
    size: [размер в байтах]
path: Shar-Messenger-Electron-Setup-0.1.0.exe
sha512: [хеш файла]
releaseDate: '2026-03-10T12:00:00.000Z'
```

### 2. Установочный файл
- `Shar-Messenger-Electron-Setup-0.1.0.exe` (Windows NSIS installer)
- или `Shar-Messenger-Electron-0.1.0.exe` (Portable версия)

## Процесс обновления

1. **Сборка приложения локально**:
   ```bash
   cd frontend/native/electron
   npm run build
   ```

2. **Загрузка на сервер**:
   ```bash
   scp release/latest.yml root@vokrug-sveta.shar-os.ru:/var/www/shar/updates/
   scp release/*.exe root@vokrug-sveta.shar-os.ru:/var/www/shar/updates/
   ```

3. **Настройка Nginx** (если еще не настроено):
   ```nginx
   location /updates {
       alias /var/www/shar/updates;
       autoindex off;
       add_header Access-Control-Allow-Origin *;
   }
   ```

4. **Проверка доступности**:
   ```bash
   curl https://vokrug-sveta.shar-os.ru/updates/latest.yml
   ```

## Автоматическая проверка обновлений

Приложение автоматически проверяет обновления:
- Через 3 секунды после запуска
- Только в собранной версии (app.isPackaged = true)
- Загружается автоматически, устанавливается при выходе

## Логи

Проверить работу автообновления можно в консоли DevTools:
- "Checking for updates..." - начало проверки
- "Update available: {...}" - доступно обновление
- "Download progress: X%" - прогресс загрузки
- "Update downloaded: {...}" - обновление загружено и будет установлено при выходе

## Ручная сборка для публикации

```bash
cd frontend/native/electron
npm version patch  # Увеличить версию (0.1.0 -> 0.1.1)
npm run build
# Загрузить файлы на сервер
```

## Важные моменты

1. Версия в `package.json` должна увеличиваться при каждом обновлении
2. Файл `latest.yml` генерируется автоматически при сборке
3. Обновление устанавливается только при завершении работы приложения
4. В dev режиме автообновление не работает
