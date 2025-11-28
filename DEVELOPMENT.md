# Development Tips - Вокруг света

Советы и лучшие практики для разработки проекта.

## 🎯 Общие рекомендации

### 1. Всегда делайте бэкап перед изменениями

```powershell
.\cli.ps1 db:backup
```

Бэкапы сохраняются в `./backups/` с timestamp.

### 2. Используйте CLI для рутинных задач

Вместо ручного запуска используйте CLI:
```powershell
# ❌ Не делайте так
cd backend
python -m uvicorn main:app --reload

# ✅ Делайте так
.\cli.ps1 start backend
```

### 3. Проверяйте статус перед запуском

```powershell
.\cli.ps1 status          # Что уже запущено?
.\cli.ps1 health          # Всё ли установлено?
```

## 🔧 Backend разработка

### Добавление нового API endpoint

**Шаг 1**: Определите Pydantic модель
```python
# backend/main.py
from pydantic import BaseModel

class TourCreate(BaseModel):
    name: str
    price: int
    days: int
```

**Шаг 2**: Создайте роут
```python
@app.post("/api/tours")
def create_tour(tour: TourCreate):
    new_tour = {
        "id": f"tour_{int(datetime.now().timestamp())}",
        **tour.dict()
    }
    # Сохранение через database.py
    db.add_tour(new_tour)
    return new_tour
```

**Шаг 3**: Добавьте метод в database.py
```python
def add_tour(self, tour: Dict[str, Any]) -> Dict[str, Any]:
    self.data.setdefault("tours", []).append(tour)
    self._save()
    return tour
```

**Шаг 4**: Протестируйте через Swagger
- Откройте http://localhost:8000/docs
- Найдите ваш endpoint
- Нажмите "Try it out"
- Выполните запрос

### Работа с базой данных

**✅ Правильно:**
```python
# Используйте методы database.py
from database import db

products = db.get_products()
db.update_product(product_id, {"price": 1000})
```

**❌ Неправильно:**
```python
# НЕ читайте/пишите напрямую в JSON!
import json
with open("database.json", "r") as f:
    data = json.load(f)  # ❌
```

### Логирование

Используйте встроенную систему логов:
```python
from database import db

db.add_log({
    "type": "parser",
    "message": "Парсинг завершен",
    "status": "success",
    "details": f"Получено {len(products)} товаров"
})
```

Типы логов: `parser`, `feed`, `settings`, `system`, `error`

## ⚛️ Frontend разработка

### Создание новой страницы

**Шаг 1**: Создайте директорию
```
frontend/src/app/my-page/
  ├── page.tsx
  └── layout.tsx (опционально)
```

**Шаг 2**: Создайте компонент
```typescript
// page.tsx
'use client'

import { useState, useEffect } from 'react'

export default function MyPage() {
  const [data, setData] = useState([])
  
  useEffect(() => {
    fetch('http://localhost:8000/api/my-endpoint')
      .then(res => res.json())
      .then(setData)
  }, [])
  
  return (
    <div>
      <h1>My Page</h1>
      {/* ... */}
    </div>
  )
}
```

**Шаг 3**: Добавьте в навигацию
```typescript
// components/Sidebar.tsx
<Link href="/my-page">
  <Settings className="w-5 h-5" />
  <span>My Page</span>
</Link>
```

### Работа с API

**✅ Правильно:**
```typescript
// Используйте async/await
const fetchData = async () => {
  try {
    const response = await fetch('http://localhost:8000/api/data')
    if (!response.ok) throw new Error('Failed to fetch')
    const data = await response.json()
    setData(data)
  } catch (error) {
    console.error('Error:', error)
    // Показать toast уведомление
  }
}
```

**❌ Избегайте:**
```typescript
// Не используйте .then().then().catch()
fetch('http://localhost:8000/api/data')
  .then(res => res.json())
  .then(data => setData(data))  // Плохо читается
  .catch(err => console.error(err))
```

### Типизация

Создавайте типы для API ответов:
```typescript
// types/tour.ts
export interface Tour {
  id: string
  name: string
  price: number
  days: number
  route: string
  image: string
}

// Использование
const [tours, setTours] = useState<Tour[]>([])
```

### Проверка роли администратора

```typescript
// ✅ Правильно
const userRole = localStorage.getItem('userRole')
const isAdmin = userRole === 'admin'

// ❌ Неправильно
const username = localStorage.getItem('username')
const isAdmin = username === 'admin'  // Небезопасно!
```

## 🎨 Стилизация

### Используйте Tailwind классы

```typescript
// ✅ Хорошо
<div className="bg-white rounded-lg shadow-md p-6">
  <h1 className="text-2xl font-bold text-gray-900">Title</h1>
</div>

// ❌ Избегайте inline стилей
<div style={{ background: 'white', borderRadius: '8px' }}>
  <h1 style={{ fontSize: '24px' }}>Title</h1>
</div>
```

### CSS переменные для темы

```css
/* globals.css */
:root {
  --background: #ffffff;
  --foreground: #171717;
  --card: #f5f5f5;
  --button: #2563eb;
}

/* Использование */
.my-class {
  background: var(--background);
  color: var(--foreground);
}
```

## 🧪 Тестирование

### Backend тесты (pytest)

```python
# tests/test_api.py
def test_get_products():
    response = client.get("/api/products")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_create_feed():
    payload = {
        "name": "Test Feed",
        "sourceId": "src_001",
        "format": "xml"
    }
    response = client.post("/api/feeds", json=payload)
    assert response.status_code == 200
    assert "id" in response.json()
```

### Frontend тесты (Jest/React Testing Library)

```typescript
// __tests__/MyComponent.test.tsx
import { render, screen } from '@testing-library/react'
import MyComponent from '@/components/MyComponent'

test('renders component', () => {
  render(<MyComponent />)
  const element = screen.getByText('Expected Text')
  expect(element).toBeInTheDocument()
})
```

## 🐛 Отладка

### Backend

```python
# Добавьте print для отладки
print(f"[DEBUG] Products count: {len(products)}")

# Используйте breakpoint()
import pdb; pdb.set_trace()

# Проверяйте через /docs
# http://localhost:8000/docs
```

### Frontend

```typescript
// Console.log
console.log('Data:', data)

// React DevTools
// Установите расширение для браузера

// Network tab (F12)
// Проверяйте API запросы
```

### Общие проблемы

**Проблема**: CORS ошибки
```
Решение: Проверьте CORS middleware в backend/main.py
```

**Проблема**: 404 на API
```
Решение: Проверьте URL и метод (GET/POST/PUT/DELETE)
```

**Проблема**: Database.json пуст
```
Решение: Восстановите из бэкапа: .\cli.ps1 db:restore <файл>
```

## 📦 Git workflow

### Коммиты

```bash
# ✅ Хорошие commit messages
git commit -m "feat: добавлен endpoint для создания туров"
git commit -m "fix: исправлена проверка роли админа"
git commit -m "docs: обновлена документация API"

# ❌ Плохие commit messages
git commit -m "fix"
git commit -m "update"
git commit -m "работает"
```

### Перед коммитом

```powershell
# 1. Линтинг
.\cli.ps1 lint

# 2. Форматирование
.\cli.ps1 format

# 3. Тесты
.\cli.ps1 test

# 4. Бэкап БД
.\cli.ps1 db:backup
```

## 🚀 Деплой

### Предпродакшен чеклист

- [ ] Все тесты проходят
- [ ] Линтер не выдает ошибок
- [ ] Создан бэкап БД
- [ ] Обновлены токены API
- [ ] Проверена аутентификация
- [ ] Проверены все основные функции
- [ ] Документация актуальна

### Продакшен сборка

```powershell
# 1. Финальный бэкап
.\cli.ps1 db:backup

# 2. Сборка frontend
.\cli.ps1 build

# 3. Тесты
.\cli.ps1 test

# 4. Запуск
.\cli.ps1 start both
```

## 💡 Полезные команды

### PowerShell

```powershell
# Найти файл
Get-ChildItem -Recurse -Filter "*.tsx" | Where-Object { $_.Name -like "*Product*" }

# Поиск текста в файлах
Select-String -Path "*.py" -Pattern "def create" -Recurse

# Проверить порт
Get-NetTCPConnection -LocalPort 8000

# Размер папки
(Get-ChildItem -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
```

### VS Code

- `Ctrl+P` - Быстрый поиск файлов
- `Ctrl+Shift+F` - Поиск по всему проекту
- `F12` - Перейти к определению
- `Ctrl+D` - Выбрать следующее совпадение
- `Alt+Up/Down` - Переместить строку

## 📚 Полезные ресурсы

### Документация

- Next.js: https://nextjs.org/docs
- FastAPI: https://fastapi.tiangolo.com
- Tailwind CSS: https://tailwindcss.com/docs
- TypeScript: https://www.typescriptlang.org/docs

### Проект

- API Docs: http://localhost:8000/docs
- Frontend: http://localhost:3000
- Copilot Guide: `.github/copilot-instructions.md`

## 🎓 Обучение

### Новым разработчикам

1. Прочитайте `README.md`
2. Изучите `.github/copilot-instructions.md`
3. Запустите `.\cli.ps1 info`
4. Проверьте `.\cli.ps1 health`
5. Запустите `.\cli.ps1 dev`
6. Откройте http://localhost:8000/docs
7. Поэкспериментируйте с API

### Для AI агентов

- Основной гайд: `.github/copilot-instructions.md`
- Схема аутентификации: `AUTH_FLOW.md`
- Примеры API: `API_EXAMPLES.md`
- CLI документация: `CLI_GUIDE.md`

---

**Вопросы?** Создайте issue или обратитесь к команде.
