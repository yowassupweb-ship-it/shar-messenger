import React, { memo } from 'react';
import { CheckSquare, Calendar, User, Flag, MessageCircle } from 'lucide-react';

interface TaskCardProps {
  todo: any;
  isSelected: boolean;
  onClick: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  categoryColor?: string;
  executorName?: string;
  commentsCount?: number;
  formattedDeadline?: string;
}

const TaskCard = memo(({ 
  todo, 
  isSelected, 
  onClick, 
  onDragStart,
  onDragOver,
  onDrop,
  categoryColor,
  executorName,
  commentsCount,
  formattedDeadline
}: TaskCardProps) => {
  const priorityColors = {
    low: 'border-l-green-400 dark:border-l-green-500',
    medium: 'border-l-yellow-400 dark:border-l-yellow-500',
    high: 'border-l-orange-400 dark:border-l-orange-500',
    urgent: 'border-l-red-500 dark:border-l-red-600'
  };

  return (
    <div
      onClick={onClick}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      draggable
      className={`
        group bg-white dark:bg-[var(--bg-tertiary)] border border-gray-300 dark:border-[var(--border-color)] 
        rounded-xl p-3 md:cursor-grab md:active:cursor-grabbing transition-all duration-200 
        hover:shadow-lg hover:border-gray-400 dark:hover:border-[var(--border-light)] 
        border-l-4 ${priorityColors[todo.priority as keyof typeof priorityColors] || priorityColors.medium} 
        ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-[var(--bg-primary)]' : ''} 
        shadow-md flex flex-col gap-2 will-change-transform
      `}
      style={{ transform: 'translateZ(0)' }}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-medium text-sm text-gray-900 dark:text-white line-clamp-2 flex-1">
          {todo.title}
        </h3>
        {todo.status === 'review' && (
          <CheckSquare className="w-4 h-4 text-green-500 flex-shrink-0" />
        )}
      </div>

      {todo.description && (
        <div 
          className="text-[10px] text-gray-600 dark:text-white/60 line-clamp-3 pointer-events-auto cursor-pointer"
          dangerouslySetInnerHTML={{ __html: todo.description }}
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
        />
      )}

      <div className="flex items-center gap-2 flex-wrap pt-1 pointer-events-auto">
        {categoryColor && (
          <span 
            className="px-1.5 py-0.5 rounded text-[9px] font-medium"
            style={{ 
              backgroundColor: `${categoryColor}20`,
              color: categoryColor,
              border: `1px solid ${categoryColor}40`
            }}
          >
            {todo.category}
          </span>
        )}

        {executorName && (
          <div className="flex items-center gap-1 text-[9px] text-gray-600 dark:text-white/50">
            <User className="w-2.5 h-2.5" />
            {executorName}
          </div>
        )}

        {formattedDeadline && (
          <div className="flex items-center gap-1 text-[9px] text-gray-600 dark:text-white/50">
            <Calendar className="w-2.5 h-2.5" />
            {formattedDeadline}
          </div>
        )}

        {commentsCount !== undefined && commentsCount > 0 && (
          <div className="flex items-center gap-1 text-[9px] text-blue-600 dark:text-blue-400">
            <MessageCircle className="w-2.5 h-2.5" />
            {commentsCount}
          </div>
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for better performance
  return (
    prevProps.todo.id === nextProps.todo.id &&
    prevProps.todo.title === nextProps.todo.title &&
    prevProps.todo.description === nextProps.todo.description &&
    prevProps.todo.status === nextProps.todo.status &&
    prevProps.todo.priority === nextProps.todo.priority &&
    prevProps.todo.category === nextProps.todo.category &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.executorName === nextProps.executorName &&
    prevProps.commentsCount === nextProps.commentsCount &&
    prevProps.formattedDeadline === nextProps.formattedDeadline
  );
});

TaskCard.displayName = 'TaskCard';

export default TaskCard;
