import { useState, useRef, useEffect } from 'react';

interface DragResizeOptions {
  minHeight?: number;
  maxHeight?: number;
  onHeightChange?: (height: number) => void;
}

// Hook for drag-to-resize functionality
export function useDragResize({
  minHeight = 100,
  maxHeight = 500,
  onHeightChange
}: DragResizeOptions = {}) {
  const [height, setHeight] = useState(200);
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);
  
  // Handle drag start
  const handleDragStart = (clientY: number) => {
    setIsDragging(true);
    startYRef.current = clientY;
    startHeightRef.current = height;
  };
  
  // Set up event listeners for dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const deltaY = startYRef.current - e.clientY;
      const newHeight = Math.max(minHeight, Math.min(maxHeight, startHeightRef.current + deltaY));
      
      setHeight(newHeight);
      if (onHeightChange) {
        onHeightChange(newHeight);
      }
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
    };
    
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, minHeight, maxHeight, onHeightChange]);
  
  return {
    height,
    isDragging,
    handleDragStart
  };
}