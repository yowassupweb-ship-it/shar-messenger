-- Migration: Access Control System - Departments, Positions, Permissions
-- Created: 2026-02-09
-- Description: Внедрение системы отделов, должностей и прав доступа

-- ============================================================================
-- ЧАСТЬ 1: ОТДЕЛЫ И ДОЛЖНОСТИ
-- ============================================================================

-- Таблица отделов
CREATE TABLE IF NOT EXISTS departments (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    head_user_id VARCHAR(255), -- Руководитель отдела
    parent_department_id VARCHAR(255), -- Для иерархии отделов
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (head_user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (parent_department_id) REFERENCES departments(id) ON DELETE SET NULL
);

CREATE INDEX idx_departments_head ON departments(head_user_id);
CREATE INDEX idx_departments_parent ON departments(parent_department_id);

-- Таблица должностей
CREATE TABLE IF NOT EXISTS positions (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    department_id VARCHAR(255) NOT NULL,
    level VARCHAR(50) NOT NULL CHECK (level IN ('executor', 'customer', 'head')),
    description TEXT,
    can_delegate BOOLEAN DEFAULT false, -- Может делегировать задачи
    can_close_tasks BOOLEAN DEFAULT false, -- Может закрывать задачи
    can_assign_to_all BOOLEAN DEFAULT false, -- Может ставить задачи всем
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
    UNIQUE(name, department_id)
);

CREATE INDEX idx_positions_department ON positions(department_id);
CREATE INDEX idx_positions_level ON positions(level);

-- Обновление таблицы users для связи с отделами и должностями
ALTER TABLE users ADD COLUMN IF NOT EXISTS department_id VARCHAR(255) REFERENCES departments(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS position_id VARCHAR(255) REFERENCES positions(id) ON DELETE SET NULL;

-- Индексы для быстрой проверки прав
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department_id);
CREATE INDEX IF NOT EXISTS idx_users_position ON users(position_id);

-- ============================================================================
-- ЧАСТЬ 2: ПРАВА ДОСТУПА К КАЛЕНДАРЮ
-- ============================================================================

-- Таблица списков календаря (calendar_lists)
CREATE TABLE IF NOT EXISTS calendar_lists (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    owner_id VARCHAR(255) NOT NULL, -- Владелец списка
    color VARCHAR(20),
    description TEXT,
    is_personal BOOLEAN DEFAULT true, -- Личный лист (доступен только владельцу)
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_calendar_lists_owner ON calendar_lists(owner_id);
CREATE INDEX idx_calendar_lists_personal ON calendar_lists(is_personal);

-- Права доступа к спискам календаря
CREATE TABLE IF NOT EXISTS calendar_list_permissions (
    id SERIAL PRIMARY KEY,
    list_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255), -- Доступ конкретному пользователю
    department_id VARCHAR(255), -- Доступ отделу
    access_type VARCHAR(50) NOT NULL CHECK (access_type IN ('read', 'write', 'admin')),
    granted_by VARCHAR(255), -- Кто выдал доступ
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (list_id) REFERENCES calendar_lists(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
    FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE SET NULL,
    CHECK ((user_id IS NOT NULL AND department_id IS NULL) OR (user_id IS NULL AND department_id IS NOT NULL))
);

CREATE INDEX idx_calendar_permissions_list ON calendar_list_permissions(list_id);
CREATE INDEX idx_calendar_permissions_user ON calendar_list_permissions(user_id);
CREATE INDEX idx_calendar_permissions_dept ON calendar_list_permissions(department_id);

-- Обновление таблицы events для связи со списками
ALTER TABLE events ADD COLUMN IF NOT EXISTS calendar_list_id VARCHAR(255) REFERENCES calendar_lists(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_events_calendar_list ON events(calendar_list_id);

-- ============================================================================
-- ЧАСТЬ 3: ПРАВА ДОСТУПА К ЗАДАЧАМ (TODOS)
-- ============================================================================

-- Права доступа к задачам
CREATE TABLE IF NOT EXISTS task_permissions (
    id SERIAL PRIMARY KEY,
    task_id VARCHAR(255), -- NULL = права на весь столбец
    column_id VARCHAR(255), -- NULL = права на конкретную задачу
    user_id VARCHAR(255), -- Доступ конкретному пользователю
    department_id VARCHAR(255), -- Доступ отделу
    access_type VARCHAR(50) NOT NULL CHECK (access_type IN ('read', 'write', 'admin')),
    granted_by VARCHAR(255), -- Кто выдал доступ
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
    FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE SET NULL,
    CHECK ((user_id IS NOT NULL AND department_id IS NULL) OR (user_id IS NULL AND department_id IS NOT NULL)),
    CHECK ((task_id IS NOT NULL AND column_id IS NULL) OR (task_id IS NULL AND column_id IS NOT NULL))
);

CREATE INDEX idx_task_permissions_task ON task_permissions(task_id);
CREATE INDEX idx_task_permissions_column ON task_permissions(column_id);
CREATE INDEX idx_task_permissions_user ON task_permissions(user_id);
CREATE INDEX idx_task_permissions_dept ON task_permissions(department_id);

-- ============================================================================
-- ЧАСТЬ 4: ПРАВА ДОСТУПА К КОНТЕНТ-ПЛАНАМ
-- ============================================================================

-- Права доступа к контент-планам
CREATE TABLE IF NOT EXISTS content_plan_permissions (
    id SERIAL PRIMARY KEY,
    plan_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255), -- Доступ конкретному пользователю
    department_id VARCHAR(255), -- Доступ отделу
    position_type VARCHAR(50), -- Доступ по должности (smm, manager)
    access_type VARCHAR(50) NOT NULL CHECK (access_type IN ('read', 'write', 'admin')),
    granted_by VARCHAR(255), -- Кто выдал доступ
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (plan_id) REFERENCES content_plans(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
    FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE SET NULL,
    CHECK (
        (user_id IS NOT NULL AND department_id IS NULL AND position_type IS NULL) OR
        (user_id IS NULL AND department_id IS NOT NULL AND position_type IS NULL) OR
        (user_id IS NULL AND department_id IS NULL AND position_type IS NOT NULL)
    )
);

CREATE INDEX idx_content_plan_permissions_plan ON content_plan_permissions(plan_id);
CREATE INDEX idx_content_plan_permissions_user ON content_plan_permissions(user_id);
CREATE INDEX idx_content_plan_permissions_dept ON content_plan_permissions(department_id);
CREATE INDEX idx_content_plan_permissions_position ON content_plan_permissions(position_type);

-- ============================================================================
-- ЧАСТЬ 5: БАЗА ССЫЛОК ПО ОТДЕЛАМ
-- ============================================================================

-- Обновление link_lists для привязки к отделу
ALTER TABLE link_lists ADD COLUMN IF NOT EXISTS department_id VARCHAR(255) REFERENCES departments(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_link_lists_department ON link_lists(department_id);

-- ============================================================================
-- ЧАСТЬ 6: UTM ПРЕСЕТЫ (ПЕРСОНАЛЬНЫЕ)
-- ============================================================================

-- Обновление templates для привязки к пользователю (уже есть owner_id в схеме)
-- Templates уже имеют owner_id, дополнительные изменения не нужны

-- ============================================================================
-- ЧАСТЬ 7: ФУНКЦИИ ДЛЯ ПРОВЕРКИ ПРАВ ДОСТУПА
-- ============================================================================

-- Функция проверки доступа к календарю
CREATE OR REPLACE FUNCTION check_calendar_access(
    p_list_id VARCHAR(255),
    p_user_id VARCHAR(255),
    p_required_access VARCHAR(50)
) RETURNS BOOLEAN AS $$
DECLARE
    v_is_owner BOOLEAN;
    v_is_personal BOOLEAN;
    v_has_user_permission BOOLEAN;
    v_has_dept_permission BOOLEAN;
    v_user_department_id VARCHAR(255);
BEGIN
    -- Проверка владельца
    SELECT owner_id = p_user_id, is_personal
    INTO v_is_owner, v_is_personal
    FROM calendar_lists
    WHERE id = p_list_id;
    
    -- Владелец всегда имеет доступ
    IF v_is_owner THEN
        RETURN TRUE;
    END IF;
    
    -- Личные списки доступны только владельцу
    IF v_is_personal THEN
        RETURN FALSE;
    END IF;
    
    -- Проверка персональных прав
    SELECT EXISTS(
        SELECT 1 FROM calendar_list_permissions
        WHERE list_id = p_list_id
        AND user_id = p_user_id
        AND (
            access_type = p_required_access OR
            access_type = 'admin' OR
            (p_required_access = 'read' AND access_type = 'write')
        )
    ) INTO v_has_user_permission;
    
    IF v_has_user_permission THEN
        RETURN TRUE;
    END IF;
    
    -- Проверка прав отдела
    SELECT department_id INTO v_user_department_id
    FROM users WHERE id = p_user_id;
    
    IF v_user_department_id IS NOT NULL THEN
        SELECT EXISTS(
            SELECT 1 FROM calendar_list_permissions
            WHERE list_id = p_list_id
            AND department_id = v_user_department_id
            AND (
                access_type = p_required_access OR
                access_type = 'admin' OR
                (p_required_access = 'read' AND access_type = 'write')
            )
        ) INTO v_has_dept_permission;
        
        IF v_has_dept_permission THEN
            RETURN TRUE;
        END IF;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Функция проверки доступа к задаче
CREATE OR REPLACE FUNCTION check_task_access(
    p_task_id VARCHAR(255),
    p_user_id VARCHAR(255),
    p_required_access VARCHAR(50)
) RETURNS BOOLEAN AS $$
DECLARE
    v_is_author BOOLEAN;
    v_is_assignee BOOLEAN;
    v_is_dept_head BOOLEAN;
    v_has_permission BOOLEAN;
    v_user_department_id VARCHAR(255);
    v_task_department_id VARCHAR(255);
BEGIN
    -- Автор задачи всегда имеет доступ
    SELECT author_id = p_user_id INTO v_is_author
    FROM tasks WHERE id = p_task_id;
    
    IF v_is_author THEN
        RETURN TRUE;
    END IF;
    
    -- Назначенный исполнитель имеет доступ
    SELECT 
        assigned_to_id = p_user_id OR
        p_user_id = ANY(COALESCE(assigned_to_ids, ARRAY[]::VARCHAR[]))
    INTO v_is_assignee
    FROM tasks WHERE id = p_task_id;
    
    IF v_is_assignee THEN
        RETURN TRUE;
    END IF;
    
    -- Руководитель отдела имеет доступ ко всем задачам отдела
    SELECT u.department_id, u.is_department_head
    INTO v_user_department_id, v_is_dept_head
    FROM users u WHERE u.id = p_user_id;
    
    IF v_is_dept_head THEN
        -- Получаем отдел задачи через автора
        SELECT u.department_id INTO v_task_department_id
        FROM tasks t
        JOIN users u ON t.author_id = u.id
        WHERE t.id = p_task_id;
        
        IF v_user_department_id = v_task_department_id THEN
            RETURN TRUE;
        END IF;
    END IF;
    
    -- Проверка explicit permissions
    SELECT EXISTS(
        SELECT 1 FROM task_permissions
        WHERE task_id = p_task_id
        AND (user_id = p_user_id OR department_id = v_user_department_id)
        AND (
            access_type = p_required_access OR
            access_type = 'admin' OR
            (p_required_access = 'read' AND access_type = 'write')
        )
    ) INTO v_has_permission;
    
    RETURN v_has_permission;
END;
$$ LANGUAGE plpgsql;

-- Функция проверки доступа к контент-плану
CREATE OR REPLACE FUNCTION check_content_plan_access(
    p_plan_id VARCHAR(255),
    p_user_id VARCHAR(255),
    p_required_access VARCHAR(50)
) RETURNS BOOLEAN AS $$
DECLARE
    v_is_owner BOOLEAN;
    v_has_permission BOOLEAN;
    v_user_department_id VARCHAR(255);
    v_user_position_type VARCHAR(50);
BEGIN
    -- Владелец всегда имеет доступ
    SELECT owner_id = p_user_id INTO v_is_owner
    FROM content_plans WHERE id = p_plan_id;
    
    IF v_is_owner THEN
        RETURN TRUE;
    END IF;
    
    -- Получаем данные пользователя
    SELECT department_id INTO v_user_department_id
    FROM users WHERE id = p_user_id;
    
    -- Проверка прав (персональные, отдел, должность)
    SELECT EXISTS(
        SELECT 1 FROM content_plan_permissions
        WHERE plan_id = p_plan_id
        AND (
            user_id = p_user_id OR
            department_id = v_user_department_id OR
            position_type IN ('smm', 'manager') -- TODO: связать с реальной должностью
        )
        AND (
            access_type = p_required_access OR
            access_type = 'admin' OR
            (p_required_access = 'read' AND access_type = 'write')
        )
    ) INTO v_has_permission;
    
    RETURN v_has_permission;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ЧАСТЬ 8: НАЧАЛЬНЫЕ ДАННЫЕ
-- ============================================================================

-- Создание дефолтного отдела
INSERT INTO departments (id, name, description, is_active)
VALUES 
    ('dept-default', 'Общий отдел', 'Отдел по умолчанию для всех пользователей', true)
ON CONFLICT (id) DO NOTHING;

-- Создание базовых должностей
INSERT INTO positions (id, name, department_id, level, can_delegate, can_close_tasks, can_assign_to_all)
VALUES
    ('pos-executor', 'Исполнитель', 'dept-default', 'executor', false, false, false),
    ('pos-customer', 'Заказчик', 'dept-default', 'customer', true, false, true),
    ('pos-head', 'Руководитель', 'dept-default', 'head', true, true, true)
ON CONFLICT (name, department_id) DO NOTHING;

COMMENT ON TABLE departments IS 'Отделы компании с иерархией';
COMMENT ON TABLE positions IS 'Должности с уровнями доступа (executor/customer/head)';
COMMENT ON TABLE calendar_list_permissions IS 'Права доступа к спискам календаря';
COMMENT ON TABLE task_permissions IS 'Права доступа к задачам и столбцам';
COMMENT ON TABLE content_plan_permissions IS 'Права доступа к контент-планам';
