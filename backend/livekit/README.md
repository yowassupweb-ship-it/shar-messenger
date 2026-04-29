# LiveKit Server - Быстрая инструкция

## Перезапуск LiveKit

```bash
# Быстрый перезапуск контейнера
docker restart livekit-livekit-1

# Или оба сервиса
docker restart livekit-livekit-1 livekit-redis-1

# Проверка статуса
docker ps | grep livekit

# Проверка работы
curl http://localhost:7880/
# Должен вернуть: OK
```

## Логи

```bash
# Просмотр логов
docker logs -f livekit-livekit-1

# Последние 50 строк
docker logs --tail 50 livekit-livekit-1
```

## Конфигурация

- **Путь**: `/var/www/shar/livekit/livekit.yaml`
- **Порт**: 7880 (WebSocket)
- **Redis**: localhost:6379
- **RTC порты**: 50000-50020 (UDP)
- **Network**: host mode (без docker-proxy для экономии памяти)

## Важно

- Используется `network_mode: host` для экономии памяти
- Redis должен быть запущен на localhost:6379
- API ключ: `devkey` (минимум 32 символа)
- Перезапуск НЕ через `docker-compose` (его нет на сервере)

## Память

Если появляется проблема с памятью:
```bash
# Очистить кеш
sync; echo 3 > /proc/sys/vm/drop_caches

# Проверить память
free -h

# Убить старые docker-proxy если остались
pkill -9 docker-proxy
```
