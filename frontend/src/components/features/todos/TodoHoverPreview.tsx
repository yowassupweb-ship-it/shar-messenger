import React from 'react';
import { UserCheck, Clock, Link2, ExternalLink } from 'lucide-react';
import { Todo, Person } from '@/types/todos';

interface TodoHoverPreviewProps {
  todo: Todo | null;
  position: { x: number; y: number };
  windowWidth: number;
  people: Person[];
  onMouseLeave: () => void;
  getPersonNameById: (people: Person[], id?: string, fallback?: string) => string;
}

export default function TodoHoverPreview({
  todo,
  position,
  windowWidth,
  people,
  onMouseLeave,
  getPersonNameById
}: TodoHoverPreviewProps) {
  if (!todo || (!todo.description && !todo.reviewComment)) {
    return null;
  }

  return (
    <div 
      className="hidden md:block fixed z-[100] bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-[var(--border-light)] rounded-xl shadow-2xl p-4 max-w-sm animate-in fade-in duration-200 text-gray-900 dark:text-white"
      style={{ 
        left: Math.min(position.x, windowWidth - 350),
        top: Math.min(position.y, typeof window !== 'undefined' ? window.innerHeight - 200 : 600),
      }}
      onMouseEnter={() => {}}
      onMouseLeave={onMouseLeave}
    >
      <div className="flex items-start gap-2 mb-2">
        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
          todo.priority === 'high' ? 'bg-red-500' : 
          todo.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
        }`} />
        <h4 className="font-medium text-sm">{todo.title}</h4>
      </div>
      
      {todo.description && (
        <div className="mb-3">
          <p className="text-xs text-gray-500 dark:text-[var(--text-muted)] mb-1">Описание:</p>
          <div 
            className="text-sm text-gray-700 dark:text-[var(--text-secondary)] prose dark:prose-invert prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: todo.description }}
          />
        </div>
      )}
      
      {todo.reviewComment && (
        <div className="pt-2 border-t border-gray-200 dark:border-[var(--border-color)]">
          <p className="text-xs text-purple-500 dark:text-purple-400/60 mb-1">Комментарий руководителя:</p>
          <p className="text-sm text-purple-600 dark:text-purple-300/80 whitespace-pre-wrap">{todo.reviewComment}</p>
        </div>
      )}
      
      {todo.linkId && todo.linkUrl && (
        <div className="pt-2 border-t border-gray-200 dark:border-[var(--border-color)]">
          <p className="text-xs text-blue-500 dark:text-blue-400/60 mb-1">Прикреплённая ссылка:</p>
          <a
            href={todo.linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300"
          >
            <Link2 className="w-3.5 h-3.5" />
            <span className="truncate">{todo.linkTitle || todo.linkUrl}</span>
            <ExternalLink className="w-3 h-3 flex-shrink-0" />
          </a>
        </div>
      )}
      
      {(todo.assignedToId || todo.dueDate) && (
        <div className="flex items-center gap-3 mt-3 pt-2 border-t border-gray-200 dark:border-[var(--border-color)] text-xs text-gray-500 dark:text-white/50">
          {todo.assignedToId && (
            <span className="flex items-center gap-1">
              <UserCheck className="w-3 h-3" />
              {getPersonNameById(people, todo.assignedToId, todo.assignedTo)}
            </span>
          )}
          {todo.dueDate && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(todo.dueDate).toLocaleDateString('ru-RU')}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
