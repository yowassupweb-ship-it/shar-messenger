# Настройка API Яндекс.Вордстат

## Получение OAuth токена

1. **Перейдите на страницу разработчика Яндекса:**
   https://oauth.yandex.ru/

2. **Создайте новое приложение:**
   - Нажмите "Зарегистрировать новое приложение"
   - Укажите название приложения (например, "Словолов")
   - Выберите платформу "Веб-сервисы"
   - В поле "Callback URI" укажите: `http://localhost:3000/auth/callback`

3. **Получите данные приложения:**
   - Скопируйте Client ID и Client Secret

4. **Получите авторизационный код:**
   - Перейдите по ссылке (замените YOUR_CLIENT_ID на ваш Client ID):
   ```
   https://oauth.yandex.ru/authorize?response_type=code&client_id=YOUR_CLIENT_ID&redirect_uri=http://localhost:3000/auth/callback&scope=yandex-wordstat:read
   ```
   - Войдите в аккаунт Яндекс и разрешите доступ
   - Скопируйте код из URL после редиректа

5. **Обменяйте код на токен:**
   Выполните POST запрос:
   ```bash
   curl -X POST "https://oauth.yandex.ru/token" \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "grant_type=authorization_code&code=YOUR_CODE&client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET"
   ```

## Настройка в приложении

### Вариант 1: Переменная окружения (рекомендуется)

Создайте файл `.env.local` в корне проекта:
```env
YANDEX_WORDSTAT_OAUTH_TOKEN=your_oauth_token_here
```

### Вариант 2: Через интерфейс приложения

1. Перейдите в раздел "Настройки"
2. Найдите поле "OAuth токен Яндекс.Вордстат"
3. Вставьте полученный токен
4. Нажмите "Сохранить"

## Проверка работы

После настройки токена:
1. Перезапустите приложение (`npm run dev`)
2. Попробуйте выполнить поиск
3. Если все настроено правильно, предупреждение исчезнет

## Возможные проблемы

### Ошибка 401 (Unauthorized)
- Проверьте правильность токена
- Убедитесь, что токен не истек
- Перезапустите приложение

### Ошибка 403 (Forbidden)
- Проверьте права доступа к API Wordstat
- Убедитесь, что у аккаунта есть доступ к Яндекс.Директ

### Ошибка 500 (Internal Server Error)
- Проверьте переменные окружения
- Перезапустите сервер разработки
- Проверьте логи сервера в консоли

## Дополнительные ресурсы

- [Документация API Yandex.Wordstat](https://yandex.ru/dev/direct/doc/dg/concepts/api-wordstat.html)
- [OAuth Yandex](https://yandex.ru/dev/id/doc/ru/concepts/ya-oauth-intro)
- [Регистрация приложения](https://oauth.yandex.ru/)