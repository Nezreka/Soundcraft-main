import React, { useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils/format';

interface SpectrumProps {
  analyser?: AnalyserNode;
  color?: string;
  height?: number;
  className?: string;
}

const Spectrum: React.FC<SpectrumProps> = ({
  analyser,
  color = '#03DAC6',
  height = 120,
  className,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [isActive, setIsActive] = useState(false);
  
  // Set up animation loop when analyser changes
  useEffect(() => {
    if (!analyser) {
      setIsActive(false);
      
      // Clear canvas when analyzer is null
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
      return;
    }
    
    setIsActive(true);
    
    // Clean up previous animation frame
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyser]);
  
  // Draw spectrum when active
  useEffect(() => {
    if (!isActive || !analyser) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      
      analyser.getByteFrequencyData(dataArray);
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Set up drawing
      ctx.fillStyle = color;
      
      // Add glow effect
      ctx.shadowBlur = 10;
      ctx.shadowColor = 'rgba(0, 200, 255, 0.5)';
      
      // Calculate bar width
      const barWidth = canvas.width / bufferLength * 2.5;
      let x = 0;
      
      // Draw frequency bars with gradient colors
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;
        
        if (barHeight > 0) {
          // Create gradient for each bar based on its height
          const gradient = ctx.createLinearGradient(
            x, 
            canvas.height - barHeight, 
            x, 
            canvas.height
          );
          
          // Add color stops - vibrant gradient
          gradient.addColorStop(0, 'rgb(255, 50, 100)');   // Pink/Red at top
          gradient.addColorStop(0.4, 'rgb(255, 150, 50)'); // Orange in middle
          gradient.addColorStop(0.8, 'rgb(50, 200, 255)'); // Bright blue at bottom
          
          // Use the gradient for this bar
          ctx.fillStyle = gradient;
          ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
          ctx.fillStyle = color; // Reset to default color
        }
        
        x += barWidth + 1;
        if (x > canvas.width) break;
      }
    };
    
    draw();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, analyser, color]);
  
  // Draw placeholder if no analyser
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || isActive) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // No placeholder visualization when no sound is playing
  }, [isActive, color]);
  
  // Resize canvas when component mounts
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (!container) return;
      
      canvas.width = container.clientWidth;
      canvas.height = height;
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [height]);
  
  return (
    <div className={cn('w-full neumorphic-inset p-2', className)}>
      <canvas 
        ref={canvasRef} 
        height={height}
        className="w-full"
      />
    </div>
  );
};

export default Spectrum;