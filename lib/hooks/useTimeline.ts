import { useState, useEffect, useRef } from 'react';
import { useStore } from '@/store';
import { ensureAudioContext } from '@/lib/audio/audioContext';
import * as Tone from 'tone';

// Hook for managing timeline playback
export function useTimeline() {
  const { 
    timeline, 
    sounds, 
    setCurrentTime,
    setIsPlaying
  } = useStore();
  
  // Use typeof Tone.Transport to get the correct type
  const transportRef = useRef<typeof Tone.Transport>(Tone.Transport);
  const scheduledEventsRef = useRef<number[]>([]);
  
  // Initialize timeline
  useEffect(() => {
    const initTimeline = async () => {
      // Ensure audio context is running
      await ensureAudioContext();
      
      // Set up transport
      transportRef.current.bpm.value = 120;
      transportRef.current.timeSignature = [4, 4];
      
      // Set up loop if enabled
      if (timeline.loop.enabled) {
        transportRef.current.setLoopPoints(timeline.loop.start, timeline.loop.end);
        transportRef.current.loop = true;
      } else {
        transportRef.current.loop = false;
      }
    };
    
    initTimeline();
    
    // Update current time when transport position changes
    const interval = setInterval(() => {
      if (timeline.isPlaying) {
        const currentTime = transportRef.current.seconds;
        setCurrentTime(currentTime);
      }
    }, 16); // ~60fps
    
    return () => {
      clearInterval(interval);
      
      // Clean up scheduled events
      scheduledEventsRef.current.forEach(id => {
        transportRef.current.clear(id);
      });
      scheduledEventsRef.current = [];
      
      // Stop transport
      transportRef.current.stop();
    };
  }, []);
  
  // Update loop settings when they change
  useEffect(() => {
    if (timeline.loop.enabled) {
      transportRef.current.setLoopPoints(timeline.loop.start, timeline.loop.end);
      transportRef.current.loop = true;
    } else {
      transportRef.current.loop = false;
    }
  }, [timeline.loop]);
  
  // Update playback state when isPlaying changes
  useEffect(() => {
    if (timeline.isPlaying) {
      transportRef.current.start();
    } else {
      transportRef.current.pause();
    }
  }, [timeline.isPlaying]);
  
  // Schedule clips when tracks change
  useEffect(() => {
    // Clear previous events
    scheduledEventsRef.current.forEach(id => {
      transportRef.current.clear(id);
    });
    scheduledEventsRef.current = [];
    
    // Schedule new events
    timeline.tracks.forEach(track => {
      const sound = sounds.find(s => s.id === track.soundId);
      if (!sound) return;
      
      track.clips.forEach(clip => {
        // Schedule clip start
        const startId = transportRef.current.schedule((time) => {
          // Here we would trigger the sound to play
          // For now, just log it
          console.log(`Playing clip ${clip.id} at ${time}`);
        }, clip.startTime);
        
        // Schedule clip end
        const endId = transportRef.current.schedule((time) => {
          // Here we would stop the sound
          console.log(`Stopping clip ${clip.id} at ${time}`);
        }, clip.startTime + clip.duration);
        
        scheduledEventsRef.current.push(startId, endId);
      });
    });
  }, [timeline.tracks, sounds]);
  
  // Seek to a specific time
  const seek = (time: number) => {
    transportRef.current.seconds = time;
    setCurrentTime(time);
  };
  
  return {
    seek,
    transport: transportRef.current
  };
}