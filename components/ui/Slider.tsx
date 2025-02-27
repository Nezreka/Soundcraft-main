import React, { useState, useRef, useEffect } from 'react';
import { SliderProps } from '@/types/ui';
import { cn } from '@/lib/utils/format';

const Slider: React.FC<SliderProps> = ({
  value,
  min,
  max,
  step = 1,
  onChange,
  label,
  showValue = true,
  unit = '',
  vertical = false,
  bipolar = false,
}) => {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Calculate percentage for positioning the thumb
  const getPercentage = () => {
    return ((value - min) / (max - min)) * 100;
  };

  // Format the display value
  const displayValue = () => {
    let val = Number(value.toFixed(2));
    if (bipolar) {
      // For bipolar controls, show + sign for positive values
      return `${val > 0 ? '+' : ''}${val}${unit}`;
    }
    return `${val}${unit}`;
  };

  // Handle mouse and touch interactions
  const handleInteractionStart = (clientX: number, clientY: number) => {
    setIsDragging(true);
    updateValue(clientX, clientY);
  };

  const handleInteractionMove = (clientX: number, clientY: number) => {
    if (isDragging) {
      updateValue(clientX, clientY);
    }
  };

  const handleInteractionEnd = () => {
    setIsDragging(false);
  };

  // Update value based on mouse/touch position
  const updateValue = (clientX: number, clientY: number) => {
    if (!sliderRef.current) return;
    
    const rect = sliderRef.current.getBoundingClientRect();
    let percentage;
    
    if (vertical) {
      // For vertical slider, invert the percentage (top is max, bottom is min)
      percentage = 1 - (clientY - rect.top) / rect.height;
    } else {
      percentage = (clientX - rect.left) / rect.width;
    }
    
    // Clamp percentage between 0 and 1
    percentage = Math.max(0, Math.min(1, percentage));
    
    // Calculate new value
    let newValue = min + percentage * (max - min);
    
    // Apply step
    if (step) {
      newValue = Math.round(newValue / step) * step;
    }
    
    // Clamp value between min and max
    newValue = Math.max(min, Math.min(max, newValue));
    
    onChange(newValue);
  };

  // Set up event listeners
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => handleInteractionMove(e.clientX, e.clientY);
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) {
        handleInteractionMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    
    const handleUp = () => handleInteractionEnd();
    
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('mouseup', handleUp);
      document.addEventListener('touchend', handleUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('mouseup', handleUp);
      document.removeEventListener('touchend', handleUp);
    };
  }, [isDragging]);

  return (
    <div className={cn(
      'flex gap-2',
      vertical ? 'flex-col h-32' : 'flex-row items-center'
    )}>
      <div className="text-xs text-text-secondary">{label}</div>
      
      <div 
        ref={sliderRef}
        className={cn(
          'relative cursor-pointer',
          vertical ? 'h-full w-8' : 'w-full h-8'
        )}
        onMouseDown={(e) => handleInteractionStart(e.clientX, e.clientY)}
        onTouchStart={(e) => {
          if (e.touches[0]) {
            handleInteractionStart(e.touches[0].clientX, e.touches[0].clientY);
          }
        }}
      >
        <div 
          className={cn(
            'slider-track absolute bg-surface/80',
            vertical ? 'w-2 h-full left-3' : 'h-2 w-full top-3'
          )}
        />
        
        {/* Fill track */}
        <div 
          className={cn(
            'absolute bg-primary rounded-full',
            vertical 
              ? 'w-2 left-3 bottom-0' 
              : 'h-2 top-3 left-0'
          )}
          style={
            vertical 
              ? { height: `${getPercentage()}%` } 
              : { width: `${getPercentage()}%` }
          }
        />
        
        {/* Thumb */}
        <div 
          className="slider-thumb bg-primary"
          style={
            vertical 
              ? { bottom: `${getPercentage()}%`, left: '0.25rem', transform: 'translateY(50%)' } 
              : { left: `${getPercentage()}%` }
          }
        />
      </div>
      
      {showValue && (
        <div className="min-w-[40px] text-center text-xs text-text-secondary">
          {displayValue()}
        </div>
      )}
    </div>
  );
};

export { Slider };