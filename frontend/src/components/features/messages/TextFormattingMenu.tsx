import { Link as LinkIcon, ChevronRight, Copy, Scissors, Clipboard, Type } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface TextFormattingMenuProps {
  showTextFormatMenu: boolean;
  formatMenuPosition: { top: number; left: number };
  setShowTextFormatMenu: (show: boolean) => void;
  applyFormatting: (format: 'bold' | 'italic' | 'underline' | 'link' | 'strikethrough' | 'code' | 'spoiler' | 'copy' | 'paste' | 'cut' | 'selectAll') => void;
}

export default function TextFormattingMenu({
  showTextFormatMenu,
  formatMenuPosition,
  setShowTextFormatMenu,
  applyFormatting,
}: TextFormattingMenuProps) {
  const [showFormattingSubmenu, setShowFormattingSubmenu] = useState(false);
  const [submenuPosition, setSubmenuPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const formattingButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (showFormattingSubmenu && menuRef.current && formattingButtonRef.current) {
      const menuRect = menuRef.current.getBoundingClientRect();
      setSubmenuPosition({
        top: menuRect.top,
        left: menuRect.right + 8
      });
    }
  }, [showFormattingSubmenu]);

  if (!showTextFormatMenu) return null;

  return (
    <>
      <div 
        className="fixed inset-0 z-40" 
        onClick={() => {
          setShowTextFormatMenu(false);
          setShowFormattingSubmenu(false);
        }}
      />
      <div 
        ref={menuRef}
        className="fixed z-50 bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-2xl rounded-xl overflow-hidden min-w-[200px]"
        style={{
          top: `${formatMenuPosition.top}px`,
          left: `${formatMenuPosition.left}px`,
          transform: 'translate(-50%, -100%)'
        }}
      >
        <button
          onClick={() => {
            applyFormatting('copy');
            setShowFormattingSubmenu(false);
          }}
          className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-[var(--bg-tertiary)] transition-colors text-left text-sm"
        >
          <span>Копировать</span>
          <span className="text-xs text-[var(--text-muted)]">Ctrl+C</span>
        </button>
        <button
          onClick={() => {
            applyFormatting('paste');
            setShowFormattingSubmenu(false);
          }}
          className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-[var(--bg-tertiary)] transition-colors text-left text-sm"
        >
          <span>Вставить</span>
          <span className="text-xs text-[var(--text-muted)]">Ctrl+V</span>
        </button>
        <button
          onClick={() => {
            applyFormatting('cut');
            setShowFormattingSubmenu(false);
          }}
          className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-[var(--bg-tertiary)] transition-colors text-left text-sm"
        >
          <span>Вырезать</span>
          <span className="text-xs text-[var(--text-muted)]">Ctrl+X</span>
        </button>
        <button
          onClick={() => {
            applyFormatting('selectAll');
            setShowFormattingSubmenu(false);
          }}
          className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-[var(--bg-tertiary)] transition-colors text-left text-sm border-b border-[var(--border-color)]"
        >
          <span>Выбрать всё</span>
          <span className="text-xs text-[var(--text-muted)]">Ctrl+A</span>
        </button>
        
        <button
          ref={formattingButtonRef}
          onClick={() => setShowFormattingSubmenu(!showFormattingSubmenu)}
          className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-[var(--bg-tertiary)] transition-colors text-left text-sm"
        >
          <span>Форматирование</span>
          <ChevronRight className="w-4 h-4" />
        </button>
        
        <div className="border-t border-[var(--border-color)]">
          <button
            onClick={() => {
              applyFormatting('link');
              setShowFormattingSubmenu(false);
            }}
            className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-[var(--bg-tertiary)] transition-colors text-left text-sm"
          >
            <span>Добавить ссылку</span>
            <span className="text-xs text-[var(--text-muted)]">Ctrl+K</span>
          </button>
        </div>
      </div>

      {/* Submenu - отдельно справа */}
      {showFormattingSubmenu && (
        <div 
          className="fixed z-50 bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-2xl rounded-xl overflow-hidden min-w-[200px]"
          style={{
            top: `${submenuPosition.top}px`,
            left: `${submenuPosition.left}px`
          }}
        >
          <button
            onClick={() => {
              applyFormatting('bold');
              setShowFormattingSubmenu(false);
            }}
            className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-[var(--bg-tertiary)] transition-colors text-left text-sm"
          >
            <span>Жирный</span>
            <span className="text-xs text-[var(--text-muted)]">Ctrl+B</span>
          </button>
          <button
            onClick={() => {
              applyFormatting('italic');
              setShowFormattingSubmenu(false);
            }}
            className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-[var(--bg-tertiary)] transition-colors text-left text-sm"
          >
            <span>Курсив</span>
            <span className="text-xs text-[var(--text-muted)]">Ctrl+I</span>
          </button>
          <button
            onClick={() => {
              applyFormatting('underline');
              setShowFormattingSubmenu(false);
            }}
            className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-[var(--bg-tertiary)] transition-colors text-left text-sm"
          >
            <span>Подчёркнутый</span>
            <span className="text-xs text-[var(--text-muted)]">Ctrl+U</span>
          </button>
          <button
            onClick={() => {
              applyFormatting('strikethrough');
              setShowFormattingSubmenu(false);
            }}
            className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-[var(--bg-tertiary)] transition-colors text-left text-sm"
          >
            <span>Зачёркнутый</span>
            <span className="text-xs text-[var(--text-muted)]">Ctrl+Shift+X</span>
          </button>
          <button
            onClick={() => {
              applyFormatting('code');
              setShowFormattingSubmenu(false);
            }}
            className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-[var(--bg-tertiary)] transition-colors text-left text-sm"
          >
            <span>Моноширинный</span>
            <span className="text-xs text-[var(--text-muted)]">Ctrl+Shift+M</span>
          </button>
          <button
            onClick={() => {
              applyFormatting('spoiler');
              setShowFormattingSubmenu(false);
            }}
            className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-[var(--bg-tertiary)] transition-colors text-left text-sm"
          >
            <span>Скрытый</span>
            <span className="text-xs text-[var(--text-muted)]">Ctrl+Shift+P</span>
          </button>
        </div>
      )}
    </>
  );
}
