import React from 'react';
import { SoundParameters } from '@/types/audio';
import { Knob } from '@/components/ui/Knob';

interface EnvelopeControlsProps {
  sound: SoundParameters;
  onChange: (id: string, updates: Partial<SoundParameters>) => void;
}

const EnvelopeControls: React.FC<EnvelopeControlsProps> = ({ sound, onChange }) => {
  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-6">ADSR Envelope</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="grid grid-cols-2 gap-6">
          <Knob
            label="Attack"
            value={sound.attack}
            min={0.001}
            max={2}
            step={0.001}
            onChange={(value) => onChange(sound.id, { attack: value })}
            unit=" s"
          />
          
          <Knob
            label="Decay"
            value={sound.decay}
            min={0.001}
            max={2}
            step={0.001}
            onChange={(value) => onChange(sound.id, { decay: value })}
            unit=" s"
          />
          
          <Knob
            label="Sustain"
            value={sound.sustain}
            min={0}
            max={1}
            step={0.01}
            onChange={(value) => onChange(sound.id, { sustain: value })}
          />
          
          <Knob
            label="Release"
            value={sound.release}
            min={0.001}
            max={5}
            step={0.001}
            onChange={(value) => onChange(sound.id, { release: value })}
            unit=" s"
          />
        </div>
        
        <div className="neumorphic-inset p-4">
          <div className="w-full h-40 relative">
            {/* ADSR visualization */}
            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path
                d={`
                  M 0,100
                  L ${sound.attack * 20},0
                  L ${sound.attack * 20 + sound.decay * 20},${(1 - sound.sustain) * 100}
                  L 80,${(1 - sound.sustain) * 100}
                  L 100,100
                `}
                fill="none"
                stroke="#BB86FC"
                strokeWidth="2"
              />
            </svg>
            
            {/* Labels */}
            <div className="absolute bottom-0 left-0 w-full flex justify-between text-xs text-text-secondary">
              <span>A</span>
              <span>D</span>
              <span>S</span>
              <span>R</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnvelopeControls;