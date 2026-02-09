import { useState, useCallback, useRef } from 'react';

export function useHover<T>(delay: number = 500) {
  const [hovered, setHovered] = useState<T | null>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = useCallback((event: React.MouseEvent, item: T) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setPosition({
      x: rect.left + rect.width + 10,
      y: rect.top
    });

    timeoutRef.current = setTimeout(() => {
      setHovered(item);
    }, delay);
  }, [delay]);

  const handleMouseLeave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setHovered(null);
  }, []);

  return {
    hovered,
    position,
    handleMouseEnter,
    handleMouseLeave
  };
}
