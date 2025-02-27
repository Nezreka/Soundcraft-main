export type SoundType = 
  | 'Bass Kick' 
  | 'Bass' 
  | 'Synth' 
  | 'FX' 
  | 'Percussion' 
  | 'Vocal' 
  | 'Ambient' 
  | 'Noise'
  | 'Snare'
  | 'Hi-Hat'
  | 'Clap'
  | 'Bass Synth'
  | 'Sub Bass'
  | 'Lead Synth'
  | 'Pad'
  | 'Riser'
  | 'Impact';

// Update to include 'noise' as a waveform type
export type WaveformType = 'sine' | 'square' | 'sawtooth' | 'triangle' | 'noise';

export interface SoundParameters {
  id: string;
  type: SoundType;
  name: string;
  
  // Basic parameters
  volume: number;
  pan: number;
  pitch: number;
  timeStretch: number;
  duration: number;
  waveform: WaveformType;
  
  // Filter
  filterCutoff: number;
  filterResonance: number;
  filterType: 'lowpass' | 'highpass' | 'bandpass' | 'notch';
  
  // ADSR
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  
  // LFO
  lfoRate: number;
  lfoDepth: number;
  lfoPhase: number;
  lfoTarget: 'pitch' | 'filter' | 'volume' | 'pan';
  
  // Effects
  distortion: number;
  delayTime: number;
  delayFeedback: number;
  delayMix: number;

  // Reverb parameters
  reverbEnabled: boolean;
  reverbAmount: number;
  reverbDecay: number;
  reverbMix: number;
  
  // EQ
  eqLow: number;
  eqMid: number;
  eqHigh: number;
  
  // Dynamics
  compressionRatio: number;
  compressionThreshold: number;
  compressionAttack: number;
  compressionRelease: number;
  
  // Spatial
  stereoWidth: number;
  
  // New envelope parameters
  pitchEnvelope?: {
    attack: number;
    decay: number;
    amount: number;
  };
  
  filterEnvelope?: {
    attack: number;
    decay: number;
    amount: number;
  };
  
  // Additional LFO parameter for amount (might replace lfoDepth in the future)
  lfoAmount?: number;
}

export interface TimelineTrack {
  id: string;
  soundId: string;
  name: string;
  color: string;
  muted: boolean;
  solo: boolean;
  volume: number;
  pan: number;
  clips: TimelineClip[];
}

export interface TimelineClip {
  id: string;
  startTime: number;
  duration: number;
  offset: number;
}

export interface TimelineState {
  tracks: TimelineTrack[];
  duration: number;
  currentTime: number;
  isPlaying: boolean;
  loop: {
    enabled: boolean;
    start: number;
    end: number;
  };
}