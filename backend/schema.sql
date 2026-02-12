-- PostgreSQL Schema for Shar Messenger and Content Management System
-- Created: 2026-02-03

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(255) UNIQUE NOT NULL,
    value JSONB,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    todo_role VARCHAR(50) DEFAULT 'universal',
    position VARCHAR(255),
    department VARCHAR(255),
    phone VARCHAR(20),
    work_schedule TEXT,
    telegram_id VARCHAR(255),
    telegram_username VARCHAR(255),
    is_department_head BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    enabled_tools JSONB DEFAULT '[]',
    can_see_all_tasks BOOLEAN DEFAULT false,
    avatar VARCHAR(255),
    is_online BOOLEAN DEFAULT false,
    last_seen TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);

-- Data Sources table
CREATE TABLE IF NOT EXISTS data_sources (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    url TEXT,
    source_type VARCHAR(100),
    enabled BOOLEAN DEFAULT true,
    auto_sync BOOLEAN DEFAULT false,
    sync_interval INTEGER DEFAULT 3600,
    is_parsing BOOLEAN DEFAULT false,
    last_sync TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_data_sources_type ON data_sources(source_type);

-- Feeds table
CREATE TABLE IF NOT EXISTS feeds (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE,
    description TEXT,
    source_id VARCHAR(255),
    template_type VARCHAR(100),
    enabled BOOLEAN DEFAULT true,
    last_update TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    FOREIGN KEY (source_id) REFERENCES data_sources(id) ON DELETE SET NULL
);

CREATE INDEX idx_feeds_slug ON feeds(slug);
CREATE INDEX idx_feeds_source_id ON feeds(source_id);

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(255) PRIMARY KEY,
    source_id VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2),
    currency VARCHAR(10),
    url TEXT,
    image_url TEXT,
    is_new BOOLEAN DEFAULT false,
    hidden BOOLEAN DEFAULT false,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    hidden_at TIMESTAMP,
    dates_updated_at TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    dates JSONB DEFAULT '[]',
    FOREIGN KEY (source_id) REFERENCES data_sources(id) ON DELETE SET NULL
);

CREATE INDEX idx_products_source_id ON products(source_id);
CREATE INDEX idx_products_hidden ON products(hidden);
CREATE INDEX idx_products_name ON products(name);

-- Templates table
CREATE TABLE IF NOT EXISTS templates (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    template_type VARCHAR(100),
    content TEXT,
    variables JSONB DEFAULT '{}',
    is_system BOOLEAN DEFAULT false,
    creator_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_templates_type ON templates(template_type);
CREATE INDEX idx_templates_creator_id ON templates(creator_id);

-- Collections table
CREATE TABLE IF NOT EXISTS collections (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    product_ids JSONB DEFAULT '[]',
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Logs table
CREATE TABLE IF NOT EXISTS logs (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255),
    action VARCHAR(255),
    entity_type VARCHAR(100),
    entity_id VARCHAR(255),
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_logs_user_id ON logs(user_id);
CREATE INDEX idx_logs_created_at ON logs(created_at);
CREATE INDEX idx_logs_entity ON logs(entity_type, entity_id);

-- Analytics table
CREATE TABLE IF NOT EXISTS analytics (
    id SERIAL PRIMARY KEY,
    source_id VARCHAR(255),
    metric_name VARCHAR(255),
    metric_value DECIMAL(15, 2),
    data_point JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (source_id) REFERENCES data_sources(id) ON DELETE SET NULL
);

CREATE INDEX idx_analytics_source_id ON analytics(source_id);
CREATE INDEX idx_analytics_created_at ON analytics(created_at);

-- Wordstat Searches table
CREATE TABLE IF NOT EXISTS wordstat_searches (
    id SERIAL PRIMARY KEY,
    query VARCHAR(255) NOT NULL,
    search_volume INTEGER,
    competition DECIMAL(5, 2),
    source_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (source_id) REFERENCES data_sources(id) ON DELETE SET NULL
);

CREATE INDEX idx_wordstat_searches_query ON wordstat_searches(query);
CREATE INDEX idx_wordstat_searches_source_id ON wordstat_searches(source_id);

-- Wordstat Cache table
CREATE TABLE IF NOT EXISTS wordstat_cache (
    id SERIAL PRIMARY KEY,
    cache_key VARCHAR(255) UNIQUE NOT NULL,
    cache_data JSONB,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_wordstat_cache_key ON wordstat_cache(cache_key);
CREATE INDEX idx_wordstat_cache_expires ON wordstat_cache(expires_at);

-- Tracked Posts table
CREATE TABLE IF NOT EXISTS tracked_posts (
    id VARCHAR(255) PRIMARY KEY,
    post_url TEXT,
    title VARCHAR(255),
    utm_params JSONB,
    source_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (source_id) REFERENCES data_sources(id) ON DELETE SET NULL
);

CREATE INDEX idx_tracked_posts_source_id ON tracked_posts(source_id);

-- Chats table
CREATE TABLE IF NOT EXISTS chats (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(255),
    is_group BOOLEAN DEFAULT false,
    is_notifications_chat BOOLEAN DEFAULT false,
    is_system_chat BOOLEAN DEFAULT false,
    is_favorites_chat BOOLEAN DEFAULT false,
    creator_id VARCHAR(255),
    todo_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    unread_count INTEGER DEFAULT 0,
    read_messages_by_user JSONB DEFAULT '{}',
    pinned_by_user JSONB DEFAULT '{}',
    last_message_id VARCHAR(255),
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_chats_is_system ON chats(is_system_chat);
CREATE INDEX idx_chats_is_group ON chats(is_group);
CREATE INDEX idx_chats_creator_id ON chats(creator_id);

-- Chat Participants table
CREATE TABLE IF NOT EXISTS chat_participants (
    id SERIAL PRIMARY KEY,
    chat_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(chat_id, user_id),
    FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_chat_participants_chat_id ON chat_participants(chat_id);
CREATE INDEX idx_chat_participants_user_id ON chat_participants(user_id);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id VARCHAR(255) PRIMARY KEY,
    chat_id VARCHAR(255) NOT NULL,
    author_id VARCHAR(255) NOT NULL,
    author_name VARCHAR(255),
    content TEXT,
    mentions JSONB DEFAULT '[]',
    reply_to_id VARCHAR(255),
    is_edited BOOLEAN DEFAULT false,
    is_deleted BOOLEAN DEFAULT false,
    is_system_message BOOLEAN DEFAULT false,
    notification_type VARCHAR(100),
    linked_chat_id VARCHAR(255),
    linked_message_id VARCHAR(255),
    linked_task_id VARCHAR(255),
    linked_post_id VARCHAR(255),
    attachments JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reply_to_id) REFERENCES messages(id) ON DELETE SET NULL
);

CREATE INDEX idx_messages_chat_id ON messages(chat_id);
CREATE INDEX idx_messages_author_id ON messages(author_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_messages_is_system ON messages(is_system_message);

-- Parsing State table
CREATE TABLE IF NOT EXISTS parsing_state (
    id SERIAL PRIMARY KEY,
    source_id VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50),
    progress INTEGER,
    started_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    details JSONB DEFAULT '{}',
    FOREIGN KEY (source_id) REFERENCES data_sources(id) ON DELETE CASCADE
);

-- Tasks (TODOs) table - for content plan
CREATE TABLE IF NOT EXISTS tasks (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    priority VARCHAR(50),
    due_date TIMESTAMP,
    assigned_to VARCHAR(255),
    assigned_to_ids JSONB DEFAULT '[]',
    author_id VARCHAR(255),
    assigned_by_id VARCHAR(255),
    list_id VARCHAR(255),
    tags JSONB DEFAULT '[]',
    is_completed BOOLEAN DEFAULT false,
    add_to_calendar BOOLEAN DEFAULT false,
    task_order INTEGER DEFAULT 0,
    archived BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_by_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (list_id) REFERENCES todo_lists(id) ON DELETE SET NULL
);

CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_author_id ON tasks(author_id);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_list_id ON tasks(list_id);
CREATE INDEX idx_tasks_is_completed ON tasks(is_completed);
CREATE INDEX IF NOT EXISTS idx_tasks_archived ON tasks(archived);

-- Events table
CREATE TABLE IF NOT EXISTS events (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    user_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_events_user_id ON events(user_id);
CREATE INDEX idx_events_start_date ON events(start_date);

-- Events table
CREATE TABLE IF NOT EXISTS events (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_type VARCHAR(100),
    date_type VARCHAR(50),
    start_date DATE,
    end_date DATE,
    tags JSONB DEFAULT '[]',
    participants JSONB DEFAULT '[]',
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_events_created_by ON events(created_by);
CREATE INDEX idx_events_start_date ON events(start_date);

-- Links table
CREATE TABLE IF NOT EXISTS links (
    id VARCHAR(255) PRIMARY KEY,
    url TEXT NOT NULL,
    title VARCHAR(255),
    description TEXT,
    favicon TEXT,
    image TEXT,
    site_name VARCHAR(255),
    list_id VARCHAR(100),
    tags JSONB DEFAULT '[]',
    department VARCHAR(255),
    is_bookmarked BOOLEAN DEFAULT false,
    is_pinned BOOLEAN DEFAULT false,
    click_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    link_order INTEGER DEFAULT 0
);

CREATE INDEX idx_links_list_id ON links(list_id);
CREATE INDEX idx_links_bookmarked ON links(is_bookmarked);
CREATE INDEX idx_links_department ON links(department);

-- Link Lists table
CREATE TABLE IF NOT EXISTS link_lists (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    color VARCHAR(50) DEFAULT '#3b82f6',
    icon VARCHAR(255),
    department VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    list_order INTEGER DEFAULT 0
);

CREATE INDEX idx_link_lists_department ON link_lists(department);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    is_completed BOOLEAN DEFAULT false,
    priority VARCHAR(50) DEFAULT 'medium',
    status VARCHAR(50) DEFAULT 'pending',
    list_id VARCHAR(100),
    tags JSONB DEFAULT '[]',
    assigned_by_id VARCHAR(255),
    assigned_by VARCHAR(255),
    assigned_to VARCHAR(255),
    assigned_to_ids JSONB DEFAULT '[]',
    author_id VARCHAR(255),
    add_to_calendar BOOLEAN DEFAULT false,
    due_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    task_order INTEGER DEFAULT 0,
    FOREIGN KEY (assigned_by_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_tasks_list_id ON tasks(list_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_assigned_by_id ON tasks(assigned_by_id);
CREATE INDEX idx_tasks_author_id ON tasks(author_id);

-- TODO Lists table
CREATE TABLE IF NOT EXISTS todo_lists (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    color VARCHAR(50) DEFAULT '#3b82f6',
    icon VARCHAR(255),
    department VARCHAR(255),
    archived BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    list_order INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_todo_lists_archived ON todo_lists(archived);

-- TODO Categories table
CREATE TABLE IF NOT EXISTS todo_categories (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    color VARCHAR(50) DEFAULT '#3b82f6',
    icon VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    category_order INTEGER DEFAULT 0
);

-- Content Plans table
CREATE TABLE IF NOT EXISTS content_plans (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    content TEXT,
    status VARCHAR(50) DEFAULT 'draft',
    post_type VARCHAR(100),
    scheduled_date TIMESTAMP,
    published_date TIMESTAMP,
    platform VARCHAR(100),
    tags JSONB DEFAULT '[]',
    author_id VARCHAR(255),
    assigned_to_ids JSONB DEFAULT '[]',
    attachments JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_content_plans_author_id ON content_plans(author_id);
CREATE INDEX idx_content_plans_status ON content_plans(status);
CREATE INDEX idx_content_plans_scheduled_date ON content_plans(scheduled_date);

-- Comments/Reactions table (optional, for future use)
CREATE TABLE IF NOT EXISTS message_reactions (
    id SERIAL PRIMARY KEY,
    message_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    reaction VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(message_id, user_id, reaction),
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_message_reactions_message_id ON message_reactions(message_id);
