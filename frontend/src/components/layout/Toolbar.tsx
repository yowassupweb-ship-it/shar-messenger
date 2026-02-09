'use client';

import { useStore } from '@/store/store';

interface ToolbarProps {
  activeTab: 'queries' | 'filters' | 'models';
}

export default function Toolbar({ activeTab }: ToolbarProps) {
  const { queries, filters, isLoading, loadData } = useStore();

  const handleExport = () => {
    if (activeTab === 'queries') {
      const text = queries.map((q) => q.text).join('\n');
      downloadFile('queries.txt', text);
    } else if (activeTab === 'filters') {
      const text = filters.map((f) => `=== ${f.name} ===\n${f.items.join('\n')}`).join('\n\n');
      downloadFile('filters.txt', text);
    }
  };

  const downloadFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const text = await file.text();
      console.log('Imported:', text);
      // TODO: Parse and add to store
    };
    input.click();
  };

  return (
    <div className="h-10 bg-dark-surface border-b border-dark-border flex items-center px-4 gap-2">
      <button
        onClick={() => loadData()}
        disabled={isLoading}
        className="px-3 py-1 bg-dark-hover text-dark-text rounded text-sm hover:bg-dark-border disabled:opacity-50"
      >
        {isLoading ? 'Загрузка...' : 'Обновить'}
      </button>
      
      <div className="w-px h-5 bg-dark-border mx-2" />
      
      <button
        onClick={handleImport}
        className="px-3 py-1 bg-dark-hover text-dark-text rounded text-sm hover:bg-dark-border"
      >
        Импорт
      </button>
      
      <button
        onClick={handleExport}
        className="px-3 py-1 bg-dark-hover text-dark-text rounded text-sm hover:bg-dark-border"
      >
        Экспорт
      </button>

      <div className="flex-1" />

      {activeTab === 'queries' && (
        <span className="text-xs text-dark-muted">
          Всего запросов: {queries.length}
        </span>
      )}
      
      {activeTab === 'filters' && (
        <span className="text-xs text-dark-muted">
          Всего фильтров: {filters.length}
        </span>
      )}
    </div>
  );
}
