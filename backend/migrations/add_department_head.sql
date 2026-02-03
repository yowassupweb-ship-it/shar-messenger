-- Добавление колонки is_department_head в таблицу users
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_department_head BOOLEAN DEFAULT FALSE;

-- Обновление комментария для колонки
COMMENT ON COLUMN users.is_department_head IS 'Является ли пользователь руководителем отдела';
