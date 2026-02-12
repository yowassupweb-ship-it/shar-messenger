-- Добавление поля archived для задач
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;

-- Создание индекса для быстрого поиска заархивированных задач
CREATE INDEX IF NOT EXISTS idx_tasks_archived ON tasks(archived);

-- Комментарий к полю
COMMENT ON COLUMN tasks.archived IS 'Флаг архивации задачи';

-- Добавление поля archived для списков задач
ALTER TABLE todo_lists 
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;

-- Создание индекса для быстрого поиска заархивированных списков
CREATE INDEX IF NOT EXISTS idx_todo_lists_archived ON todo_lists(archived);

-- Комментарий к полю
COMMENT ON COLUMN todo_lists.archived IS 'Флаг архивации списка задач';
