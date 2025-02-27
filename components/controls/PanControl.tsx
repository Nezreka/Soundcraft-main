import React from 'react';
import { SoundParameters } from '@/types/audio';
import { Knob } from '@/components/ui/Knob';
import { Slider } from '@/components/ui/Slider';

interface PanControlProps {
  sound: SoundParameters;
  onChange: (id: string, updates: Partial<SoundParameters>) => void;
  useSlider?: boolean;
}

const PanControl: React.FC<PanControlProps> = ({ 
  sound, 
  onChange,
  useSlider = false
}) => {
  const handlePanChange = (value: number) => {
    onChange(sound.id, { pan: value });
  };
  
  const formatPan = (value: number) => {
    if (value === 0) return 'C';
    return value < 0 ? `L ${Math.abs(value * 100).toFixed(0)}` : `R ${(value * 100).toFixed(0)}`;
  };
  
  return (
    <div className="flex flex-col items-center gap-2">
      {useSlider ? (
        <Slider
          label="Pan"
          value={sound.pan}
          min={-1}
          max={1}
          step={0.01}
          onChange={handlePanChange}
          bipolar
        />
      ) : (
        <Knob
          label="Pan"
          value={sound.pan}
          min={-1}
          max={1}
          step={0.01}
          onChange={handlePanChange}
          bipolar
        />
      )}
      
      <div className="text-xs text-text-secondary">
        {formatPan(sound.pan)}
      </div>
    </div>
  );
};

export default PanControl;