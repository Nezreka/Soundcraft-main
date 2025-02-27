import React from 'react';
import { SoundParameters } from '@/types/audio';
import { Knob } from '@/components/ui/Knob';
import { formatPercentage } from '@/lib/utils/format';

interface SpatialControlsProps {
  sound: SoundParameters;
  onChange: (id: string, updates: Partial<SoundParameters>) => void;
}

const SpatialControls: React.FC<SpatialControlsProps> = ({ sound, onChange }) => {
  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-6">Spatial Controls</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="flex justify-center">
          <Knob
            label="Stereo Width"
            value={sound.stereoWidth}
            min={0}
            max={2}
            step={0.01}
            onChange={(value) => onChange(sound.id, { stereoWidth: value })}
            size="lg"
          />
        </div>
        
        <div className="neumorphic-inset p-4">
          <div className="w-full h-40 relative">
            {/* Stereo field visualization */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div 
                className="rounded-full border-2 border-primary flex items-center justify-center"
                style={{ 
                  width: `${Math.min(100, sound.stereoWidth * 70)}%`,
                  height: `${Math.min(100, sound.stereoWidth * 70)}%`,
                  opacity: 0.7
                }}
              >
                <div className="w-3 h-3 rounded-full bg-primary" />
              </div>
            </div>
            
            {/* Labels */}
            <div className="absolute top-2 left-2 text-xs text-primary">
              Width: {formatPercentage(sound.stereoWidth)}
            </div>
            
            {/* Left/Right indicators */}
            <div className="absolute bottom-2 left-0 w-full flex justify-between text-xs text-text-secondary">
              <span>L</span>
              <span>R</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpatialControls;