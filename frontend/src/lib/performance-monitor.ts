/**
 * 🚀 Performance Monitor - отлов задержек UI > 100ms
 * 
 * Отслеживает:
 * - Long Tasks (> 50ms)
 * - Event Timing (keyboard, pointer)
 * - Interaction to Next Paint (INP)
 */

interface PerformanceEntry {
  name: string;
  entryType: string;
  startTime: number;
  duration: number;
  processingStart?: number;
  processingEnd?: number;
  target?: string;
}

interface INPReport {
  type: string;
  target: string;
  duration: number;
  inputDelay: number;
  processingTime: number;
  presentationDelay: number;
  timestamp: string;
  stackTrace?: string;
}

class PerformanceMonitor {
  private threshold = 100; // ms
  private logs: INPReport[] = [];
  private maxLogs = 50;
  private isEnabled = false;
  
  constructor() {
    if (typeof window === 'undefined') return;
    
    // Автозапуск только в dev mode
    if (process.env.NODE_ENV === 'development') {
      this.start();
    }
  }

  start() {
    if (this.isEnabled) return;
    this.isEnabled = true;
    
    console.log('🚀 Performance Monitor started (threshold: ' + this.threshold + 'ms)');
    
    this.observeLongTasks();
    this.observeEventTiming();
    this.observeLayoutShifts();
    this.addManualListeners(); // Запасной механизм
    
    // Глобальные методы для отладки
    (window as any).perfMonitor = {
      getLogs: () => this.logs,
      clearLogs: () => { this.logs = []; console.log('Logs cleared'); },
      setThreshold: (ms: number) => { this.threshold = ms; console.log('Threshold set to', ms, 'ms'); },
      getStats: () => this.getStats(),
      export: () => this.exportLogs()
    };
  }

  stop() {
    this.isEnabled = false;
    console.log('⏹️ Performance Monitor stopped');
  }

  private observeLongTasks() {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const task = entry as any;
          if (task.duration > 50) {
            console.warn(`⚠️ Long Task detected: ${task.duration.toFixed(2)}ms`, {
              name: task.name,
              startTime: task.startTime.toFixed(2),
              attribution: task.attribution
            });
          }
        }
      });

      observer.observe({ entryTypes: ['longtask'] });
    } catch (e) {
      // longtask not supported, skip
    }
  }

  private observeEventTiming() {
    if (!('PerformanceObserver' in window)) {
      console.warn('❌ PerformanceObserver not supported');
      return;
    }

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        console.log(`📊 Got ${entries.length} performance entries`);
        
        for (const entry of entries) {
          const event = entry as any;
          
          // Интересующие типы событий
          const interactionTypes = ['keydown', 'keyup', 'keypress', 'input', 
                                    'pointerdown', 'pointerup', 'click', 'mousedown', 'mouseup'];
          
          if (!interactionTypes.includes(event.name)) {
            console.log(`⏭️ Skipping event: ${event.name}`);
            continue;
          }

          const duration = event.duration || 0;
          
          // Логируем ВСЕ keyboard события для отладки
          if (event.name.startsWith('key') || event.name === 'input') {
            console.log(`⌨️ [${event.name}] ${duration.toFixed(0)}ms →`, this.getTargetInfo(event.target));
          }
          
          // Логируем pointer события
          if (event.name.startsWith('pointer') || event.name.startsWith('click')) {
            console.log(`🖱️ [${event.name}] ${duration.toFixed(0)}ms →`, this.getTargetInfo(event.target));
          }
          
          if (duration > this.threshold) {
            const inputDelay = (event.processingStart || event.startTime) - event.startTime;
            const processingTime = (event.processingEnd || event.startTime) - (event.processingStart || event.startTime);
            const presentationDelay = duration - inputDelay - processingTime;

            const report: INPReport = {
              type: event.name,
              target: this.getTargetInfo(event.target),
              duration: Math.round(duration),
              inputDelay: Math.round(inputDelay),
              processingTime: Math.round(processingTime),
              presentationDelay: Math.round(presentationDelay),
              timestamp: new Date().toISOString(),
              stackTrace: this.captureStackTrace()
            };

            this.addLog(report);

            console.error(`🔴 SLOW INTERACTION (${duration.toFixed(0)}ms):`, {
              type: event.name,
              target: report.target,
              breakdown: {
                '1️⃣ Input Delay': inputDelay.toFixed(2) + 'ms',
                '2️⃣ Processing': processingTime.toFixed(2) + 'ms',
                '3️⃣ Presentation': presentationDelay.toFixed(2) + 'ms',
                'Total': duration.toFixed(2) + 'ms'
              },
              element: event.target,
              timestamp: report.timestamp
            });
          }
        }
      });

      // Пробуем новый синтаксис (Chrome 96+)
      try {
        observer.observe({ 
          type: 'event',
          buffered: true,
          durationThreshold: 0 // Ловим все события, фильтрация в коде
        } as any);
        console.log('✅ Event Timing observer started (new syntax)');
      } catch (e1) {
        // Fallback на старый синтаксис
        try {
          observer.observe({ 
            entryTypes: ['event'],
            buffered: true
          });
          console.log('✅ Event Timing observer started (legacy syntax)');
        } catch (e2) {
          console.warn('❌ Event Timing API not supported:', e2);
        }
      }
    } catch (e) {
      console.error('❌ Failed to create PerformanceObserver:', e);
    }
  }

  private observeLayoutShifts() {
    if (!('PerformanceObserver' in window)) return;

    try {
      let cls = 0;
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const shift = entry as any;
          if (!shift.hadRecentInput) {
            cls += shift.value;
            if (shift.value > 0.1) {
              console.warn(`⚠️ Layout Shift: ${shift.value.toFixed(4)}`, {
                sources: shift.sources,
                cumulative: cls.toFixed(4)
              });
            }
          }
        }
      });

      observer.observe({ entryTypes: ['layout-shift'] });
    } catch (e) {
      // Layout shift not supported
    }
  }

  // 🔧 Запасной механизм - ручные listeners (работает везде)
  private addManualListeners() {
    console.log('🔧 Adding manual event listeners as fallback');
    
    const eventStartTimes = new Map<string, number>();
    
    // Захватываем начало события
    const captureStart = (e: Event) => {
      const key = `${e.type}-${Date.now()}`;
      eventStartTimes.set(key, performance.now());
      
      // Очищаем старые записи (>5 секунд)
      const now = Date.now();
      for (const [k, v] of eventStartTimes.entries()) {
        if (now - parseInt(k.split('-')[1]) > 5000) {
          eventStartTimes.delete(k);
        }
      }
    };
    
    // Измеряем длительность после обработки
    const measureEnd = (e: Event, startTime: number) => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      const target = e.target as HTMLElement;
      
      // Логируем все keyboard/input события
      if (e.type.startsWith('key') || e.type === 'input') {
        console.log(`⌨️ [MANUAL ${e.type}] ${duration.toFixed(0)}ms →`, this.getTargetInfo(target));
      }
      
      if (duration > this.threshold) {
        // Упрощенный отчет (без разбивки на фазы, т.к. это fallback)
        const report: INPReport = {
          type: `${e.type} (manual)`,
          target: this.getTargetInfo(target),
          duration: Math.round(duration),
          inputDelay: 0, // Не можем измерить точно
          processingTime: Math.round(duration),
          presentationDelay: 0,
          timestamp: new Date().toISOString(),
          stackTrace: this.captureStackTrace()
        };
        
        this.addLog(report);
        
        console.error(`🔴 SLOW INTERACTION [MANUAL] (${duration.toFixed(0)}ms):`, {
          type: e.type,
          target: report.target,
          duration: duration.toFixed(2) + 'ms',
          element: target,
          timestamp: report.timestamp
        });
      }
    };
    
    // Слушаем keyboard события
    ['keydown', 'keyup', 'input'].forEach(eventType => {
      window.addEventListener(eventType, (e) => {
        const startTime = performance.now();
        captureStart(e);
        
        // Измеряем в следующем тике (после обработки React)
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            measureEnd(e, startTime);
          });
        });
      }, { capture: true, passive: true });
    });
    
    // Слушаем pointer события
    ['click', 'pointerdown', 'pointerup'].forEach(eventType => {
      window.addEventListener(eventType, (e) => {
        const startTime = performance.now();
        captureStart(e);
        
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            measureEnd(e, startTime);
          });
        });
      }, { capture: true, passive: true });
    });
    
    console.log('✅ Manual listeners installed (keyboard + pointer)');
  }

  private getTargetInfo(target: any): string {
    if (!target) return 'unknown';
    
    const tagName = target.tagName?.toLowerCase() || '';
    const id = target.id ? `#${target.id}` : '';
    const className = target.className && typeof target.className === 'string' 
      ? `.${target.className.split(' ').slice(0, 3).join('.')}` 
      : '';
    
    return `${tagName}${id}${className}`.slice(0, 100);
  }

  private captureStackTrace(): string {
    try {
      const err = new Error();
      const stack = err.stack || '';
      const lines = stack.split('\n').slice(2, 6); // Skip first 2 lines
      return lines.join('\n');
    } catch {
      return 'Stack trace unavailable';
    }
  }

  private addLog(report: INPReport) {
    this.logs.unshift(report);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }
  }

  private getStats() {
    if (this.logs.length === 0) {
      return { message: 'No slow interactions recorded' };
    }

    const durations = this.logs.map(l => l.duration);
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    const max = Math.max(...durations);
    const min = Math.min(...durations);

    const byTarget = this.logs.reduce((acc, log) => {
      acc[log.target] = (acc[log.target] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topTargets = Object.entries(byTarget)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return {
      total: this.logs.length,
      average: Math.round(avg),
      max,
      min,
      topSlowTargets: topTargets.map(([target, count]) => ({ target, count }))
    };
  }

  private exportLogs() {
    const data = JSON.stringify({
      threshold: this.threshold,
      stats: this.getStats(),
      logs: this.logs
    }, null, 2);

    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    console.log('📥 Performance report exported');
  }
}

// Singleton instance
let monitorInstance: PerformanceMonitor | null = null;

export function initPerformanceMonitor() {
  if (typeof window === 'undefined') {
    console.log('⏭️ Skip monitor init (SSR)');
    return;
  }
  
  console.log('🔍 Checking environment for Performance Monitor...');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('hostname:', window.location.hostname);
  console.log('Next.js dev mode:', process.env.NEXT_PUBLIC_DEV_MODE);
  
  if (!monitorInstance) {
    console.log('📦 Creating new PerformanceMonitor instance...');
    monitorInstance = new PerformanceMonitor();
  } else {
    console.log('♻️ Using existing PerformanceMonitor instance');
  }
  
  return monitorInstance;
}

// Auto-init в dev окружении
if (typeof window !== 'undefined') {
  const isDev = process.env.NODE_ENV === 'development' || 
                window.location.hostname === 'localhost' ||
                window.location.hostname === '127.0.0.1';
  
  console.log('🎯 Performance Monitor auto-init check:');
  console.log('  - isDev:', isDev);
  console.log('  - NODE_ENV:', process.env.NODE_ENV);
  console.log('  - hostname:', window.location.hostname);
  
  if (isDev) {
    console.log('✨ Starting Performance Monitor...');
    initPerformanceMonitor();
  } else {
    console.log('⏭️ Skipping Performance Monitor (production mode)');
  }
}

export default PerformanceMonitor;
