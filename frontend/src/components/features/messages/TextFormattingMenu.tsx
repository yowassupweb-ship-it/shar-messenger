import { Link as LinkIcon } from 'lucide-react';

interface TextFormattingMenuProps {
  showTextFormatMenu: boolean;
  formatMenuPosition: { top: number; left: number };
  setShowTextFormatMenu: (show: boolean) => void;
  applyFormatting: (format: 'bold' | 'italic' | 'underline' | 'link') => void;
}

export default function TextFormattingMenu({
  showTextFormatMenu,
  formatMenuPosition,
  setShowTextFormatMenu,
  applyFormatting,
}: TextFormattingMenuProps) {
  if (!showTextFormatMenu) return null;

  return (
    <>
      <div 
        className="fixed inset-0 z-40" 
        onClick={() => setShowTextFormatMenu(false)}
      />
      <div 
        className="fixed z-50 flex items-center gap-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-2xl p-1"
        style={{
          top: `${formatMenuPosition.top}px`,
          left: `${formatMenuPosition.left}px`,
          transform: 'translateX(-50%)',
          borderRadius: '35px'
        }}
      >
        <button
          onClick={() => applyFormatting('bold')}
          className="w-8 h-8 flex items-center justify-center hover:bg-[var(--bg-tertiary)] transition-colors"
          style={{ borderRadius: '20px' }}
          title="Жирный (** **)"
        >
          <span className="font-bold text-sm">B</span>
        </button>
        <button
          onClick={() => applyFormatting('italic')}
          className="w-8 h-8 flex items-center justify-center hover:bg-[var(--bg-tertiary)] transition-colors"
          style={{ borderRadius: '20px' }}
          title="Курсив (* *)"
        >
          <span className="italic text-sm">I</span>
        </button>
        <button
          onClick={() => applyFormatting('underline')}
          className="w-8 h-8 flex items-center justify-center hover:bg-[var(--bg-tertiary)] transition-colors"
          style={{ borderRadius: '20px' }}
          title="Подчеркнутый (__ __)"
        >
          <span className="underline text-sm">U</span>
        </button>
        <button
          onClick={() => applyFormatting('link')}
          className="w-8 h-8 flex items-center justify-center hover:bg-[var(--bg-tertiary)] transition-colors"
          style={{ borderRadius: '20px' }}
          title="Гиперссылка"
        >
          <LinkIcon className="w-4 h-4" />
        </button>
      </div>
    </>
  );
}
