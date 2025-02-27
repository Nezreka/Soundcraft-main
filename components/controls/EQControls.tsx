import React from 'react';
import { SoundParameters } from '@/types/audio';
import { Knob } from '@/components/ui/Knob';
import { formatDb } from '@/lib/utils/format';

interface EQControlsProps {
  sound: SoundParameters;
  onChange: (id: string, updates: Partial<SoundParameters>) => void;
}

const EQControls: React.FC<EQControlsProps> = ({ sound, onChange }) => {
  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-6">Equalizer</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="grid grid-cols-3 gap-6 place-items-center">
          <Knob
            label="Low"
            value={sound.eqLow}
            min={-12}
            max={12}
            step={0.5}
            onChange={(value) => onChange(sound.id, { eqLow: value })}
            color="secondary"
            bipolar
            unit=" dB"
          />
          
          <Knob
            label="Mid"
            value={sound.eqMid}
            min={-12}
            max={12}
            step={0.5}
            onChange={(value) => onChange(sound.id, { eqMid: value })}
            color="secondary"
            bipolar
            unit=" dB"
          />
          
          <Knob
            label="High"
            value={sound.eqHigh}
            min={-12}
            max={12}
            step={0.5}
            onChange={(value) => onChange(sound.id, { eqHigh: value })}
            color="secondary"
            bipolar
            unit=" dB"
          />
        </div>
        
        <div className="neumorphic-inset p-4">
          <div className="w-full h-40 relative">
            {/* EQ curve visualization */}
            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
              {/* Center line (0 dB) */}
              <line
                x1="0"
                y1="50"
                x2="100"
                y2="50"
                stroke="#333"
                strokeWidth="1"
                strokeDasharray="2,2"
              />
              
              {/* EQ curve */}
              <path
                d={`
                  M 0,${50 - sound.eqLow * 2}
                  C 20,${50 - sound.eqLow * 2} 30,${50 - sound.eqMid * 2} 50,${50 - sound.eqMid * 2}
                  C 70,${50 - sound.eqMid * 2} 80,${50 - sound.eqHigh * 2} 100,${50 - sound.eqHigh * 2}
                `}
                fill="none"
                stroke="#03DAC6"
                strokeWidth="2"
              />
              
              {/* Frequency bands */}
              <line x1="33" y1="0" x2="33" y2="100" stroke="#333" strokeWidth="1" strokeDasharray="2,2" />
              <line x1="66" y1="0" x2="66" y2="100" stroke="#333" strokeWidth="1" strokeDasharray="2,2" />
            </svg>
            
            {/* Labels */}
            <div className="absolute bottom-0 left-0 w-full flex justify-between text-xs text-text-secondary">
              <span>100Hz</span>
              <span>1kHz</span>
              <span>10kHz</span>
            </div>
            
            {/* dB markers */}
            <div className="absolute top-0 right-0 h-full flex flex-col justify-between text-xs text-text-secondary">
              <span>+12dB</span>
              <span>0dB</span>
              <span>-12dB</span>
            </div>
            
            {/* Values */}
            <div className="absolute top-2 left-2 space-y-1">
              <div className="text-xs text-secondary">Low: {formatDb(sound.eqLow)}</div>
              <div className="text-xs text-secondary">Mid: {formatDb(sound.eqMid)}</div>
              <div className="text-xs text-secondary">High: {formatDb(sound.eqHigh)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EQControls;