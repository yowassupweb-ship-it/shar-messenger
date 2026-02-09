import { useEffect, useState, useRef } from 'react';

interface UseResizableColumnsProps {
  windowWidth: number;
}

export function useResizableColumns({ windowWidth }: UseResizableColumnsProps) {
  const [columnWidths, setColumnWidths] = useState<[number, number, number]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('todos_modal_column_widths');
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          return [27.5, 45, 27.5];
        }
      }
    }
    return [27.5, 45, 27.5];
  });

  const [isResizing, setIsResizing] = useState<number | null>(null);
  const resizeStartXRef = useRef<number>(0);
  const resizeStartWidthsRef = useRef<[number, number, number]>([27.5, 45, 27.5]);

  const startResize = (columnIndex: number, clientX: number) => {
    setIsResizing(columnIndex);
    resizeStartXRef.current = clientX;
    resizeStartWidthsRef.current = columnWidths;
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('todos_modal_column_widths', JSON.stringify(columnWidths));
    }
  }, [columnWidths]);

  useEffect(() => {
    if (isResizing === null) return;

    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      const deltaX = e.clientX - resizeStartXRef.current;
      const containerWidth = windowWidth;
      const deltaPercent = (deltaX / containerWidth) * 100;

      const [left, center, right] = resizeStartWidthsRef.current;

      if (isResizing === 0) {
        const newLeft = Math.max(15, Math.min(50, left + deltaPercent));
        const newCenter = Math.max(15, Math.min(60, center - deltaPercent));
        setColumnWidths([newLeft, newCenter, right]);
      } else if (isResizing === 1) {
        const newCenter = Math.max(15, Math.min(60, center + deltaPercent));
        const newRight = Math.max(15, Math.min(50, right - deltaPercent));
        setColumnWidths([left, newCenter, newRight]);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(null);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isResizing, windowWidth]);

  return {
    columnWidths,
    isResizing,
    startResize
  };
}
