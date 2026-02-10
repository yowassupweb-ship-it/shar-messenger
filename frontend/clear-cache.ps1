# Скрипт для очистки кеша Next.js и перезапуска dev сервера

Write-Host "Очистка кеша Next.js..." -ForegroundColor Yellow

# Остановка процессов node (dev сервера)
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

# Удаление кеша
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force node_modules/.cache -ErrorAction SilentlyContinue

Write-Host "Кеш очищен успешно!" -ForegroundColor Green
Write-Host ""
Write-Host "Запуск dev сервера..." -ForegroundColor Yellow

# Запуск dev сервера
npm run dev
