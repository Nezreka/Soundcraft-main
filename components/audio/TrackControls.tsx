import React from 'react';
import { Slider } from '@/components/ui/Slider';
import { Button } from '@/components/ui/Button';
import { TimelineTrack } from '@/types/audio';
import { FaVolumeUp, FaRandom } from 'react-icons/fa';

interface TrackControlsProps {
  track: TimelineTrack;
  onVolumeChange: (value: number) => void;
  onPanChange: (value: number) => void;
}

const TrackControls: React.FC<TrackControlsProps> = ({
  track,
  onVolumeChange,
  onPanChange,
}) => {
  return (
    <div className="flex items-center gap-4 p-2 neumorphic">
      <div className="flex items-center gap-2">
        <FaVolumeUp className="text-text-secondary" />
        <Slider
          value={track.volume}
          min={0}
          max={1}
          step={0.01}
          onChange={onVolumeChange}
          label=""
          showValue={false}
        />
      </div>
      
      <div className="flex items-center gap-2">
        <FaRandom className="text-text-secondary" />
        <Slider
          value={track.pan}
          min={-1}
          max={1}
          step={0.01}
          onChange={onPanChange}
          label=""
          showValue={false}
          bipolar
        />
      </div>
    </div>
  );
};

export default TrackControls;