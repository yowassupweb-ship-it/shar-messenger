-- Таблица для истории калькулятора (одна история на пользователя)
CREATE TABLE IF NOT EXISTS calculator_history (
    user_id VARCHAR(255) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    history JSONB DEFAULT '[]',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индекс для быстрого поиска
CREATE INDEX idx_calculator_history_user_id ON calculator_history(user_id);

-- Комментарии
COMMENT ON TABLE calculator_history IS 'История вычислений калькулятора для каждого пользователя';
COMMENT ON COLUMN calculator_history.user_id IS 'ID пользователя';
COMMENT ON COLUMN calculator_history.history IS 'JSON массив с историей вычислений';
