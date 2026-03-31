'use client';

import React, { useState, useEffect } from 'react';
import { Download, FileText, FolderOpen, Loader2 } from 'lucide-react';

interface FileAttachmentProps {
  url: string;
  name?: string;
  size?: number;
  messageId: string;
  onClick?: (e: React.MouseEvent) => void;
}

// Простая система отслеживания скачанных файлов через localStorage
const DOWNLOADED_FILES_KEY = 'shar_downloaded_files';

function getDownloadedFiles(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const stored = localStorage.getItem(DOWNLOADED_FILES_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

function markFileAsDownloaded(url: string): void {
  if (typeof window === 'undefined') return;
  try {
    const files = getDownloadedFiles();
    files.add(url);
    localStorage.setItem(DOWNLOADED_FILES_KEY, JSON.stringify([...files]));
  } catch (e) {
    console.error('Failed to mark file as downloaded:', e);
  }
}

function isFileDownloaded(url: string): boolean {
  return getDownloadedFiles().has(url);
}

const fmtSize = (b: number) => 
  b < 1024 ? `${b} B` : 
  b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : 
  `${(b / 1048576).toFixed(1)} MB`;

export default function FileAttachment({ url, name, size, messageId, onClick }: FileAttachmentProps) {
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    // Проверяем при монтировании, скачан ли файл
    setIsDownloaded(isFileDownloaded(url));
  }, [url]);

  const triggerBrowserDownload = () => {
    const link = document.createElement('a');
    link.href = url;
    link.download = name || '';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openDownloadedFile = async () => {
    const bridge = (window as any)?.sharDesktop;
    if (bridge?.openExternal) {
      await bridge.openExternal(url);
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (onClick) {
      onClick(e);
    }

    if (isDownloading) return;

    if (isDownloaded) {
      await openDownloadedFile();
      return;
    }

    setIsDownloading(true);
    triggerBrowserDownload();

    setTimeout(() => {
      markFileAsDownloaded(url);
      setIsDownloaded(true);
      setIsDownloading(false);
    }, 500);
  };

  const statusLabel = isDownloading
    ? 'Загрузка'
    : isDownloaded
      ? 'Открыть в папке'
      : 'Загрузить';

  const StatusIcon = isDownloading ? Loader2 : isDownloaded ? FolderOpen : Download;

  return (
    <button
      type="button"
      className="flex items-center gap-2 px-2.5 py-2 rounded-xl bg-black/10 dark:bg-white/10 hover:bg-black/15 dark:hover:bg-white/15 transition-colors max-w-full group"
      onClick={handleClick}
    >
      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-500/20 dark:bg-blue-400/20 flex items-center justify-center">
        <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
      </div>
      
      <div className="flex-1 min-w-0 flex flex-col items-start">
        <div className="w-full min-w-0 flex items-center gap-1.5">
          <StatusIcon className={`w-3.5 h-3.5 shrink-0 ${isDownloading ? 'opacity-70 animate-spin' : isDownloaded ? 'text-blue-600 dark:text-blue-400 opacity-85' : 'opacity-70'}`} />
          <span className="text-[11px] opacity-70 shrink-0">{statusLabel}</span>
          <span className="text-[13px] font-medium truncate">{name || 'Файл'}</span>
        </div>
        {size && <span className="text-[11px] opacity-50 mt-0.5">{fmtSize(size)}</span>}
      </div>
    </button>
  );
}
