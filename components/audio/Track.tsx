import React from 'react';
import { useStore } from '@/store';
import { TimelineTrack } from '@/types/audio';
import { Slider } from '@/components/ui/Slider';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import { FaTrash, FaVolumeUp, FaVolumeMute } from 'react-icons/fa';

interface TrackProps {
  track: TimelineTrack;
}

const Track: React.FC<TrackProps> = ({ track }) => {
  const { 
    updateTrack, 
    removeTrack, 
    timeline,
    addClip
  } = useStore();
  
  const handleVolumeChange = (value: number) => {
    updateTrack(track.id, { volume: value });
  };
  
  const handlePanChange = (value: number) => {
    updateTrack(track.id, { pan: value });
  };
  
  const handleMuteToggle = () => {
    updateTrack(track.id, { muted: !track.muted });
  };
  
  const handleSoloToggle = () => {
    updateTrack(track.id, { solo: !track.solo });
  };
  
  const handleAddClip = () => {
    // Add a new clip at the current playhead position
    addClip(track.id, timeline.currentTime, 4); // 4 seconds default duration
  };
  
  return (
    <div className="flex flex-col">
      {/* Track header */}
      <div className="flex items-center gap-2 p-2 neumorphic mb-1">
        <div 
          className="w-3 h-full rounded-full" 
          style={{ backgroundColor: track.color }}
        />
        
        <div className="flex-1 font-medium truncate">{track.name}</div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleMuteToggle}
            className={track.muted ? 'text-accent' : ''}
          >
            {track.muted ? <FaVolumeMute /> : <FaVolumeUp />}
          </Button>
          
          <Switch 
            checked={track.solo}
            onChange={handleSoloToggle}
            label="S"
            size="sm"
          />
          
          <Slider 
            value={track.volume}
            min={0}
            max={1}
            step={0.01}
            onChange={handleVolumeChange}
            label=""
            showValue={false}
          />
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => removeTrack(track.id)}
          >
            <FaTrash />
          </Button>
        </div>
      </div>
      
      {/* Track clips area */}
      <div 
        className="h-16 relative neumorphic-inset"
        onClick={handleAddClip}
      >
        {track.clips.map(clip => (
          <div 
            key={clip.id}
            className="absolute top-0 h-full rounded-md"
            style={{
              left: `${(clip.startTime / timeline.duration) * 100}%`,
              width: `${(clip.duration / timeline.duration) * 100}%`,
              backgroundColor: track.color,
              opacity: track.muted ? 0.5 : 0.8
            }}
          >
            <div className="p-1 text-xs truncate text-white">
              {track.name}
            </div>
          </div>
        ))}
        
        {track.clips.length === 0 && (
          <div className="flex items-center justify-center h-full text-xs text-text-secondary">
            Click to add a clip
          </div>
        )}
      </div>
    </div>
  );
};

export default Track;