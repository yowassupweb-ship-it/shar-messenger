# Установка и настройка LiveKit

LiveKit - это open-source платформа для видео/аудио конференций в реальном времени.

## Вариант 1: LiveKit Cloud (Рекомендуется для начала)

### Преимущества
- Не требует установки
- Автоматические обновления
- Глобальная CDN
- Бесплатный тариф: 50GB трафика/месяц

### Установка
1. Зарегистрируйтесь на https://livekit.io/cloud
2. Создайте проект
3. Получите API ключи в Project Settings
4. Добавьте в `backend/.env`:
```bash
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=APIxxxxxxxxxxxxxxxxx
LIVEKIT_API_SECRET=secretxxxxxxxxxxxxxxxxx
```

## Вариант 2: Self-hosted (Свой сервер)

### Требования
- Ubuntu/Debian Linux
- Docker и Docker Compose
- Открытые порты:
  - 7880 (WebSocket)
  - 7881 (TURN/TCP)
  - 50000-60000/udp (RTP)

### Быстрая установка через Docker

```bash
# 1. Загрузите скрипт на сервер
scp backend/install-livekit.sh root@81.90.31.129:/root/

# 2. Подключитесь к серверу
ssh root@81.90.31.129

# 3. Запустите установку
chmod +x /root/install-livekit.sh
/root/install-livekit.sh
```

Скрипт автоматически:
- Установит Docker (если не установлен)
- Сгенерирует API ключи
- Настроит LiveKit + Redis
- Запустит сервисы в контейнерах

### Настройка после установки

1. Скопируйте сгенерированные ключи в `backend/.env`:
```bash
LIVEKIT_URL=ws://81.90.31.129:7880
LIVEKIT_API_KEY=<сгенерированный ключ>
LIVEKIT_API_SECRET=<сгенерированный секрет>
```

2. Установите Python пакет livekit:
```bash
cd /var/www/shar/backend
pip3 install livekit
```

3. Перезапустите backend:
```bash
shar restart
```

### Управление сервисом

```bash
cd /opt/livekit

# Статус
docker-compose ps

# Логи
docker-compose logs -f livekit

# Перезапуск
docker-compose restart

# Остановка
docker-compose stop

# Запуск
docker-compose start

# Обновление
docker-compose pull
docker-compose up -d
```

### Настройка для продакшена

1. **SSL/TLS сертификат** (обязательно для wss://)
```bash
# Используйте certbot для Let's Encrypt
apt-get install certbot
certbot certonly --standalone -d livekit.your-domain.com
```

2. **Nginx reverse proxy**
```nginx
server {
    listen 443 ssl http2;
    server_name livekit.your-domain.com;
    
    ssl_certificate /etc/letsencrypt/live/livekit.your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/livekit.your-domain.com/privkey.pem;
    
    location / {
        proxy_pass http://127.0.0.1:7880;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

3. **Firewall**
```bash
ufw allow 7880/tcp
ufw allow 7881/tcp
ufw allow 50000:60000/udp
```

4. **Обновите LIVEKIT_URL на wss://**
```bash
LIVEKIT_URL=wss://livekit.your-domain.com
```

## Проверка работы

### 1. Проверка API endpoint
```bash
curl http://localhost:7880/
# Должен вернуть версию LiveKit
```

### 2. Проверка генерации токена
```bash
curl -X POST http://localhost:8000/api/livekit/token \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "roomName": "test-room",
    "userName": "Test User",
    "canPublish": true,
    "canSubscribe": true
  }'
```

Должен вернуть JWT токен.

### 3. Тест в браузере
Frontend автоматически подключится к LiveKit при инициализации видеозвонка.

## Мониторинг

### Логи контейнера
```bash
docker logs -f livekit-server
docker logs -f livekit-redis
```

### Метрики
LiveKit предоставляет Prometheus метрики на порту 6789:
```bash
curl http://localhost:6789/metrics
```

### Использование ресурсов
```bash
docker stats livekit-server livekit-redis
```

## Troubleshooting

### Проблема: "Connection failed"
- Проверьте, что порты открыты
- Проверьте firewall: `ufw status`
- Проверьте логи: `docker logs livekit-server`

### Проблема: "No audio/video"
- Проверьте, что UDP порты 50000-60000 открыты
- Проверьте NAT/STUN/TURN настройки
- Убедитесь, что используется wss:// (не ws://) для HTTPS сайтов

### Проблема: "Token invalid"
- Проверьте, что API ключи в `.env` совпадают с `livekit.yaml`
- Проверьте время на сервере: `date`
- JWT токены имеют срок действия (по умолчанию 6 часов)

## Дополнительная информация

- Официальная документация: https://docs.livekit.io/
- Deploy guide: https://docs.livekit.io/deploy/
- GitHub: https://github.com/livekit/livekit
- Community: https://livekit.io/community
