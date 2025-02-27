// components/ui/Spectrum.tsx
import React, { useEffect, useRef } from 'react';
import { useStore } from '@/store';
import { cn } from '@/lib/utils/format';

interface SpectrumProps {
  className?: string;
}

const Spectrum: React.FC<SpectrumProps> = ({ className }) => {
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
    
    // Draw frequency spectrum (simplified visualization)
    const barCount = 32;
    const barWidth = rect.width / barCount;
    const barSpacing = 2;
    
    // Generate a spectrum based on the sound parameters
    const spectrum = generateSpectrum(currentSound, barCount);
    
    // Draw bars
    for (let i = 0; i < barCount; i++) {
      const barHeight = spectrum[i] * rect.height;
      
      // Create gradient
      const gradient = ctx.createLinearGradient(0, rect.height, 0, rect.height - barHeight);
      gradient.addColorStop(0, 'rgba(var(--color-primary-rgb), 0.6)');
      gradient.addColorStop(1, 'rgba(var(--color-primary-rgb), 1.0)');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(
        i * barWidth + barSpacing / 2, 
        rect.height - barHeight, 
        barWidth - barSpacing, 
        barHeight
      );
    }
    
    // Add grid lines
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    
    // Horizontal lines
    for (let i = 0; i <= 4; i++) {
      const y = (i / 4) * rect.height;
      ctx.moveTo(0, y);
      ctx.lineTo(rect.width, y);
    }
    
    ctx.stroke();
    
  }, [currentSound]);
  
  // Generate a simplified spectrum based on sound parameters
  const generateSpectrum = (sound: any, barCount: number) => {
    const spectrum = [];
    const waveformType = sound.waveform || 'sine';
    
    // Different spectrum shapes based on waveform type
    for (let i = 0; i < barCount; i++) {
      let value = 0;
      const normalizedFreq = i / barCount;
      
      switch (waveformType) {
        case 'sine':
          // Sine wave has a single peak
          value = Math.exp(-Math.pow((normalizedFreq - 0.2) * 10, 2));
          break;
        case 'square':
          // Square wave has odd harmonics
          if (i % 2 === 1) {
            value = 0.7 / (i + 1);
          } else {
            value = 0.2 / (i + 1);
          }
          value = Math.min(0.9, value);
          break;
        case 'sawtooth':
          // Sawtooth has all harmonics
          value = 0.6 / (i + 1);
          value = Math.min(0.9, value);
          break;
        case 'triangle':
          // Triangle has odd harmonics with faster falloff
          if (i % 2 === 1) {
            value = 0.5 / Math.pow(i + 1, 2);
          } else {
            value = 0.1 / Math.pow(i + 1, 2);
          }
          value = Math.min(0.9, value);
          break;
      }
      
      // Apply filter effect
      if (sound.filterType === 'lowpass') {
        const cutoff = sound.filterCutoff / 10000; // Normalize to 0-1
        value *= Math.exp(-Math.pow((normalizedFreq - cutoff) * 5, 2) * (normalizedFreq > cutoff ? 1 : 0));
      } else if (sound.filterType === 'highpass') {
        const cutoff = sound.filterCutoff / 10000; // Normalize to 0-1
        value *= Math.exp(-Math.pow((normalizedFreq - cutoff) * 5, 2) * (normalizedFreq < cutoff ? 1 : 0));
      }
      
      // Add some randomness for a more natural look
      value *= 0.9 + Math.random() * 0.1;
      
      spectrum.push(value);
    }
    
    return spectrum;
  };
  
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

export default Spectrum;