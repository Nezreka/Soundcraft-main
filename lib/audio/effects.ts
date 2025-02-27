import * as Tone from 'tone';
import { SoundParameters } from '@/types/audio';

// Class to manage effects for a sound
export class EffectsChain {
  private reverb: Tone.Reverb;
  private delay: Tone.FeedbackDelay;
  private distortion: Tone.Distortion;
  private eq3: Tone.EQ3;
  private compressor: Tone.Compressor;
  private input: Tone.Gain;
  private output: Tone.Gain;
  
  constructor() {
    // Create effects
    this.reverb = new Tone.Reverb();
    this.delay = new Tone.FeedbackDelay();
    this.distortion = new Tone.Distortion();
    this.eq3 = new Tone.EQ3();
    this.compressor = new Tone.Compressor();
    
    // Create input/output nodes
    this.input = new Tone.Gain();
    this.output = new Tone.Gain();
    
    // Connect effects chain
    this.input
      .connect(this.distortion)
      .connect(this.eq3)
      .connect(this.compressor)
      .connect(this.delay)
      .connect(this.reverb)
      .connect(this.output);
    
    // Initialize with default settings
    this.reverb.set({ wet: 0 });
    this.delay.set({ wet: 0 });
    this.distortion.set({ wet: 0 });
  }
  
  // Apply parameters to all effects
  public applyParameters(params: SoundParameters): void {
    // Distortion
    this.distortion.set({
      distortion: params.distortion,
      wet: params.distortion > 0 ? 1 : 0
    });
    
    // EQ
    this.eq3.set({
      low: params.eqLow,
      mid: params.eqMid,
      high: params.eqHigh
    });
    
    // Compressor
    this.compressor.set({
      threshold: params.compressionThreshold,
      ratio: params.compressionRatio,
      attack: params.compressionAttack,
      release: params.compressionRelease
    });
    
    // Delay
    this.delay.set({
      delayTime: params.delayTime,
      feedback: params.delayFeedback,
      wet: params.delayMix
    });
    
    // Reverb
    this.reverb.set({
      decay: params.reverbDecay,
      wet: params.reverbMix
    });
  }
  
  // Get input node for connecting sources
  public getInput(): Tone.InputNode {
    return this.input;
  }
  
  // Get output node for connecting to destinations
  public getOutput(): Tone.OutputNode {
    return this.output;
  }
  
  // Connect to a destination
  public connect(destination: Tone.InputNode): void {
    this.output.connect(destination);
  }
  
  // Disconnect from all destinations
  public disconnect(): void {
    this.output.disconnect();
  }
  
  // Dispose of all effects (cleanup)
  public dispose(): void {
    this.reverb.dispose();
    this.delay.dispose();
    this.distortion.dispose();
    this.eq3.dispose();
    this.compressor.dispose();
    this.input.dispose();
    this.output.dispose();
  }
}