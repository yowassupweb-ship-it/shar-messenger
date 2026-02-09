'use client';

import React, { memo } from 'react';
import { Bot, Send, X } from 'lucide-react';

interface TelegramSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  telegramToken: string;
  setTelegramToken: (token: string) => void;
  telegramEnabled: boolean;
  setTelegramEnabled: (enabled: boolean) => void;
  updateTelegramSettings: () => void;
}

const TelegramSettings = memo(function TelegramSettings({
  isOpen,
  onClose,
  telegramToken,
  setTelegramToken,
  telegramEnabled,
  setTelegramEnabled,
  updateTelegramSettings
}: TelegramSettingsProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
      <div className="bg-[var(--bg-tertiary)] w-full h-full flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
          <h3 className="font-semibold flex items-center gap-2">
            <Bot className="w-5 h-5 text-cyan-400" />
            Уведомления в Telegram
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[var(--bg-glass)] rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
            
            <div className="p-4 space-y-4">
              <p className="text-sm text-white/50">
                Настройте бота для отправки уведомлений о новых задачах исполнителям в Telegram.
              </p>

              <div>
                <label className="block text-sm font-medium mb-1">Bot Token</label>
                <input
                  type="password"
                  value={telegramToken}
                  onChange={(e) => setTelegramToken(e.target.value)}
                  placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                  className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg focus:outline-none focus:border-white/30"
                />
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Получите токен у @BotFather в Telegram
                </p>
              </div>

              <div className="flex items-center justify-between p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)]">
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4 text-white/50" />
                  <span className="text-sm">Отправлять уведомления</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={telegramEnabled}
                    onChange={(e) => setTelegramEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-[var(--bg-glass-hover)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
                </label>
              </div>

              <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                <p className="text-xs text-cyan-400">
                  💡 Как получить Telegram ID:<br/>
                  1. Напишите боту @userinfobot<br/>
                  2. Он пришлёт ваш ID<br/>
                  3. Добавьте ID к исполнителю в разделе &quot;Люди&quot;
                </p>
              </div>
            </div>
            
        <div className="flex justify-end gap-2 p-4 border-t border-[var(--border-color)]">
          <button
            onClick={onClose}
            className="px-4 py-2 hover:bg-[var(--bg-glass)] rounded-lg transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={updateTelegramSettings}
            className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-all border border-cyan-500/30"
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
});

export default TelegramSettings;
