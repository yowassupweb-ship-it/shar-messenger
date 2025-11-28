# Переменные окружения для Vercel

Этот файл содержит список всех переменных окружения, которые нужно настроить в панели Vercel.

## Как добавить в Vercel

1. Откройте проект в [панели Vercel](https://vercel.com/dashboard)
2. Settings → Environment Variables
3. Добавьте каждую переменную ниже

## Database (Neon PostgreSQL)

Получите на https://neon.tech после создания проекта:

```
POSTGRES_URL
POSTGRES_PRISMA_URL
DATABASE_URL_UNPOOLED
POSTGRES_URL_NON_POOLING
DATABASE_URL
POSTGRES_URL_NO_SSL
PGHOST
PGHOST_UNPOOLED
POSTGRES_HOST
PGUSER
POSTGRES_USER
PGPASSWORD
POSTGRES_PASSWORD
PGDATABASE
POSTGRES_DATABASE
NEON_PROJECT_ID
```

## Yandex Wordstat API

Получите OAuth токен на https://oauth.yandex.ru:

```
YANDEX_WORDSTAT_TOKEN=y0_ваш_токен
YANDEX_WORDSTAT_OAUTH_TOKEN=y0_ваш_токен
YANDEX_WORDSTAT_API_URL=https://api.wordstat.yandex.net
```

## AI (Deepseek)

Получите API ключ на https://platform.deepseek.com:

```
DEEPSEEK_API_KEY=sk-ваш_ключ
```

## Authentication

Задайте свои безопасные значения:

```
ADMIN_USERNAME=admin
ADMIN_PASSWORD=ваш_надежный_пароль
NEXTAUTH_SECRET=случайная_строка_минимум_32_символа
NEXTAUTH_URL=https://ваш-домен.vercel.app
```

Для генерации NEXTAUTH_SECRET используйте:
```bash
openssl rand -base64 32
```

## Limits

```
MAX_RESULTS_LIMIT=10000
DEFAULT_RESULTS_LIMIT=500
```

## Важно

- ❌ **НЕ коммитьте** `.env.local` в Git
- ✅ **Коммитьте** `.env.example` (без реальных значений)
- 🔒 Храните секреты только в Vercel Environment Variables
