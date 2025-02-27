// lib/audio/audioContext.ts

// Singleton to ensure we only create one audio context
class AudioContextManager {
  private static instance: AudioContextManager;
  private _context: AudioContext;
  private _masterGain: GainNode;
  private _analyser: AnalyserNode;
  
  private constructor() {
    // Create a standard Web Audio API context
    this._context = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create master gain node
    this._masterGain = this._context.createGain();
    this._masterGain.connect(this._context.destination);
    
    // Create analyzer for visualizations
    this._analyser = this._context.createAnalyser();
    this._analyser.fftSize = 2048;
    this._masterGain.connect(this._analyser);
  }
  
  public static getInstance(): AudioContextManager {
    if (!AudioContextManager.instance) {
      AudioContextManager.instance = new AudioContextManager();
    }
    
    return AudioContextManager.instance;
  }
  
  // Resume audio context (needed for browsers that suspend it until user interaction)
  public async resume(): Promise<void> {
    if (this._context.state === 'suspended') {
      await this._context.resume();
    }
  }
  
  // Get the Web Audio API context
  public get context(): AudioContext {
    return this._context;
  }
  
  // Get the master gain node
  public get masterGain(): GainNode {
    return this._masterGain;
  }
  
  // Get the analyzer node
  public get analyser(): AnalyserNode {
    return this._analyser;
  }
  
  // Set master volume
  public setMasterVolume(volume: number): void {
    this._masterGain.gain.value = volume;
  }
}

// Export a function to get the audio context instance
export const getAudioContext = (): AudioContextManager => {
  if (typeof window !== 'undefined') {
    return AudioContextManager.getInstance();
  }
  return null as any; // For SSR
};

// Export a function to ensure the audio context is running
export const ensureAudioContext = async (): Promise<AudioContextManager | null> => {
  if (typeof window === 'undefined') {
    return null; // For SSR
  }
  
  try {
    const manager = getAudioContext();
    await manager.resume();
    console.log("Audio context started successfully");
    return manager;
  } catch (error) {
    console.error("Failed to start audio context:", error);
    return null;
  }
};