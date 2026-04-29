#!/bin/bash
# Установка LiveKit Server через Docker
# Документация: https://docs.livekit.io/deploy/

set -e

echo "=== Установка LiveKit Server ==="

# 1. Установка Docker (если не установлен)
if ! command -v docker &> /dev/null; then
    echo "Docker не установлен. Устанавливаем..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
fi

# 2. Создание директории для LiveKit
mkdir -p /opt/livekit
cd /opt/livekit

# 3. Генерация API ключей
API_KEY=$(openssl rand -hex 16)
API_SECRET=$(openssl rand -base64 32)

echo "Сгенерированы ключи:"
echo "API_KEY: $API_KEY"
echo "API_SECRET: $API_SECRET"

# 4. Создание конфигурации LiveKit
cat > livekit.yaml <<EOF
port: 7880
rtc:
  port_range_start: 50000
  port_range_end: 60000
  use_external_ip: true
  
redis:
  address: redis:6379

keys:
  $API_KEY: $API_SECRET

logging:
  level: info
  
room:
  auto_create: true
  empty_timeout: 300
  max_participants: 100
EOF

# 5. Создание docker-compose.yml
cat > docker-compose.yml <<EOF
version: '3.8'

services:
  livekit:
    image: livekit/livekit-server:latest
    container_name: livekit-server
    command: --config /etc/livekit.yaml
    restart: unless-stopped
    ports:
      - "7880:7880"
      - "7881:7881"
      - "50000-60000:50000-60000/udp"
    volumes:
      - ./livekit.yaml:/etc/livekit.yaml
    depends_on:
      - redis
    networks:
      - livekit-net

  redis:
    image: redis:7-alpine
    container_name: livekit-redis
    restart: unless-stopped
    networks:
      - livekit-net

networks:
  livekit-net:
    driver: bridge
EOF

# 6. Запуск LiveKit
echo "Запускаем LiveKit..."
docker-compose up -d

# 7. Ожидание запуска
echo "Ожидание запуска сервера..."
sleep 5

# 8. Проверка статуса
docker-compose ps

# 9. Вывод информации
PUBLIC_IP=$(curl -s ifconfig.me)
echo ""
echo "=== LiveKit успешно установлен! ==="
echo ""
echo "Добавьте в backend/.env:"
echo "LIVEKIT_URL=ws://$PUBLIC_IP:7880"
echo "LIVEKIT_API_KEY=$API_KEY"
echo "LIVEKIT_API_SECRET=$API_SECRET"
echo ""
echo "Управление:"
echo "  docker-compose ps         # Статус"
echo "  docker-compose logs -f    # Логи"
echo "  docker-compose restart    # Перезапуск"
echo "  docker-compose stop       # Остановка"
echo "  docker-compose start      # Запуск"
echo ""
echo "Для продакшена рекомендуется:"
echo "  1. Настроить SSL/TLS (wss:// вместо ws://)"
echo "  2. Открыть порты в firewall: 7880, 7881, 50000-60000/udp"
echo "  3. Настроить домен и reverse proxy (nginx)"
