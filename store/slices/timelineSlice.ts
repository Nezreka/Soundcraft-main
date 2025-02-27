import { StateCreator } from 'zustand';
import { TimelineTrack, TimelineClip, TimelineState, SoundParameters } from '@/types/audio';
import { TimelinePreset } from '@/types/preset';
import { v4 as uuidv4 } from 'uuid';

export interface TimelineSlice {
  timeline: TimelineState;
  timelinePresets: TimelinePreset[];
  
  // Track management
  addTrack: (soundId: string, name: string) => void;
  removeTrack: (trackId: string) => void;
  updateTrack: (trackId: string, updates: Partial<TimelineTrack>) => void;
  
  // Clip management
  addClip: (trackId: string, startTime: number, duration: number) => void;
  removeClip: (trackId: string, clipId: string) => void;
  updateClip: (trackId: string, clipId: string, updates: Partial<TimelineClip>) => void;
  moveClip: (trackId: string, clipId: string, newStartTime: number) => void;
  
  // Playback control
  setCurrentTime: (time: number) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  seekForward: (seconds: number) => void;
  seekBackward: (seconds: number) => void;
  
  // Loop control
  setLoopPoints: (start: number, end: number) => void;
  toggleLoop: () => void;
  
  // Timeline presets
  saveTimelinePreset: (name: string) => void;
  loadTimelinePreset: (presetId: string) => void;
  deleteTimelinePreset: (presetId: string) => void;
  
  // Timeline visibility
  toggleTimelineVisibility: () => void;
  
  // Sound filtering for timeline
  filterSoundsByType: (type: string | null) => SoundParameters[];
  filterSoundsByName: (name: string) => SoundParameters[];
}

const initialTimelineState: TimelineState = {
  tracks: [],
  duration: 15, // 15 seconds total timeline duration
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
  
  // Track management
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
  
  // Clip management
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
  
  moveClip: (trackId, clipId, newStartTime) => {
    set(state => ({
      timeline: {
        ...state.timeline,
        tracks: state.timeline.tracks.map(track => 
          track.id === trackId 
            ? {
                ...track,
                clips: track.clips.map(clip => 
                  clip.id === clipId 
                    ? { ...clip, startTime: Math.max(0, newStartTime) }
                    : clip
                )
              }
            : track
        )
      }
    }));
  },
  
  // Playback control
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
  
  seekForward: (seconds) => {
    set(state => {
      const newTime = Math.min(
        state.timeline.currentTime + seconds,
        state.timeline.duration
      );
      
      return {
        timeline: {
          ...state.timeline,
          currentTime: newTime,
        }
      };
    });
  },
  
  seekBackward: (seconds) => {
    set(state => {
      const newTime = Math.max(state.timeline.currentTime - seconds, 0);
      
      return {
        timeline: {
          ...state.timeline,
          currentTime: newTime,
        }
      };
    });
  },
  
  // Loop control
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
  
  // Timeline presets
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
    
    // Replace the entire timeline with the preset timeline
    set(state => ({
      timeline: {
        ...state.timeline,
        tracks: preset.timeline.tracks.map(track => {
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
        duration: preset.timeline.duration || 15,
        currentTime: 0,
      }
    }));
  },
  
  deleteTimelinePreset: (presetId) => {
    set(state => ({
      timelinePresets: state.timelinePresets.filter(p => p.id !== presetId)
    }));
  },
  
  // Timeline visibility
  toggleTimelineVisibility: () => {
    // We'll implement this in the UI slice, but add the interface here
    // This will be used for collapsing/expanding the timeline
    console.log("Timeline visibility toggled");
  },
  
  // Sound filtering for timeline
  filterSoundsByType: (type) => {
    const sounds = get().sounds;
    if (!type) return sounds;
    
    return sounds.filter(sound => sound.type === type);
  },
  
  filterSoundsByName: (name) => {
    const sounds = get().sounds;
    if (!name.trim()) return sounds;
    
    const lowercaseName = name.toLowerCase();
    return sounds.filter(sound => 
      sound.name.toLowerCase().includes(lowercaseName)
    );
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