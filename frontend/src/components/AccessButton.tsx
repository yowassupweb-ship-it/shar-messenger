'use client';

import { useState } from 'react';
import { Lock, Users } from 'lucide-react';
import ShareModal from './ShareModal';

interface AccessButtonProps {
  resourceType: 'calendar' | 'todos' | 'content-plan' | 'task' | 'list';
  resourceId: string;
  resourceName: string;
  variant?: 'icon' | 'button';
  size?: 'sm' | 'md';
  className?: string;
}

export default function AccessButton({ 
  resourceType, 
  resourceId, 
  resourceName, 
  variant = 'icon',
  size = 'sm',
  className = ''
}: AccessButtonProps) {
  const [showShareModal, setShowShareModal] = useState(false);

  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  const buttonSize = size === 'sm' ? 'w-7 h-7' : 'w-8 h-8';

  if (variant === 'button') {
    return (
      <>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowShareModal(true);
          }}
          className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-colors bg-transparent hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-white/70 text-sm w-full ${className}`}
          title="Доступ"
        >
          <Users className={iconSize} />
          <span className="flex-1 text-left">Доступ</span>
        </button>
        
        <ShareModal 
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          resourceType={resourceType as 'calendar' | 'todos' | 'content-plan'}
          resourceId={resourceId}
          resourceName={resourceName}
        />
      </>
    );
  }

  return (
    <>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowShareModal(true);
        }}
        className={`${buttonSize} rounded-lg flex items-center justify-center transition-all bg-gradient-to-br from-white/10 to-white/5 hover:from-blue-500/20 hover:to-blue-500/10 border border-white/20 hover:border-blue-500/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)] backdrop-blur-md text-gray-500 dark:text-white/60 hover:text-blue-500 dark:hover:text-blue-400 ${className}`}
        title="Доступ"
      >
        <Lock className={iconSize} />
      </button>
      
      <ShareModal 
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        resourceType={resourceType as 'calendar' | 'todos' | 'content-plan'}
        resourceId={resourceId}
        resourceName={resourceName}
      />
    </>
  );
}
