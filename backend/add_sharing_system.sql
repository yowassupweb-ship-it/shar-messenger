-- Таблица для ссылок-приглашений (sharing links)
CREATE TABLE IF NOT EXISTS shared_links (
    id VARCHAR(255) PRIMARY KEY,
    token VARCHAR(255) UNIQUE NOT NULL,
    resource_type VARCHAR(50) NOT NULL, -- 'calendar', 'todos', 'content-plan'
    resource_id VARCHAR(255), -- ID конкретного календаря/списка (если NULL - весь раздел)
    permission VARCHAR(50) NOT NULL DEFAULT 'viewer', -- 'viewer' или 'editor'
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP, -- NULL = бессрочная
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_shared_links_token ON shared_links(token);
CREATE INDEX IF NOT EXISTS idx_shared_links_resource ON shared_links(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_shared_links_created_by ON shared_links(created_by);

COMMENT ON TABLE shared_links IS 'Ссылки для совместного доступа к ресурсам';
COMMENT ON COLUMN shared_links.resource_type IS 'Тип ресурса: calendar, todos, content-plan';
COMMENT ON COLUMN shared_links.permission IS 'Уровень доступа: viewer (читатель) или editor (редактор)';
