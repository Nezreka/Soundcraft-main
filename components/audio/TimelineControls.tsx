import React, { useState } from 'react';
import { useStore } from '@/store';
import { Button } from '@/components/ui/Button';
import { formatTime } from '@/lib/utils/format';
import { Modal } from '@/components/ui/Modal';
import { Slider } from '@/components/ui/Slider';
import { Switch } from '@/components/ui/Switch';
import { Dropdown } from '@/components/ui/Dropdown';
import AddSoundModal from '@/components/modals/AddSoundModal';
import TimelinePresetModal from './TimelinePresetModal';
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
  FaAngleDoubleRight,
  FaDownload,
  FaMusic,
  FaFile,
  FaFileAudio,
  FaSpinner
} from 'react-icons/fa';

// Interface for Timeline Export Modal props
interface TimelineExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Timeline Export Modal Component for WAV and MP3 export
const TimelineExportModal: React.FC<TimelineExportModalProps> = ({ isOpen, onClose }) => {
  const { timeline, sounds } = useStore();
  
  // State for export settings
  const [format, setFormat] = useState<'wav' | 'mp3'>('wav');
  const [quality, setQuality] = useState(0.8);
  const [normalize, setNormalize] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // Function to export timeline as audio
  const handleExport = async () => {
    try {
      setIsExporting(true);
      setProgress(0);
      
      // Calculate timeline end time (last clip end time + 0.5s)
      let lastEndTime = 0;
      
      timeline.tracks.forEach(track => {
        if (track.clips.length > 0) {
          track.clips.forEach(clip => {
            const clipEndTime = clip.startTime + clip.duration;
            if (clipEndTime > lastEndTime) {
              lastEndTime = clipEndTime;
            }
          });
        }
      });
      
      // Add 0.5 seconds for tail
      const exportDuration = Math.min(timeline.duration, lastEndTime + 0.5);
      
      // Import timeline export function
      const { exportTimeline } = await import('@/lib/audio/timelineExporter');
      
      // Progress callback function
      const onProgress = (percent: number) => {
        setProgress(percent);
      };
      
      // Export the timeline
      await exportTimeline({
        timeline,
        sounds,
        settings: {
          format,
          quality,
          normalize,
          duration: exportDuration
        },
        onProgress
      });
      
      setIsExporting(false);
      onClose();
    } catch (error) {
      console.error("Error exporting timeline:", error);
      setIsExporting(false);
    }
  };
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={!isExporting ? onClose : undefined}
      title="Export Timeline Audio"
    >
      <div className="p-6 space-y-6">
        {isExporting ? (
          <div className="text-center py-10 space-y-4">
            <FaSpinner className="animate-spin text-4xl mx-auto text-primary" />
            <h3 className="text-lg font-semibold">Exporting Timeline...</h3>
            <div className="w-full bg-surface-darker rounded-full h-2.5">
              <div 
                className="bg-primary h-2.5 rounded-full" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p>This may take a few moments. Please wait...</p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <Dropdown
                label="Export Format"
                options={[
                  { value: 'wav', label: 'WAV - Uncompressed (Highest Quality)' },
                  { value: 'mp3', label: 'MP3 - Compressed (Smaller File)' },
                ]}
                value={format}
                onChange={(value) => setFormat(value as 'wav' | 'mp3')}
              />
              
              <Slider
                label="Quality"
                min={0.1}
                max={1}
                step={0.1}
                value={quality}
                onChange={setQuality}
                unit="%"
                showValueAsPercentage
              />
              
              <Switch
                label="Normalize Audio"
                description="Adjust volume to optimal level"
                checked={normalize}
                onChange={setNormalize}
              />
              
              <div className="glass-panel p-4 rounded-md">
                <h4 className="font-medium mb-2">Export Details</h4>
                <ul className="space-y-1 text-sm text-text-secondary">
                  <li className="flex justify-between">
                    <span>Timeline Duration:</span>
                    <span>{formatTime(timeline.duration)}</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Active Tracks:</span>
                    <span>{timeline.tracks.length}</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Format:</span>
                    <span>{format.toUpperCase()}</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Quality:</span>
                    <span>{Math.round(quality * 100)}%</span>
                  </li>
                </ul>
              </div>
              
              <div className="flex justify-between mt-6 pt-4 border-t border-white/10">
                <Button 
                  variant="outline" 
                  onClick={onClose}
                  disabled={isExporting}
                >
                  Cancel
                </Button>
                
                <Button
                  onClick={handleExport}
                  disabled={isExporting || timeline.tracks.length === 0}
                  className="flex items-center"
                >
                  <FaFileAudio className="mr-2" />
                  Export {format.toUpperCase()}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

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
  const [presetModalMode, setPresetModalMode] = useState<'save' | 'load'>('save');
  const [exportModalOpen, setExportModalOpen] = useState(false);
  
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
  
  // Handle export functionality
  const handleExport = async () => {
    setExportModalOpen(true);
  };
  
  // Open Save Timeline Modal
  const handleSaveTimeline = () => {
    setPresetModalMode('save');
    setTimelinePresetModalOpen(true);
  };
  
  // Open Load Timeline Modal
  const handleLoadTimeline = () => {
    setPresetModalMode('load');
    setTimelinePresetModalOpen(true);
  };

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        {/* Add sound button - most important action */}
        {/* Using default variant which has primary styling */}
        <Button 
          variant="default"
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
            onClick={handleSaveTimeline}
            title="Save timeline preset"
          >
            <FaSave className="mr-1" />
            Save
          </Button>
          
          <Button 
            variant="glass" 
            size="sm" 
            onClick={handleLoadTimeline}
            title="Load timeline preset"
          >
            <FaFolder className="mr-1" />
            Load
          </Button>
          
          <Button 
            variant="glass" 
            size="sm" 
            onClick={handleExport}
            title="Export timeline to audio file"
            className="text-accent"
          >
            <FaDownload className="mr-1" />
            Export
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
      
      <TimelinePresetModal
        isOpen={timelinePresetModalOpen}
        onClose={() => setTimelinePresetModalOpen(false)}
        mode={presetModalMode}
      />
      
      {exportModalOpen && (
        <TimelineExportModal
          isOpen={exportModalOpen}
          onClose={() => setExportModalOpen(false)}
        />
      )}
    </>
  );
};

export default TimelineControls;