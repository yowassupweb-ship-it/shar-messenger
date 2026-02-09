'use client';

import { useEffect, useState } from 'react';
import { initPerformanceMonitor } from '@/lib/performance-monitor';

/**
 * 🎯 Performance Debug Panel - UI для мониторинга задержек
 * 
 * Использование:
 * import PerformanceDebug from '@/app/performance-debug'
 * <PerformanceDebug />
 */

interface INPLog {
  type: string;
  target: string;
  duration: number;
  inputDelay: number;
  processingTime: number;
  presentationDelay: number;
  timestamp: string;
}

export default function PerformanceDebug() {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<INPLog[]>([]);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    // ПРИНУДИТЕЛЬНЫЙ ЗАПУСК монитора на клиенте
    console.log('🎯 PerformanceDebug mounted, forcing monitor init...');
    initPerformanceMonitor();
    
    // Интервал обновления каждые 2 секунды
    const interval = setInterval(() => {
      if (typeof window !== 'undefined' && (window as any).perfMonitor) {
        const monitor = (window as any).perfMonitor;
        setLogs(monitor.getLogs());
        setStats(monitor.getStats());
      }
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const clearLogs = () => {
    if (typeof window !== 'undefined' && (window as any).perfMonitor) {
      (window as any).perfMonitor.clearLogs();
      setLogs([]);
      setStats(null);
    }
  };

  const exportLogs = () => {
    if (typeof window !== 'undefined' && (window as any).perfMonitor) {
      (window as any).perfMonitor.export();
    }
  };

  if (process.env.NODE_ENV !== 'development') {
    return null; // Только в dev режиме
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 z-[9999] w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-full shadow-xl flex items-center justify-center text-white font-bold text-lg transition-transform hover:scale-110"
        title="Performance Monitor"
      >
        {logs.length > 0 && (
          <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full text-xs flex items-center justify-center animate-pulse">
            {logs.length}
          </span>
        )}
        ⚡
      </button>

      {/* Debug panel */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 z-[9999] w-[600px] max-h-[600px] bg-gray-900 text-white rounded-xl shadow-2xl border border-gray-700 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <div className="flex items-center gap-2">
              <span className="text-xl">⚡</span>
              <h3 className="font-bold">Performance Monitor</h3>
              <span className="text-xs text-gray-400">&gt;100ms</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={clearLogs}
                className="px-3 py-1 bg-red-500 hover:bg-red-600 rounded text-xs"
              >
                Clear
              </button>
              <button
                onClick={exportLogs}
                className="px-3 py-1 bg-blue-500 hover:bg-blue-600 rounded text-xs"
              >
                Export
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="w-6 h-6 hover:bg-gray-700 rounded flex items-center justify-center"
              >
                ×
              </button>
            </div>
          </div>

          {/* Stats */}
          {stats && stats.total > 0 && (
            <div className="p-3 bg-gray-800 border-b border-gray-700 grid grid-cols-4 gap-2 text-xs">
              <div>
                <div className="text-gray-400">Total</div>
                <div className="font-bold text-lg">{stats.total}</div>
              </div>
              <div>
                <div className="text-gray-400">Average</div>
                <div className="font-bold text-lg text-yellow-400">{stats.average}ms</div>
              </div>
              <div>
                <div className="text-gray-400">Max</div>
                <div className="font-bold text-lg text-red-400">{stats.max}ms</div>
              </div>
              <div>
                <div className="text-gray-400">Min</div>
                <div className="font-bold text-lg text-green-400">{stats.min}ms</div>
              </div>
            </div>
          )}

          {/* Logs */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {logs.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <div className="text-4xl mb-2">✅</div>
                <div>No slow interactions detected</div>
                <div className="text-xs mt-2">Threshold: 100ms</div>
              </div>
            ) : (
              logs.map((log, idx) => (
                <div key={idx} className="bg-gray-800 rounded p-3 border border-gray-700">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="font-mono text-xs text-purple-400">{log.type}</div>
                      <div className="font-mono text-xs text-gray-400 truncate">{log.target}</div>
                    </div>
                    <div className={`font-bold text-lg ${
                      log.duration > 500 ? 'text-red-400' :
                      log.duration > 200 ? 'text-orange-400' :
                      'text-yellow-400'
                    }`}>
                      {log.duration}ms
                    </div>
                  </div>
                  
                  {/* Breakdown */}
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-gray-900 rounded p-2">
                      <div className="text-gray-400">Input Delay</div>
                      <div className="font-bold text-blue-400">{log.inputDelay}ms</div>
                    </div>
                    <div className="bg-gray-900 rounded p-2">
                      <div className="text-gray-400">Processing</div>
                      <div className="font-bold text-yellow-400">{log.processingTime}ms</div>
                    </div>
                    <div className="bg-gray-900 rounded p-2">
                      <div className="text-gray-400">Presentation</div>
                      <div className="font-bold text-green-400">{log.presentationDelay}ms</div>
                    </div>
                  </div>

                  <div className="mt-2 text-xs text-gray-500">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2 border-t border-gray-700 text-xs text-gray-400 text-center">
            Console: <code className="bg-gray-800 px-1 rounded">window.perfMonitor</code>
          </div>
        </div>
      )}
    </>
  );
}
