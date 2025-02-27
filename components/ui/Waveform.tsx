// components/ui/Waveform.tsx
import React, { useEffect, useRef } from 'react';
import { useStore } from '@/store';
import { cn } from '@/lib/utils/format';

interface WaveformProps {
  className?: string;
}

const Waveform: React.FC<WaveformProps> = ({ className }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { currentSoundId, sounds } = useStore();
  
  const currentSound = sounds.find(s => s.id === currentSoundId);
  
  useEffect(() => {
    if (!canvasRef.current || !currentSound) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas dimensions
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    ctx.scale(dpr, dpr);
    
    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height);
    
    // Draw waveform
    ctx.beginPath();
    ctx.moveTo(0, rect.height / 2);
    
    const waveformType = currentSound.waveform || 'sine';
    const points = 100;
    
    for (let i = 0; i <= points; i++) {
      const x = (i / points) * rect.width;
      let y = rect.height / 2;
      
      // Different waveform shapes
      const phase = (i / points) * Math.PI * 2;
      
      switch (waveformType) {
        case 'sine':
          y = (Math.sin(phase) * rect.height * 0.4) + rect.height / 2;
          break;
        case 'square':
          y = (phase % (Math.PI * 2) < Math.PI ? -0.4 : 0.4) * rect.height + rect.height / 2;
          break;
        case 'sawtooth':
          y = ((phase % (Math.PI * 2)) / Math.PI - 1) * rect.height * 0.4 + rect.height / 2;
          break;
        case 'triangle':
          const tri = Math.abs(((phase % (Math.PI * 2)) / (Math.PI / 2) - 2) % 4 - 2) - 1;
          y = tri * rect.height * 0.4 + rect.height / 2;
          break;
      }
      
      ctx.lineTo(x, y);
    }
    
    // Style and stroke the path
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim();
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Add grid lines
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    
    // Horizontal center line
    ctx.moveTo(0, rect.height / 2);
    ctx.lineTo(rect.width, rect.height / 2);
    
    // Vertical lines
    for (let i = 0; i <= 4; i++) {
      const x = (i / 4) * rect.width;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, rect.height);
    }
    
    ctx.stroke();
    
  }, [currentSound]);
  
  return (
    <div className={cn("relative h-32 bg-surface-dark rounded-lg overflow-hidden", className)}>
      {!currentSound ? (
        <div className="absolute inset-0 flex items-center justify-center text-text-secondary">
          No sound selected
        </div>
      ) : (
        <canvas 
          ref={canvasRef} 
          className="w-full h-full"
          style={{ display: 'block' }}
        />
      )}
    </div>
  );
};

export default Waveform;