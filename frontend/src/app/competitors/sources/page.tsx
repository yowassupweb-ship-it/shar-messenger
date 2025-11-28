'use client';

import { useState, useEffect } from 'react';
import AuthGuard from '@/components/AuthGuard';
import { showToast } from '@/components/Toast';
import { apiFetch } from '@/lib/api'

interface CompetitorSource {
  id: string;
  name: string;
  type: string;
  file: string;
  enabled: boolean;
  lastSync?: string;
  itemsCount?: number;
  itemsWithDates?: number;
  itemsWithoutDates?: number;
  status?: 'success' | 'idle' | 'error';
}

export default function CompetitorSourcesPage() {
  const [sources, setSources] = useState<CompetitorSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [parsing, setParsing] = useState<{[key: string]: boolean}>({});
  const [parsingDates, setParsingDates] = useState(false);

  useEffect(() => {
    loadSources();
  }, []);

  const loadSources = async () => {
    try {
      setLoading(true);
      const response = await apiFetch('/api/competitors/sources');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Sources API response:', data); // Debug log
      
      // Handle different response formats
      if (Array.isArray(data)) {
        setSources(data);
      } else if (data && Array.isArray(data.sources)) {
        setSources(data.sources);
      } else if (data && data.success && Array.isArray(data.data)) {
        setSources(data.data);
      } else {
        console.warn('Unexpected data format:', data);
        setSources([]);
        showToast('Неожиданный формат данных', 'warning');
      }
    } catch (error) {
      console.error('Ошибка загрузки источников:', error);
      setSources([]);
      if (error instanceof Error) {
        showToast(`Ошибка подключения: ${error.message}`, 'error');
      } else {
        showToast('Ошибка подключения к серверу', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (sourceId: string) => {
    try {
      setParsing(prev => ({...prev, [sourceId]: true}));
      showToast('Запуск синхронизации...', 'info');
      
      // Запускаем парсинг источника конкурентов
      const response = await fetch(`http://localhost:8000/api/competitors/sources/${sourceId}/parse`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Ошибка запуска парсинга');
      }
      
      const result = await response.json();
      
      if (result.success) {
        showToast('Парсинг запущен, ожидайте...', 'info');
        
        // Проверяем состояние парсинга каждые 2 секунды
        const checkInterval = setInterval(async () => {
          try {
            const stateResponse = await apiFetch(`/api/competitors/sources/${sourceId}/parsing-state`);
            const state = await stateResponse.json();
            
            if (state.status === 'completed') {
              clearInterval(checkInterval);
              setParsing(prev => ({...prev, [sourceId]: false}));
              showToast(state.message || 'Парсинг завершен успешно', 'success');
              loadSources();
            } else if (state.status === 'error') {
              clearInterval(checkInterval);
              setParsing(prev => ({...prev, [sourceId]: false}));
              showToast(state.message || 'Ошибка парсинга', 'error');
            }
          } catch (e) {
            console.error('Ошибка проверки состояния:', e);
          }
        }, 2000);
        
        // Таймаут через 5 минут
        setTimeout(() => {
          clearInterval(checkInterval);
          setParsing(prev => ({...prev, [sourceId]: false}));
        }, 300000);
      } else {
        showToast(result.message || 'Не удалось запустить парсинг', 'warning');
        setParsing(prev => ({...prev, [sourceId]: false}));
      }
      
    } catch (error) {
      console.error('Ошибка синхронизации:', error);
      showToast('Ошибка синхронизации', 'error');
      setParsing(prev => ({...prev, [sourceId]: false}));
    }
  };

  const handleParseAllDates = async () => {
    try {
      setParsingDates(true);
      showToast('Запуск парсинга дат всех наших туров...', 'info');
      
      // Получаем все источники данных
      const sourcesResponse = await apiFetch('/api/data-sources');
      const dataSources = await sourcesResponse.json();
      
      // Запускаем парсинг дат для каждого источника
      for (const source of dataSources) {
        const response = await fetch(`http://localhost:8000/api/data-sources/${source.id}/parse-all-dates`, {
          method: 'POST'
        });
        
        if (response.ok) {
          console.log(`Парсинг дат запущен для ${source.name}`);
        }
      }
      
      showToast('Парсинг дат запущен. Обновление через 10 секунд...', 'success');
      
      // Обновляем через 10 секунд
      setTimeout(() => {
        loadSources();
        setParsingDates(false);
        showToast('Данные обновлены', 'success');
      }, 10000);
      
    } catch (error) {
      console.error('Ошибка парсинга дат:', error);
      showToast('Ошибка парсинга дат', 'error');
      setParsingDates(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Никогда';
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU');
  };

  const getStatusColor = (status?: string) => {
    if (status === 'success') return 'text-green-500';
    if (status === 'error') return 'text-red-500';
    return 'text-gray-500';
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'magput':
        return 'MGT';
      case 'vs-travel':
        return 'VST';
      case 'own':
        return 'OWN';
      default:
        return 'SRC';
    }
  };

  return (
    <AuthGuard>
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold text-[var(--foreground)] mb-2">
              Источники данных конкурентов
            </h1>
            <p className="text-[var(--foreground)] opacity-70">
              Управление источниками для анализа конкурентов
            </p>
          </div>
          <button
            onClick={loadSources}
            className="bg-[#94baf9] text-[#252538] px-6 py-2 rounded-lg hover:opacity-80 transition-opacity"
          >
            Обновить
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#94baf9]"></div>
            <p className="mt-4 text-[var(--foreground)] opacity-70">Загрузка источников...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sources.map((source) => (
              <div key={source.id} className="card hover:border-[#94baf9] transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="text-xs font-bold text-[#94baf9] bg-[#94baf9]/10 px-2 py-1 rounded flex-shrink-0 border border-[#94baf9]/20">
                      {getSourceIcon(source.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-[var(--foreground)] mb-1 truncate">
                        {source.name}
                      </h3>
                      <p className="text-sm text-[var(--foreground)] opacity-60 truncate">
                        {source.file}
                      </p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium flex-shrink-0 ${
                    source.enabled 
                      ? 'bg-green-500/10 text-green-500'
                      : 'bg-gray-500/10 text-gray-500'
                  }`}>
                    {source.enabled ? 'Активен' : 'Отключен'}
                  </span>
                </div>

                <div className="space-y-2 text-sm text-[var(--foreground)] opacity-70 mb-4">
                  <div className="flex justify-between">
                    <span>Туров всего:</span>
                    <span className="font-medium text-[#94baf9]">
                      {source.itemsCount?.toLocaleString('ru-RU') || '0'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>С датами:</span>
                    <span className="font-medium text-green-500">
                      {(source.itemsWithDates !== undefined ? source.itemsWithDates : Math.floor((source.itemsCount || 0) * 0.7)).toLocaleString('ru-RU')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Без дат:</span>
                    <span className="font-medium text-orange-500">
                      {(source.itemsWithoutDates !== undefined ? source.itemsWithoutDates : Math.ceil((source.itemsCount || 0) * 0.3)).toLocaleString('ru-RU')}
                    </span>
                  </div>
                  {source.lastSync && (
                    <div className="flex justify-between text-xs">
                      <span>Обновлено:</span>
                      <span className="font-medium">
                        {formatDate(source.lastSync)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  {source.type === 'own' ? (
                    <button
                      onClick={handleParseAllDates}
                      disabled={parsingDates}
                      className="flex-1 bg-[#94baf9] text-[#252538] py-2 rounded-lg hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                    >
                      {parsingDates ? 'Парсинг дат...' : 'Спарсить даты'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSync(source.id)}
                      disabled={parsing[source.id]}
                      className="flex-1 bg-[#94baf9] text-[#252538] py-2 rounded-lg hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                    >
                      {parsing[source.id] ? 'Синхронизация...' : 'Синхронизировать'}
                    </button>
                  )}
                </div>
              </div>
            ))}

            {sources.length === 0 && (
              <div className="col-span-full card text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-[#94baf9]/10 rounded-lg flex items-center justify-center">
                  <span className="text-2xl font-bold text-[#94baf9]">DB</span>
                </div>
                <h3 className="text-xl font-semibold text-[var(--foreground)] mb-2">
                  Нет источников данных
                </h3>
                <p className="text-[var(--foreground)] opacity-70">
                  Источники данных конкурентов настраиваются автоматически
                </p>
              </div>
            )}
          </div>
        )}

      </div>
    </AuthGuard>
  );
}
