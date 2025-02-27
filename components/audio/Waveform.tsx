import React, { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils/format';

interface WaveformProps {
  audioBuffer?: AudioBuffer;
  color?: string;
  height?: number;
  className?: string;
}

const Waveform: React.FC<WaveformProps> = ({
  audioBuffer,
  color = '#BB86FC',
  height = 80,
  className,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Draw waveform when audioBuffer changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !audioBuffer) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Create gradient for the waveform
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    gradient.addColorStop(0, '#4158D0');   // Blue
    gradient.addColorStop(0.5, '#C850C0'); // Purple
    gradient.addColorStop(1, '#FFCC70');   // Amber
    
    // Set up drawing
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    
    // Add glow effect
    ctx.shadowBlur = 8;
    ctx.shadowColor = 'rgba(200, 80, 192, 0.5)'; // Purple glow
    
    // Get audio data
    const channelData = audioBuffer.getChannelData(0); // Use first channel
    const step = Math.ceil(channelData.length / canvas.width);
    
    // Start drawing path
    ctx.beginPath();
    
    // Move to the center of the canvas
    ctx.moveTo(0, canvas.height / 2);
    
    // Draw the waveform
    for (let i = 0; i < canvas.width; i++) {
      const dataIndex = Math.min(i * step, channelData.length - 1);
      const value = channelData[dataIndex];
      
      // Scale the value to fit in the canvas
      const y = (value * 0.8 + 1) * canvas.height / 2;
      
      ctx.lineTo(i, y);
    }
    
    ctx.stroke();
  }, [audioBuffer, color]);
  
  // If no audio buffer, draw placeholder
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || audioBuffer) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Create gradient for the placeholder waveform
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    gradient.addColorStop(0, '#4158D0');   // Blue
    gradient.addColorStop(0.5, '#C850C0'); // Purple
    gradient.addColorStop(1, '#FFCC70');   // Amber
    
    // Set up drawing
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    
    // Add glow effect
    ctx.shadowBlur = 8;
    ctx.shadowColor = 'rgba(200, 80, 192, 0.5)'; // Purple glow
    
    // Draw placeholder waveform (sine wave)
    ctx.beginPath();
    
    const amplitude = canvas.height / 4;
    const centerY = canvas.height / 2;
    
    for (let x = 0; x < canvas.width; x++) {
      const frequency = 0.02;
      const y = centerY + Math.sin(x * frequency) * amplitude;
      
      if (x === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    
    ctx.stroke();
  }, [audioBuffer, color]);
  
  // Resize canvas when component mounts or audio buffer changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (!container) return;
      
      // Set size based on container
      canvas.width = container.clientWidth;
      canvas.height = height;
      
      // Force redraw if we have an audio buffer
      if (audioBuffer) {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Set up drawing
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        
        // Get audio data
        const channelData = audioBuffer.getChannelData(0); // Use first channel
        const step = Math.ceil(channelData.length / canvas.width);
        
        // Start drawing path
        ctx.beginPath();
        
        // Move to the center of the canvas
        ctx.moveTo(0, canvas.height / 2);
        
        // Draw the waveform
        for (let i = 0; i < canvas.width; i++) {
          const dataIndex = Math.min(i * step, channelData.length - 1);
          const value = channelData[dataIndex];
          
          // Scale the value to fit in the canvas
          const y = (value * 0.8 + 1) * canvas.height / 2;
          
          ctx.lineTo(i, y);
        }
        
        ctx.stroke();
      } else {
        // Draw placeholder if no buffer
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Set up drawing
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        
        // Draw placeholder waveform (sine wave)
        ctx.beginPath();
        
        const amplitude = canvas.height / 4;
        const centerY = canvas.height / 2;
        
        for (let x = 0; x < canvas.width; x++) {
          const frequency = 0.02;
          const y = centerY + Math.sin(x * frequency) * amplitude;
          
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        
        ctx.stroke();
      }
    };
    
    // Resize immediately and also add event listener for future resizes
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [audioBuffer, color, height]);
  
  return (
    <div className={cn('w-full h-full', className)}>
      <canvas 
        ref={canvasRef} 
        height={height}
        className="w-full h-full"
      />
    </div>
  );
};

export default Waveform;