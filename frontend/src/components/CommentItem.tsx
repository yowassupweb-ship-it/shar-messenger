import React, { memo } from 'react';
import { Reply, Edit3, Trash2 } from 'lucide-react';

interface CommentItemProps {
  comment: any;
  isOwn: boolean;
  onReply: (comment: any) => void;
  onEdit?: (comment: any) => void;
  onDelete?: (commentId: string) => void;
  personName?: string;
}

const CommentItem = memo(({ 
  comment, 
  isOwn, 
  onReply,
  onEdit,
  onDelete,
  personName 
}: CommentItemProps) => {
  // Функция для обработки ссылок и @mentions
  const renderContent = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const mentionRegex = /(@\w+)/g;
    
    let content = text;
    
    // Обрабатываем ссылки
    content = content.replace(urlRegex, (url) => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:underline">${url}</a>`;
    });
    
    // Обрабатываем @mentions
    content = content.replace(mentionRegex, (mention) => {
      return `<span class="text-blue-500 font-medium">${mention}</span>`;
    });
    
    return content;
  };

  return (
    <div 
      className={`
        flex ${isOwn ? 'justify-end' : 'justify-start'} group
      `}
      style={{ maxWidth: '90%', alignSelf: isOwn ? 'flex-end' : 'flex-start' }}
    >
      <div
        className={`
          rounded-2xl px-3 py-2.5 backdrop-blur-xl border shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)]
          ${isOwn 
            ? 'bg-gradient-to-br from-blue-500/20 to-blue-600/15 border-blue-500/30 rounded-br-md' 
            : 'bg-gradient-to-br from-white/10 to-white/5 border-white/20 rounded-bl-md'
          }
        `}
        style={{ transform: 'translateZ(0)' }}
      >
        <div className="flex items-center justify-between mb-1">
          <span className={`text-[10px] font-medium ${isOwn ? 'text-blue-500 dark:text-blue-300' : 'text-blue-600 dark:text-blue-400'}`}>
            {personName || comment.authorName || 'Неизвестный'}
          </span>
        </div>
        
        <div 
          className="text-xs text-gray-900 dark:text-white/90 mb-1.5 break-words whitespace-pre-wrap"
          dangerouslySetInnerHTML={{ __html: renderContent(comment.content) }}
        />
        
        <div className="flex items-center justify-between gap-2">
          <span className="text-[9px] text-gray-500 dark:text-white/40">
            {new Date(comment.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
          </span>
          
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onReply(comment)}
              className="p-1 hover:bg-white/10 rounded transition-colors"
              title="Ответить"
            >
              <Reply className="w-3 h-3 text-gray-400 dark:text-white/50" />
            </button>
            
            {isOwn && onEdit && (
              <button
                onClick={() => onEdit(comment)}
                className="p-1 hover:bg-white/10 rounded transition-colors"
                title="Редактировать"
              >
                <Edit3 className="w-3 h-3 text-gray-400 dark:text-white/50" />
              </button>
            )}
            
            {isOwn && onDelete && (
              <button
                onClick={() => onDelete(comment.id)}
                className="p-1 hover:bg-red-500/20 rounded transition-colors"
                title="Удалить"
              >
                <Trash2 className="w-3 h-3 text-red-400" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.comment.id === nextProps.comment.id &&
    prevProps.comment.content === nextProps.comment.content &&
    prevProps.isOwn === nextProps.isOwn &&
    prevProps.personName === nextProps.personName
  );
});

CommentItem.displayName = 'CommentItem';

export default CommentItem;
