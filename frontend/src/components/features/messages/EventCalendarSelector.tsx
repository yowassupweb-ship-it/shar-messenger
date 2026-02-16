'use client';

import React from 'react';
import { Message } from './types';
import { X, Calendar } from 'lucide-react';

interface CalendarList {
  id: string;
  name: string;
  color: string;
}

interface EventCalendarSelectorProps {
  show: boolean;
  message: Message | null;
  calendarLists: CalendarList[];
  onClose: () => void;
}

export default function EventCalendarSelector({
  show,
  message,
  calendarLists,
  onClose
}: EventCalendarSelectorProps) {
  if (!show || !message) return null;

  const handleCreateEvent = async (list: CalendarList) => {
    try {
      const eventTitle = message.content.length > 100
        ? message.content.substring(0, 100) + '...'
        : message.content;
      
      const res = await fetch('/api/calendar-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: eventTitle,
          description: message.content,
          type: 'event',
          date: new Date().toISOString().split('T')[0],
          listId: list.id,
          sourceId: message.id,
          assignedBy: localStorage.getItem('username') || undefined
        })
      });
      
      if (res.ok) {
        onClose();
      } else {
        throw new Error('Ошибка создания события');
      }
    } catch (error) {
      console.error('Error creating event:', error);
      alert('Не удалось создать событие');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-[100]">
      <div className="bg-white dark:bg-gradient-to-b dark:from-[#1a1a1a] dark:to-[#151515] border-0 sm:border border-gray-200 dark:border-white/10 rounded-t-2xl sm:rounded-xl w-full sm:w-96 max-h-[95vh] shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-white/10">
          <h3 className="font-medium text-gray-900 dark:text-white">Выберите календарь</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-gray-500 dark:text-white/60" />
          </button>
        </div>

        {/* Calendar List */}
        <div className="p-4 flex flex-col gap-2 overflow-y-auto">
          {calendarLists.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-white/50">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Нет доступных календарей</p>
              <p className="text-xs mt-1">Создайте календарь в настройках</p>
            </div>
          ) : (
            calendarLists.map(list => (
              <button
                key={list.id}
                onClick={() => handleCreateEvent(list)}
                className="w-full px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl flex items-center gap-3 transition-colors"
                style={{ borderLeft: `3px solid ${list.color || '#3B82F6'}` }}
              >
                <Calendar className="w-5 h-5 text-gray-400 dark:text-white/60" />
                <span className="text-gray-900 dark:text-white font-medium">{list.name}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
