import { MessageCircle } from 'lucide-react';

interface EmptyStateProps {
  type: 'no-chat' | 'no-messages' | 'loading';
  isLoading?: boolean;
  messageCount?: number;
  userCount?: number;
}

export default function EmptyState({ type, isLoading, messageCount, userCount }: EmptyStateProps) {
  if (type === 'no-chat') {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <MessageCircle className="w-20 h-20 mx-auto text-gray-300 dark:text-gray-600 opacity-40 mb-4" />
          <p className="text-gray-900 dark:text-gray-100 font-medium">Выберите чат</p>
        </div>
      </div>
    );
  }

  if (type === 'no-messages' || type === 'loading') {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-500 dark:text-gray-400">
            {isLoading ? 'Загрузка...' : 'Нет сообщений'}
          </div>

        </div>
      </div>
    );
  }

  return null;
}
