// lib/hooks/useAudioNode.ts
import { useState, useEffect, useRef } from "react";
import { SoundParameters } from "@/types/audio";
import { getAudioContext } from "@/lib/audio/audioContext";
import { 
  createSpecializedSource, 
  createNoiseBuffer, 
  createImpulseResponse, 
  createDistortionCurve 
} from "@/lib/audio/soundGenerators";

export function useAudioNode(sound: SoundParameters | null) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [analyzer, setAnalyzer] = useState<AnalyserNode | null>(null);
  const sourceRef = useRef<OscillatorNode | AudioBufferSourceNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const filterRef = useRef<BiquadFilterNode | null>(null);
  const distortionRef = useRef<WaveShaperNode | null>(null);
  const reverbRef = useRef<ConvolverNode | null>(null);
  const reverbGainRef = useRef<GainNode | null>(null);
  const dryGainRef = useRef<GainNode | null>(null);
  const delayRef = useRef<DelayNode | null>(null);
  const delayFeedbackRef = useRef<GainNode | null>(null);
  const delayDryRef = useRef<GainNode | null>(null);
  const delayWetRef = useRef<GainNode | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lfoRef = useRef<OscillatorNode | null>(null);
  const lfoGainRef = useRef<GainNode | null>(null);
  const additionalSourcesRef = useRef<
    (OscillatorNode | AudioBufferSourceNode)[]
  >([]);

  // Clean up function
  const cleanup = () => {
    console.log("Running cleanup for sound", sound?.type);
    
    // Make sure we set isPlaying to false immediately for UI responsiveness
    setIsPlaying(false);
    
    if (sourceRef.current) {
      try {
        sourceRef.current.stop();
        console.log("Stopped main source");
      } catch (e) {
        console.log("Error stopping main source:", e);
        // Ignore errors if already stopped
      }
      try {
        sourceRef.current.disconnect();
      } catch (e) {
        console.log("Error disconnecting main source:", e);
      }
      sourceRef.current = null;
    }

    // Clean up additional sources
    if (additionalSourcesRef.current.length > 0) {
      additionalSourcesRef.current.forEach((source) => {
        try {
          source.stop();
        } catch (e) {
          // Ignore errors if already stopped
        }
        source.disconnect();
      });
      additionalSourcesRef.current = [];
    }

    if (lfoRef.current) {
      try {
        lfoRef.current.stop();
      } catch (e) {
        // Ignore errors if already stopped
      }
      lfoRef.current.disconnect();
      lfoRef.current = null;
    }

    // Clean up all other audio nodes
    [
      gainRef,
      filterRef,
      distortionRef,
      reverbRef,
      reverbGainRef,
      dryGainRef,
      delayRef,
      delayFeedbackRef,
      delayDryRef,
      delayWetRef,
      lfoGainRef,
    ].forEach((ref) => {
      if (ref.current) {
        ref.current.disconnect();
        ref.current = null;
      }
    });

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setAnalyzer(null);
  };

  // Clean up on unmount
  useEffect(() => {
    return cleanup;
  }, []);

  // Calculate reverb tail time based on sound parameters
  const calculateReverbTail = (sound: SoundParameters) => {
    if (sound.reverbMix <= 0) return 0;
    return sound.reverbDecay * 2; // Estimate the reverb tail length
  };

  // Calculate delay tail time
  const calculateDelayTail = (sound: SoundParameters) => {
    if (sound.delayMix <= 0) return 0;
    // Estimate based on delay time and feedback
    return sound.delayTime * 10 * sound.delayFeedback;
  };

  // Play sound once
  const play = () => {
    if (!sound) return;

    // Clean up any existing nodes
    cleanup();
    
    // Set isPlaying to true immediately for UI feedback
    setIsPlaying(true);
    
    // Create a listener for the sound completion event
    const onSoundComplete = () => {
      console.log(`Sound ${sound.type} finished playing naturally`);
      cleanup();
      setIsPlaying(false);
    };
    
    // Make sure we start with a clean state
    sourceRef.current = null;
    additionalSourcesRef.current = [];
    lfoRef.current = null;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    try {
      const audioContext = getAudioContext();
      if (!audioContext?.context) return;

      const ctx = audioContext.context;

      // Create all audio nodes
      const mainGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      const distortion = ctx.createWaveShaper();

      // Create analyzer
      const analyzerNode = ctx.createAnalyser();
      analyzerNode.fftSize = 256;
      analyzerNode.smoothingTimeConstant = 0.7;

      // Reverb nodes
      const reverbNode = ctx.createConvolver();
      const reverbGain = ctx.createGain();
      const dryGain = ctx.createGain();

      // Delay nodes
      const delay = ctx.createDelay(5.0); // Max 5 seconds
      const delayFeedback = ctx.createGain();
      const delayDry = ctx.createGain();
      const delayWet = ctx.createGain();

      // Get the current time
      const now = ctx.currentTime;

      // Use the shared sound generation code (same as timeline)
      const sourceInfo = createSpecializedSource(ctx, sound, now);
      const source = sourceInfo.source;
      let sourceOutput = sourceInfo.output;

      // Set up LFO if needed (for non-specialized sources)
      if (
        sound.type !== "Bass Kick" &&
        sound.type !== "Snare" &&
        (sound.lfoAmount || sound.lfoDepth) > 0 &&
        sound.lfoRate > 0
      ) {
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();

        lfo.frequency.value = sound.lfoRate;
        // Use either lfoAmount or lfoDepth, whichever is defined
        const lfoDepthValue = sound.lfoAmount || sound.lfoDepth;
        lfoGain.gain.value = lfoDepthValue * 10; // Scale for more noticeable effect

        lfo.connect(lfoGain);

        // Connect LFO to appropriate parameter based on target
        if (sound.lfoTarget === "pitch" && "frequency" in source) {
          lfoGain.connect((source as OscillatorNode).frequency);
        }
        // Store LFO references
        lfoRef.current = lfo;
        lfoGainRef.current = lfoGain;

        lfo.start(now);
      }

      // Store additional sources for cleanup
      if (sourceInfo.additionalSources) {
        additionalSourcesRef.current = sourceInfo.additionalSources;
      }

      // Connect source output to the main gain
      sourceOutput.connect(mainGain);

      // Set up main gain
      mainGain.gain.value = sound.volume;

      // Set up filter
      filter.type = sound.filterType as BiquadFilterType;
      filter.frequency.value = sound.filterCutoff;
      filter.Q.value = sound.filterResonance;

      // Set up filter envelope if defined
      if (sound.filterEnvelope && sound.filterEnvelope.amount) {
        const baseFreq = sound.filterCutoff;
        const targetFreq = baseFreq + sound.filterEnvelope.amount;

        // Start at base frequency
        filter.frequency.setValueAtTime(baseFreq, now);

        // Sweep to target frequency
        filter.frequency.linearRampToValueAtTime(
          targetFreq,
          now + (sound.filterEnvelope.attack || 0.01)
        );

        // If there's a decay, sweep back
        if (sound.filterEnvelope.decay && sound.filterEnvelope.decay > 0) {
          filter.frequency.linearRampToValueAtTime(
            baseFreq,
            now +
              (sound.filterEnvelope.attack || 0.01) +
              (sound.filterEnvelope.decay || 0.1)
          );
        }
      }

      // Set up distortion
      if (sound.distortion > 0) {
        distortion.curve = createDistortionCurve(sound.distortion);
        distortion.oversample = "4x";
      }

      // Set up reverb
      if (sound.reverbMix > 0) {
        reverbNode.buffer = createImpulseResponse(ctx, sound.reverbDecay);
        reverbGain.gain.value = sound.reverbMix;
        dryGain.gain.value = 1 - sound.reverbMix;
      } else {
        // Bypass reverb
        reverbGain.gain.value = 0;
        dryGain.gain.value = 1;
      }

      // Set up delay
      if (sound.delayMix > 0) {
        delay.delayTime.value = sound.delayTime;
        delayFeedback.gain.value = sound.delayFeedback;
        delayWet.gain.value = sound.delayMix;
        delayDry.gain.value = 1 - sound.delayMix;
      } else {
        // Bypass delay
        delayWet.gain.value = 0;
        delayDry.gain.value = 1;
      }

      // Connect nodes:
      // Source -> Main Gain -> Filter -> Distortion ->
      // -> [Dry, Reverb -> Reverb Gain] ->
      // -> [Delay Dry, Delay -> Feedback Loop -> Delay Wet] ->
      // -> Analyzer -> Master Output

      // Basic signal path
      sourceOutput.connect(mainGain);
      mainGain.connect(filter);
      filter.connect(distortion);

      // Split for reverb
      const postDistortion = distortion;

      if (sound.reverbMix > 0) {
        // Dry path
        postDistortion.connect(dryGain);

        // Wet (reverb) path
        postDistortion.connect(reverbNode);
        reverbNode.connect(reverbGain);

        // Combine dry and wet paths
        dryGain.connect(analyzerNode);
        reverbGain.connect(analyzerNode);
      } else {
        // No reverb, direct connection
        postDistortion.connect(analyzerNode);
      }

      // Connect analyzer to output
      analyzerNode.connect(audioContext.masterGain);

      // Calculate total duration including effect tails
      let soundDuration = sound.duration || 1.0;
      const adjustedDuration = soundDuration * (sound.timeStretch || 1);
      const reverbTail = calculateReverbTail(sound);
      const delayTail = calculateDelayTail(sound);
      const effectsTail = Math.max(reverbTail, delayTail);
      
      // If we have an effectiveDuration from a specialized sound, use that
      // Add 0.1 seconds to ensure UI updates properly
      const totalDuration = (sourceInfo.effectiveDuration || (adjustedDuration + effectsTail)) + 0.1;

      // Start source
      source.start(now);

      // Apply envelope
      // Attack
      // Apply envelope based on sound type
      if (!["Bass Kick", "Snare", "Hi-Hat"].includes(sound.type)) {
        // Apply envelope
        // Attack
        mainGain.gain.setValueAtTime(0, now);
        mainGain.gain.linearRampToValueAtTime(sound.volume, now + sound.attack);

        // Decay to sustain
        mainGain.gain.linearRampToValueAtTime(
          sound.volume * sound.sustain,
          now + sound.attack + sound.decay
        );

        // Hold at sustain until release
        mainGain.gain.setValueAtTime(
          sound.volume * sound.sustain,
          now + adjustedDuration - sound.release
        );

        // Release
        mainGain.gain.linearRampToValueAtTime(0, now + adjustedDuration);
      } else {
        // For specialized sounds, just set the main gain to the volume
        // and let the specialized envelope handle the shaping
        mainGain.gain.setValueAtTime(sound.volume, now);
      }

      // Schedule source to stop after total duration
      source.stop(now + totalDuration);

      // If we have an LFO, stop it as well
      if (lfoRef.current) {
        lfoRef.current.stop(now + totalDuration);
      }

      // Check if this is one of the special sound types that needs extra handling
      const isSpecialSound = ["Bass Kick", "Percussion", "Bass", "Synth", "Ambient", 
                           "Bass Synth", "Lead Synth", "Sub Bass", "Pad"].includes(sound.type);
      
      // For special sounds, use a much shorter timeout to ensure UI responsiveness
      if (isSpecialSound) {
        console.log(`Using short timeout for special sound: ${sound.type}`);
        // Use a short timeout to ensure the button flips back quickly
        setTimeout(() => {
          console.log(`Short timeout complete for ${sound.type}`);
          cleanup();
          setIsPlaying(false);
        }, 500); // 500ms is enough to hear the sound but ensure UI responsiveness
        
        // If not a special sound, try to use event-based detection
      } else if (source instanceof AudioBufferSourceNode) {
        source.onended = () => {
          console.log(`AudioBufferSourceNode ended event for ${sound.type}`);
          cleanup();
          setIsPlaying(false);
        };
      } else if (sourceInfo.additionalSources && sourceInfo.additionalSources.length > 0) {
        // For multiple sources, use the onended of the main source
        sourceInfo.additionalSources[0].onended = () => {
          console.log(`Additional source ended event for ${sound.type}`);
          cleanup();
          setIsPlaying(false);
        };
      }
      
      // Only set the fallback timeout for non-special sounds
      // Special sounds already have their short timeout set above
      if (!isSpecialSound) {
        // Set a timeout as a fallback, using the calculated total duration
        // This ensures cleanup even if the onended event doesn't fire
        const timeoutMs = totalDuration * 1000 + 100;
        
        console.log(`Setting fallback timeout for ${sound.type} with duration ${timeoutMs}ms`);
        
        timeoutRef.current = setTimeout(() => {
          console.log(`Fallback timeout triggered for ${sound.type}`);
          cleanup();
          setIsPlaying(false);
        }, timeoutMs);
      }

      // Store references
      sourceRef.current = source;
      gainRef.current = mainGain;
      filterRef.current = filter;
      distortionRef.current = distortion;
      reverbRef.current = reverbNode;
      reverbGainRef.current = reverbGain;
      dryGainRef.current = dryGain;
      delayRef.current = delay;
      delayFeedbackRef.current = delayFeedback;
      delayDryRef.current = delayDry;
      delayWetRef.current = delayWet;

      // Store analyzer
      setAnalyzer(analyzerNode);
      
      // isPlaying is already set to true at the start of the function
    } catch (error) {
      console.error("Error playing sound:", error);
      // Reset isPlaying if there's an error
      setIsPlaying(false);
    }
  };

  // Stop sound
  const stop = () => {
    cleanup();
  };

  // Toggle play/stop
  const toggle = () => {
    console.log("Toggle called, current isPlaying state:", isPlaying);
    
    // Force UI update for immediate feedback
    if (isPlaying) {
      console.log("Stopping playback");
      setIsPlaying(false);
      stop();
    } else {
      console.log("Starting playback");
      setIsPlaying(true);
      play();
    }
    
    // Return the new state to help parent components update
    return !isPlaying;
  };

  return {
    isPlaying,
    play,
    stop,
    toggle,
    analyzer,
  };
}
