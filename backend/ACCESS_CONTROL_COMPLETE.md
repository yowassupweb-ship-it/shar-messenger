# ✅ СИСТЕМА ПРАВ ДОСТУПА - ВНЕДРЕНА

## 📅 Дата: 9 февраля 2026 г.

## ✨ Выполнено

### 1. Создана миграция базы данных
**Файл:** `backend/migrations/001_access_control_system.sql` (15KB)

### 2. Применена миграция через psql
```bash
psql -h localhost -U postgres -d shar_messenger -f backend/migrations/001_access_control_system.sql
```

**Результат:** 
- CREATE TABLE: 6 таблиц
- CREATE FUNCTION: 3 функции
- INSERT: Начальные данные
- COMMENT: Документация таблиц

---

## 📋 Созданные структуры БД

### Таблицы

#### 1. **departments** (Отделы)
```sql
id, name, description, head_user_id, parent_department_id, 
is_active, created_at, updated_at
```
- Поддержка иерархии отделов
- Назначение руководителя отдела
- Каскадное удаление подотделов

#### 2. **positions** (Должности)
```sql
id, name, department_id, level, description,
can_delegate, can_close_tasks, can_assign_to_all,
is_active, created_at, updated_at
```
**Уровни доступа:**
- `executor` - Исполнитель (не может делегировать, не закрывает задачи)
- `customer` - Заказчик (делегирует, ставит задачи другим)
- `head` - Руководитель (полный доступ + весь отдел)

#### 3. **calendar_lists** (Списки календаря)
```sql
id, name, owner_id, color, description,
is_personal, is_active, created_at, updated_at
```
- Личные списки (`is_personal=true`) доступны только владельцу
- Общие списки управляются через permissions

#### 4. **calendar_list_permissions** (Права на календарь)
```sql
id, list_id, user_id, department_id, access_type,
granted_by, created_at
```
**Типы доступа:** `read`, `write`, `admin`
**Режимы:** по пользователю ИЛИ по отделу

#### 5. **task_permissions** (Права на задачи)
```sql
id, task_id, column_id, user_id, department_id,
access_type, granted_by, created_at
```
**Гранулярность:** на задачу ИЛИ на весь столбец
**Типы доступа:** `read`, `write`, `admin`

#### 6. **content_plan_permissions** (Права на контент-план)
```sql
id, plan_id, user_id, department_id, position_type,
access_type, granted_by, created_at
```
**Режимы выдачи:** персонально, по отделу, по должности (smm/manager)

---

## 🔧 Функции проверки прав

### 1. `check_calendar_access(list_id, user_id, access_type)`
**Логика:**
1. Владелец → всегда доступ
2. Личный список → только владелец
3. Проверка персональных прав
4. Проверка прав отдела пользователя

### 2. `check_task_access(task_id, user_id, access_type)`
**Логика:**
1. Автор задачи → всегда доступ
2. Исполнитель задачи → доступ
3. Руководитель отдела → доступ ко всем задачам отдела
4. Explicit permissions → проверка явных прав

### 3. `check_content_plan_access(plan_id, user_id, access_type)`
**Логика:**
1. Владелец плана → всегда доступ
2. Персональные права → по user_id
3. Отдел → по department_id
4. Должность → smm, manager

---

## 📊 Начальные данные

### Отделы
| ID | Name | Description |
|---|---|---|
| dept-default | Общий отдел | Отдел по умолчанию для всех пользователей |

### Должности
| ID | Name | Level | can_delegate | can_close_tasks | can_assign_to_all |
|---|---|---|---|---|---|
| pos-executor | Исполнитель | executor | ❌ | ❌ | ❌ |
| pos-customer | Заказчик | customer | ✅ | ❌ | ✅ |
| pos-head | Руководитель | head | ✅ | ✅ | ✅ |

---

## 🔗 Обновленные таблицы

### users
**Новые поля:**
- `department_id` → связь с departments
- `position_id` → связь с positions

### events
**Новые поля:**
- `calendar_list_id` → связь с calendar_lists

### link_lists
**Новые поля:**
- `department_id` → 1 отдел = 1 база ссылок

---

## 🎯 Следующие шаги

### 1. ⏳ Создать API endpoints (Python FastAPI)

**Управление отделами:**
```python
GET    /api/departments           # Список отделов
POST   /api/departments           # Создать отдел
PUT    /api/departments/{id}      # Обновить отдел
DELETE /api/departments/{id}      # Удалить отдел
GET    /api/departments/{id}/users # Пользователи отдела
```

**Управление должностями:**
```python
GET    /api/positions             # Список должностей
POST   /api/positions             # Создать должность
PUT    /api/positions/{id}        # Обновить должность
DELETE /api/positions/{id}        # Удалить должность
```

**Управление правами:**
```python
# Календарь
GET    /api/permissions/calendar/{list_id}
POST   /api/permissions/calendar
DELETE /api/permissions/calendar/{id}

# Задачи
GET    /api/permissions/tasks/{task_id}
POST   /api/permissions/tasks
DELETE /api/permissions/tasks/{id}

# Контент-план
GET    /api/permissions/content-plan/{plan_id}
POST   /api/permissions/content-plan
DELETE /api/permissions/content-plan/{id}
```

### 2. ⏳ Интегрировать проверку прав в существующие endpoints

**Пример для задач:**
```python
@app.get("/api/todos/{id}")
async def get_task(id: str, current_user: User):
    # Проверка прав через SQL функцию
    has_access = db.execute(
        "SELECT check_task_access(%s, %s, 'read')",
        (id, current_user.id)
    )
    if not has_access:
        raise HTTPException(403, "Access denied")
    # ... возврат задачи
```

### 3. ⏳ Обновить frontend

**Новые страницы:**
- `/admin/departments` - Управление отделами
- `/admin/positions` - Управление должностями
- `/settings/permissions` - Настройка прав доступа

**Обновить существующие:**
- Календарь: выбор списка при создании события
- Задачи: проверка прав перед редактированием
- Контент-план: фильтрация по правам доступа

### 4. ⏳ Создать UI компоненты

```typescript
// Компонент выбора отдела
<DepartmentSelector 
  value={selectedDept}
  onChange={setSelectedDept}
/>

// Компонент выбора должности
<PositionSelector
  departmentId={dept.id}
  value={position}
  onChange={setPosition}
/>

// Компонент управления правами
<PermissionsManager
  resourceType="calendar|task|content-plan"
  resourceId={id}
  onUpdate={refreshPermissions}
/>
```

---

## 🔐 Использование в коде

### Backend (Python)

```python
from db_postgres import PostgresConnection

db = PostgresConnection()
db.connect()

# Проверка прав на календарь
has_access = db.fetch_one(
    "SELECT check_calendar_access(%s, %s, %s)",
    (calendar_list_id, user_id, 'write')
)[0]

if has_access:
    # Разрешить операцию
    pass
else:
    # Отклонить
    raise PermissionDenied()
```

### Frontend (TypeScript)

```typescript
// Проверка прав перед редактированием
const canEdit = await checkPermission({
  type: 'calendar',
  resourceId: listId,
  access: 'write'
});

if (canEdit) {
  // Показать кнопку редактирования
}
```

---

## 📝 Настройка подключения

### Локальная разработка
```env
# backend/.env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=shar_messenger
DB_USER=postgres
DB_PASSWORD=postgres
USE_POSTGRES=true
```

### Продакшн (сервер)
```env
# backend/.env
DB_HOST=YOUR_SERVER_IP
DB_PORT=5432
DB_NAME=shar_messenger
DB_USER=postgres
DB_PASSWORD=SECURE_PASSWORD  # Обязательно изменить!
USE_POSTGRES=true
ENVIRONMENT=production
```

---

## 🐛 Troubleshooting

### Проблема: psycopg2 UnicodeDecodeError на Windows
**Решение:** Используйте psql напрямую
```bash
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -h localhost -U postgres -d shar_messenger
```

### Проблема: Ошибка подключения к БД
**Проверить:**
1. PostgreSQL запущен: `pg_ctl status`
2. Порт доступен: `Test-NetConnection localhost -Port 5432`
3. База существует: `psql -l`
4. Пароль корректный

### Проблема: Миграция не применилась
**Проверить:**
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('departments', 'positions');
```

---

## 📚 Дополнительные материалы

- **Миграция:** `backend/migrations/001_access_control_system.sql`
- **Конфигурация:** `backend/.env`
- **Пример использования:** См. раздел "Использование в коде"

---

## ✅ Чеклист готовности

- [x] Миграция создана
- [x] Миграция применена
- [x] Таблицы созданы
- [x] Функции работают
- [x] Начальные данные добавлены
- [ ] API endpoints созданы
- [ ] Интеграция в существующие endpoints
- [ ] Frontend UI обновлен
- [ ] Тестирование прав доступа

---

**Статус:** 🟢 База данных готова, требуется интеграция в приложение

**Автор:** GitHub Copilot  
**Дата:** 9 февраля 2026 г.
