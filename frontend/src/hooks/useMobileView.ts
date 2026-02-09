import { useState, useEffect } from 'react';

interface UseMobileViewProps {
  initialSelectedColumn?: number;
}

export function useMobileView({ initialSelectedColumn = 0 }: UseMobileViewProps = {}) {
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );
  
  const [mobileView, setMobileView] = useState<'board' | 'single'>(
    windowWidth < 768 ? 'single' : 'board'
  );
  
  const [selectedColumnIndex, setSelectedColumnIndex] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('todos_selected_column');
      if (stored !== null) return Number(stored);
    }
    return initialSelectedColumn;
  });

  // Passive resize listener
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let resizeTimeout: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        const newWidth = window.innerWidth;
        setWindowWidth(newWidth);
        setMobileView(newWidth < 768 ? 'single' : 'board');
      }, 200);
    };

    window.addEventListener('resize', handleResize, { passive: true });
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
    };
  }, []);

  // Save selected column to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('todos_selected_column', String(selectedColumnIndex));
    }
  }, [selectedColumnIndex]);

  return {
    windowWidth,
    mobileView,
    selectedColumnIndex,
    setSelectedColumnIndex
  };
}
