'use client';

import { Check, Bell, X, MessageCircle, ExternalLink } from 'lucide-react';

interface Toast {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  todoId?: string;
  createdAt: number;
  groupKey?: string;
  count?: number;
}

interface TodoNotificationsProps {
  toasts: Toast[];
  removeToast: (id: string) => void;
  setToasts: (toasts: Toast[]) => void;
  openTodoModalWithFreshData: (todoId: string) => void;
}

export default function TodoNotifications({
  toasts,
  removeToast,
  setToasts,
  openTodoModalWithFreshData,
}: TodoNotificationsProps) {
  return (
    <div className="fixed top-20 right-6 z-[100] flex flex-col gap-2 pointer-events-none max-h-[calc(100vh-120px)] overflow-hidden">
      {toasts.slice(0, 5).map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto animate-slide-in-right"
        >
          <div className={`
            flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-xl min-w-[280px] max-w-[360px]
            bg-gradient-to-r ${
              toast.type === 'success' ? 'from-green-500/20 to-green-500/5 border-green-500/30' :
              toast.type === 'warning' ? 'from-orange-500/20 to-orange-500/5 border-orange-500/30' :
              toast.type === 'error' ? 'from-red-500/20 to-red-500/5 border-red-500/30' :
              'from-blue-500/20 to-blue-500/5 border-blue-500/30'
            } border
          `}>
            {/* Иконка */}
            <div className={`relative flex-shrink-0 ${
              toast.type === 'success' ? 'text-green-400' :
              toast.type === 'warning' ? 'text-orange-400' :
              toast.type === 'error' ? 'text-red-400' :
              'text-blue-400'
            }`}>
              {toast.type === 'success' ? <Check className="w-4 h-4 relative" /> :
               toast.type === 'warning' ? <Bell className="w-4 h-4 relative" /> :
               toast.type === 'error' ? <X className="w-4 h-4 relative" /> :
               <MessageCircle className="w-4 h-4 relative" />}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-[var(--text-primary)] truncate">{toast.title}</span>
                {toast.count && toast.count > 1 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                    toast.type === 'success' ? 'bg-green-500/30 text-green-300' :
                    toast.type === 'warning' ? 'bg-orange-500/30 text-orange-300' :
                    toast.type === 'error' ? 'bg-red-500/30 text-red-300' :
                    'bg-blue-500/30 text-blue-300'
                  }`}>
                    +{toast.count}
                  </span>
                )}
              </div>
              <div className="text-[10px] text-[var(--text-secondary)] truncate">{toast.message}</div>
            </div>

            {toast.todoId && (
              <button
                onClick={() => {
                  openTodoModalWithFreshData(toast.todoId!);
                  removeToast(toast.id);
                }}
                className={`p-1.5 rounded-lg transition-all flex-shrink-0 ${
                  toast.type === 'success' ? 'hover:bg-green-500/20 text-green-400' :
                  toast.type === 'warning' ? 'hover:bg-orange-500/20 text-orange-400' :
                  toast.type === 'error' ? 'hover:bg-red-500/20 text-red-400' :
                  'hover:bg-blue-500/20 text-blue-400'
                }`}
                title="Открыть задачу"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
            
            <button
              onClick={() => removeToast(toast.id)}
              className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] p-1 rounded transition-all flex-shrink-0"
              title="Закрыть"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ))}
      
      {/* Кнопка очистки всех */}
      {toasts.length > 1 && (
        <button
          onClick={() => setToasts([])}
          className="pointer-events-auto text-[10px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors self-end px-2 py-1"
        >
          Очистить все ({toasts.length})
        </button>
      )}
    </div>
  );
}
