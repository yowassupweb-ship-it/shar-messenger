-- Add user preference columns for navigation and chat settings
-- Migration: 002_add_user_preferences
-- Created: 2026-02-10

-- Add pinned_tools column (array of tool IDs for bottom navigation)
ALTER TABLE users ADD COLUMN IF NOT EXISTS pinned_tools JSONB DEFAULT '[]';

-- Add visible_tabs column (which navigation tabs are visible)
ALTER TABLE users ADD COLUMN IF NOT EXISTS visible_tabs JSONB DEFAULT '{"messages": true, "tasks": true, "calendar": true, "contacts": true, "links": true}';

-- Add chat_settings column (bubble style, font size, colors, etc)
ALTER TABLE users ADD COLUMN IF NOT EXISTS chat_settings JSONB DEFAULT '{"bubbleStyle": "modern", "fontSize": 13, "fontSizeMobile": 15, "bubbleColor": "#3c3d96", "bubbleColorLight": "#453de6", "colorPreset": 0}';

-- Add comments for clarity
COMMENT ON COLUMN users.pinned_tools IS 'User''s pinned tools in bottom navigation (max 3)';
COMMENT ON COLUMN users.visible_tabs IS 'Visibility settings for navigation tabs';
COMMENT ON COLUMN users.chat_settings IS 'Chat appearance settings (bubble style, colors, fonts)';
