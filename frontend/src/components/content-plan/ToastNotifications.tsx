'use client';

import React from 'react';
import { Check, X, MessageCircle, ExternalLink } from 'lucide-react';
import type { Toast, ContentPost } from '@/types/contentPlan';

interface ToastNotificationsProps {
  toasts: Toast[];
  posts: ContentPost[];
  onRemove: (toastId: string) => void;
  onClearAll: () => void;
  onOpenPost: (post: ContentPost) => void;
}

export default function ToastNotifications({
  toasts,
  posts,
  onRemove,
  onClearAll,
  onOpenPost
}: ToastNotificationsProps) {
  if (toasts.length === 0) return null;

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
            <div className={`relative flex-shrink-0 ${
              toast.type === 'success' ? 'text-green-400' :
              toast.type === 'warning' ? 'text-orange-400' :
              toast.type === 'error' ? 'text-red-400' :
              'text-blue-400'
            }`}>
              {toast.type === 'success' ? <Check className="w-4 h-4" /> :
               toast.type === 'warning' ? <Check className="w-4 h-4" /> :
               toast.type === 'error' ? <X className="w-4 h-4" /> :
               <MessageCircle className="w-4 h-4" />}
            </div>
            
            <div className="flex-1 min-w-0">
              <span className="text-xs font-medium text-gray-900 dark:text-white truncate block">{toast.title}</span>
              <div className="text-[10px] text-gray-500 dark:text-white/60 truncate">{toast.message}</div>
            </div>

            {toast.postId && (
              <button
                onClick={() => {
                  const post = posts.find(p => p.id === toast.postId);
                  if (post) {
                    onOpenPost(post);
                    onRemove(toast.id);
                  }
                }}
                className={`p-1.5 rounded-lg transition-all flex-shrink-0 ${
                  toast.type === 'success' ? 'hover:bg-green-500/20 text-green-400' :
                  toast.type === 'warning' ? 'hover:bg-orange-500/20 text-orange-400' :
                  toast.type === 'error' ? 'hover:bg-red-500/20 text-red-400' :
                  'hover:bg-blue-500/20 text-blue-400'
                }`}
                title="Открыть пост"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
            
            <button
              onClick={() => onRemove(toast.id)}
              className="text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/60 p-1 rounded transition-all flex-shrink-0"
              title="Закрыть"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ))}
      
      {toasts.length > 1 && (
        <button
          onClick={onClearAll}
          className="pointer-events-auto text-[10px] text-gray-400 dark:text-white/40 hover:text-gray-600 dark:hover:text-white/70 transition-colors self-end px-2 py-1"
        >
          Очистить все ({toasts.length})
        </button>
      )}
    </div>
  );
}
