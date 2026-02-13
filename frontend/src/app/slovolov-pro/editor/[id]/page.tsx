'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import * as XLSX from 'xlsx';

interface ResultItem {
  query: string;
  count: number;
}

interface ResultData {
  id: string;
  modelName: string;
  query: string;
  createdAt: string;
  items: ResultItem[];
  filters?: string[];
}

type FrequencyCategory = 'all' | 'high' | 'medium' | 'low';

export default function ResultDetailPage() {
  const params = useParams();
  const router = useRouter();
  const resultId = params.id as string;
  
  const [result, setResult] = useState<ResultData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [frequencyFilter, setFrequencyFilter] = useState<FrequencyCategory>('all');
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    if (!resultId) return;
    
    fetch(`/api/results?id=${encodeURIComponent(resultId)}`)
      .then((res) => {
        if (!res.ok) throw new Error('Result not found');
        return res.json();
      })
      .then((data) => {
        setResult(data);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setIsLoading(false);
      });
  }, [resultId]);

  // Фильтрация результатов
  const filteredItems = useMemo(() => {
    if (!result) return [];
    
    let items = result.items;
    
    // Фильтр по частотности
    if (frequencyFilter !== 'all') {
      items = items.filter((item) => {
        if (frequencyFilter === 'high') return item.count >= 10000;
        if (frequencyFilter === 'medium') return item.count >= 2000 && item.count < 10000;
        if (frequencyFilter === 'low') return item.count < 2000;
        return true;
      });
    }
    
    // Поиск по тексту
    if (searchText) {
      const lower = searchText.toLowerCase();
      items = items.filter((item) => item.query.toLowerCase().includes(lower));
    }
    
    return items;
  }, [result, frequencyFilter, searchText]);

  // Статистика
  const stats = useMemo(() => {
    if (!result) return { total: 0, high: 0, medium: 0, low: 0, totalFreq: 0 };
    
    const items = result.items;
    return {
      total: items.length,
      high: items.filter((i) => i.count >= 10000).length,
      medium: items.filter((i) => i.count >= 2000 && i.count < 10000).length,
      low: items.filter((i) => i.count < 2000).length,
      totalFreq: items.reduce((sum, i) => sum + i.count, 0),
    };
  }, [result]);

  // Получение класса для частотности
  const getFrequencyClass = (count: number): string => {
    if (count >= 10000) return 'text-orange-400';
    if (count >= 2000) return 'text-yellow-400';
    return 'text-blue-400';
  };

  const getFrequencyBadge = (count: number): string => {
    if (count >= 10000) return 'badge-orange';
    if (count >= 2000) return 'badge-yellow';
    return 'badge-blue';
  };

  // Копирование всех запросов
  const handleCopyAll = async () => {
    const text = filteredItems.map((i) => i.query).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  // Экспорт в XLSX
  const handleExportXLSX = () => {
    if (!result) return;
    
    const data = filteredItems.map((item, index) => ({
      '#': index + 1,
      'Запрос': item.query,
      'Частотность': item.count,
      'Категория': item.count >= 10000 ? 'ВЧ' : item.count >= 2000 ? 'СЧ' : 'НЧ',
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Результаты');
    
    // Ширина колонок
    ws['!cols'] = [
      { wch: 5 },
      { wch: 50 },
      { wch: 15 },
      { wch: 10 },
    ];
    
    const filename = `${result.modelName}_${result.id}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  // Копирование URL
  const handleCopyUrl = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      alert('URL скопирован!');
    } catch {
      prompt('Скопируйте URL:', url);
    }
  };

  // Удаление результата
  const handleDelete = async () => {
    if (!result) return;
    if (!confirm('Удалить этот результат?')) return;
    
    try {
      await fetch(`/api/results?id=${encodeURIComponent(result.id)}`, { method: 'DELETE' });
      router.push('/slovolov-pro/editor');
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="h-full flex items-center justify-center">
          <div className="spinner"></div>
        </div>
      </MainLayout>
    );
  }

  if (error || !result) {
    return (
      <MainLayout>
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-400 mb-4">{error || 'Результат не найден'}</p>
            <button onClick={() => router.push('/slovolov-pro/editor')} className="btn btn-primary">
              К списку результатов
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="h-full flex flex-col p-4">
        {/* Header */}
        <div className="bg-dark-surface rounded border border-dark-border p-4 mb-4">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold">{result.modelName}</h1>
              <p className="text-xs text-dark-muted mt-1">
                ID: {result.id} | Создан: {new Date(result.createdAt).toLocaleString('ru-RU')}
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={handleCopyUrl} className="btn btn-secondary text-xs">
                Копировать URL
              </button>
              <button onClick={handleDelete} className="btn bg-red-600 hover:bg-red-500 text-white text-xs">
                Удалить
              </button>
            </div>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-5 gap-4 mt-4">
            <div className="text-center p-3 bg-dark-bg rounded">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-xs text-dark-muted">Всего</div>
            </div>
            <div className="text-center p-3 bg-dark-bg rounded">
              <div className="text-2xl font-bold text-orange-400">{stats.high}</div>
              <div className="text-xs text-dark-muted">ВЧ (10000+)</div>
            </div>
            <div className="text-center p-3 bg-dark-bg rounded">
              <div className="text-2xl font-bold text-yellow-400">{stats.medium}</div>
              <div className="text-xs text-dark-muted">СЧ (2000-10000)</div>
            </div>
            <div className="text-center p-3 bg-dark-bg rounded">
              <div className="text-2xl font-bold text-blue-400">{stats.low}</div>
              <div className="text-xs text-dark-muted">НЧ (до 2000)</div>
            </div>
            <div className="text-center p-3 bg-dark-bg rounded">
              <div className="text-2xl font-bold text-green-400">{stats.totalFreq.toLocaleString('ru-RU')}</div>
              <div className="text-xs text-dark-muted">Сумма частот</div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-dark-surface rounded border border-dark-border p-4 mb-4">
          <div className="flex items-center gap-4">
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Поиск запросов..."
              className="input flex-1"
            />
            
            <div className="flex gap-2">
              {(['all', 'high', 'medium', 'low'] as FrequencyCategory[]).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFrequencyFilter(cat)}
                  className={`btn text-xs ${
                    frequencyFilter === cat ? 'btn-primary' : 'btn-secondary'
                  }`}
                >
                  {cat === 'all' && 'Все'}
                  {cat === 'high' && 'ВЧ'}
                  {cat === 'medium' && 'СЧ'}
                  {cat === 'low' && 'НЧ'}
                </button>
              ))}
            </div>
            
            <button 
              onClick={handleCopyAll} 
              className={`btn ${copySuccess ? 'btn-primary' : 'btn-secondary'}`}
            >
              {copySuccess ? 'Скопировано!' : 'Копировать все'}
            </button>
            
            <button onClick={handleExportXLSX} className="btn btn-primary">
              Скачать XLSX
            </button>
          </div>
          
          <div className="text-xs text-dark-muted mt-2">
            Показано: {filteredItems.length} из {result.items.length}
          </div>
        </div>

        {/* Results table */}
        <div className="flex-1 bg-dark-surface rounded border border-dark-border overflow-hidden">
          <div className="h-full overflow-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-dark-surface z-10">
                <tr className="border-b border-dark-border">
                  <th className="text-left px-4 py-3 text-xs font-medium text-dark-muted w-16">#</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-dark-muted">Запрос</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-dark-muted w-32">Частотность</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-dark-muted w-20">Категория</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item, index) => (
                  <tr 
                    key={index} 
                    className="border-b border-dark-border hover:bg-dark-hover transition-colors"
                  >
                    <td className="px-4 py-2 text-xs text-dark-muted">{index + 1}</td>
                    <td className="px-4 py-2 text-sm font-mono">{item.query}</td>
                    <td className={`px-4 py-2 text-sm text-right font-medium ${getFrequencyClass(item.count)}`}>
                      {item.count.toLocaleString('ru-RU')}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span className={`badge ${getFrequencyBadge(item.count)}`}>
                        {item.count >= 10000 ? 'ВЧ' : item.count >= 2000 ? 'СЧ' : 'НЧ'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {filteredItems.length === 0 && (
              <div className="p-8 text-center text-dark-muted">
                {searchText ? 'Ничего не найдено' : 'Нет результатов'}
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
