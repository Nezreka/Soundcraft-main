import React, { useState } from 'react';
import { useStore } from '@/store';
import { Button } from '@/components/ui/Button';
import { formatTime } from '@/lib/utils/format';
import AddSoundModal from '@/components/modals/AddSoundModal';
import { 
  FaPlay, 
  FaPause, 
  FaStop, 
  FaStepBackward, 
  FaStepForward,
  FaRedo,
  FaPlus,
  FaSave,
  FaFolder,
  FaChevronUp,
  FaChevronDown,
  FaAngleDoubleLeft,
  FaAngleDoubleRight
} from 'react-icons/fa';

const TimelineControls: React.FC = () => {
  const { 
    timeline, 
    setIsPlaying, 
    setCurrentTime, 
    toggleLoop,
    toggleTimelineExpanded,
    timelineExpanded,
    seekForward,
    seekBackward
  } = useStore();
  
  // State for modals
  const [addSoundModalOpen, setAddSoundModalOpen] = useState(false);
  const [timelinePresetModalOpen, setTimelinePresetModalOpen] = useState(false);
  
  const handlePlayPause = async () => {
    console.log("Play/Pause clicked, current state:", timeline.isPlaying);
    
    try {
      // Import audio context initialization function
      const { initializeAudio, getAudioContext } = await import('@/lib/audio/audioContext');
      
      // When starting playback, ensure audio context is running
      if (!timeline.isPlaying) {
        console.log("Initializing audio context before playback");
        const success = await initializeAudio();
        console.log("Audio initialization result:", success);
        
        // If we're at the end of the timeline, reset to beginning
        if (timeline.currentTime >= timeline.duration - 0.1) {
          console.log("At end of timeline, resetting to beginning");
          setCurrentTime(0);
        }
        
        // Force immediate resume of audio context with a user interaction
        const audioContext = getAudioContext()?.context;
        if (audioContext) {
          await audioContext.resume();
          console.log("Audio context resumed by user interaction, state:", audioContext.state);
        }
      }
      
      console.log("Setting isPlaying to:", !timeline.isPlaying);
      setIsPlaying(!timeline.isPlaying);
    } catch (error) {
      console.error("Error in handlePlayPause:", error);
      // Try to continue anyway
      setIsPlaying(!timeline.isPlaying);
    }
  };
  
  const handleStop = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };
  
  const handleRewindOneSecond = () => {
    seekBackward(1);
  };
  
  const handleForwardOneSecond = () => {
    seekForward(1);
  };
  
  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        {/* Add sound button - most important action */}
        <Button 
          variant="primary" 
          onClick={() => setAddSoundModalOpen(true)}
          className="flex items-center"
        >
          <FaPlus className="mr-1" />
          Add Sound
        </Button>
        
        {/* Time display */}
        <div className="glass-panel px-3 py-1 text-sm">
          {formatTime(timeline.currentTime)} / {formatTime(timeline.duration)}
        </div>
        
        {/* Transport controls */}
        <div className="flex items-center glass-panel rounded-md p-1">
          <Button
            variant="ghost" 
            size="icon"
            title="Rewind 1s"
            onClick={handleRewindOneSecond}
          >
            <FaAngleDoubleLeft />
          </Button>
          
          <Button variant="ghost" size="icon" onClick={() => setCurrentTime(Math.max(0, timeline.currentTime - 0.1))} title="Step backward">
            <FaStepBackward />
          </Button>
          
          <Button variant="ghost" size="icon" onClick={handlePlayPause} title={timeline.isPlaying ? "Pause" : "Play"}>
            {timeline.isPlaying ? <FaPause /> : <FaPlay />}
          </Button>
          
          <Button variant="ghost" size="icon" onClick={handleStop} title="Stop">
            <FaStop />
          </Button>
          
          <Button variant="ghost" size="icon" onClick={() => setCurrentTime(Math.min(timeline.duration, timeline.currentTime + 0.1))} title="Step forward">
            <FaStepForward />
          </Button>
          
          <Button
            variant="ghost" 
            size="icon"
            title="Forward 1s"
            onClick={handleForwardOneSecond}
          >
            <FaAngleDoubleRight />
          </Button>
        </div>
        
        {/* Additional controls */}
        <div className="flex gap-2">
          <Button 
            variant="glass" 
            size="sm" 
            onClick={toggleLoop}
            className={timeline.loop.enabled ? 'text-primary' : ''}
            title={timeline.loop.enabled ? "Disable loop" : "Enable loop"}
          >
            <FaRedo className="mr-1" />
            Loop
          </Button>
          
          <Button 
            variant="glass" 
            size="sm" 
            onClick={() => setTimelinePresetModalOpen(true)}
            title="Save timeline preset"
          >
            <FaSave className="mr-1" />
            Save
          </Button>
          
          <Button 
            variant="glass" 
            size="sm" 
            onClick={() => setTimelinePresetModalOpen(true)}
            title="Load timeline preset"
          >
            <FaFolder className="mr-1" />
            Load
          </Button>
          
          <Button 
            variant="glass" 
            size="sm" 
            onClick={toggleTimelineExpanded}
            title={timelineExpanded ? "Collapse timeline" : "Expand timeline"}
          >
            {timelineExpanded ? (
              <>
                <FaChevronDown className="mr-1" />
                Collapse
              </>
            ) : (
              <>
                <FaChevronUp className="mr-1" />
                Expand
              </>
            )}
          </Button>
        </div>
      </div>
      
      {/* Modals */}
      <AddSoundModal
        isOpen={addSoundModalOpen}
        onClose={() => setAddSoundModalOpen(false)}
      />
    </>
  );
};

export default TimelineControls;