import { StateCreator } from 'zustand';
import { TimelineTrack, TimelineClip, TimelineState } from '@/types/audio';
import { TimelinePreset } from '@/types/preset';
import { v4 as uuidv4 } from 'uuid';

export interface TimelineSlice {
  timeline: TimelineState;
  timelinePresets: TimelinePreset[];
  
  addTrack: (soundId: string, name: string) => void;
  removeTrack: (trackId: string) => void;
  updateTrack: (trackId: string, updates: Partial<TimelineTrack>) => void;
  
  addClip: (trackId: string, startTime: number, duration: number) => void;
  removeClip: (trackId: string, clipId: string) => void;
  updateClip: (trackId: string, clipId: string, updates: Partial<TimelineClip>) => void;
  
  setCurrentTime: (time: number) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setLoopPoints: (start: number, end: number) => void;
  toggleLoop: () => void;
  
  saveTimelinePreset: (name: string) => void;
  loadTimelinePreset: (presetId: string) => void;
  deleteTimelinePreset: (presetId: string) => void;
}

const initialTimelineState: TimelineState = {
  tracks: [],
  duration: 60,
  currentTime: 0,
  isPlaying: false,
  loop: {
    enabled: false,
    start: 0,
    end: 4,
  },
};

export const timelineSlice: StateCreator<TimelineSlice> = (set, get) => ({
  timeline: initialTimelineState,
  timelinePresets: [],
  
  addTrack: (soundId, name) => {
    const newTrack: TimelineTrack = {
      id: uuidv4(),
      soundId,
      name,
      color: getRandomColor(),
      muted: false,
      solo: false,
      volume: 0.8,
      pan: 0,
      clips: [],
    };
    
    set(state => ({
      timeline: {
        ...state.timeline,
        tracks: [...state.timeline.tracks, newTrack],
      }
    }));
  },
  
  removeTrack: (trackId) => {
    set(state => ({
      timeline: {
        ...state.timeline,
        tracks: state.timeline.tracks.filter(track => track.id !== trackId),
      }
    }));
  },
  
  updateTrack: (trackId, updates) => {
    set(state => ({
      timeline: {
        ...state.timeline,
        tracks: state.timeline.tracks.map(track => 
          track.id === trackId ? { ...track, ...updates } : track
        ),
      }
    }));
  },
  
  addClip: (trackId, startTime, duration) => {
    const newClip: TimelineClip = {
      id: uuidv4(),
      startTime,
      duration,
      offset: 0,
    };
    
    set(state => ({
      timeline: {
        ...state.timeline,
        tracks: state.timeline.tracks.map(track => 
          track.id === trackId 
            ? { ...track, clips: [...track.clips, newClip] } 
            : track
        ),
      }
    }));
  },
  
  removeClip: (trackId, clipId) => {
    set(state => ({
      timeline: {
        ...state.timeline,
        tracks: state.timeline.tracks.map(track => 
          track.id === trackId 
            ? { ...track, clips: track.clips.filter(clip => clip.id !== clipId) } 
            : track
        ),
      }
    }));
  },
  
  updateClip: (trackId, clipId, updates) => {
    set(state => ({
      timeline: {
        ...state.timeline,
        tracks: state.timeline.tracks.map(track => 
          track.id === trackId 
            ? { 
                ...track, 
                clips: track.clips.map(clip => 
                  clip.id === clipId ? { ...clip, ...updates } : clip
                ) 
              } 
            : track
        ),
      }
    }));
  },
  
  setCurrentTime: (time) => {
    set(state => ({
      timeline: {
        ...state.timeline,
        currentTime: Math.max(0, Math.min(time, state.timeline.duration)),
      }
    }));
  },
  
  setIsPlaying: (isPlaying) => {
    set(state => ({
      timeline: {
        ...state.timeline,
        isPlaying,
      }
    }));
  },
  
  setLoopPoints: (start, end) => {
    set(state => ({
      timeline: {
        ...state.timeline,
        loop: {
          ...state.timeline.loop,
          start,
          end,
        }
      }
    }));
  },
  
  toggleLoop: () => {
    set(state => ({
      timeline: {
        ...state.timeline,
        loop: {
          ...state.timeline.loop,
          enabled: !state.timeline.loop.enabled,
        }
      }
    }));
  },
  
  saveTimelinePreset: (name) => {
    const { tracks, duration } = get().timeline;
    
    const preset: TimelinePreset = {
      id: uuidv4(),
      name,
      timeline: {
        tracks: tracks.map(track => ({
          id: track.id,
          soundId: track.soundId,
          clips: track.clips.map(clip => ({
            id: clip.id,
            startTime: clip.startTime,
            duration: clip.duration,
            offset: clip.offset,
          })),
        })),
        duration,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    set(state => ({
      timelinePresets: [...state.timelinePresets, preset]
    }));
  },
  
  loadTimelinePreset: (presetId) => {
    const preset = get().timelinePresets.find(p => p.id === presetId);
    if (!preset) return;
    
    // Preserve current tracks but add the preset tracks
    set(state => ({
      timeline: {
        ...state.timeline,
        tracks: [
          ...state.timeline.tracks,
          ...preset.timeline.tracks.map(track => {
            // Generate new IDs to avoid conflicts
            const newTrackId = uuidv4();
            return {
              id: newTrackId,
              soundId: track.soundId,
              name: `Track ${state.timeline.tracks.length + 1}`,
              color: getRandomColor(),
              muted: false,
              solo: false,
              volume: 0.8,
              pan: 0,
              clips: track.clips.map(clip => ({
                id: uuidv4(),
                startTime: clip.startTime,
                duration: clip.duration,
                offset: clip.offset,
              })),
            } as TimelineTrack;
          }),
        ],
        duration: Math.max(state.timeline.duration, preset.timeline.duration),
      }
    }));
  },
  
  deleteTimelinePreset: (presetId) => {
    set(state => ({
      timelinePresets: state.timelinePresets.filter(p => p.id !== presetId)
    }));
  },
});

// Helper function to generate random colors for tracks
function getRandomColor() {
  const colors = [
    '#BB86FC', // Primary
    '#03DAC6', // Secondary
    '#CF6679', // Accent
    '#3700B3', // Purple
    '#018786', // Teal
    '#B00020', // Red
    '#6200EE', // Deep Purple
    '#FF7597', // Pink
  ];
  
  return colors[Math.floor(Math.random() * colors.length)];
}