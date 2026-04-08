# Быстрый деплой Shar OS

## Одной командой (Electron + Server):
```powershell
.\deploy\.shar-deploy.ps1
```

Автоматически: обновляет версию, собирает, загружает на сервер, выполняет `shar pull`

## Только Electron (без сервера):
```powershell
.\publish-electron.ps1
```

## Опции версионирования:
```powershell
.\deploy\.shar-deploy.ps1              # Patch: 0.2.6 -> 0.2.7
.\deploy\.shar-deploy.ps1 -Minor       # Minor: 0.2.6 -> 0.3.0
.\deploy\.shar-deploy.ps1 -Major       # Major: 0.2.6 -> 1.0.0
.\deploy\.shar-deploy.ps1 -Version 2.0.0  # Конкретная версия
```

Подробнее: [deploy\README.md](deploy/README.md)
