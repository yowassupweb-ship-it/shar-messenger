import React from 'react';
import { X, AlertTriangle, Bell, UserCheck, User, Users, Check } from 'lucide-react';

interface Person {
  id: string;
  name: string;
  telegramId?: string;
  telegramUsername?: string;
  role: 'executor' | 'customer' | 'universal';
  notifyOnNewTask?: boolean;
  notifyOnStatusChange?: boolean;
  notifyOnComment?: boolean;
  notifyOnMention?: boolean;
}

interface EditPersonModalProps {
  isOpen: boolean;
  person: Person | null;
  onClose: () => void;
  onUpdate: (person: Person) => void;
  editingPerson: Person | null;
  setEditingPerson: (person: Person | null) => void;
}

export default function EditPersonModal({
  isOpen,
  person,
  onClose,
  onUpdate,
  editingPerson,
  setEditingPerson
}: EditPersonModalProps) {
  if (!isOpen || !editingPerson) return null;

  const handleSave = () => {
    onUpdate(editingPerson);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-2xl max-w-md w-full shadow-2xl">
        <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
            {editingPerson.role === 'executor' ? <UserCheck className="w-5 h-5 text-green-400" /> : 
             editingPerson.role === 'customer' ? <User className="w-5 h-5 text-blue-400" /> :
             <Users className="w-5 h-5 text-purple-400" />}
            Редактирование профиля
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--bg-glass-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 space-y-5">
          {/* Основные данные */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-white/50 mb-2">Имя</label>
              <input
                type="text"
                value={editingPerson.name}
                onChange={(e) => setEditingPerson({ ...editingPerson, name: e.target.value })}
                className="w-full px-4 py-2.5 bg-[var(--bg-glass)] border border-[var(--border-color)] rounded-xl text-[var(--text-primary)] text-sm focus:outline-none focus:border-cyan-500/50"
                placeholder="Имя пользователя"
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-2">Telegram ID</label>
              <input
                type="text"
                value={editingPerson.telegramId || ''}
                onChange={(e) => setEditingPerson({ ...editingPerson, telegramId: e.target.value })}
                className="w-full px-4 py-2.5 bg-[var(--bg-glass)] border border-[var(--border-color)] rounded-xl text-[var(--text-primary)] text-sm focus:outline-none focus:border-cyan-500/50"
                placeholder="123456789"
              />
              <p className="text-[10px] text-[var(--text-muted)] mt-1">ID пользователя в Telegram (можно получить у @userinfobot)</p>
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-2">Роль</label>
              <select
                value={editingPerson.role}
                onChange={(e) => setEditingPerson({ ...editingPerson, role: e.target.value as 'executor' | 'customer' | 'universal' })}
                className="w-full px-4 py-2.5 bg-[var(--bg-glass)] border border-[var(--border-color)] rounded-xl text-[var(--text-primary)] text-sm focus:outline-none focus:border-cyan-500/50"
              >
                <option value="executor" className="bg-[var(--bg-tertiary)]">Исполнитель</option>
                <option value="customer" className="bg-[var(--bg-tertiary)]">Заказчик</option>
                <option value="universal" className="bg-[var(--bg-tertiary)]">Универсальный</option>
              </select>
            </div>
          </div>

          {/* Настройки уведомлений */}
          <div className="border-t border-[var(--border-color)] pt-4">
            <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3 flex items-center gap-2">
              <Bell className="w-4 h-4 text-cyan-400" />
              Уведомления в Telegram
            </h3>
            {!editingPerson.telegramId && (
              <p className="text-xs text-orange-400/70 mb-3 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Укажите Telegram ID для получения уведомлений
              </p>
            )}
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer group p-2 rounded-lg hover:bg-[var(--bg-glass)]">
                <input
                  type="checkbox"
                  checked={editingPerson.notifyOnNewTask ?? true}
                  onChange={(e) => setEditingPerson({ ...editingPerson, notifyOnNewTask: e.target.checked })}
                  className="w-4 h-4 rounded border-[var(--border-light)] bg-[var(--bg-glass)] text-cyan-500 focus:ring-cyan-500/20"
                />
                <div>
                  <span className="text-sm text-[var(--text-secondary)] group-hover:text-white/90 transition-colors block">Новая задача</span>
                  <span className="text-[10px] text-[var(--text-muted)]">Когда вам назначают новую задачу</span>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group p-2 rounded-lg hover:bg-[var(--bg-glass)]">
                <input
                  type="checkbox"
                  checked={editingPerson.notifyOnStatusChange ?? true}
                  onChange={(e) => setEditingPerson({ ...editingPerson, notifyOnStatusChange: e.target.checked })}
                  className="w-4 h-4 rounded border-[var(--border-light)] bg-[var(--bg-glass)] text-cyan-500 focus:ring-cyan-500/20"
                />
                <div>
                  <span className="text-sm text-[var(--text-secondary)] group-hover:text-white/90 transition-colors block">Изменение статуса</span>
                  <span className="text-[10px] text-[var(--text-muted)]">Когда меняется статус вашей задачи</span>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group p-2 rounded-lg hover:bg-[var(--bg-glass)]">
                <input
                  type="checkbox"
                  checked={editingPerson.notifyOnComment ?? true}
                  onChange={(e) => setEditingPerson({ ...editingPerson, notifyOnComment: e.target.checked })}
                  className="w-4 h-4 rounded border-[var(--border-light)] bg-[var(--bg-glass)] text-cyan-500 focus:ring-cyan-500/20"
                />
                <div>
                  <span className="text-sm text-[var(--text-secondary)] group-hover:text-white/90 transition-colors block">Комментарии</span>
                  <span className="text-[10px] text-[var(--text-muted)]">Когда кто-то комментирует вашу задачу</span>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group p-2 rounded-lg hover:bg-[var(--bg-glass)]">
                <input
                  type="checkbox"
                  checked={editingPerson.notifyOnMention ?? true}
                  onChange={(e) => setEditingPerson({ ...editingPerson, notifyOnMention: e.target.checked })}
                  className="w-4 h-4 rounded border-[var(--border-light)] bg-[var(--bg-glass)] text-cyan-500 focus:ring-cyan-500/20"
                />
                <div>
                  <span className="text-sm text-[var(--text-secondary)] group-hover:text-white/90 transition-colors block">Упоминания</span>
                  <span className="text-[10px] text-[var(--text-muted)]">Когда вас упоминают в комментарии</span>
                </div>
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-cyan-600 text-[var(--text-primary)] rounded-xl font-medium hover:from-cyan-600 hover:to-cyan-700 transition-all"
            >
              <Check className="w-4 h-4" />
              Сохранить
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2.5 bg-[var(--bg-glass)] border border-[var(--border-color)] rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-glass-hover)] transition-all"
            >
              Отмена
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
