import React from 'react';
import { cn } from '@/lib/utils/format';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  title?: string;  // Add title prop for tooltip
}

const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  size = 'md',
  title,
}) => {
  const handleClick = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  const sizeClasses = {
    sm: 'w-8 h-4',
    md: 'w-10 h-5',
    lg: 'w-12 h-6',
  };

  const thumbSizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const thumbTranslateClasses = {
    sm: 'translate-x-4',
    md: 'translate-x-5',
    lg: 'translate-x-6',
  };

  return (
    <div className={cn(
      'flex items-center gap-2',
      disabled && 'opacity-50 cursor-not-allowed'
    )}>
      {(label || description) && (
        <div className="flex flex-col">
          {label && (
            <span className="text-sm text-text-secondary">{label}</span>
          )}
          {description && (
            <span className="text-xs text-text-secondary/70">{description}</span>
          )}
        </div>
      )}
      
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={handleClick}
        title={title}
        className={cn(
          'relative inline-flex shrink-0 cursor-pointer rounded-full transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          sizeClasses[size],
          checked ? 'bg-primary' : 'bg-surface shadow-neumorphic-inset'
        )}
      >
        <span
          className={cn(
            'pointer-events-none inline-block transform rounded-full bg-white shadow-lg ring-0 transition-transform',
            thumbSizeClasses[size],
            checked ? thumbTranslateClasses[size] : 'translate-x-0.5'
          )}
          style={{
            transform: `translateY(-50%) ${checked ? thumbTranslateClasses[size] : 'translateX(1px)'}`,
            top: '50%',
            position: 'absolute',
          }}
        />
      </button>
    </div>
  );
};

export { Switch };