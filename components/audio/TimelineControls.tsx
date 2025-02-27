import React from 'react';
import { useStore } from '@/store';
import { Button } from '@/components/ui/Button';
import { formatTime } from '@/lib/utils/format';
import { 
  FaPlay, 
  FaPause, 
  FaStop, 
  FaStepBackward, 
  FaStepForward,
  FaRedo,
  FaPlus,
  FaFileExport
} from 'react-icons/fa';

const TimelineControls: React.FC = () => {
  const { 
    timeline, 
    setIsPlaying, 
    setCurrentTime, 
    toggleLoop,
    openExportModal
  } = useStore();
  
  const handlePlayPause = () => {
    setIsPlaying(!timeline.isPlaying);
  };
  
  const handleStop = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };
  
  const handleStepBackward = () => {
    // Step back by 1 second
    setCurrentTime(Math.max(0, timeline.currentTime - 1));
  };
  
  const handleStepForward = () => {
    // Step forward by 1 second
    setCurrentTime(Math.min(timeline.duration, timeline.currentTime + 1));
  };
  
  return (
    <div className="flex items-center gap-2">
      <div className="neumorphic px-3 py-1 text-sm">
        {formatTime(timeline.currentTime)} / {formatTime(timeline.duration)}
      </div>
      
      <div className="flex items-center neumorphic p-1">
        <Button variant="ghost" size="icon" onClick={handleStepBackward}>
          <FaStepBackward />
        </Button>
        
        <Button variant="ghost" size="icon" onClick={handlePlayPause}>
          {timeline.isPlaying ? <FaPause /> : <FaPlay />}
        </Button>
        
        <Button variant="ghost" size="icon" onClick={handleStop}>
          <FaStop />
        </Button>
        
        <Button variant="ghost" size="icon" onClick={handleStepForward}>
          <FaStepForward />
        </Button>
      </div>
      
      <Button 
        variant="neumorphic" 
        size="icon" 
        onClick={toggleLoop}
        className={timeline.loop.enabled ? 'text-primary' : ''}
      >
        <FaRedo />
      </Button>
      
      <Button variant="neumorphic" size="icon" onClick={openExportModal}>
        <FaFileExport />
      </Button>
    </div>
  );
};

export default TimelineControls;