// store/slices/soundsSlice.ts
import { StateCreator } from 'zustand';
import { SoundParameters, SoundType } from '@/types/audio';
import { Preset } from '@/types/preset';
import { v4 as uuidv4 } from 'uuid';
import { DEFAULT_SOUND_PROFILES } from '@/lib/audio/defaultSounds';

export interface SoundsSlice {
  sounds: SoundParameters[];
  presets: Preset[];
  currentSoundId: string | null;
  
  addSound: (type: SoundType) => string;
  updateSound: (id: string, parameters: Partial<SoundParameters>) => void;
  deleteSound: (id: string) => void;
  setCurrentSound: (id: string | null) => void;
  
  savePreset: (name: string, soundId: string) => void;
  loadPreset: (presetId: string) => void;
  deletePreset: (presetId: string) => void;
}

const DEFAULT_PARAMETERS: Omit<SoundParameters, 'id' | 'type' | 'name'> = {
  volume: 0.8,
  pan: 0,
  pitch: 0,
  timeStretch: 1,
  duration: 1.0,
  waveform: 'sine',
  
  filterCutoff: 1000,
  filterResonance: 1,
  filterType: 'lowpass',
  
  attack: 0.01,
  decay: 0.1,
  sustain: 0.5,
  release: 0.5,
  
  lfoRate: 1,
  lfoDepth: 0,
  lfoPhase: 0,
  lfoTarget: 'pitch',
  
  distortion: 0,
  reverbMix: 0,
  reverbDecay: 1.5,
  reverbEnabled: false,
  reverbAmount: 0.3,
  delayTime: 0.25,
  delayFeedback: 0.3,
  delayMix: 0,
  
  eqLow: 0,
  eqMid: 0,
  eqHigh: 0,
  
  compressionRatio: 4,
  compressionThreshold: -24,
  compressionAttack: 0.003,
  compressionRelease: 0.25,
  
  stereoWidth: 0.5,
};

export const soundsSlice: StateCreator<SoundsSlice> = (set, get) => ({
  sounds: [],
  presets: [],
  currentSoundId: null,
  
  addSound: (type) => {
    const id = uuidv4();
    
    // Get type-specific default parameters
    const typeDefaults = DEFAULT_SOUND_PROFILES[type] || {};
    
    const newSound: SoundParameters = {
      id,
      type,
      name: type,
      ...DEFAULT_PARAMETERS,
      ...typeDefaults, // Apply type-specific defaults
    };
    
    set(state => ({
      sounds: [...state.sounds, newSound],
      currentSoundId: id,
    }));
    
    return id;
  },
  
  updateSound: (id, parameters) => {
    set(state => ({
      sounds: state.sounds.map(sound => 
        sound.id === id ? { ...sound, ...parameters } : sound
      )
    }));
  },
  
  deleteSound: (id) => {
    set(state => ({
      sounds: state.sounds.filter(sound => sound.id !== id),
      currentSoundId: state.currentSoundId === id ? null : state.currentSoundId
    }));
  },
  
  setCurrentSound: (id) => {
    set({ currentSoundId: id });
  },
  
  savePreset: (name, soundId) => {
    const sound = get().sounds.find(s => s.id === soundId);
    if (!sound) return;
    
    const preset: Preset = {
      id: uuidv4(),
      name,
      category: sound.type,
      parameters: { ...sound },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    set(state => ({
      presets: [...state.presets, preset]
    }));
  },
  
  loadPreset: (presetId) => {
    const preset = get().presets.find(p => p.id === presetId);
    if (!preset) return;
    
    const id = uuidv4();
    const newSound: SoundParameters = {
      ...preset.parameters,
      id,
      name: preset.name,
    };
    
    set(state => ({
      sounds: [...state.sounds, newSound],
      currentSoundId: id,
    }));
  },
  
  deletePreset: (presetId) => {
    set(state => ({
      presets: state.presets.filter(p => p.id !== presetId)
    }));
  },
});