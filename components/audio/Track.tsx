import React, { useState, useRef } from 'react';
import { useStore } from '@/store';
import { TimelineTrack, TimelineClip } from '@/types/audio';
import { Slider } from '@/components/ui/Slider';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import { cn } from '@/lib/utils/format';
import { FaTrash, FaVolumeUp, FaVolumeMute, FaTimes } from 'react-icons/fa';

interface TrackProps {
  track: TimelineTrack;
}

const Track: React.FC<TrackProps> = ({ track }) => {
  const { 
    updateTrack, 
    removeTrack, 
    timeline,
    addClip,
    removeClip,
    moveClip
  } = useStore();
  
  // State for clip dragging
  const [draggingClipId, setDraggingClipId] = useState<string | null>(null);
  const [dragStartX, setDragStartX] = useState(0);
  const [clipStartTime, setClipStartTime] = useState(0);
  
  // Refs
  const trackAreaRef = useRef<HTMLDivElement>(null);
  
  // Handle volume and pan changes
  const handleVolumeChange = (value: number) => {
    updateTrack(track.id, { volume: value });
  };
  
  const handleMuteToggle = () => {
    updateTrack(track.id, { muted: !track.muted });
  };
  
  const handleSoloToggle = () => {
    updateTrack(track.id, { solo: !track.solo });
  };
  
  // Add a clip when clicking on the track
  const handleTrackClick = (e: React.MouseEvent) => {
    if (!trackAreaRef.current) return;
    
    // Get click position relative to track area
    const rect = trackAreaRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const trackWidth = rect.width;
    
    // Calculate time position
    const clickTime = (clickX / trackWidth) * timeline.duration;
    
    // Add a clip at the clicked position
    addClip(track.id, clickTime, 2); // 2 seconds default duration
  };
  
  // Start dragging a clip
  const handleClipDragStart = (e: React.MouseEvent, clip: TimelineClip) => {
    e.stopPropagation(); // Prevent track click
    
    setDraggingClipId(clip.id);
    setDragStartX(e.clientX);
    setClipStartTime(clip.startTime);
    
    // Setup global event listeners
    document.addEventListener('mousemove', handleClipDragMove);
    document.addEventListener('mouseup', handleClipDragEnd);
  };
  
  // Drag clip
  const handleClipDragMove = (e: MouseEvent) => {
    if (!draggingClipId || !trackAreaRef.current) return;
    
    const clip = track.clips.find(c => c.id === draggingClipId);
    if (!clip) return;
    
    // Calculate distance dragged
    const deltaX = e.clientX - dragStartX;
    
    // Convert to time
    const rect = trackAreaRef.current.getBoundingClientRect();
    const timePerPixel = timeline.duration / rect.width;
    const timeDelta = deltaX * timePerPixel;
    
    // Calculate new start time
    const newStartTime = Math.max(0, clipStartTime + timeDelta);
    
    // Update clip position
    moveClip(track.id, clip.id, newStartTime);
  };
  
  // End clip drag
  const handleClipDragEnd = () => {
    setDraggingClipId(null);
    
    // Remove global event listeners
    document.removeEventListener('mousemove', handleClipDragMove);
    document.removeEventListener('mouseup', handleClipDragEnd);
  };
  
  // Delete a clip
  const handleDeleteClip = (e: React.MouseEvent, clipId: string) => {
    e.stopPropagation();
    removeClip(track.id, clipId);
  };
  
  // Get sound info for this track
  const sound = useStore(state => 
    state.sounds.find(s => s.id === track.soundId)
  );
  
  return (
    <div className="flex flex-col mb-3">
      {/* Track header */}
      <div className="flex items-center gap-2 p-2 glass-panel mb-1 backdrop-blur-sm">
        <div 
          className="w-4 h-full rounded-full min-h-[20px]" 
          style={{ backgroundColor: track.color }}
        />
        
        <div className="flex-1 font-medium truncate">
          {track.name}
          {sound && (
            <span className="text-xs text-text-secondary ml-2">
              ({sound.type})
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleMuteToggle}
            className={track.muted ? 'text-accent' : ''}
            title={track.muted ? "Unmute" : "Mute"}
          >
            {track.muted ? <FaVolumeMute /> : <FaVolumeUp />}
          </Button>
          
          <Switch 
            checked={track.solo}
            onChange={handleSoloToggle}
            label="Solo"
            size="sm"
            title="Solo (play only this track)"
          />
          
          <Slider 
            value={track.volume}
            min={0}
            max={1}
            step={0.01}
            onChange={handleVolumeChange}
            label=""
            showValue={false}
            className="w-24"
          />
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => removeTrack(track.id)}
            className="text-red-500 hover:bg-red-500/10"
            title="Delete track"
          >
            <FaTrash />
          </Button>
        </div>
      </div>
      
      {/* Track clips area */}
      <div 
        ref={trackAreaRef}
        className="h-24 relative glass-panel backdrop-blur-sm"
        onClick={handleTrackClick}
      >
        {/* Timeline grid */}
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: Math.ceil(timeline.duration / 5) }).map((_, i) => (
            <div 
              key={i}
              className="absolute top-0 h-full border-l border-white/10"
              style={{ left: `${(i * 5 / timeline.duration) * 100}%` }}
            />
          ))}
        </div>
        
        {/* Current time indicator */}
        <div 
          className="absolute top-0 h-full w-px bg-primary z-10 pointer-events-none"
          style={{ left: `${(timeline.currentTime / timeline.duration) * 100}%` }}
        />
        
        {/* Clips */}
        {track.clips.map(clip => (
          <div 
            key={clip.id}
            className={cn(
              "absolute top-0 h-full rounded-md cursor-move",
              "glass-panel backdrop-blur-sm shadow-lg",
              draggingClipId === clip.id && "ring-2 ring-primary",
              track.muted && "opacity-50"
            )}
            style={{
              left: `${(clip.startTime / timeline.duration) * 100}%`,
              width: `${(clip.duration / timeline.duration) * 100}%`,
              backgroundColor: track.color,
            }}
            onMouseDown={(e) => handleClipDragStart(e, clip)}
          >
            <div className="p-2 text-xs truncate text-white flex justify-between items-center">
              <div>{track.name}</div>
              <Button
                variant="ghost"
                size="xs"
                className="text-white/70 hover:text-white hover:bg-red-500/20"
                onClick={(e) => handleDeleteClip(e, clip.id)}
              >
                <FaTimes />
              </Button>
            </div>
            
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-50 pointer-events-none" />
          </div>
        ))}
        
        {track.clips.length === 0 && (
          <div className="flex items-center justify-center h-full text-sm text-text-secondary">
            Click here to add a sound marker
          </div>
        )}
      </div>
    </div>
  );
};

export default Track;