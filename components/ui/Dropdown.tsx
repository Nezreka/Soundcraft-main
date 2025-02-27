import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils/format';
import { IoMdArrowDropdown } from 'react-icons/io';

interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
}

const Dropdown: React.FC<DropdownProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  label,
  disabled = false,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(option => option.value === value);

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const handleSelect = (option: DropdownOption) => {
    onChange(option.value);
    setIsOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      {label && (
        <label className="block text-sm text-text-secondary mb-1">
          {label}
        </label>
      )}
      
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={cn(
          'flex items-center justify-between w-full p-2 text-left rounded-md',
          'neumorphic text-sm',
          disabled && 'opacity-50 cursor-not-allowed',
          isOpen && 'shadow-neumorphic-inset'
        )}
      >
        <span className={cn(!selectedOption && 'text-text-secondary')}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <IoMdArrowDropdown
          className={cn(
            'transition-transform',
            isOpen && 'transform rotate-180'
          )}
        />
      </button>
      
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 glass-panel border border-white/10 rounded-md shadow-lg max-h-60 overflow-auto">
          {options.map(option => (
            <div
              key={option.value}
              onClick={() => handleSelect(option)}
              className={cn(
                'p-2 text-sm cursor-pointer hover:bg-white/10',
                option.value === value && 'bg-primary/20 text-primary'
              )}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export { Dropdown };