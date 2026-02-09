'use client';

import React, { memo } from 'react';
import { User, UserCheck, Users, X } from 'lucide-react';

interface Person {
  id: string;
  name: string;
  username?: string;
  telegramId?: string;
  role: 'executor' | 'customer' | 'universal';
}

interface PeopleManagerProps {
  isOpen: boolean;
  onClose: () => void;
  people: Person[];
}

const PeopleManager = memo(function PeopleManager({
  isOpen,
  onClose,
  people
}: PeopleManagerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
      <div className="bg-[var(--bg-tertiary)] w-full h-full flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
          <h3 className="font-semibold flex items-center gap-2">
            <Users className="w-5 h-5 text-[var(--text-secondary)]" />
            Исполнители и заказчики
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[var(--bg-glass)] rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
            
            <div className="p-4 overflow-y-auto flex-1">
              <p className="text-sm text-white/50 mb-4">
                Список пользователей системы и их роли в задачах. Управление пользователями доступно в админ-панели.
              </p>

              {/* Исполнители */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-2 flex items-center gap-2">
                  <UserCheck className="w-4 h-4" /> Исполнители
                </h4>
                <div className="space-y-2">
                  {people.filter(p => p.role === 'executor' || p.role === 'universal').map(person => (
                    <div 
                      key={person.id}
                      className="flex items-center justify-between p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)]"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          person.role === 'universal' 
                            ? 'bg-purple-500/20 text-purple-400' 
                            : 'bg-green-500/20 text-green-400'
                        }`}>
                          {person.role === 'universal' ? <Users className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{person.name}</span>
                            {person.role === 'universal' && (
                              <span className="text-[9px] px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded-full">Универсал</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {person.telegramId && (
                              <span className="text-xs text-cyan-400">📱 {person.telegramId}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {people.filter(p => p.role === 'executor' || p.role === 'universal').length === 0 && (
                    <div className="text-sm text-[var(--text-muted)] text-center py-4">Нет исполнителей</div>
                  )}
                </div>
              </div>

              {/* Заказчики */}
              <div>
                <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-2 flex items-center gap-2">
                  <User className="w-4 h-4" /> Заказчики
                </h4>
                <div className="space-y-2">
                  {people.filter(p => p.role === 'customer' || p.role === 'universal').map(person => (
                    <div 
                      key={person.id}
                      className="flex items-center justify-between p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)]"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          person.role === 'universal' 
                            ? 'bg-purple-500/20 text-purple-400' 
                            : 'bg-blue-500/20 text-blue-400'
                        }`}>
                          {person.role === 'universal' ? <Users className="w-4 h-4" /> : <User className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{person.name}</span>
                            {person.role === 'universal' && (
                              <span className="text-[9px] px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded-full">Универсал</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {person.telegramId && (
                              <span className="text-xs text-cyan-400">📱 {person.telegramId}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {people.filter(p => p.role === 'customer' || p.role === 'universal').length === 0 && (
                    <div className="text-sm text-[var(--text-muted)] text-center py-4">Нет заказчиков</div>
                  )}
                </div>
              </div>
            </div>

        <div className="flex justify-end p-4 border-t border-[var(--border-color)]">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[var(--bg-glass-hover)] text-[var(--text-primary)] hover:bg-white/15 rounded-xl transition-all border border-[var(--border-color)]"
          >
            Готово
          </button>
        </div>
      </div>
    </div>
  );
});

export default PeopleManager;
