// components/ui/Knob.tsx
import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils/format';

interface KnobProps {
  label?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'secondary' | 'accent';
  bipolar?: boolean;
  unit?: string;
  className?: string;
}

const colorClasses = {
  primary: 'bg-primary',
  secondary: 'bg-secondary',
  accent: 'bg-accent'
};

export const Knob: React.FC<KnobProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  size = 'md',
  color = 'primary',
  bipolar = false,
  unit = '',
  className
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const knobRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const startValueRef = useRef(value);
  
  // Calculate knob rotation angle based on value
  const getRotationAngle = () => {
    const range = max - min;
    const valuePercent = (value - min) / range;
    
    // For bipolar knobs, we want to rotate from -135 to 135 degrees
    // For regular knobs, we want to rotate from -135 to 45 degrees
    const minAngle = -135;
    const maxAngle = bipolar ? 135 : 45;
    const angleRange = maxAngle - minAngle;
    
    return minAngle + valuePercent * angleRange;
  };
  
  // Handle mouse down on knob
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startYRef.current = e.clientY;
    startValueRef.current = value;
  };
  
  // Handle touch start on knob
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startYRef.current = e.touches[0].clientY;
    startValueRef.current = value;
  };
  
  // Handle mouse/touch move
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      // Calculate value change based on vertical mouse movement
      // Moving up increases value, moving down decreases value
      const deltaY = startYRef.current - e.clientY;
      const sensitivity = (max - min) / 200; // Adjust sensitivity as needed
      const newValue = Math.min(max, Math.max(min, startValueRef.current + deltaY * sensitivity));
      
      // Round to nearest step
      const roundedValue = Math.round(newValue / step) * step;
      
      onChange(parseFloat(roundedValue.toFixed(5)));
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      
      const deltaY = startYRef.current - e.touches[0].clientY;
      const sensitivity = (max - min) / 200;
      const newValue = Math.min(max, Math.max(min, startValueRef.current + deltaY * sensitivity));
      
      const roundedValue = Math.round(newValue / step) * step;
      
      onChange(parseFloat(roundedValue.toFixed(5)));
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
    };
    
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchend', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, min, max, step, onChange]);
  
  // Determine size classes
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-20 h-20',
    lg: 'w-24 h-24'
  };
  
  // Format display value
  const displayValue = () => {
    // If value is very close to 0, display exactly 0
    const displayVal = Math.abs(value) < 0.00001 ? 0 : value;
    
    // Format based on step size
    if (step >= 1) return Math.round(displayVal) + unit;
    if (step >= 0.1) return displayVal.toFixed(1) + unit;
    return displayVal.toFixed(2) + unit;
  };
  
  // Calculate the height of the indicator line based on size
  const lineHeight = size === 'sm' ? '30%' : size === 'lg' ? '40%' : '35%';
  
  return (
    <div className={cn("flex flex-col items-center", className)}>
      {label && <div className="text-sm text-text-secondary mb-2">{label}</div>}
      
      <div 
        ref={knobRef}
        className={cn(
          "relative rounded-full neumorphic cursor-pointer",
          sizeClasses[size],
          isDragging ? "scale-105" : ""
        )}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        {/* Knob background */}
        <div className="absolute inset-0 rounded-full bg-surface"></div>
        
        {/* Center dot */}
        <div className={cn(
          "absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-full",
          colorClasses[color as keyof typeof colorClasses] || 'bg-primary',
          size === 'sm' ? 'w-1.5 h-1.5' : size === 'lg' ? 'w-2.5 h-2.5' : 'w-2 h-2'
        )}></div>
        
        {/* Indicator line - positioned to rotate from top center */}
        <div 
          className={cn(
            "absolute w-[2px] rounded-full",
            colorClasses[color as keyof typeof colorClasses] || 'bg-primary'
          )}
          style={{ 
            height: lineHeight,
            backgroundColor: 'currentColor',
            position: 'absolute',
            bottom: '50%', // Position at the center, extending upward
            left: '50%',
            marginLeft: '-1px', // Center horizontally
            transformOrigin: 'center bottom', // Rotate from the bottom of the line (which is at the center of the knob)
            transform: `rotate(${getRotationAngle()}deg)`,
          }}
        ></div>
        
        {/* Bipolar indicator at center position */}
        {bipolar && (
          <div className="absolute top-0 left-1/2 w-[1px] h-[6px] bg-text-secondary transform -translate-x-1/2"></div>
        )}
      </div>
      
      <div className="text-xs text-text-secondary mt-2">{displayValue()}</div>
    </div>
  );
};