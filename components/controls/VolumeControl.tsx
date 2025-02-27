import React from 'react';
import { SoundParameters } from '@/types/audio';
import { Knob } from '@/components/ui/Knob';
import { Slider } from '@/components/ui/Slider';
import { formatPercentage } from '@/lib/utils/format';

interface VolumeControlProps {
  sound: SoundParameters;
  onChange: (id: string, updates: Partial<SoundParameters>) => void;
  vertical?: boolean;
}

const VolumeControl: React.FC<VolumeControlProps> = ({ 
  sound, 
  onChange, 
  vertical = false 
}) => {
  const handleVolumeChange = (value: number) => {
    onChange(sound.id, { volume: value });
  };
  
  return (
    <div className="flex flex-col items-center gap-2">
      {vertical ? (
        <Slider
          label="Volume"
          value={sound.volume}
          min={0}
          max={1}
          step={0.01}
          onChange={handleVolumeChange}
          vertical
          showValue
        />
      ) : (
        <Knob
          label="Volume"
          value={sound.volume}
          min={0}
          max={1}
          step={0.01}
          onChange={handleVolumeChange}
        />
      )}
      
      <div className="text-xs text-text-secondary">
        {formatPercentage(sound.volume)}
      </div>
    </div>
  );
};

export default VolumeControl;