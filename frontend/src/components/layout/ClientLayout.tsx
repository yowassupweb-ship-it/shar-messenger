'use client';

import React from 'react';
import { ThemeProvider } from '@/contexts/ThemeContext';
import BottomNav from './BottomNav';

interface ClientLayoutProps {
  children: React.ReactNode;
}

function ClientLayout({ children }: ClientLayoutProps) {
  return (
    <ThemeProvider>
      {children}
      <BottomNav />
    </ThemeProvider>
  );
}

export default ClientLayout;
