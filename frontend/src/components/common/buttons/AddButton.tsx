'use client';

interface AddButtonProps {
  onClick: (e?: React.MouseEvent) => void;
  disabled?: boolean;
  title?: string;
  className?: string;
  size?: 'sm' | 'md';  // sm = маленькая иконка (w-5), md = обычная (w-6)
}

export default function AddButton({ onClick, disabled = false, title = 'Добавить', className = '', size = 'md' }: AddButtonProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick(e);
  };

  // Размеры кнопок
  const sizeClasses = size === 'sm' 
    ? 'w-5 h-5' 
    : 'w-6 h-6';
  
  const iconClasses = size === 'sm'
    ? 'w-2.5 h-2.5'
    : 'w-3 h-3';

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`${sizeClasses} flex items-center justify-center bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-full transition-colors disabled:opacity-50 ${className}`}
      title={title}
      style={{ boxShadow: '0 1px 2px rgba(0, 0, 0, 0.2), 0 1px 0 rgba(255, 255, 255, 0.05) inset' }}
    >
      <svg className={iconClasses} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M12 5v14M5 12h14"/>
      </svg>
    </button>
  );
}
