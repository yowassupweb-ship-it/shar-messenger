import { Reply } from 'lucide-react';
import type { Message } from './types';

interface QuoteProps {
  replyMessage: Message | null;
  onJumpToMessage?: (messageId: string) => void;
  isIncoming?: boolean;
}

export default function Quote({ replyMessage, onJumpToMessage, isIncoming = false }: QuoteProps) {
  if (!replyMessage) return null;

  const handleClick = () => {
    if (onJumpToMessage && replyMessage.id) {
      onJumpToMessage(replyMessage.id);
    }
  };

  // Извлекаем превью изображения если есть
  const imageAttachment = replyMessage.attachments?.find((att: any) => 
    att.type === 'image' || (att.contentType && att.contentType.startsWith('image/'))
  );

  const imageUrl = imageAttachment?.url || imageAttachment?.preview;

  // Или ищем URL изображения в тексте
  const textImageUrl = (() => {
    if (imageUrl) return imageUrl;
    const urls = String(replyMessage.content || '').match(/(https?:\/\/[^\s<>"']+)/gi) || [];
    const imgPattern = /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|tiff?)(\?|$|#)/i;
    return urls.find(url => imgPattern.test(url)) || '';
  })();

  const contentPreview = (() => {
    const text = String(replyMessage.content || '').trim();
    if (textImageUrl) return 'Фото';
    if (replyMessage.attachments && replyMessage.attachments.length > 0) {
      return `📎 ${replyMessage.attachments.length} файл${replyMessage.attachments.length > 1 ? 'ов' : ''}`;
    }
    return text.slice(0, 100);
  })();

  return (
    <button
      onClick={handleClick}
      className={`w-full text-left mb-1.5 px-2 py-1.5 rounded-md border-l-[3px] transition-all ${
        isIncoming
          ? 'border-blue-500 dark:border-blue-400 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10'
          : 'border-white/70 bg-white/10 hover:bg-white/15'
      } ${onJumpToMessage ? 'cursor-pointer' : 'cursor-default'}`}
      type="button"
      disabled={!onJumpToMessage}
    >
      <div className="flex items-start gap-2">
        {textImageUrl && (
          <div className="flex-shrink-0 w-9 h-9 rounded overflow-hidden bg-gray-200 dark:bg-slate-700">
            <img 
              src={textImageUrl} 
              alt="" 
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div 
            className={`text-[11px] font-semibold mb-0.5 flex items-center gap-1 ${
              isIncoming ? 'text-blue-600 dark:text-blue-400' : 'text-white/95'
            }`}
            style={{
              letterSpacing: '-0.03px',
            }}
          >
            <Reply className="w-3 h-3" />
            {replyMessage.authorName || 'Неизвестный'}
          </div>
          <div 
            className={`text-[11px] truncate ${
              isIncoming ? 'text-gray-700 dark:text-gray-300' : 'text-white/80'
            }`}
            style={{
              letterSpacing: '-0.02px',
              opacity: 0.9,
            }}
          >
            {contentPreview}
          </div>
        </div>
      </div>
    </button>
  );
}
