import * as Tone from 'tone';
import { SoundParameters, SoundType } from '@/types/audio';
import { getAudioContext } from './audioContext';

// Base class for all sound generators
export abstract class SoundGenerator {
  protected context: AudioContext;
  protected output: GainNode;
  
  constructor() {
    const { context, masterGain } = getAudioContext();
    this.context = context;
    this.output = context.createGain();
    this.output.connect(masterGain);
  }
  
  // Apply basic parameters to the sound
  public applyParameters(params: SoundParameters): void {
    this.output.gain.value = params.volume;
  }
  
  // Connect to a specific destination
  public connect(destination: AudioNode): void {
    this.output.disconnect();
    this.output.connect(destination);
  }
  
  // Disconnect from all destinations
  public disconnect(): void {
    this.output.disconnect();
  }
  
  // Abstract methods to be implemented by subclasses
  public abstract start(time?: number): void;
  public abstract stop(time?: number): void;
  public abstract setParameter(name: string, value: number): void;
}

// Synthesizer using Tone.js
export class SynthGenerator extends SoundGenerator {
  private synth: Tone.PolySynth;
  private filter: Tone.Filter;
  
  constructor() {
    super();
    
    // Create synth
    this.synth = new Tone.PolySynth(Tone.Synth).toDestination();
    
    // Create filter
    this.filter = new Tone.Filter().toDestination();
    
    // Connect synth to filter to output
    this.synth.disconnect();
    this.synth.connect(this.filter);
    this.filter.disconnect();
    this.filter.connect(this.output);
  }
  
  public applyParameters(params: SoundParameters): void {
    super.applyParameters(params);
    
    // Apply synth parameters
    this.synth.set({
      envelope: {
        attack: params.attack,
        decay: params.decay,
        sustain: params.sustain,
        release: params.release,
      }
    });
    
    // Apply filter parameters
    this.filter.frequency.value = params.filterCutoff;
    this.filter.Q.value = params.filterResonance;
    this.filter.type = params.filterType;
  }
  
  public start(time = 0): void {
    // Start playing a note (middle C)
    this.synth.triggerAttack('C4', time);
  }
  
  public stop(time = 0): void {
    // Release all notes
    this.synth.triggerRelease(['C4'], time);
  }
  
  public setParameter(name: string, value: number): void {
    switch (name) {
      case 'filterCutoff':
        this.filter.frequency.value = value;
        break;
      case 'filterResonance':
        this.filter.Q.value = value;
        break;
      // Add more parameters as needed
    }
  }
}

// Factory function to create the appropriate sound generator
export function createSoundGenerator(type: SoundType): SoundGenerator {
  switch (type) {
    case 'Synth':
      return new SynthGenerator();
    // Add more generator types as needed
    default:
      return new SynthGenerator();
  }
}