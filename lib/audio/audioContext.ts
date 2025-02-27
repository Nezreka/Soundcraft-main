// lib/audio/audioContext.ts

import { AudioContextState } from '../../types/audio';

// Singleton to ensure we only create one audio context
class AudioContextManager {
  private static instance: AudioContextManager;
  private _context!: AudioContext;
  private _masterGain!: GainNode;
  private _analyser!: AnalyserNode;
  private _initialized: boolean = false;
  
  private constructor() {
    console.log("🎵 AUDIO: Creating new AudioContextManager instance");
    
    try {
      // Create a standard Web Audio API context
      this._context = new (window.AudioContext || (window as any).webkitAudioContext)();
      console.log(`🎵 AUDIO: Created AudioContext with state: ${this._context.state}`);
      
      // Create master gain node
      this._masterGain = this._context.createGain();
      this._masterGain.connect(this._context.destination);
      
      // Create analyzer for visualizations
      this._analyser = this._context.createAnalyser();
      this._analyser.fftSize = 2048;
      this._masterGain.connect(this._analyser);
      
      this._initialized = true;
      console.log("🎵 AUDIO: AudioContextManager initialized successfully");
    } catch (error) {
      console.error("🎵 AUDIO: Failed to initialize AudioContextManager:", error);
      this._initialized = false;
    }
  }
  
  public static getInstance(): AudioContextManager {
    if (!AudioContextManager.instance) {
      console.log("🎵 AUDIO: Creating AudioContextManager instance");
      AudioContextManager.instance = new AudioContextManager();
    } else {
      console.log("🎵 AUDIO: Returning existing AudioContextManager instance");
    }
    
    return AudioContextManager.instance;
  }
  
  // Resume audio context (needed for browsers that suspend it until user interaction)
  public async resume(): Promise<boolean> {
    if (!this._initialized) {
      console.error("🎵 AUDIO: Cannot resume - AudioContextManager not initialized");
      return false;
    }
    
    console.log(`🎵 AUDIO: Attempting to resume audio context, current state: ${this._context.state}`);
    
    if (this._context.state === 'suspended') {
      try {
        await this._context.resume();
        console.log(`🎵 AUDIO: Audio context resumed successfully, new state: ${this._context.state}`);
        return this._context.state as string === 'running';
      } catch (error) {
        console.error("🎵 AUDIO: Failed to resume audio context:", error);
        return false;
      }
    } else {
      console.log(`🎵 AUDIO: Audio context already in state: ${this._context.state}`);
      return this._context.state as string === 'running';
    }
  }
  
  // Get the Web Audio API context
  public get context(): AudioContext {
    return this._context;
  }
  
  // Get if the context is initialized
  public get isInitialized(): boolean {
    return this._initialized;
  }
  
  // Get if the context is running
  public get isRunning(): boolean {
    return this._initialized && this._context.state as string === 'running';
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
    if (!this._initialized) return;
    
    this._masterGain.gain.value = volume;
    console.log(`🎵 AUDIO: Master volume set to ${volume}`);
  }
}

// Export a function to get the audio context instance
export const getAudioContext = (): AudioContextManager => {
  if (typeof window !== 'undefined') {
    console.log("🎵 AUDIO: Getting audio context");
    return AudioContextManager.getInstance();
  }
  console.log("🎵 AUDIO: Window not defined (SSR context), returning null");
  return null as any; // For SSR
};

// Export a function to ensure the audio context is running
export const ensureAudioContext = async (): Promise<AudioContextManager | null> => {
  if (typeof window === 'undefined') {
    console.log("🎵 AUDIO: Window not defined (SSR context), cannot ensure audio context");
    return null; // For SSR
  }
  
  try {
    console.log("🎵 AUDIO: Ensuring audio context is running");
    const manager = getAudioContext();
    
    if (!manager || !manager.isInitialized) {
      console.error("🎵 AUDIO: Audio context manager not initialized");
      return null;
    }
    
    const success = await manager.resume();
    
    if (success) {
      console.log("🎵 AUDIO: Audio context started successfully");
    } else {
      console.warn("🎵 AUDIO: Audio context could not be started");
    }
    
    return manager;
  } catch (error) {
    console.error("🎵 AUDIO: Failed to start audio context:", error);
    return null;
  }
};

// Function to manually initialize audio on user interaction
export const initializeAudio = async (): Promise<boolean> => {
  console.log("🎵 AUDIO: Manual initialization requested");
  const manager = await ensureAudioContext();
  return !!manager?.isRunning;
};