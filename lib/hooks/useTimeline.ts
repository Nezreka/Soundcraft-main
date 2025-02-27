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
  
  // Play the sound using the specialized sound generators
  play(audioContext: AudioContext, outputNode: AudioNode, currentTime: number) {
    console.log(`🔊 SOUND: Playing clip ${this.id}, type: ${this.soundParams.type || 'unknown'}, waveform: ${this.soundParams.waveform}`);
    
    // Stop if already playing
    if (this.isPlaying) {
      console.log(`🔊 SOUND: Clip ${this.id} is already playing, stopping first`);
      this.stop();
    }
    
    try {
      // Create audio nodes
      this.gainNode = audioContext.createGain();
      this.panNode = audioContext.createStereoPanner();
      
      // Set volume and pan based on both sound and track parameters
      this.gainNode.gain.value = this.soundParams.volume * this.trackVolume;
      this.panNode.pan.value = this.trackPan;
      
      // Connect nodes
      this.gainNode.connect(this.panNode);
      this.panNode.connect(outputNode);
      
      // Generate appropriate sound source based on waveform
      if (this.soundParams.waveform === 'noise') {
        // Create noise source
        const noiseBuffer = this.createNoiseBuffer(audioContext, this.duration);
        const noiseSource = audioContext.createBufferSource();
        noiseSource.buffer = noiseBuffer;
        
        // Connect and start
        noiseSource.connect(this.gainNode);
        noiseSource.start();
        
        // Only set stop time if duration is reasonable
        if (this.duration > 0.1) {
          noiseSource.stop(audioContext.currentTime + this.duration);
        }
        
        this.sourceNode = noiseSource;
        console.log(`🔊 SOUND: Started noise source for clip ${this.id}, duration: ${this.duration}s`);
      } else {
        // Create oscillator with appropriate type
        const oscillator = audioContext.createOscillator();
        
        // Make sure waveform is a valid OscillatorType
        try {
          oscillator.type = (this.soundParams.waveform as OscillatorType) || 'sine';
        } catch (e) {
          console.log(`🔊 SOUND: Invalid waveform type, defaulting to sine`);
          oscillator.type = 'sine';
        }
        
        // Set frequency based on pitch (A4 = 440Hz, each semitone is a factor of 2^(1/12))
        oscillator.frequency.value = 440 * Math.pow(2, (this.soundParams.pitch || 0) / 12);
        console.log(`🔊 SOUND: Oscillator frequency: ${oscillator.frequency.value.toFixed(2)} Hz`);
        
        // Apply envelope for more realistic sound
        if (this.gainNode) {
          const now = audioContext.currentTime;
          const attack = Math.max(0.005, this.soundParams.attack || 0.01);
          const decay = Math.max(0.01, this.soundParams.decay || 0.1);
          const sustain = this.soundParams.sustain !== undefined ? this.soundParams.sustain : 0.7;
          const release = Math.max(0.01, this.soundParams.release || 0.3);
          
          // Start with zero gain
          this.gainNode.gain.setValueAtTime(0, now);
          
          // Attack phase - linear ramp to full volume
          this.gainNode.gain.linearRampToValueAtTime(
            this.soundParams.volume * this.trackVolume, 
            now + attack
          );
          
          // Decay phase - linear ramp to sustain level
          this.gainNode.gain.linearRampToValueAtTime(
            this.soundParams.volume * this.trackVolume * sustain,
            now + attack + decay
          );
          
          // Determine when to start release
          const releaseStart = now + attack + decay;
          
          // Release phase - linear ramp to zero
          this.gainNode.gain.linearRampToValueAtTime(
            0,
            releaseStart + release
          );
          
          console.log(`🔊 SOUND: ADSR envelope: a=${attack}s, d=${decay}s, s=${sustain}, r=${release}s`);
        }
        
        // Connect and start the oscillator
        oscillator.connect(this.gainNode);
        oscillator.start();
        
        // Ensure a reasonable duration for the sound
        const effectiveDuration = Math.max(0.5, this.duration);
        oscillator.stop(audioContext.currentTime + effectiveDuration);
        
        this.sourceNode = oscillator;
        console.log(`🔊 SOUND: Started oscillator for clip ${this.id}, type: ${oscillator.type}, freq: ${oscillator.frequency.value}Hz`);
      }
      
      this.isPlaying = true;
      
      // Auto-stop when done (use a slightly longer timeout to ensure all processing completes)
      const stopTimeout = Math.max(0.5, this.duration) * 1000 + 100;
      setTimeout(() => {
        console.log(`🔊 SOUND: Auto-stopping clip ${this.id} after ${stopTimeout/1000} seconds`);
        this.stop();
      }, stopTimeout);
      
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
    
    if (this.gainNode) {
      try {
        this.gainNode.disconnect();
      } catch (e) {
        console.error(`🔊 SOUND: Error disconnecting gain node for ${this.id}:`, e);
      }
      this.gainNode = null;
    }
    
    if (this.panNode) {
      try {
        this.panNode.disconnect();
      } catch (e) {
        console.error(`🔊 SOUND: Error disconnecting pan node for ${this.id}:`, e);
      }
      this.panNode = null;
    }
    
    this.isPlaying = false;
    console.log(`🔊 SOUND: Clip ${this.id} is now stopped`);
  }
  
  // Helper to create noise buffer
  private createNoiseBuffer(audioContext: AudioContext, duration: number) {
    const sampleRate = audioContext.sampleRate;
    const bufferSize = sampleRate * duration;
    const buffer = audioContext.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    return buffer;
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
    if (timeline.isPlaying) {
      startPlayback();
    } else {
      pausePlayback();
    }
  }, [timeline.isPlaying]);
  
  // Start playback using a completely different approach with requestAnimationFrame
  const startPlayback = () => {
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
    
    // Check if any clips should trigger at the current position
    if (audioContextManager?.context) {
      checkClipTriggers(startTime);
    }
    
    // Create a frame animation loop for smooth playback
    const animationLoop = (currentTime: number) => {
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
        
        // Check for sound triggers
        checkClipTriggers(newPos);
        
        // Continue the animation loop
        animationFrameRef.current = requestAnimationFrame(animationLoop);
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
  const checkClipTriggers = (currentTime: number) => {
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
            // Make a deep copy of the sound parameters to avoid issues
            const soundParams = { ...sound };
            
            // Ensure essential parameters have defaults
            if (soundParams.duration === undefined || soundParams.duration <= 0) {
              soundParams.duration = 1.0; // Default to 1 second if not specified
            }
            
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
            soundClip.play(audioContext, audioContext.destination, offset);
            activeClipsRef.current.set(clipId, soundClip);
            
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