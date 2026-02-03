-- Добавление полей для сохранения настроек навигации
ALTER TABLE users ADD COLUMN IF NOT EXISTS visible_tabs JSONB DEFAULT '{"messages": true, "tasks": true, "calendar": true, "contacts": true, "links": true}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS tools_order JSONB DEFAULT '[]';

-- Комментарии
COMMENT ON COLUMN users.visible_tabs IS 'Видимые вкладки навигации пользователя';
COMMENT ON COLUMN users.tools_order IS 'Порядок инструментов на рабочем столе';
