import * as Tone from 'tone';
import { SoundParameters } from '@/types/audio';
import { getAudioContext } from './audioContext';

// Class to handle audio processing chain for a sound
export class AudioProcessor {
  private context: AudioContext;
  private input: GainNode;
  private output: GainNode;
  private panner: StereoPannerNode;
  private filter: BiquadFilterNode;
  private distortion: WaveShaperNode;
  private compressor: DynamicsCompressorNode;
  private reverb: ConvolverNode;
  private delay: DelayNode;
  private delayFeedback: GainNode;
  private delayMix: GainNode;
  private reverbMix: GainNode;
  
  constructor() {
    const { context, masterGain } = getAudioContext();
    this.context = context;
    
    // Create nodes
    this.input = context.createGain();
    this.output = context.createGain();
    this.panner = context.createStereoPanner();
    this.filter = context.createBiquadFilter();
    this.distortion = context.createWaveShaper();
    this.compressor = context.createDynamicsCompressor();
    this.reverb = context.createConvolver();
    this.delay = context.createDelay(5.0);
    this.delayFeedback = context.createGain();
    this.delayMix = context.createGain();
    this.reverbMix = context.createGain();
    
    // Create impulse response for reverb
    this.createReverbImpulse(2.5);
    
    // Set up delay feedback loop
    this.delay.connect(this.delayFeedback);
    this.delayFeedback.connect(this.delay);
    
    // Connect the processing chain
    this.input
      .connect(this.filter)
      .connect(this.distortion)
      .connect(this.panner);
    
    // Main signal path
    this.panner.connect(this.compressor);
    
    // Reverb path
    this.panner.connect(this.reverb);
    this.reverb.connect(this.reverbMix);
    this.reverbMix.connect(this.compressor);
    
    // Delay path
    this.panner.connect(this.delay);
    this.delay.connect(this.delayMix);
    this.delayMix.connect(this.compressor);
    
    // Final output
    this.compressor.connect(this.output);
    this.output.connect(masterGain);
  }
  
  // Create reverb impulse response
  private async createReverbImpulse(duration: number): Promise<void> {
    const sampleRate = this.context.sampleRate;
    const length = sampleRate * duration;
    const impulse = this.context.createBuffer(2, length, sampleRate);
    const leftChannel = impulse.getChannelData(0);
    const rightChannel = impulse.getChannelData(1);
    
    for (let i = 0; i < length; i++) {
      const n = i / length;
      // Decay curve
      const amplitude = Math.pow(1 - n, 2) * Math.random() * 0.5;
      leftChannel[i] = amplitude * (Math.random() * 2 - 1);
      rightChannel[i] = amplitude * (Math.random() * 2 - 1);
    }
    
    this.reverb.buffer = impulse;
  }
  
  // Apply parameters to the processing chain
  public applyParameters(params: SoundParameters): void {
    // Basic parameters
    this.output.gain.value = params.volume;
    this.panner.pan.value = params.pan;
    
    // Filter
    this.filter.type = params.filterType;
    this.filter.frequency.value = params.filterCutoff;
    this.filter.Q.value = params.filterResonance;
    
    // Distortion
    if (params.distortion > 0) {
      this.distortion.curve = this.createDistortionCurve(params.distortion * 400);
    } else {
      this.distortion.curve = null; // Bypass distortion
    }
    
    // Compressor
    this.compressor.threshold.value = params.compressionThreshold;
    this.compressor.ratio.value = params.compressionRatio;
    this.compressor.attack.value = params.compressionAttack;
    this.compressor.release.value = params.compressionRelease;
    
    // Reverb
    this.reverbMix.gain.value = params.reverbMix;
    
    // Delay
    this.delay.delayTime.value = params.delayTime;
    this.delayFeedback.gain.value = params.delayFeedback;
    this.delayMix.gain.value = params.delayMix;
  }
  
  // Create distortion curve
  private createDistortionCurve(amount: number): Float32Array {
    const samples = 44100;
    const curve = new Float32Array(samples);
    const deg = Math.PI / 180;
    
    for (let i = 0; i < samples; ++i) {
      const x = (i * 2) / samples - 1;
      curve[i] = (3 + amount) * x * 20 * deg / (Math.PI + amount * Math.abs(x));
    }
    
    return curve;
  }
  
  // Get input node for connecting sources
  public getInput(): AudioNode {
    return this.input;
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
}