import React from 'react';
import { SoundParameters } from '@/types/audio';
import { Knob } from '@/components/ui/Knob';
import { Tabs } from '@/components/ui/Tabs';

interface EffectsControlsProps {
  sound: SoundParameters;
  onChange: (id: string, updates: Partial<SoundParameters>) => void;
}

const EffectsControls: React.FC<EffectsControlsProps> = ({ sound, onChange }) => {
  const effectsTabs = [
    {
      id: 'distortion',
      label: 'Distortion',
      content: (
        <div className="p-4 grid place-items-center">
          <Knob
            label="Distortion"
            value={sound.distortion}
            min={0}
            max={1}
            step={0.01}
            onChange={(value) => onChange(sound.id, { distortion: value })}
            size="lg"
          />
        </div>
      ),
    },
    {
      id: 'reverb',
      label: 'Reverb',
      content: (
        <div className="p-4 grid grid-cols-2 gap-8 place-items-center">
          <Knob
            label="Mix"
            value={sound.reverbMix}
            min={0}
            max={1}
            step={0.01}
            onChange={(value) => onChange(sound.id, { reverbMix: value })}
            size="lg"
          />
          <Knob
            label="Decay"
            value={sound.reverbDecay}
            min={0.1}
            max={10}
            step={0.1}
            onChange={(value) => onChange(sound.id, { reverbDecay: value })}
            size="lg"
            unit=" s"
          />
        </div>
      ),
    },
    {
      id: 'delay',
      label: 'Delay',
      content: (
        <div className="p-4 grid grid-cols-3 gap-6 place-items-center">
          <Knob
            label="Time"
            value={sound.delayTime}
            min={0.05}
            max={2}
            step={0.01}
            onChange={(value) => onChange(sound.id, { delayTime: value })}
            size="lg"
            unit=" s"
          />
          <Knob
            label="Feedback"
            value={sound.delayFeedback}
            min={0}
            max={0.95}
            step={0.01}
            onChange={(value) => onChange(sound.id, { delayFeedback: value })}
            size="lg"
          />
          <Knob
            label="Mix"
            value={sound.delayMix}
            min={0}
            max={1}
            step={0.01}
            onChange={(value) => onChange(sound.id, { delayMix: value })}
            size="lg"
          />
        </div>
      ),
    },
  ];
  
  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-6">Effects</h3>
      
      <Tabs tabs={effectsTabs} variant="pills" />
    </div>
  );
};

export default EffectsControls;