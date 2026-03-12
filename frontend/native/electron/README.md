# Electron client

Electron-клиент открывает веб-версию приложения в отдельном нативном окне.

## Режимы работы

### Development режим (`npm run dev`)
- **Фронтенд**: Подключение к локальному Next.js dev server (`http://localhost:3000`)
- **Бекенд**: Удаленный API сервер (`https://vokrug-sveta.shar-os.ru`)
- **Использование**: Для разработки UI с hot reload
- **Требуется**: Запущенный `npm run dev` в папке `frontend/`

### Production режим (`npm start`)
- **Фронтенд**: Удаленный веб-сервер (`https://vokrug-sveta.shar-os.ru`)
- **Бекенд**: Удаленный API сервер (`https://vokrug-sveta.shar-os.ru`)
- **Использование**: Для тестирования production-версии

## Настройка

1. Скопируйте `.env.example` в `.env.local` (для dev)
2. `.env.local` уже настроен для разработки
3. `.env.production` используется автоматически при `npm start`
4. Установите зависимости: `npm install`

## Команды

- `npm run dev` — Запуск в dev режиме (локальный фронт + удаленный бекенд)
- `npm start` — Запуск в production режиме (удаленные фронт + бекенд)
- `npm run build` — Сборка Windows установщика

## Переменные окружения

### `.env.local` (development)
```env
REMOTE_WEB_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=https://vokrug-sveta.shar-os.ru
```

### `.env.production` (production)
```env
REMOTE_WEB_URL=https://vokrug-sveta.shar-os.ru
NEXT_PUBLIC_API_URL=https://vokrug-sveta.shar-os.ru
```

Текущий фронтенд построен на Next.js App Router и активно использует свои маршруты и относительные `/api/*` вызовы. Поэтому для быстрого и безопасного переноса в нативную оболочку Electron сейчас используется webview-подход без переписывания экранов.
