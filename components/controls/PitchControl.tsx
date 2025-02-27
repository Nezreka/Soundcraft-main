import React from 'react';
import { SoundParameters } from '@/types/audio';
import { Knob } from '@/components/ui/Knob';
import { Slider } from '@/components/ui/Slider';

interface PitchControlProps {
  sound: SoundParameters;
  onChange: (id: string, updates: Partial<SoundParameters>) => void;
  useSlider?: boolean;
}

const PitchControl: React.FC<PitchControlProps> = ({ 
  sound, 
  onChange,
  useSlider = false
}) => {
  const handlePitchChange = (value: number) => {
    onChange(sound.id, { pitch: value });
  };
  
  return (
    <div className="flex flex-col items-center gap-2">
      {useSlider ? (
        <Slider
          label="Pitch"
          value={sound.pitch}
          min={-12}
          max={12}
          step={1}
          onChange={handlePitchChange}
          bipolar
          unit=" st"
        />
      ) : (
        <Knob
          label="Pitch"
          value={sound.pitch}
          min={-12}
          max={12}
          step={1}
          onChange={handlePitchChange}
          bipolar
          unit=" st"
        />
      )}
      
      <div className="text-xs text-text-secondary">
        {sound.pitch > 0 ? `+${sound.pitch}` : sound.pitch} semitones
      </div>
    </div>
  );
};

export default PitchControl;