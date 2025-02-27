import React from 'react';
import { SoundParameters } from '@/types/audio';
import { Knob } from '@/components/ui/Knob';
import { Dropdown } from '@/components/ui/Dropdown';

interface LFOControlsProps {
  sound: SoundParameters;
  onChange: (id: string, updates: Partial<SoundParameters>) => void;
}

const LFOControls: React.FC<LFOControlsProps> = ({ sound, onChange }) => {
  const handleTargetChange = (value: string) => {
    onChange(sound.id, { 
      lfoTarget: value as 'pitch' | 'filter' | 'volume' | 'pan' 
    });
  };
  
  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-6">LFO Controls</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <Dropdown
            label="LFO Target"
            options={[
              { value: 'pitch', label: 'Pitch' },
              { value: 'filter', label: 'Filter Cutoff' },
              { value: 'volume', label: 'Volume' },
              { value: 'pan', label: 'Pan' },
            ]}
            value={sound.lfoTarget}
            onChange={handleTargetChange}
          />
          
          <div className="grid grid-cols-3 gap-6">
            <Knob
              label="Rate"
              value={sound.lfoRate}
              min={0.1}
              max={20}
              step={0.1}
              onChange={(value) => onChange(sound.id, { lfoRate: value })}
              color="accent"
              unit=" Hz"
            />
            
            <Knob
              label="Depth"
              value={sound.lfoDepth}
              min={0}
              max={1}
              step={0.01}
              onChange={(value) => onChange(sound.id, { lfoDepth: value })}
              color="accent"
            />
            
            <Knob
              label="Phase"
              value={sound.lfoPhase}
              min={0}
              max={360}
              step={1}
              onChange={(value) => onChange(sound.id, { lfoPhase: value })}
              color="accent"
              unit="°"
            />
          </div>
        </div>
        
        <div className="neumorphic-inset p-4">
          <div className="w-full h-40 relative">
            {/* LFO visualization */}
            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path
                d={`
                  M 0,50
                  ${Array.from({ length: 100 }).map((_, i) => {
                    const x = i;
                    const y = 50 - Math.sin((i / 100 * Math.PI * 2 * sound.lfoRate) + (sound.lfoPhase * Math.PI / 180)) * 40 * sound.lfoDepth;
                    return `L ${x},${y}`;
                  }).join(' ')}
                `}
                fill="none"
                stroke="#CF6679"
                strokeWidth="2"
              />
            </svg>
            
            {/* Center line */}
            <div className="absolute top-1/2 left-0 w-full h-px bg-white/20" />
            
            {/* Target label */}
            <div className="absolute top-2 right-2 text-xs text-accent">
              Target: {sound.lfoTarget}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LFOControls;