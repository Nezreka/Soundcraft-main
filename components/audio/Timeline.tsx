import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '@/store';
import { formatTime } from '@/lib/utils/format';
import { Button } from '@/components/ui/Button';
import Track from './Track';
import TimelineControls from './TimelineControls';
import { FaChevronUp, FaChevronDown } from 'react-icons/fa';

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
  
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [startHeight, setStartHeight] = useState(0);
  
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
      const newHeight = startHeight + deltaY;
      
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
  
  // Handle timeline playhead positioning
  const handleTimelineClick = (e: React.MouseEvent) => {
    if (!timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * timeline.duration;
    
    setCurrentTime(newTime);
  };
  
  return (
    <div 
      className="relative bg-surface border-t border-white/10"
      style={{ height: `${timelineHeight}px` }}
    >
      {/* Resize handle */}
      <div 
        className="absolute top-0 left-0 right-0 h-2 cursor-ns-resize flex justify-center items-center"
        onMouseDown={handleResizeStart}
      >
        <div className="w-16 h-1 bg-white/20 rounded-full" />
      </div>
      
      {/* Expand/collapse button */}
      <Button 
        variant="ghost" 
        size="icon"
        onClick={toggleTimelineExpanded}
        className="absolute top-3 right-3 z-10"
      >
        {timelineExpanded ? <FaChevronDown /> : <FaChevronUp />}
      </Button>
      
      {/* Timeline content */}
      <div className="p-4 pt-6 h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Timeline</h2>
          <TimelineControls />
        </div>
        
        {/* Tracks container */}
        <div className="flex-1 overflow-y-auto">
          {timeline.tracks.length === 0 ? (
            <div className="flex items-center justify-center h-full text-text-secondary">
              No tracks added. Click on a sound card to create a sound.
            </div>
          ) : (
            <div className="space-y-2">
              {timeline.tracks.map(track => (
                <Track key={track.id} track={track} />
              ))}
            </div>
          )}
        </div>
        
        {/* Timeline ruler */}
        <div 
          ref={timelineRef}
          className="h-6 mt-2 relative neumorphic-inset"
          onClick={handleTimelineClick}
        >
          {/* Time markers */}
          {Array.from({ length: Math.ceil(timeline.duration / 5) + 1 }).map((_, i) => (
            <div 
              key={i} 
              className="absolute top-0 h-full flex flex-col items-center"
              style={{ left: `${(i * 5 / timeline.duration) * 100}%` }}
            >
              <div className="h-2 w-px bg-white/30" />
              <span className="text-xs text-text-secondary">
                {formatTime(i * 5)}
              </span>
            </div>
          ))}
          
          {/* Playhead */}
          <div 
            className="absolute top-0 h-full w-px bg-primary"
            style={{ left: `${(timeline.currentTime / timeline.duration) * 100}%` }}
          >
            <div className="absolute -top-1 -translate-x-1/2 w-2 h-2 bg-primary rounded-full" />
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
      </div>
    </div>
  );
};

export default Timeline;