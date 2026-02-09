'use client';

import React, { memo, useRef, useEffect } from 'react';
import { Bold, Italic, Underline, List, ListOrdered, Type, Link2 } from 'lucide-react';

interface TaskCenterPanelProps {
  title: string;
  description: string;
  titleInputRef: React.RefObject<HTMLInputElement>;
  descriptionEditorRef: React.RefObject<HTMLDivElement>;
  onAttachmentUpload?: (files: FileList) => void;
}

const TaskCenterPanel = memo(function TaskCenterPanel({
  title,
  description,
  titleInputRef,
  descriptionEditorRef,
  onAttachmentUpload
}: TaskCenterPanelProps) {
  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    descriptionEditorRef.current?.focus();
  };

  const insertLink = () => {
    const url = prompt('Введите URL:');
    if (url) {
      execCommand('createLink', url);
    }
  };

  return (
    <div className="w-full lg:w-[var(--col-center)] flex flex-col bg-white dark:bg-[var(--bg-secondary)] border-b-0 lg:border-b-0 lg:border-r border-gray-200 dark:border-[var(--border-color)] order-1 lg:order-2 transition-[width] duration-100">
      {/* Название задачи */}
      <div className="px-2 sm:px-3 pt-2 sm:pt-3 pb-1.5 sm:pb-2">
        <input
          ref={titleInputRef}
          type="text"
          defaultValue={title}
          className="no-mobile-scale w-full px-2 sm:px-3 py-3 bg-gradient-to-br from-white/5 to-white/10 border border-white/10 rounded-[20px] text-4xl sm:text-5xl font-semibold focus:outline-none focus:border-blue-500/50 transition-all text-gray-900 dark:text-[var(--text-primary)] placeholder-gray-400 dark:placeholder-white/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)] backdrop-blur-sm"
          placeholder="Название задачи..."
        />
      </div>

      {/* Панель форматирования */}
      <div className="px-2 sm:px-3 py-1 sm:py-1.5 md:border-b border-gray-200 dark:border-[var(--border-color)]">
        <div className="flex items-center justify-center sm:justify-start gap-0.5 flex-wrap">
          <button
            type="button"
            onClick={() => execCommand('bold')}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/5 rounded transition-colors"
            title="Жирный (Ctrl+B)"
          >
            <Bold className="w-3.5 h-3.5 text-gray-600 dark:text-white/60" />
          </button>
          <button
            type="button"
            onClick={() => execCommand('italic')}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/5 rounded transition-colors"
            title="Курсив (Ctrl+I)"
          >
            <Italic className="w-3.5 h-3.5 text-gray-600 dark:text-white/60" />
          </button>
          <button
            type="button"
            onClick={() => execCommand('underline')}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/5 rounded transition-colors"
            title="Подчеркнутый (Ctrl+U)"
          >
            <Underline className="w-3.5 h-3.5 text-gray-600 dark:text-white/60" />
          </button>
          <div className="w-px h-4 bg-gray-300 dark:bg-white/10 mx-1" />
          <button
            type="button"
            onClick={() => execCommand('insertUnorderedList')}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/5 rounded transition-colors"
            title="Маркированный список"
          >
            <List className="w-3.5 h-3.5 text-gray-600 dark:text-white/60" />
          </button>
          <button
            type="button"
            onClick={() => execCommand('insertOrderedList')}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/5 rounded transition-colors"
            title="Нумерованный список"
          >
            <ListOrdered className="w-3.5 h-3.5 text-gray-600 dark:text-white/60" />
          </button>
          <div className="w-px h-4 bg-gray-300 dark:bg-white/10 mx-1" />
          <button
            type="button"
            onClick={insertLink}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/5 rounded transition-colors"
            title="Вставить ссылку"
          >
            <Link2 className="w-3.5 h-3.5 text-gray-600 dark:text-white/60" />
          </button>
          <button
            type="button"
            onClick={() => execCommand('formatBlock', 'h3')}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/5 rounded transition-colors"
            title="Заголовок"
          >
            <Type className="w-3.5 h-3.5 text-gray-600 dark:text-white/60" />
          </button>
        </div>
      </div>

      {/* Description Editor */}
      <div className="relative flex-1 overflow-y-auto px-2 sm:px-3 pb-2 sm:pb-3">
        <div
          ref={descriptionEditorRef}
          id="description-editor"
          contentEditable
          suppressContentEditableWarning
          onInput={() => {
            // 🚀 ULTRA PERFORMANCE: НЕ вызываем setState - НИКАКОГО re-render!
            // description живет только в DOM, сохраняется при закрытии модалки
            // Это полностью убирает Input Delay 160-191ms
          }}
          onClick={(e) => {
            const target = e.target as HTMLElement;

            // Ctrl + клик по ссылке = переход
            if (target.tagName === 'A' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              const link = target as HTMLAnchorElement;
              if (link.href) {
                window.open(link.href, '_blank', 'noopener,noreferrer');
              }
            }
          }}
          data-placeholder="Добавьте описание задачи..."
          className="w-full flex-1 min-h-[150px] px-2 sm:px-3 py-2 bg-gray-50 dark:bg-[var(--bg-glass)] border border-gray-200 dark:border-[var(--border-color)] rounded-xl text-sm text-gray-900 dark:text-[var(--text-primary)] focus:outline-none focus:border-blue-500/30 transition-all whitespace-pre-wrap break-words overflow-y-auto empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 empty:before:dark:text-white/30 will-change-contents"
          style={{ transform: 'translateZ(0)' }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.currentTarget.style.borderColor = 'rgb(59, 130, 246)';
            e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.05)';
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.currentTarget.style.borderColor = '';
            e.currentTarget.style.backgroundColor = '';
          }}
          onDrop={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.currentTarget.style.borderColor = '';
            e.currentTarget.style.backgroundColor = '';

            const files = e.dataTransfer.files;
            if (files && files.length > 0 && onAttachmentUpload) {
              onAttachmentUpload(files);
            }
          }}
        />
      </div>
    </div>
  );
});

export default TaskCenterPanel;
