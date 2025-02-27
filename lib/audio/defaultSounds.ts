// lib/audio/defaultSounds.ts
import { SoundParameters } from "@/types/audio";

type DefaultSoundProfiles = {
  [key: string]: Partial<SoundParameters>;
};

export const DEFAULT_SOUND_PROFILES: DefaultSoundProfiles = {
  // DRUMS
  "Bass Kick": {
    waveform: "sine",
    volume: 0.8,
    pitch: 0,
    attack: 0.01, // Changed from 0.5 to 0.01 for a punchier attack
    decay: 0.2,
    sustain: 0.2,
    release: 0.3,
    filterType: "lowpass",
    filterCutoff: 200,
    filterResonance: 1,
    distortion: 0.2,
    duration: 0.5, // Changed from 1.0 to 0.5 for a tighter kick
    timeStretch: 1.0,
    // Add a pitch envelope for the characteristic "thump"
    pitchEnvelope: {
      attack: 0.01,
      decay: 0.1,
      amount: 24, // Start 2 octaves higher and quickly drop
    },
  },

  Snare: {
    waveform: "noise",
    volume: 0.7,
    pitch: 0,
    attack: 0.001,
    decay: 0.1, // Shorter decay
    sustain: 0.1,
    release: 0.2, // Shorter release
    filterType: "highpass",
    filterCutoff: 800,
    filterResonance: 1.5,
    duration: 0.2,
    timeStretch: 1.0,
    // Add some distortion for punch
    distortion: 0.1,
  },

  "Hi-Hat": {
    waveform: "noise",
    volume: 0.6,
    pitch: 12,
    attack: 0.001,
    decay: 0.05, // Shorter decay for a tighter hi-hat
    sustain: 0,
    release: 0.05, // Shorter release
    filterType: "highpass",
    filterCutoff: 7000, // Higher cutoff for a brighter sound
    filterResonance: 3, // More resonance for that metallic character
    duration: 0.1,
    timeStretch: 1.0,
  },

  Clap: {
    waveform: "noise",
    volume: 0.7,
    pitch: 0,
    attack: 0.001,
    decay: 0.1,
    sustain: 0.1,
    release: 0.2,
    filterType: "bandpass",
    filterCutoff: 1200,
    filterResonance: 2, // More resonance
    duration: 0.2,
    timeStretch: 1.0,
    // Add some reverb for the characteristic "room" sound
    reverbMix: 0.4, // More reverb
    reverbDecay: 0.7, // Longer decay
  },

  // BASS
  "Bass Synth": {
    waveform: "sawtooth",
    volume: 0.7,
    pitch: -12, // Changed from -24 to -12 (one octave down)
    attack: 0.05,
    decay: 0.1,
    sustain: 0.8,
    release: 0.3,
    filterType: "lowpass",
    filterCutoff: 800,
    filterResonance: 2,
    distortion: 0.2, // More distortion for character
    duration: 1.0,
    timeStretch: 1.0,
  },

  "Sub Bass": {
    waveform: "sine",
    volume: 0.8,
    pitch: -12, // Changed from -24 to -12 (one octave down)
    attack: 0.05,
    decay: 0.1,
    sustain: 1.0,
    release: 0.5,
    filterType: "lowpass",
    filterCutoff: 200,
    filterResonance: 0.5,
    duration: 1.0,
    timeStretch: 1.0,
  },

  // LEADS
  "Lead Synth": {
    waveform: "sawtooth",
    volume: 0.6,
    pitch: 0,
    attack: 0.02, // Faster attack
    decay: 0.1,
    sustain: 0.7,
    release: 0.3,
    filterType: "lowpass",
    filterCutoff: 3000, // Higher cutoff for brightness
    filterResonance: 2,
    distortion: 0.05,
    duration: 1.0,
    timeStretch: 1.0,
    // Add vibrato
    lfoRate: 5,
    lfoDepth: 0.1, // Use lfoDepth instead of lfoAmount for compatibility
  },

  // PADS
  Pad: {
    waveform: "triangle",
    volume: 0.5,
    pitch: 0,
    attack: 0.8,
    decay: 1.0,
    sustain: 0.8,
    release: 1.5,
    filterType: "lowpass",
    filterCutoff: 1200,
    filterResonance: 1,
    duration: 3.0,
    timeStretch: 1.0,
    // Add chorus and reverb for width
    reverbMix: 0.4,
    reverbDecay: 2.0,
    // Add slow LFO for movement
    lfoRate: 0.5,
    lfoDepth: 0.1,
    lfoTarget: "filter",
  },

  // FX
  Riser: {
    waveform: "sawtooth",
    volume: 0.6,
    pitch: -12,
    attack: 1.0,
    decay: 1.0,
    sustain: 1.0,
    release: 0.5,
    filterType: "lowpass",
    filterCutoff: 500,
    filterResonance: 4,
    duration: 3.0,
    timeStretch: 1.0,
    // Filter sweep up
    filterEnvelope: {
      attack: 3.0,
      decay: 0,
      amount: 5000,
    },
    // Pitch sweep up
    pitchEnvelope: {
      attack: 3.0,
      decay: 0,
      amount: 24,
    },
  },

  Impact: {
    waveform: "noise",
    volume: 0.8,
    pitch: -12,
    attack: 0.001,
    decay: 0.3, // Shorter decay
    sustain: 0,
    release: 1.0, // Shorter release
    filterType: "lowpass",
    filterCutoff: 800,
    filterResonance: 1,
    duration: 1.0,
    timeStretch: 1.0,
    reverbMix: 0.6, // More reverb
    reverbDecay: 2.5, // Longer decay
    distortion: 0.1, // Add some distortion
  },

  // Add a few more common sound types
  Bass: {
    waveform: "sawtooth",
    volume: 0.7,
    pitch: 0,
    attack: 0.05,
    decay: 0.1,
    sustain: 0.8,
    release: 0.3,
    filterType: "lowpass",
    filterCutoff: 800,
    filterResonance: 2,
    distortion: 0.2,
    duration: 1.0,
    timeStretch: 1.0,
  },

  Synth: {
    waveform: "sawtooth",
    volume: 0.6,
    pitch: 0,
    attack: 0.02,
    decay: 0.1,
    sustain: 0.7,
    release: 0.3,
    filterType: "lowpass",
    filterCutoff: 3000,
    filterResonance: 2,
    distortion: 0.05,
    duration: 1.0,
    timeStretch: 1.0,
    lfoRate: 5,
    lfoDepth: 0.1,
  },

  "Percussion": {
    waveform: "noise",
    volume: 0.7,
    pitch: 0,
    attack: 0.001,
    decay: 0.15,
    sustain: 0.1,
    release: 0.2,
    filterType: "bandpass",
    filterCutoff: 1000, // Lower cutoff for a fuller sound
    filterResonance: 1.5, // Less resonance for a more natural sound
    duration: 0.3,
    timeStretch: 1.0,
    distortion: 0.1,
    // Add some reverb for space
    reverbMix: 0.2,
    reverbDecay: 0.5,
 },

  Ambient: {
    waveform: "triangle",
    volume: 0.5,
    pitch: 0,
    attack: 0.8,
    decay: 1.0,
    sustain: 0.8,
    release: 1.5,
    filterType: "lowpass",
    filterCutoff: 1200,
    filterResonance: 1,
    duration: 3.0,
    timeStretch: 1.0,
    reverbMix: 0.6,
    reverbDecay: 3.0,
    lfoRate: 0.3,
    lfoDepth: 0.1,
    lfoTarget: "filter",
  },

  FX: {
    waveform: "sawtooth",
    volume: 0.6,
    pitch: 0,
    attack: 0.5,
    decay: 0.5,
    sustain: 0.5,
    release: 1.0,
    filterType: "bandpass",
    filterCutoff: 2000,
    filterResonance: 3,
    duration: 2.0,
    timeStretch: 1.0,
    reverbMix: 0.4,
    reverbDecay: 2.0,
    delayTime: 0.3,
    delayFeedback: 0.4,
    delayMix: 0.3,
  },

  Vocal: {
    waveform: "sine",
    volume: 0.7,
    pitch: 0,
    attack: 0.05,
    decay: 0.1,
    sustain: 0.8,
    release: 0.3,
    filterType: "bandpass",
    filterCutoff: 1000,
    filterResonance: 2,
    duration: 1.0,
    timeStretch: 1.0,
    reverbMix: 0.3,
    reverbDecay: 1.5,
  },

  Noise: {
    waveform: "noise",
    volume: 0.6,
    pitch: 0,
    attack: 0.1,
    decay: 0.2,
    sustain: 0.5,
    release: 0.5,
    filterType: "lowpass",
    filterCutoff: 2000,
    filterResonance: 1,
    duration: 1.0,
    timeStretch: 1.0,
  },
};
