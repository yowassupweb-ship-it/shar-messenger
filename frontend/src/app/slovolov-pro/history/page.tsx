'use client';

import MainLayout from '@/components/layout/MainLayout';
import { useState, useEffect } from 'react';

interface HistoryItem {
  id: string;
  timestamp: number;
  type: 'search' | 'export' | 'config_change' | 'filter_add' | 'model_add' | 'batch_update';
  description: string;
  details?: string;
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const res = await fetch('/api/history');
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredHistory = filter === 'all' 
    ? history 
    : history.filter(h => h.type === filter);

  const clearHistory = async () => {
    try {
      await fetch('/api/history', { method: 'DELETE' });
      setHistory([]);
    } catch (error) {
      console.error('Error clearing history:', error);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'search':
        return 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z';
      case 'export':
        return 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12';
      case 'config_change':
        return 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z';
      case 'filter_add':
        return 'M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z';
      case 'model_add':
        return 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2';
      case 'batch_update':
        return 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15';
      default:
        return 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'search': return 'text-blue-400 bg-blue-500/10';
      case 'export': return 'text-green-400 bg-green-500/10';
      case 'config_change': return 'text-yellow-400 bg-yellow-500/10';
      case 'filter_add': return 'text-orange-400 bg-orange-500/10';
      case 'model_add': return 'text-purple-400 bg-purple-500/10';
      case 'batch_update': return 'text-cyan-400 bg-cyan-500/10';
      default: return 'text-white/60 bg-white/5';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'search': return 'Поиск';
      case 'export': return 'Экспорт';
      case 'config_change': return 'Настройка';
      case 'filter_add': return 'Фильтр';
      case 'model_add': return 'Модель';
      case 'batch_update': return 'Обновление';
      default: return 'Другое';
    }
  };

  return (
    <MainLayout>
      <div className="h-full flex flex-col p-4">
        {/* Заголовок */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-lg font-semibold text-white">История действий</h1>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Фильтр */}
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white/80 focus:outline-none focus:border-cyan-500/50"
            >
              <option value="all">Все действия</option>
              <option value="search">Поиск</option>
              <option value="batch_update">Обновление</option>
              <option value="export">Экспорт</option>
              <option value="config_change">Настройки</option>
              <option value="filter_add">Фильтры</option>
              <option value="model_add">Модели</option>
            </select>
            
            {history.length > 0 && (
              <button
                onClick={clearHistory}
                className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs transition-colors"
              >
                Очистить
              </button>
            )}
          </div>
        </div>

        {/* Список истории */}
        <div className="flex-1 overflow-y-auto">
          {filteredHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-white/30">
              <svg className="w-16 h-16 mb-4 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm">История пуста</p>
              <p className="text-xs mt-1 opacity-60">Действия будут отображаться здесь</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredHistory.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 p-3 bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 rounded-lg transition-colors"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${getTypeColor(item.type)}`}>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d={getTypeIcon(item.type)} />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${getTypeColor(item.type)}`}>
                        {getTypeLabel(item.type)}
                      </span>
                      <span className="text-[10px] text-white/30">{formatDate(item.timestamp)}</span>
                    </div>
                    <p className="text-sm text-white/80">{item.description}</p>
                    {item.details && (
                      <p className="text-xs text-white/40 mt-1 truncate">{item.details}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
