import { useCallback, useRef } from 'react';

interface UseBoardScrollProps {
  windowWidth: number;
  draggedTodo: any;
  draggedList: any;
  isDraggingBoard: boolean;
  setIsDraggingBoard: (dragging: boolean) => void;
  setStartX: (x: number) => void;
  setScrollLeft: (scroll: number) => void;
  boardRef: React.RefObject<HTMLDivElement | null>;
}

export function useBoardScroll({
  windowWidth,
  draggedTodo,
  draggedList,
  isDraggingBoard,
  setIsDraggingBoard,
  setStartX,
  setScrollLeft,
  boardRef
}: UseBoardScrollProps) {
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Только для desktop
    if (windowWidth < 768) return;
    // Не начинаем scroll если идёт перетаскивание задачи или списка
    if (!boardRef.current || draggedTodo || draggedList) return;
    // Не начинаем scroll если клик был на интерактивном элементе
    const target = e.target as HTMLElement;
    if (target.closest('button, input, [draggable="true"], a')) return;
    setIsDraggingBoard(true);
    startXRef.current = e.pageX - boardRef.current.offsetLeft;
    scrollLeftRef.current = boardRef.current.scrollLeft;
    setStartX(startXRef.current);
    setScrollLeft(scrollLeftRef.current);
    boardRef.current.style.cursor = 'grabbing';
    boardRef.current.style.userSelect = 'none';
  }, [windowWidth, draggedTodo, draggedList, boardRef, setIsDraggingBoard, setStartX, setScrollLeft]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    // Не двигаем если идёт перетаскивание задачи или списка
    if (!isDraggingBoard || !boardRef.current || draggedTodo || draggedList) return;
    e.preventDefault();
    const x = e.pageX - boardRef.current.offsetLeft;
    const walk = (x - startXRef.current) * 2;
    boardRef.current.scrollLeft = scrollLeftRef.current - walk;
  }, [isDraggingBoard, draggedTodo, draggedList, boardRef]);

  const handleMouseUp = useCallback(() => {
    setIsDraggingBoard(false);
    if (boardRef.current) {
      boardRef.current.style.cursor = 'grab';
      boardRef.current.style.userSelect = 'auto';
    }
  }, [setIsDraggingBoard, boardRef]);

  const handleMouseLeave = useCallback(() => {
    if (isDraggingBoard) {
      setIsDraggingBoard(false);
      if (boardRef.current) {
        boardRef.current.style.cursor = 'grab';
        boardRef.current.style.userSelect = 'auto';
      }
    }
  }, [isDraggingBoard, setIsDraggingBoard, boardRef]);

  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave
  };
}
