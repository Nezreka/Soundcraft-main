import { useState, useEffect, useRef } from 'react';
import { useStore } from '@/store';
import { getAudioContext, ensureAudioContext } from '@/lib/audio/audioContext';
import { SoundParameters } from '@/types/audio';

// Class for managing an individual sound clip
class SoundClip {
  id: string;
  soundParams: SoundParameters;
  trackVolume: number;
  trackPan: number;
  startTime: number;
  duration: number;
  isPlaying: boolean = false;
  
  // Audio nodes
  private sourceNode: AudioBufferSourceNode | OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private panNode: StereoPannerNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private distortionNode: WaveShaperNode | null = null;
  private reverbNode: ConvolverNode | null = null;
  private reverbGainNode: GainNode | null = null;
  private dryGainNode: GainNode | null = null;
  private delayNode: DelayNode | null = null;
  private delayFeedbackNode: GainNode | null = null;
  private delayDryNode: GainNode | null = null;
  private delayWetNode: GainNode | null = null;
  private additionalSources: (AudioBufferSourceNode | OscillatorNode)[] = [];
  
  constructor(
    id: string, 
    soundParams: SoundParameters, 
    trackVolume: number,
    trackPan: number,
    startTime: number, 
    duration: number
  ) {
    this.id = id;
    this.soundParams = soundParams;
    this.trackVolume = trackVolume;
    this.trackPan = trackPan;
    this.startTime = startTime;
    this.duration = duration;
  }
  
  // Create a simple impulse response for reverb
  private createImpulseResponse(audioContext: AudioContext, duration: number) {
    const sampleRate = audioContext.sampleRate;
    const length = sampleRate * duration;
    const impulse = audioContext.createBuffer(2, length, sampleRate);
    const leftChannel = impulse.getChannelData(0);
    const rightChannel = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      // Exponential decay
      const decay = Math.exp(-i / ((sampleRate * duration) / 10));
      // Random noise
      const noise = Math.random() * 2 - 1;

      leftChannel[i] = noise * decay;
      rightChannel[i] = noise * decay;
    }

    return impulse;
  }

  // Create distortion curve
  private createDistortionCurve(amount: number) {
    const k = amount * 100;
    const samples = 44100;
    const curve = new Float32Array(samples);
    const deg = Math.PI / 180;

    for (let i = 0; i < samples; ++i) {
      const x = (i * 2) / samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }

    return curve;
  }
  
  // Play the sound using the specialized sound generators
  play(audioContext: AudioContext, outputNode: AudioNode, currentTime: number) {
    console.log(`🔊 SOUND: Playing clip ${this.id}, 
      type: ${this.soundParams.type || 'unknown'}, 
      waveform: ${this.soundParams.waveform}, 
      pitch: ${this.soundParams.pitch}`);
    
    // Debug the sound parameters to understand what's happening
    console.log(`🔊 SOUND PARAMS: ${JSON.stringify({
      type: this.soundParams.type,
      waveform: this.soundParams.waveform,
      pitch: this.soundParams.pitch,
      volume: this.soundParams.volume,
      attack: this.soundParams.attack,
      decay: this.soundParams.decay,
      sustain: this.soundParams.sustain,
      release: this.soundParams.release,
      filterType: this.soundParams.filterType,
      filterCutoff: this.soundParams.filterCutoff,
      reverbMix: this.soundParams.reverbMix,
      distortion: this.soundParams.distortion
    }, null, 2)}`);
    
    // Stop if already playing
    if (this.isPlaying) {
      console.log(`🔊 SOUND: Clip ${this.id} is already playing, stopping first`);
      this.stop();
    }
    
    try {
      // Create main audio nodes
      this.gainNode = audioContext.createGain();
      this.panNode = audioContext.createStereoPanner();
      this.filterNode = audioContext.createBiquadFilter();
      this.distortionNode = audioContext.createWaveShaper();
      
      // Create reverb nodes
      this.reverbNode = audioContext.createConvolver();
      this.reverbGainNode = audioContext.createGain();
      this.dryGainNode = audioContext.createGain();
      
      // Create delay nodes
      this.delayNode = audioContext.createDelay(5.0);
      this.delayFeedbackNode = audioContext.createGain();
      this.delayDryNode = audioContext.createGain();
      this.delayWetNode = audioContext.createGain();
      
      // Get actual time
      const now = audioContext.currentTime;
      
      // Setup filter
      if (this.filterNode) {
        this.filterNode.type = this.soundParams.filterType as BiquadFilterType || 'lowpass';
        this.filterNode.frequency.value = this.soundParams.filterCutoff || 1000;
        this.filterNode.Q.value = this.soundParams.filterResonance || 1;
        
        // Apply filter envelope if present
        if (this.soundParams.filterEnvelope && this.soundParams.filterEnvelope.amount) {
          const baseFreq = this.soundParams.filterCutoff || 1000;
          const targetFreq = baseFreq + this.soundParams.filterEnvelope.amount;
          
          this.filterNode.frequency.setValueAtTime(baseFreq, now);
          this.filterNode.frequency.linearRampToValueAtTime(
            targetFreq,
            now + (this.soundParams.filterEnvelope.attack || 0.01)
          );
          
          if (this.soundParams.filterEnvelope.decay && this.soundParams.filterEnvelope.decay > 0) {
            this.filterNode.frequency.linearRampToValueAtTime(
              baseFreq,
              now + (this.soundParams.filterEnvelope.attack || 0.01) + (this.soundParams.filterEnvelope.decay || 0.1)
            );
          }
        }
      }
      
      // Setup distortion
      if (this.distortionNode && this.soundParams.distortion && this.soundParams.distortion > 0) {
        this.distortionNode.curve = this.createDistortionCurve(this.soundParams.distortion);
        this.distortionNode.oversample = '4x';
      }
      
      // Setup reverb
      if (this.reverbNode && this.reverbGainNode && this.dryGainNode) {
        if (this.soundParams.reverbMix && this.soundParams.reverbMix > 0) {
          this.reverbNode.buffer = this.createImpulseResponse(audioContext, this.soundParams.reverbDecay || 1.0);
          this.reverbGainNode.gain.value = this.soundParams.reverbMix;
          this.dryGainNode.gain.value = 1 - this.soundParams.reverbMix;
        } else {
          // Bypass reverb
          this.reverbGainNode.gain.value = 0;
          this.dryGainNode.gain.value = 1;
        }
      }
      
      // Setup delay
      if (this.delayNode && this.delayFeedbackNode && this.delayDryNode && this.delayWetNode) {
        if (this.soundParams.delayMix && this.soundParams.delayMix > 0) {
          this.delayNode.delayTime.value = this.soundParams.delayTime || 0.5;
          this.delayFeedbackNode.gain.value = this.soundParams.delayFeedback || 0.3;
          this.delayWetNode.gain.value = this.soundParams.delayMix;
          this.delayDryNode.gain.value = 1 - this.soundParams.delayMix;
        } else {
          // Bypass delay
          this.delayWetNode.gain.value = 0;
          this.delayDryNode.gain.value = 1;
        }
      }
      
      // Set pan based on track parameters
      this.panNode.pan.value = this.trackPan;
      
      // Use our specialized sound creation based on sound type
      const specializedSound = createSpecializedSound(
        audioContext,
        this.gainNode,
        this.soundParams,
        currentTime
      );
      
      // Store the main source
      this.sourceNode = specializedSound.source;
      
      // Store any additional sources
      this.additionalSources = specializedSound.additionalSources || [];
      
      // Setup gain to respect both sound volume and track volume
      if (this.gainNode) {
        console.log(`🔊 SOUND: Setting gain with volume=${this.soundParams.volume}, trackVolume=${this.trackVolume}`);
        
        // Apply ADSR envelope
        const soundDuration = this.soundParams.duration || 1.0;
        const adjustedDuration = soundDuration * (this.soundParams.timeStretch || 1);
        
        // Only apply full ADSR if it's not a specialized percussion sound
        if (!["Bass Kick", "Snare", "Hi-Hat", "Percussion"].includes(this.soundParams.type || '')) {
          // Apply attack
          this.gainNode.gain.setValueAtTime(0, now);
          this.gainNode.gain.linearRampToValueAtTime(
            this.soundParams.volume * this.trackVolume, 
            now + (this.soundParams.attack || 0.01)
          );
          
          // Decay to sustain
          this.gainNode.gain.linearRampToValueAtTime(
            this.soundParams.volume * this.trackVolume * (this.soundParams.sustain || 0.7),
            now + (this.soundParams.attack || 0.01) + (this.soundParams.decay || 0.1)
          );
          
          // Release
          this.gainNode.gain.setValueAtTime(
            this.soundParams.volume * this.trackVolume * (this.soundParams.sustain || 0.7),
            now + adjustedDuration - (this.soundParams.release || 0.1)
          );
          this.gainNode.gain.linearRampToValueAtTime(0.001, now + adjustedDuration);
        } else {
          // For specialized percussion, just set a static gain value
          this.gainNode.gain.value = this.soundParams.volume * this.trackVolume;
        }
      }
      
      // Connect all nodes in proper audio chain
      if (this.gainNode && this.filterNode && this.distortionNode && 
          this.reverbNode && this.reverbGainNode && this.dryGainNode && 
          this.delayNode && this.delayDryNode && this.delayWetNode && this.panNode) {
        
        // Basic signal path
        // Source -> Gain -> Filter -> Distortion
        this.gainNode.connect(this.filterNode);
        this.filterNode.connect(this.distortionNode);
        
        // Split for reverb processing
        if (this.soundParams.reverbMix && this.soundParams.reverbMix > 0) {
          // Dry path
          this.distortionNode.connect(this.dryGainNode);
          
          // Wet (reverb) path
          this.distortionNode.connect(this.reverbNode);
          this.reverbNode.connect(this.reverbGainNode);
          
          // Combine dry and wet paths to pan node
          this.dryGainNode.connect(this.panNode);
          this.reverbGainNode.connect(this.panNode);
        } else {
          // No reverb, direct connection
          this.distortionNode.connect(this.panNode);
        }
        
        // Connect pan to final output
        this.panNode.connect(outputNode);
        
        console.log(`🔊 SOUND: Full audio chain connected: Source -> Gain -> Filter -> Distortion -> [Reverb] -> Pan -> Output`);
      } else {
        // Fallback for simpler routing
        if (this.gainNode && this.panNode) {
          this.gainNode.connect(this.panNode);
          this.panNode.connect(outputNode);
          console.log(`🔊 SOUND: Simple audio chain: Gain -> Pan -> Output`);
        }
      }
      
      // Set playing state
      this.isPlaying = true;
      
      // Auto-stop when done - use a longer timeout for good measure
      const effectsTail = Math.max(
        (this.soundParams.reverbMix || 0) > 0 ? (this.soundParams.reverbDecay || 0) * 2 : 0,
        (this.soundParams.delayMix || 0) > 0 ? (this.soundParams.delayTime || 0) * 10 * (this.soundParams.delayFeedback || 0) : 0
      );
      
      const totalDuration = Math.max(1.0, this.duration + effectsTail) * 1000 + 200;
      
      setTimeout(() => {
        console.log(`🔊 SOUND: Auto-stopping clip ${this.id} after ${totalDuration/1000} seconds`);
        this.stop();
      }, totalDuration);
      
      return true;
    } catch (error) {
      console.error(`🔊 SOUND: Error playing clip ${this.id}:`, error);
      this.stop(); // Clean up any partial setup
      return false;
    }
  }
  
  // Stop the sound
  stop() {
    console.log(`🔊 SOUND: Stopping clip ${this.id}`);
    
    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
        console.log(`🔊 SOUND: Stopped source node for clip ${this.id}`);
      } catch (e) {
        console.log(`🔊 SOUND: Source node for clip ${this.id} was already stopped`);
      }
      
      try {
        this.sourceNode.disconnect();
      } catch (e) {
        console.error(`🔊 SOUND: Error disconnecting source for ${this.id}:`, e);
      }
      this.sourceNode = null;
    }
    
    // Stop additional sources
    this.additionalSources.forEach(source => {
      try {
        source.stop();
        source.disconnect();
      } catch (e) {
        // Ignore errors if already stopped
      }
    });
    this.additionalSources = [];
    
    // Disconnect all audio nodes
    [
      this.gainNode,
      this.panNode,
      this.filterNode,
      this.distortionNode,
      this.reverbNode,
      this.reverbGainNode,
      this.dryGainNode,
      this.delayNode,
      this.delayFeedbackNode,
      this.delayDryNode,
      this.delayWetNode
    ].forEach(node => {
      if (node) {
        try {
          node.disconnect();
        } catch (e) {
          console.error(`🔊 SOUND: Error disconnecting node for ${this.id}:`, e);
        }
      }
    });
    
    // Clear references
    this.gainNode = null;
    this.panNode = null;
    this.filterNode = null;
    this.distortionNode = null;
    this.reverbNode = null;
    this.reverbGainNode = null;
    this.dryGainNode = null;
    this.delayNode = null;
    this.delayFeedbackNode = null;
    this.delayDryNode = null;
    this.delayWetNode = null;
    
    this.isPlaying = false;
    console.log(`🔊 SOUND: Clip ${this.id} is now stopped`);
  }
}

// Import default sound profiles at module level to avoid awaits in function
import { DEFAULT_SOUND_PROFILES } from '@/lib/audio/defaultSounds';

// Import the specialized source creation from a common location
import { createSpecializedSource } from '@/lib/audio/soundGenerators';

// Helper function to create specialized sound sources 
function createSpecializedSound(
  audioContext: AudioContext, 
  gainNode: GainNode, 
  soundParams: any, 
  currentTime: number
) {
  const now = audioContext.currentTime;
  
  console.log(`🔊 SOUND: Creating specialized sound type: ${soundParams.type}`);
  
  // Directly use the same sound generation code that the editor uses
  // to ensure consistent sound generation between editor and timeline
  const sourceInfo = createSpecializedSource(
    audioContext,
    soundParams,
    now
  );
  
  // Connect the source's output to our gain node
  if (sourceInfo.output) {
    sourceInfo.output.connect(gainNode);
  } else if (sourceInfo.source) {
    sourceInfo.source.connect(gainNode);
  }
  
  // Create a filter for the sound (if needed for routing)
  const filter = audioContext.createBiquadFilter();
  filter.type = soundParams.filterType as BiquadFilterType || 'lowpass';
  filter.frequency.value = soundParams.filterCutoff || 1000;
  filter.Q.value = soundParams.filterResonance || 1;
  
  // Set up any additional nodes (we'll use the main source/output anyway since we connected it above)
  return {
    source: sourceInfo.source,
    additionalSources: sourceInfo.additionalSources,
    filter: filter,
    effectiveDuration: sourceInfo.effectiveDuration
  };
}

// Helper function to create a noise buffer
function createNoiseBuffer(audioContext: AudioContext, duration: number) {
  const sampleRate = audioContext.sampleRate;
  const bufferSize = sampleRate * duration;
  const buffer = audioContext.createBuffer(1, bufferSize, sampleRate);
  const data = buffer.getChannelData(0);
  
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  
  return buffer;
}

// Helper function to apply default sound parameters
function applyDefaultSoundParameters(soundParams: any, soundType: string) {
  console.log(`🔶 TIMELINE: Looking for sound type profile: "${soundType}"`);
  
  // Apply default profile for this sound type if available
  if (soundType && DEFAULT_SOUND_PROFILES[soundType]) {
    const defaultProfile = DEFAULT_SOUND_PROFILES[soundType];
    console.log(`🔶 TIMELINE: Applying default profile for ${soundType}`);
    
    // Fill in any missing parameters from the default profile
    Object.entries(defaultProfile).forEach(([key, value]) => {
      if (soundParams[key] === undefined) {
        soundParams[key] = value;
        console.log(`🔶 TIMELINE: Setting missing parameter ${key} = ${value}`);
      }
    });
  } else {
    console.log(`🔶 TIMELINE: No default profile found for "${soundType}"`);
    
    // Apply some reasonable defaults for bass-type sounds
    if (soundType?.toLowerCase().includes('bass')) {
      if (soundParams.pitch === undefined) soundParams.pitch = -12;
      if (soundParams.waveform === undefined) soundParams.waveform = 'sine';
      if (soundParams.filterType === undefined) soundParams.filterType = 'lowpass';
      if (soundParams.filterCutoff === undefined) soundParams.filterCutoff = 500;
    }
    
    // Apply some reasonable defaults for kick-type sounds
    if (soundType?.toLowerCase().includes('kick')) {
      if (soundParams.pitch === undefined) soundParams.pitch = 0;
      if (soundParams.waveform === undefined) soundParams.waveform = 'sine';
      if (soundParams.attack === undefined) soundParams.attack = 0.01;
      if (soundParams.decay === undefined) soundParams.decay = 0.2;
      if (soundParams.filterType === undefined) soundParams.filterType = 'lowpass';
      if (soundParams.filterCutoff === undefined) soundParams.filterCutoff = 200;
    }
  }
}

// Main hook for timeline functionality
export function useTimeline() {
  const { 
    timeline, 
    sounds, 
    setCurrentTime,
    setIsPlaying,
    seekForward,
    seekBackward
  } = useStore();
  
  // Hold references to active sound clips
  const activeClipsRef = useRef<Map<string, SoundClip>>(new Map());
  
  // Playback interval reference
  const playbackIntervalRef = useRef<number | null>(null);
  
  // Animation frame reference for requestAnimationFrame
  const animationFrameRef = useRef<number | null>(null);
  
  // Last tick timestamp for accurate timing
  const lastTickTimeRef = useRef<number>(0);
  
  // Initialize timeline and audio context
  useEffect(() => {
    const initAudio = async () => {
      await ensureAudioContext();
    };
    
    initAudio();
    
    return () => {
      // Clean up any playing sounds
      stopAllSounds();
      
      // Clear interval
      if (playbackIntervalRef.current) {
        window.clearInterval(playbackIntervalRef.current);
        playbackIntervalRef.current = null;
      }
      
      // Cancel animation frame if active
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, []);
  
  // Update playback state when isPlaying changes - single effect
  useEffect(() => {
    console.log(`🔶 TIMELINE: isPlaying changed to ${timeline.isPlaying}`);
    
    // Use an async function inside the effect
    const updatePlayback = async () => {
      if (timeline.isPlaying) {
        try {
          await startPlayback();
        } catch (error) {
          console.error("🔶 TIMELINE: Error starting playback:", error);
          // If startPlayback fails, make sure to set isPlaying to false
          setIsPlaying(false);
        }
      } else {
        pausePlayback();
      }
    };
    
    updatePlayback();
  }, [timeline.isPlaying]);
  
  // Start playback using a completely different approach with requestAnimationFrame
  const startPlayback = async () => {
    console.log("🔶 TIMELINE: startPlayback called - using RAF approach");
    
    // First ensure we're not already playing
    if (playbackIntervalRef.current) {
      console.log("🔶 TIMELINE: Clearing existing interval");
      clearInterval(playbackIntervalRef.current);
      playbackIntervalRef.current = null;
    }
    
    // Also cancel any existing animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // Check if we're at the end, reset to beginning if needed
    if (timeline.currentTime >= timeline.duration) {
      setCurrentTime(0);
    }
    
    // Reset the tick timestamp
    lastTickTimeRef.current = performance.now();
    
    // Initial time value
    let startTime = timeline.currentTime;
    let globalStartTime = performance.now();
    
    // Log the start of playback
    console.log(`🔶 TIMELINE: Starting playback at ${startTime}s (total: ${timeline.duration}s)`);
    
    // Initialize audio context and ensure it's running
    const audioContextManager = getAudioContext();
    if (audioContextManager) {
      audioContextManager.resume().then(success => {
        console.log(`🔶 TIMELINE: Audio context resume result: ${success}`);
      });
    }
    
    // Ensure audio context is properly running
    if (audioContextManager) {
      try {
        // Force a manual resume of the audio context
        if (audioContextManager.context.state !== 'running') {
          console.log("🔶 TIMELINE: Audio context is suspended, manually resuming it");
          await audioContextManager.context.resume();
          console.log(`🔶 TIMELINE: Audio context state after resume: ${audioContextManager.context.state}`);
        } else {
          console.log(`🔶 TIMELINE: Audio context is already in state: ${audioContextManager.context.state}`);
        }
        
        // Check for clips at the current position
        await checkClipTriggers(startTime);
      } catch (error) {
        console.error("🔶 TIMELINE: Error checking initial clip triggers:", error);
      }
    }
    
    // Create a frame animation loop for smooth playback
    const animationLoop = async (currentTime: number) => {
      // Calculate elapsed time since playback started
      const elapsedSeconds = (currentTime - globalStartTime) / 1000;
      
      // Calculate new position (startTime + elapsed)
      const newPos = Math.min(startTime + elapsedSeconds, timeline.duration);
      
      // Log for debugging - make less noisy by only logging every 0.5 seconds
      if (Math.floor(newPos * 2) > Math.floor(timeline.currentTime * 2)) {
        console.log(`🔶 TIMELINE: Playing ${newPos.toFixed(2)}s / ${timeline.duration}s (elapsed: ${elapsedSeconds.toFixed(2)}s)`);
      }
      
      // Check if we've reached the end
      if (newPos >= timeline.duration) {
        console.log("🔶 TIMELINE: Reached end, stopping");
        
        // Clean up animation frame
        animationFrameRef.current = null;
        
        // Reset UI state
        setIsPlaying(false);
        setCurrentTime(0);
        
        // Stop all sounds
        stopAllSounds();
        
        return; // Exit the animation loop
      } 
      // Otherwise just update the time
      else {
        setCurrentTime(newPos);
        
        try {
          // Check for sound triggers (now async)
          await checkClipTriggers(newPos);
        } catch (error) {
          console.error("🔶 TIMELINE: Error checking clip triggers:", error);
        }
        
        // Continue the animation loop only if we're still playing
        if (timeline.isPlaying && animationFrameRef.current !== null) {
          animationFrameRef.current = requestAnimationFrame(animationLoop);
        }
      }
    };
    
    // Start the animation loop
    animationFrameRef.current = requestAnimationFrame(animationLoop);
    
    console.log("🔶 TIMELINE: Animation loop started");
  };
  
  // Pause playback - handle both interval and animation frame
  const pausePlayback = () => {
    console.log("🔶 TIMELINE: pausePlayback called");
    
    // Clear interval if it exists
    if (playbackIntervalRef.current) {
      console.log("🔶 TIMELINE: Clearing playback interval:", playbackIntervalRef.current);
      window.clearInterval(playbackIntervalRef.current);
      playbackIntervalRef.current = null;
    }
    
    // Cancel animation frame if it exists
    if (animationFrameRef.current) {
      console.log("🔶 TIMELINE: Cancelling animation frame:", animationFrameRef.current);
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // Stop all sounds
    stopAllSounds();
    
    console.log("🔶 TIMELINE: Playback paused");
  };
  
  // Stop all playing sounds
  const stopAllSounds = () => {
    console.log(`🔶 TIMELINE: Stopping all sounds (${activeClipsRef.current.size} active clips)`);
    activeClipsRef.current.forEach((clip, id) => {
      console.log(`🔶 TIMELINE: Stopping clip ${id}`);
      try {
        clip.stop();
      } catch (error) {
        console.error(`Error stopping clip ${id}:`, error);
      }
    });
    activeClipsRef.current.clear();
    console.log("🔶 TIMELINE: All sounds stopped");
  };
  
  // Check if any clips should trigger at the current time
  const checkClipTriggers = async (currentTime: number) => {
    console.log(`🔶 TIMELINE: Checking clip triggers at ${currentTime.toFixed(2)}`);
    
    const audioContext = getAudioContext()?.context;
    if (!audioContext) {
      console.log("🔶 TIMELINE: No audio context available");
      return;
    }
    
    // Ensure audio context is running
    if (audioContext.state !== 'running') {
      console.log(`🔶 TIMELINE: Audio context is in state ${audioContext.state}, attempting to resume`);
      audioContext.resume().then(() => {
        console.log(`🔶 TIMELINE: Audio context resumed to state ${audioContext.state}`);
      }).catch(err => {
        console.error("🔶 TIMELINE: Failed to resume audio context:", err);
      });
      return; // Wait until next tick to check clips
    }
    
    // Use the current state from the store
    const tracks = timeline.tracks;
    const allSounds = sounds;
    
    // Stop clips that should no longer be playing
    activeClipsRef.current.forEach((clip, clipId) => {
      const [trackId, clipIdPart] = clipId.split('-');
      const track = tracks.find(t => t.id === trackId);
      if (!track) return;
      
      const clipItem = track.clips.find(c => c.id === clipIdPart);
      if (!clipItem) return;
      
      const clipEndTime = clipItem.startTime + clipItem.duration;
      if (currentTime > clipEndTime) {
        clip.stop();
        activeClipsRef.current.delete(clipId);
        console.log(`🔶 TIMELINE: Stopped clip ${clipId} at ${currentTime.toFixed(2)}`);
      }
    });
    
    // Loop through all tracks and clips to find new clips to play
    tracks.forEach(track => {
      // Skip muted tracks
      if (track.muted) {
        return;
      }
      
      // Find the sound for this track
      const sound = allSounds.find(s => s.id === track.soundId);
      if (!sound) {
        console.log(`🔶 TIMELINE: No sound found for track ${track.id}`);
        return;
      }
      
      // Check each clip in the track
      track.clips.forEach(clip => {
        const clipId = `${track.id}-${clip.id}`;
        const clipStartTime = clip.startTime;
        const clipEndTime = clipStartTime + clip.duration;
        
        // Skip clips that are already playing or outside our time window
        if (activeClipsRef.current.has(clipId)) {
          return;
        }
        
        // Check if this clip should start playing now
        // Use a wider detection window (200ms) to make sure we don't miss clips
        // during playback, especially if the interval timing isn't perfect
        if (
          currentTime >= clipStartTime && 
          currentTime <= clipStartTime + 0.2
        ) {
          console.log(`🔶 TIMELINE: Starting clip ${clipId} at ${currentTime.toFixed(2)}, clipStart: ${clipStartTime.toFixed(2)}`);
          
          try {
            // Create a proper copy of sound parameters, preserving all properties
            // but without using JSON.parse/stringify which can lose special types or methods
            const soundParams = { ...sound };
            
            // Make sure we preserve nested objects correctly
            if (sound.filterEnvelope) soundParams.filterEnvelope = { ...sound.filterEnvelope };
            if (sound.pitchEnvelope) soundParams.pitchEnvelope = { ...sound.pitchEnvelope };
            
            // Log the sound parameters for debugging
            console.log(`🔶 TIMELINE: Sound parameters for clip ${clipId}:`, {
              type: sound.type,
              name: sound.name,
              waveform: sound.waveform,
              pitch: sound.pitch,
              attack: sound.attack,
              decay: sound.decay,
              sustain: sound.sustain,
              release: sound.release,
              filterType: sound.filterType,
              filterCutoff: sound.filterCutoff
            });
            
            // Ensure essential parameters have defaults
            if (soundParams.duration === undefined || soundParams.duration <= 0) {
              soundParams.duration = 1.0; // Default to 1 second if not specified
            }
            
            // Apply special parameters based on sound type
            applyDefaultSoundParameters(soundParams, sound.type || sound.name);
            
            const clipDuration = Math.max(0.5, clip.duration); // Ensure minimum duration
            
            // Create and play the clip
            const soundClip = new SoundClip(
              clipId,
              soundParams,
              track.volume,
              track.pan,
              clipStartTime,
              clipDuration
            );
            
            // Play with current offset from clip start time
            const offset = Math.max(0, currentTime - clipStartTime);
            
            // Force resume the audio context before playing
            if (audioContext.state !== 'running') {
              console.log(`🔶 TIMELINE: Audio context is suspended during clip trigger, resuming`);
              // Don't use await here since we're not in an async function
              audioContext.resume().then(() => {
                console.log(`🔶 TIMELINE: Audio context resumed successfully: ${audioContext.state}`);
              });
            }
            
            // Play the clip with the current audio context destination as output
            const playResult = soundClip.play(audioContext, audioContext.destination, offset);
            activeClipsRef.current.set(clipId, soundClip);
            
            // Log that we've successfully started the clip
            console.log(`🔶 TIMELINE: Successfully triggered clip ${clipId} at ${currentTime.toFixed(2)}`);
            console.log(`🔶 TIMELINE: AudioContext state: ${audioContext.state}, play result: ${playResult}`);
            console.log(`🔶 TIMELINE: Audio routing: SoundClip source -> GainNode -> PanNode -> AudioContext.destination`);
            
            console.log(`🔶 TIMELINE: Playing clip ${clipId} with offset ${offset.toFixed(3)}s`);
          } catch (error) {
            console.error(`🔶 TIMELINE: Error playing clip ${clipId}:`, error);
          }
        }
      });
    });
  };
  
  // Seek to a specific time
  const seek = (time: number) => {
    console.log(`🔶 TIMELINE: Seeking to ${time.toFixed(2)}s`);
    
    // Stop all sounds when seeking
    stopAllSounds();
    
    // Update the time
    setCurrentTime(time);
    
    // If playback is currently active, restart it from the new position
    if (timeline.isPlaying) {
      // Cancel current playback
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      // Restart playback from new position
      startPlayback();
    } else {
      // If not playing, just check for clips at the new position
      const audioContext = getAudioContext()?.context;
      if (audioContext) {
        checkClipTriggers(time);
      }
    }
  };
  
  return {
    seek,
    stopAllSounds
  };
}