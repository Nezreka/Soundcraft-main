import React from 'react';
import { SoundParameters } from '@/types/audio';
import { Knob } from '@/components/ui/Knob';
import { formatDb } from '@/lib/utils/format';

interface DynamicsControlsProps {
  sound: SoundParameters;
  onChange: (id: string, updates: Partial<SoundParameters>) => void;
}

const DynamicsControls: React.FC<DynamicsControlsProps> = ({ sound, onChange }) => {
  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-6">Dynamics</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="grid grid-cols-2 gap-6">
          <Knob
            label="Threshold"
            value={sound.compressionThreshold}
            min={-60}
            max={0}
            step={0.5}
            onChange={(value) => onChange(sound.id, { compressionThreshold: value })}
            unit=" dB"
          />
          
          <Knob
            label="Ratio"
            value={sound.compressionRatio}
            min={1}
            max={20}
            step={0.1}
            onChange={(value) => onChange(sound.id, { compressionRatio: value })}
            unit=":1"
          />
          
          <Knob
            label="Attack"
            value={sound.compressionAttack}
            min={0.001}
            max={0.5}
            step={0.001}
            onChange={(value) => onChange(sound.id, { compressionAttack: value })}
            unit=" s"
          />
          
          <Knob
            label="Release"
            value={sound.compressionRelease}
            min={0.01}
            max={2}
            step={0.01}
            onChange={(value) => onChange(sound.id, { compressionRelease: value })}
            unit=" s"
          />
        </div>
        
        <div className="neumorphic-inset p-4">
          <div className="w-full h-40 relative">
            {/* Compression curve visualization */}
            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
              {/* Grid lines */}
              <line x1="0" y1="0" x2="0" y2="100" stroke="#333" strokeWidth="1" />
              <line x1="0" y1="100" x2="100" y2="100" stroke="#333" strokeWidth="1" />
              
              {/* Threshold line */}
              <line
                x1="0"
                y1={(100 - ((-sound.compressionThreshold) / 60) * 100)}
                x2="100"
                y2={(100 - ((-sound.compressionThreshold) / 60) * 100)}
                stroke="#BB86FC"
                strokeWidth="1"
                strokeDasharray="2,2"
              />
              
              {/* 1:1 line (no compression) */}
              <line
                x1="0"
                y1="100"
                x2="100"
                y2="0"
                stroke="#333"
                strokeWidth="1"
                strokeDasharray="2,2"
              />
              
              {/* Compression curve */}
              <path
                d={`
                  M 0,100
                  L ${((-sound.compressionThreshold) / 60) * 100},${100 - ((-sound.compressionThreshold) / 60) * 100}
                  L 100,${100 - ((-sound.compressionThreshold) / 60) * 100 - (100 - ((-sound.compressionThreshold) / 60) * 100) / sound.compressionRatio}
                `}
                fill="none"
                stroke="#BB86FC"
                strokeWidth="2"
              />
            </svg>
            
            {/* Labels */}
            <div className="absolute bottom-0 left-0 w-full flex justify-between text-xs text-text-secondary">
              <span>-60dB</span>
              <span>-30dB</span>
              <span>0dB</span>
            </div>
            
            {/* Output labels */}
            <div className="absolute top-0 left-0 h-full flex flex-col justify-between text-xs text-text-secondary">
              <span>0dB</span>
              <span>-30dB</span>
              <span>-60dB</span>
            </div>
            
            {/* Threshold marker */}
            <div 
              className="absolute text-xs text-primary"
              style={{ 
                left: '2px', 
                top: `${(100 - ((-sound.compressionThreshold) / 60) * 100)}%`,
                transform: 'translateY(-50%)'
              }}
            >
              {formatDb(sound.compressionThreshold)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DynamicsControls;