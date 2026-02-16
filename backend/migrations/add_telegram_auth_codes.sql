-- Создание таблицы для кодов авторизации Telegram
CREATE TABLE IF NOT EXISTS telegram_auth_codes (
    code VARCHAR(50) PRIMARY KEY,
    authenticated BOOLEAN DEFAULT FALSE,
    user_data JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Индекс для очистки старых кодов
CREATE INDEX IF NOT EXISTS idx_telegram_auth_codes_created_at 
ON telegram_auth_codes(created_at);

-- Добавление telegram_id к таблице users если не существует
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'telegram_id'
    ) THEN
        ALTER TABLE users ADD COLUMN telegram_id VARCHAR(50);
        CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
    END IF;
END $$;
