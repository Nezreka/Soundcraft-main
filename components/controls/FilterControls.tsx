import React from 'react';
import { SoundParameters } from '@/types/audio';
import { Knob } from '@/components/ui/Knob';
import { Dropdown } from '@/components/ui/Dropdown';
import { formatFrequency } from '@/lib/utils/format';

interface FilterControlsProps {
  sound: SoundParameters;
  onChange: (id: string, updates: Partial<SoundParameters>) => void;
}

const FilterControls: React.FC<FilterControlsProps> = ({ sound, onChange }) => {
  const handleFilterTypeChange = (value: string) => {
    onChange(sound.id, { 
      filterType: value as 'lowpass' | 'highpass' | 'bandpass' | 'notch' 
    });
  };
  
  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-6">Filter Controls</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <Dropdown
            label="Filter Type"
            options={[
              { value: 'lowpass', label: 'Low Pass' },
              { value: 'highpass', label: 'High Pass' },
              { value: 'bandpass', label: 'Band Pass' },
              { value: 'notch', label: 'Notch' },
            ]}
            value={sound.filterType}
            onChange={handleFilterTypeChange}
          />
          
          <div className="grid grid-cols-2 gap-6">
            <Knob
              label="Cutoff"
              value={sound.filterCutoff}
              min={20}
              max={20000}
              step={1}
              onChange={(value) => onChange(sound.id, { filterCutoff: value })}
              color="secondary"
              unit=" Hz"
            />
            
            <Knob
              label="Resonance"
              value={sound.filterResonance}
              min={0.1}
              max={20}
              step={0.1}
              onChange={(value) => onChange(sound.id, { filterResonance: value })}
              color="secondary"
            />
          </div>
        </div>
        
        <div className="neumorphic-inset p-4 flex items-center justify-center">
          <div className="w-full h-40 relative">
            {/* Filter response visualization would go here */}
            <div className="absolute inset-0 flex items-center justify-center text-text-secondary">
              Filter Response Visualization
            </div>
            
            {/* X-axis labels */}
            <div className="absolute bottom-0 left-0 w-full flex justify-between text-xs text-text-secondary">
              <span>20Hz</span>
              <span>200Hz</span>
              <span>2kHz</span>
              <span>20kHz</span>
            </div>
            
            {/* Cutoff indicator */}
            <div 
              className="absolute bottom-0 w-px h-full bg-secondary"
              style={{ 
                left: `${Math.log10(sound.filterCutoff / 20) / 3 * 100}%` 
              }}
            >
              <div className="absolute top-0 transform -translate-x-1/2 text-xs text-secondary">
                {formatFrequency(sound.filterCutoff)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilterControls;