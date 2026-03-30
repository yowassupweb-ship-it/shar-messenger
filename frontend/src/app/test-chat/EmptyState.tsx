import { Inbox, MessageCircle, SearchX, Loader2 } from 'lucide-react';

interface EmptyStateProps {
  type: 'no-chat' | 'no-messages' | 'loading';
  isLoading?: boolean;
  messageCount?: number;
  userCount?: number;
}

export default function EmptyState({ type, isLoading }: EmptyStateProps) {
  const renderPageSkeleton = () => (
    <div className="h-full w-full px-4 md:px-6 py-4 md:py-5 animate-pulse">
      <div className="h-11 rounded-2xl bg-gray-300/55 dark:bg-slate-700/65 mb-4" />
      <div className="space-y-3">
        <div className="h-16 rounded-2xl bg-gray-300/50 dark:bg-slate-700/60" />
        <div className="h-16 rounded-2xl bg-gray-300/45 dark:bg-slate-700/55" />
        <div className="h-16 rounded-2xl bg-gray-300/40 dark:bg-slate-700/50" />
      </div>
      <div className="mt-4 flex items-center justify-center gap-2">
        <Loader2 className="w-4 h-4 text-blue-500 animate-spin" strokeWidth={2} />
        <span className="text-xs text-gray-600 dark:text-gray-300">Загрузка...</span>
      </div>
    </div>
  );

  if (type === 'no-chat') {
    if (isLoading) {
      return renderPageSkeleton();
    }

    return (
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <div className="mx-auto mb-4 w-20 h-20 rounded-3xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-slate-800/60 flex items-center justify-center shadow-sm">
            <MessageCircle className="w-10 h-10 text-gray-400 dark:text-gray-500" strokeWidth={1.8} />
          </div>
          <p className="text-gray-900 dark:text-gray-100 font-semibold text-base">Выберите чат</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Слева список диалогов, нажмите на любой, чтобы открыть переписку</p>
        </div>
      </div>
    );
  }

  if (type === 'no-messages' || type === 'loading') {
    if (isLoading) {
      return renderPageSkeleton();
    }

    return (
      <div className="h-full flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <div className="relative mx-auto mb-4 w-20 h-20 rounded-3xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-slate-800/60 flex items-center justify-center shadow-sm">
            <Inbox className="w-9 h-9 text-gray-400 dark:text-gray-500" strokeWidth={1.8} />
            <SearchX className="w-4 h-4 text-gray-500 dark:text-gray-400 absolute -bottom-1 -right-1" strokeWidth={2} />
          </div>
          <div className="text-gray-900 dark:text-gray-100 font-semibold">Нет сообщений</div>
          <div className="text-gray-500 dark:text-gray-400 text-sm mt-1">Напишите первое сообщение, чтобы начать диалог</div>
          </div>
        </div>
    );
  }

  return null;
}
