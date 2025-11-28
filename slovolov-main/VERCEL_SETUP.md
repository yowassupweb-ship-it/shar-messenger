# Environment Variables для Vercel

Скопируйте эти переменные в Vercel Dashboard > Settings > Environment Variables:

## Обязательные переменные:

### YANDEX_WORDSTAT_API_URL
**Value:** `https://api.wordstat.yandex.net`
**Environment:** Production, Preview, Development

### ADMIN_USERNAME  
**Value:** `admin`
**Environment:** Production, Preview, Development

### ADMIN_PASSWORD
**Value:** `vstravel995`
**Environment:** Production, Preview, Development

### NEXTAUTH_SECRET
**Value:** `super-secret-production-key-change-this-2025-slovolov`
**Environment:** Production, Preview, Development

### NEXTAUTH_URL
**Value:** `https://your-project-name.vercel.app` (замените на ваш домен)
**Environment:** Production, Preview
**Value:** `http://localhost:3000`
**Environment:** Development

### DEFAULT_RESULTS_LIMIT
**Value:** `500`
**Environment:** Production, Preview, Development

## После настройки environment variables:

1. Сделайте новый деплой (Deployments > Redeploy)
2. Проверьте `/api/health` - должен вернуть статус OK
3. Приложение будет защищено Basic Auth (admin / vstravel995)

## Безопасность:

- Все переменные автоматически скрыты в интерфейсе Vercel
- Basic Auth защищает приложение от несанкционированного доступа
- NEXTAUTH_SECRET используется для шифрования сессий