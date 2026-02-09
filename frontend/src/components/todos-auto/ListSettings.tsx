'use client';

import React, { memo, Dispatch, SetStateAction } from 'react';
import { CalendarPlus, Check, ChevronDown, Palette, Settings, User, UserCheck, Users, X } from 'lucide-react';

interface ListSettingsProps {
  list: TodoList | null;
  isOpen: boolean;
  onClose: () => void;
  people: Person[];
  updateList: (list: TodoList) => void;
  setLists: React.Dispatch<React.SetStateAction<TodoList[]>>;
  listSettingsDropdown: 'executor' | 'customer' | null;
  setListSettingsDropdown: Dispatch<SetStateAction<'executor' | 'customer' | null>>;
  LIST_COLORS: string[];
}

const ListSettings = memo(function ListSettings({
  list,
  isOpen,
  onClose,
  people,
  updateList,
  setLists,
  listSettingsDropdown,
  setListSettingsDropdown,
  LIST_COLORS
}: ListSettingsProps) {
  if (!isOpen || !list) return null;

  const settingsList = list;

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
      <div className="bg-[var(--bg-tertiary)] w-full h-full flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)] flex-shrink-0">
          <h3 className="font-semibold flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-400" />
            Настройки списка &quot;{settingsList.name}&quot;
          </h3>
          <button
            onClick={() => {
              onClose();
              setListSettingsDropdown(null);
            }}
            className="p-1 hover:bg-[var(--bg-glass)] rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
              
              <div className="p-4 space-y-4 overflow-y-auto flex-1">
                <p className="text-sm text-[var(--text-muted)]">
                  Задайте исполнителя и заказчика по умолчанию для новых задач в этом списке.
                </p>

                {/* Дефолтный исполнитель */}
                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-green-400" />
                    Исполнитель по умолчанию
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setListSettingsDropdown(listSettingsDropdown === 'executor' ? null : 'executor')}
                      className={`w-full px-3 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] text-left flex items-center justify-between hover:border-[var(--border-light)] transition-all ${
                        listSettingsDropdown === 'executor' ? 'rounded-t-lg border-b-0' : 'rounded-lg'
                      }`}
                    >
                    <div className="flex items-center gap-2">
                      {settingsList.defaultExecutorId ? (
                        <>
                          <div className="w-6 h-6 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center">
                            <UserCheck className="w-3 h-3" />
                          </div>
                          <span className="text-[var(--text-primary)] text-sm">{people.find(p => p.id === settingsList.defaultExecutorId)?.name}</span>
                          {people.find(p => p.id === settingsList.defaultExecutorId)?.telegramId && (
                            <span className="text-[9px] text-cyan-400 bg-cyan-500/20 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                              <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                              TG
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-[var(--text-muted)] text-sm">Не выбран</span>
                      )}
                    </div>
                    <ChevronDown className={`w-4 h-4 text-[var(--text-muted)] transition-transform duration-200 ${listSettingsDropdown === 'executor' ? 'rotate-180' : ''}`} />
                  </button>
                  <div className={`absolute top-full left-0 right-0 bg-[var(--bg-secondary)] border border-[var(--border-color)] border-t-0 rounded-b-lg shadow-xl z-50 max-h-48 overflow-y-auto transition-all duration-200 ease-out origin-top ${
                    listSettingsDropdown === 'executor' 
                      ? 'opacity-100 scale-y-100' 
                      : 'opacity-0 scale-y-0 pointer-events-none'
                  }`}>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = { ...settingsList, defaultExecutorId: undefined };
                          updateList(updated);
                          setLists(prev => prev.map(l => l.id === updated.id ? updated : l));
                          setListSettingsDropdown(null);
                        }}
                        className={`w-full px-3 py-2.5 text-left hover:bg-[var(--bg-glass)] transition-colors flex items-center gap-2 border-b border-[var(--border-secondary)] ${
                          !settingsList.defaultExecutorId ? 'bg-[var(--bg-glass)]' : ''
                        }`}
                      >
                        <div className="w-6 h-6 rounded-full bg-[var(--bg-glass-hover)] flex items-center justify-center">
                          <X className="w-3 h-3 text-[var(--text-muted)]" />
                        </div>
                        <span className="text-white/50 text-sm">Не выбран</span>
                      </button>
                      {people.filter(p => p.role === 'executor' || p.role === 'universal').map(person => (
                        <button
                          key={person.id}
                          type="button"
                          onClick={() => {
                            const updated = { ...settingsList, defaultExecutorId: person.id };
                            updateList(updated);
                            setLists(prev => prev.map(l => l.id === updated.id ? updated : l));
                            setListSettingsDropdown(null);
                          }}
                          className={`w-full px-3 py-2.5 text-left hover:bg-[var(--bg-glass)] transition-colors flex items-center justify-between ${
                            settingsList.defaultExecutorId === person.id ? 'bg-green-500/10' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                              settingsList.defaultExecutorId === person.id 
                                ? 'bg-green-500/20 text-green-400' 
                                : 'bg-[var(--bg-glass-hover)] text-[var(--text-secondary)]'
                            }`}>
                              <UserCheck className="w-3 h-3" />
                            </div>
                            <span className={`text-sm ${settingsList.defaultExecutorId === person.id ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                              {person.name}
                            </span>
                          </div>
                          {person.telegramId && (
                            <span className="text-[9px] text-cyan-400 bg-cyan-500/20 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                              <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                              TG
                            </span>
                          )}
                        </button>
                      ))}
                      {people.filter(p => p.role === 'executor' || p.role === 'universal').length === 0 && (
                        <div className="px-3 py-4 text-center text-[var(--text-muted)] text-sm">
                          Нет исполнителей
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    Будет автоматически назначен при создании задачи
                  </p>
                </div>

                {/* Дефолтный заказчик */}
                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-400" />
                    Заказчик по умолчанию
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setListSettingsDropdown(listSettingsDropdown === 'customer' ? null : 'customer')}
                      className={`w-full px-3 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] text-left flex items-center justify-between hover:border-[var(--border-light)] transition-all ${
                        listSettingsDropdown === 'customer' ? 'rounded-t-lg border-b-0' : 'rounded-lg'
                      }`}
                    >
                    <div className="flex items-center gap-2">
                      {settingsList.defaultCustomerId ? (
                        <>
                          <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center">
                            <User className="w-3 h-3" />
                          </div>
                          <span className="text-[var(--text-primary)] text-sm">{people.find(p => p.id === settingsList.defaultCustomerId)?.name}</span>
                          {people.find(p => p.id === settingsList.defaultCustomerId)?.telegramId && (
                            <span className="text-[9px] text-cyan-400 bg-cyan-500/20 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                              <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                              TG
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-[var(--text-muted)] text-sm">Не выбран</span>
                      )}
                    </div>
                    <ChevronDown className={`w-4 h-4 text-[var(--text-muted)] transition-transform duration-200 ${listSettingsDropdown === 'customer' ? 'rotate-180' : ''}`} />
                  </button>
                  <div className={`absolute top-full left-0 right-0 bg-[var(--bg-secondary)] border border-[var(--border-color)] border-t-0 rounded-b-lg shadow-xl z-50 max-h-48 overflow-y-auto transition-all duration-200 ease-out origin-top ${
                    listSettingsDropdown === 'customer' 
                      ? 'opacity-100 scale-y-100' 
                      : 'opacity-0 scale-y-0 pointer-events-none'
                  }`}>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = { ...settingsList, defaultCustomerId: undefined };
                          updateList(updated);
                          setLists(prev => prev.map(l => l.id === updated.id ? updated : l));
                          setListSettingsDropdown(null);
                        }}
                        className={`w-full px-3 py-2.5 text-left hover:bg-[var(--bg-glass)] transition-colors flex items-center gap-2 border-b border-[var(--border-secondary)] ${
                          !settingsList.defaultCustomerId ? 'bg-[var(--bg-glass)]' : ''
                        }`}
                      >
                        <div className="w-6 h-6 rounded-full bg-[var(--bg-glass-hover)] flex items-center justify-center">
                          <X className="w-3 h-3 text-[var(--text-muted)]" />
                        </div>
                        <span className="text-white/50 text-sm">Не выбран</span>
                      </button>
                      {people.filter(p => p.role === 'customer' || p.role === 'universal').map(person => (
                        <button
                          key={person.id}
                          type="button"
                          onClick={() => {
                            const updated = { ...settingsList, defaultCustomerId: person.id };
                            updateList(updated);
                            setLists(prev => prev.map(l => l.id === updated.id ? updated : l));
                            setListSettingsDropdown(null);
                          }}
                          className={`w-full px-3 py-2.5 text-left hover:bg-[var(--bg-glass)] transition-colors flex items-center justify-between ${
                            settingsList.defaultCustomerId === person.id ? 'bg-blue-500/10' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                              settingsList.defaultCustomerId === person.id 
                                ? 'bg-blue-500/20 text-blue-400' 
                                : 'bg-[var(--bg-glass-hover)] text-[var(--text-secondary)]'
                            }`}>
                              <User className="w-3 h-3" />
                            </div>
                            <span className={`text-sm ${settingsList.defaultCustomerId === person.id ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                              {person.name}
                            </span>
                          </div>
                          {person.telegramId && (
                            <span className="text-[9px] text-cyan-400 bg-cyan-500/20 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                              <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                              TG
                            </span>
                          )}
                        </button>
                      ))}
                      {people.filter(p => p.role === 'customer' || p.role === 'universal').length === 0 && (
                        <div className="px-3 py-4 text-center text-[var(--text-muted)] text-sm">
                          Нет заказчиков
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    Будет автоматически установлен как &quot;От кого&quot;
                  </p>
                </div>

                {/* Цвет списка */}
                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                    <Palette className="w-4 h-4 text-purple-400" />
                    Цвет списка
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {LIST_COLORS.map(color => (
                      <button
                        key={color}
                        onClick={() => {
                          const updated = { ...settingsList, color };
                          updateList(updated);
                          setLists(prev => prev.map(l => l.id === updated.id ? updated : l));
                        }}
                        className={`w-8 h-8 rounded-lg transition-all ${
                          settingsList.color === color 
                            ? 'ring-2 ring-white/50 ring-offset-2 ring-offset-[#1a1a1a] scale-110' 
                            : 'opacity-70 hover:opacity-100 hover:scale-105'
                        }`}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>

                {/* Добавлять на календарь по умолчанию */}
                <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                  <label 
                    className="flex items-center gap-3 cursor-pointer group"
                    onClick={() => {
                      const updated = { ...settingsList, defaultAddToCalendar: !settingsList.defaultAddToCalendar };
                      updateList(updated);
                      setLists(prev => prev.map(l => l.id === updated.id ? updated : l));
                    }}
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                      settingsList.defaultAddToCalendar 
                        ? 'bg-purple-500 border-purple-500' 
                        : 'border-[var(--border-light)] group-hover:border-white/40'
                    }`}>
                      {settingsList.defaultAddToCalendar && <Check className="w-3 h-3 text-[var(--text-primary)]" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <CalendarPlus className="w-4 h-4 text-purple-400" />
                        <span className="text-sm text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                          Добавлять задачи на календарь
                        </span>
                      </div>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        Новые задачи будут автоматически отправляться на календарь
                      </p>
                    </div>
                  </label>
                </div>

                {/* Доступ по отделам */}
                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                    <Users className="w-4 h-4 text-orange-400" />
                    Доступ по отделам
                  </label>
                  <p className="text-xs text-[var(--text-muted)] mb-2">
                    Пользователи из выбранных отделов смогут видеть этот список
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      // Собираем все уникальные отделы из пользователей
                      const departments = [...new Set(people.filter(p => p.department).map(p => p.department!))].sort();
                      return departments.map(dept => {
                        const isSelected = settingsList.allowedDepartments?.includes(dept);
                        return (
                          <button
                            key={dept}
                            type="button"
                            onClick={() => {
                              const currentDepts = settingsList.allowedDepartments || [];
                              const newDepts = isSelected
                                ? currentDepts.filter(d => d !== dept)
                                : [...currentDepts, dept];
                              const updated = { ...settingsList, allowedDepartments: newDepts };
                              updateList(updated);
                              setLists(prev => prev.map(l => l.id === updated.id ? updated : l));
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs transition-all flex items-center gap-1.5 ${
                              isSelected
                                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                                : 'bg-[var(--bg-glass)] text-[var(--text-secondary)] border border-[var(--border-color)] hover:border-orange-500/30'
                            }`}
                          >
                            <Users className="w-3 h-3" />
                            {dept}
                            {isSelected && <Check className="w-3 h-3" />}
                          </button>
                        );
                      });
                    })()}
                    {people.filter(p => p.department).length === 0 && (
                      <div className="text-xs text-[var(--text-muted)] py-2">
                        Нет пользователей с назначенными отделами
                      </div>
                    )}
                  </div>
                  {settingsList.allowedDepartments && settingsList.allowedDepartments.length > 0 && (
                    <div className="mt-2 text-xs text-orange-400">
                      Выбрано отделов: {settingsList.allowedDepartments.length}
                    </div>
                  )}
                </div>

                {/* Текущие настройки */}
                {(settingsList.defaultExecutorId || settingsList.defaultCustomerId || settingsList.defaultAddToCalendar || (settingsList.allowedDepartments && settingsList.allowedDepartments.length > 0)) && (
                  <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <p className="text-xs text-green-400 font-medium mb-1">✓ Настройки сохранены</p>
                    <div className="text-xs text-[var(--text-secondary)] space-y-1">
                      {settingsList.defaultExecutorId && (
                        <div className="flex items-center gap-1">
                          <UserCheck className="w-3 h-3 text-green-400" />
                          Исполнитель: {people.find(p => p.id === settingsList.defaultExecutorId)?.name}
                        </div>
                      )}
                      {settingsList.defaultCustomerId && (
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3 text-blue-400" />
                          Заказчик: {people.find(p => p.id === settingsList.defaultCustomerId)?.name}
                        </div>
                      )}
                      {settingsList.defaultAddToCalendar && (
                        <div className="flex items-center gap-1">
                          <CalendarPlus className="w-3 h-3 text-purple-400" />
                          Автодобавление в календарь
                        </div>
                      )}
                      {settingsList.allowedDepartments && settingsList.allowedDepartments.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3 text-orange-400" />
                          Отделы: {settingsList.allowedDepartments.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
        <div className="flex justify-end gap-2 p-4 border-t border-[var(--border-color)]">
          <button
            onClick={() => {
              onClose();
              setListSettingsDropdown(null);
            }}
            className="px-4 py-2 bg-[var(--bg-glass-hover)] text-[var(--text-primary)] hover:bg-white/15 rounded-lg transition-all border border-[var(--border-color)]"
          >
            Готово
          </button>
        </div>
      </div>
    </div>
  );
});

export default ListSettings;
