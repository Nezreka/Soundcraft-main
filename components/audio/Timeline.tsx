import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '@/store';
import { formatTime } from '@/lib/utils/format';
import { Button } from '@/components/ui/Button';
import Track from './Track';
import TimelineControls from './TimelineControls';
import { useTimeline } from '@/lib/hooks/useTimeline';
import AddSoundModal from '@/components/modals/AddSoundModal';
import { FaChevronUp, FaChevronDown, FaPlus } from 'react-icons/fa';

const Timeline: React.FC = () => {
  const { 
    timeline, 
    timelineHeight, 
    timelineExpanded,
    setTimelineHeight, 
    toggleTimelineExpanded,
    setCurrentTime,
    setIsPlaying
  } = useStore();
  
  // State for modal visibility
  const [addSoundModalOpen, setAddSoundModalOpen] = useState(false);
  
  // Refs
  const timelineRef = useRef<HTMLDivElement>(null);
  const tracksContainerRef = useRef<HTMLDivElement>(null);
  
  // State for dragging/resizing
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [startHeight, setStartHeight] = useState(0);
  
  // Init timeline functionality
  const { seek } = useTimeline();
  
  // Handle timeline resize
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setStartY(e.clientY);
    setStartHeight(timelineHeight);
  };
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const deltaY = startY - e.clientY;
      const newHeight = Math.max(200, Math.min(800, startHeight + deltaY));
      
      setTimelineHeight(newHeight);
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
    };
    
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, startY, startHeight, setTimelineHeight]);
  
  // Handle timeline ruler click (position playhead)
  const handleTimelineClick = (e: React.MouseEvent) => {
    if (!timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * timeline.duration;
    
    // Update both the store state and the transport position
    setCurrentTime(newTime);
    seek(newTime);
  };
  
  // Update all track containers when timeline time markers change
  const syncScrollPositions = () => {
    if (!tracksContainerRef.current) return;
    
    // Get all track containers
    const trackContainers = tracksContainerRef.current.querySelectorAll('.track-container');
    
    // Sync horizontal scroll across all tracks
    // This keeps time markers aligned when scrolling horizontally
    const scrollLeft = tracksContainerRef.current.scrollLeft;
    trackContainers.forEach(container => {
      (container as HTMLElement).scrollLeft = scrollLeft;
    });
  };
  
  return (
    <div 
      className="relative bg-surface border-t border-white/10 transition-height duration-300 ease-in-out overflow-hidden"
      style={{ height: timelineExpanded ? `${timelineHeight}px` : '50px' }}
    >
      {/* Resize handle */}
      <div 
        className="absolute top-0 left-0 right-0 h-2 cursor-ns-resize flex justify-center items-center z-10"
        onMouseDown={handleResizeStart}
      >
        <div className="w-16 h-1 bg-white/20 rounded-full" />
      </div>
      
      {/* Timeline header bar - always visible even when collapsed */}
      <div className="sticky top-0 left-0 right-0 p-2 z-10 backdrop-blur-sm border-b border-white/10 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Timeline</h2>
        
        <div className="flex items-center gap-2">
          {/* Expand/collapse button - only show this button */}
          <Button 
            variant="ghost" 
            size="icon"
            onClick={toggleTimelineExpanded}
            title={timelineExpanded ? "Collapse timeline" : "Expand timeline"}
          >
            {timelineExpanded ? <FaChevronDown /> : <FaChevronUp />}
          </Button>
        </div>
      </div>
      
      {/* Timeline content - only fully visible when expanded */}
      <div className="p-4 pt-12 h-full flex flex-col overflow-y-auto">
        {timelineExpanded && (
          <>
            <div className="mb-4">
              <TimelineControls />
            </div>
            
            {/* Tracks container */}
            <div 
              ref={tracksContainerRef}
              className="flex-1 overflow-y-auto pr-2"
              onScroll={syncScrollPositions}
            >
              {timeline.tracks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-12 text-text-secondary">
                  <p className="mb-4">No tracks added yet.</p>
                  <Button
                    variant="outline"
                    onClick={() => setAddSoundModalOpen(true)}
                    className="flex items-center"
                  >
                    <FaPlus className="mr-2" /> Add Your First Sound
                  </Button>
                  
                  {/* Add the modal */}
                  <AddSoundModal 
                    isOpen={addSoundModalOpen} 
                    onClose={() => setAddSoundModalOpen(false)} 
                  />
                </div>
              ) : (
                <div className="space-y-1">
                  {timeline.tracks.map(track => (
                    <Track key={track.id} track={track} />
                  ))}
                </div>
              )}
            </div>
            
            {/* Timeline ruler */}
            <div 
              ref={timelineRef}
              className="h-8 mt-2 relative glass-panel backdrop-blur-sm"
              onClick={handleTimelineClick}
            >
              {/* Time markers */}
              {Array.from({ length: Math.ceil(timeline.duration / 5) + 1 }).map((_, i) => (
                <div 
                  key={i} 
                  className="absolute top-0 h-full flex flex-col items-center"
                  style={{ left: `${(i * 5 / timeline.duration) * 100}%` }}
                >
                  <div className="h-3 w-px bg-white/30" />
                  <span className="text-xs text-text-secondary">
                    {formatTime(i * 5)}
                  </span>
                </div>
              ))}
              
              {/* Playhead */}
              <div 
                className="absolute top-0 h-full w-px bg-primary z-10"
                style={{ left: `${(timeline.currentTime / timeline.duration) * 100}%` }}
              >
                <div className="absolute -top-1 -translate-x-1/2 w-3 h-3 bg-primary rounded-full" />
              </div>
              
              {/* Loop region */}
              {timeline.loop.enabled && (
                <div 
                  className="absolute top-0 h-full bg-primary/20"
                  style={{ 
                    left: `${(timeline.loop.start / timeline.duration) * 100}%`,
                    width: `${((timeline.loop.end - timeline.loop.start) / timeline.duration) * 100}%`
                  }}
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Timeline;