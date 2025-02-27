// lib/hooks/useAudioNode.ts
import { useState, useEffect, useRef } from "react";
import { SoundParameters } from "@/types/audio";
import { getAudioContext } from "@/lib/audio/audioContext";

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

  // In useAudioNode.ts, add this specialized function:

  // Create specialized sound sources for different types
  // Update the createSpecializedSource function to incorporate user parameters:

  const createSpecializedSource = (
    ctx: AudioContext,
    sound: SoundParameters,
    now: number
  ) => {
    // For Bass Kick, create a specialized kick drum sound
    if (sound.type === "Bass Kick") {
      // Create the main oscillator (sine wave for the body)
      const oscillator = ctx.createOscillator();
      oscillator.type = sound.waveform as OscillatorType; // Use user's waveform choice

      // Calculate frequencies based on user's pitch
      const pitchMultiplier = Math.pow(2, sound.pitch / 12);
      const baseFreq = 40 * pitchMultiplier; // Base frequency affected by pitch
      const clickFreq = 160 * pitchMultiplier; // Click frequency affected by pitch

      // Set initial frequency (the click)
      oscillator.frequency.setValueAtTime(clickFreq, now);

      // Quick pitch drop for the characteristic kick sound
      oscillator.frequency.exponentialRampToValueAtTime(
        baseFreq,
        now + 0.03 // Keep this fixed for the kick character
      );

      // Create a gain node for the amplitude envelope
      const kickEnvelope = ctx.createGain();

      // Start at full volume immediately - kick drums need a sharp attack
      kickEnvelope.gain.setValueAtTime(1, now);

      // Use a longer decay for the body of the kick
      // The attack parameter should affect the initial transient, but for kicks
      // we want to keep it punchy regardless
      kickEnvelope.gain.linearRampToValueAtTime(
        0.001,
        now + Math.max(0.2, sound.release) // Ensure at least 200ms decay
      );

      // Connect oscillator to its envelope
      oscillator.connect(kickEnvelope);

      // Calculate full duration including release to properly set completion state
      const totalDuration = sound.duration + 0.1;
      
      // Start the oscillator
      oscillator.start(now);
      oscillator.stop(now + totalDuration);
      
      // Set up an event for when oscillator ends
      oscillator.onended = () => {
        console.log("Bass Kick oscillator ended naturally");
      };
      
      // Return both source and output, plus duration for proper cleanup
      return { 
        source: oscillator, 
        output: kickEnvelope,
        effectiveDuration: totalDuration,
        onComplete: () => {
          console.log("Bass Kick complete callback triggered");
        }
      };
    }

    // For Snare, create a specialized snare drum sound
    else if (sound.type === "Snare") {
      // Create noise for the snare body
      const noiseBuffer = createNoiseBuffer(ctx, sound.duration);
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;

      // Create oscillator for the snare tone - affected by pitch
      const toneOsc = ctx.createOscillator();
      toneOsc.type = "triangle";
      toneOsc.frequency.value = 180 * Math.pow(2, sound.pitch / 12);

      // Create gain nodes for mixing
      const noiseGain = ctx.createGain();
      const toneGain = ctx.createGain();
      const mainGain = ctx.createGain();

      // Set gains - balance affected by filter cutoff (higher cutoff = more noise)
      const noiseRatio = Math.min(
        0.9,
        Math.max(0.5, sound.filterCutoff / 2000)
      );
      noiseGain.gain.value = noiseRatio;
      toneGain.gain.value = 1 - noiseRatio;

      // Create envelope based on user parameters
      mainGain.gain.setValueAtTime(0, now);
      mainGain.gain.linearRampToValueAtTime(1, now + sound.attack);
      mainGain.gain.linearRampToValueAtTime(
        sound.sustain,
        now + sound.attack + sound.decay
      );
      mainGain.gain.linearRampToValueAtTime(0.001, now + sound.duration);

      // Connect everything
      noiseSource.connect(noiseGain);
      toneOsc.connect(toneGain);
      noiseGain.connect(mainGain);
      toneGain.connect(mainGain);

      // Start sources
      noiseSource.start(now);
      toneOsc.start(now);
      noiseSource.stop(now + sound.duration);
      toneOsc.stop(now + sound.duration);

      return {
        source: noiseSource,
        output: mainGain,
        additionalSources: [toneOsc],
      };
    }

    // For Hi-Hat, create a specialized hi-hat sound
    else if (sound.type === "Hi-Hat") {
      // Create noise source for hi-hat
      const noiseBuffer = createNoiseBuffer(ctx, sound.duration);
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;

      // Create highpass filter to shape the sound
      const hihatFilter = ctx.createBiquadFilter();
      hihatFilter.type = "highpass";
      hihatFilter.frequency.value = 3000 + sound.pitch * 200; // Higher pitch = higher filter cutoff
      hihatFilter.Q.value = sound.filterResonance || 1;

      // Create envelope
      const hihatGain = ctx.createGain();
      hihatGain.gain.setValueAtTime(0, now);
      hihatGain.gain.linearRampToValueAtTime(
        1,
        now + Math.min(0.01, sound.attack)
      );
      hihatGain.gain.linearRampToValueAtTime(0.001, now + sound.duration * 0.8);

      // Connect
      noiseSource.connect(hihatFilter);
      hihatFilter.connect(hihatGain);

      // Start
      noiseSource.start(now);
      noiseSource.stop(now + sound.duration);

      return { source: noiseSource, output: hihatGain };
    }
    else if (sound.type === 'Percussion') {
      // Create noise source for the body (like a snare)
      const noiseBuffer = createNoiseBuffer(ctx, sound.duration);
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      
      // Create an oscillator for the "tone" part (like the drum head)
      const toneOsc = ctx.createOscillator();
      toneOsc.type = 'triangle';
      toneOsc.frequency.value = 180 * Math.pow(2, sound.pitch / 12); // Adjust based on pitch
      
      // Create filters to shape the sound
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.value = sound.filterCutoff;
      noiseFilter.Q.value = sound.filterResonance;
      
      // Create gain nodes for mixing and envelopes
      const noiseGain = ctx.createGain();
      const toneGain = ctx.createGain();
      const mainGain = ctx.createGain();
      
      // Set gains for mixing - more noise for a snare-like sound
      noiseGain.gain.value = 0.8;
      toneGain.gain.value = 0.3;
      
      // Create envelopes - tone part has a very quick decay
      toneGain.gain.setValueAtTime(1, now);
      toneGain.gain.exponentialRampToValueAtTime(0.01, now + 0.05); // Very quick decay for the tone
      
      // Main envelope
      mainGain.gain.setValueAtTime(0, now);
      mainGain.gain.linearRampToValueAtTime(1, now + 0.001); // Instant attack
      mainGain.gain.linearRampToValueAtTime(0.3, now + 0.1); // Quick initial decay
      mainGain.gain.linearRampToValueAtTime(0.001, now + sound.duration); // Full decay
      
      // Connect everything
      noiseSource.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      toneOsc.connect(toneGain);
      
      noiseGain.connect(mainGain);
      toneGain.connect(mainGain);
      
      // Start sources
      noiseSource.start(now);
      toneOsc.start(now);
      
      noiseSource.stop(now + sound.duration);
      toneOsc.stop(now + sound.duration);
      
      return { 
        source: noiseSource, 
        output: mainGain, 
        additionalSources: [toneOsc],
        effectiveDuration: sound.duration + 0.1
      };
    }

    // For Bass Synth, create a specialized bass sound
    else if (
      sound.type === "Bass" ||
      sound.type === "Bass Synth" ||
      sound.type === "Sub Bass"
    ) {
      // Create oscillator
      const oscillator = ctx.createOscillator();
      oscillator.type = sound.waveform as OscillatorType;

      // Calculate base frequency - much lower for bass sounds
      const baseFreq = 55 * Math.pow(2, sound.pitch / 12); // A1 (55Hz) as base
      oscillator.frequency.value = baseFreq;

      // Create a second oscillator for richness if using sawtooth or square
      let oscillator2 = null;
      let osc2Gain = null;
      if (sound.waveform === "sawtooth" || sound.waveform === "square") {
        oscillator2 = ctx.createOscillator();
        oscillator2.type = sound.waveform as OscillatorType;
        oscillator2.frequency.value = baseFreq * 1.01; // Slightly detuned for thickness

        osc2Gain = ctx.createGain();
        osc2Gain.gain.value = 0.5;
      }

      // Create envelope
      const bassGain = ctx.createGain();
      bassGain.gain.setValueAtTime(0, now);
      bassGain.gain.linearRampToValueAtTime(1, now + sound.attack);
      bassGain.gain.linearRampToValueAtTime(
        sound.sustain,
        now + sound.attack + sound.decay
      );
      bassGain.gain.linearRampToValueAtTime(0.001, now + sound.duration);

      // Connect
      oscillator.connect(bassGain);
      if (oscillator2 && osc2Gain) {
        oscillator2.connect(osc2Gain);
        osc2Gain.connect(bassGain);
      }

      // Start
      oscillator.start(now);
      oscillator.stop(now + sound.duration);
      if (oscillator2) {
        oscillator2.start(now);
        oscillator2.stop(now + sound.duration);
      }

      return {
        source: oscillator,
        output: bassGain,
        additionalSources: oscillator2 ? [oscillator2] : undefined,
        effectiveDuration: sound.duration + 0.1
      };
    }

    // For Lead Synth, create a lead sound
    else if (sound.type === "Synth" || sound.type === "Lead Synth") {
      // Create oscillator
      const oscillator = ctx.createOscillator();
      oscillator.type = sound.waveform as OscillatorType;

      // Higher base frequency for leads
      const baseFreq = 440 * Math.pow(2, sound.pitch / 12); // A4 (440Hz) as base
      oscillator.frequency.value = baseFreq;

      // Create envelope
      const leadGain = ctx.createGain();
      leadGain.gain.setValueAtTime(0, now);
      leadGain.gain.linearRampToValueAtTime(1, now + sound.attack);
      leadGain.gain.linearRampToValueAtTime(
        sound.sustain,
        now + sound.attack + sound.decay
      );
      leadGain.gain.linearRampToValueAtTime(0.001, now + sound.duration);

      // Connect
      oscillator.connect(leadGain);

      // Start
      oscillator.start(now);
      oscillator.stop(now + sound.duration);

      return { 
        source: oscillator, 
        output: leadGain,
        effectiveDuration: sound.duration + 0.1
      };
    }

    // For Pad, create a pad sound
    else if (sound.type === "Pad" || sound.type === "Ambient") {
      // Create multiple oscillators for richness
      const oscillator1 = ctx.createOscillator();
      const oscillator2 = ctx.createOscillator();
      const oscillator3 = ctx.createOscillator();

      oscillator1.type = sound.waveform as OscillatorType;
      oscillator2.type = sound.waveform as OscillatorType;
      oscillator3.type = sound.waveform as OscillatorType;

      // Set frequencies with slight detuning for chorus effect
      const baseFreq = 220 * Math.pow(2, sound.pitch / 12); // A3 as base
      oscillator1.frequency.value = baseFreq;
      oscillator2.frequency.value = baseFreq * 1.003; // Slightly detuned
      oscillator3.frequency.value = baseFreq * 0.997; // Slightly detuned

      // Create individual gains for mixing
      const gain1 = ctx.createGain();
      const gain2 = ctx.createGain();
      const gain3 = ctx.createGain();

      gain1.gain.value = 0.5;
      gain2.gain.value = 0.3;
      gain3.gain.value = 0.3;

      // Create main envelope with slow attack and release
      const padGain = ctx.createGain();
      padGain.gain.setValueAtTime(0, now);
      padGain.gain.linearRampToValueAtTime(
        1,
        now + Math.max(0.5, sound.attack)
      );
      padGain.gain.linearRampToValueAtTime(
        sound.sustain,
        now + sound.attack + sound.decay
      );
      padGain.gain.linearRampToValueAtTime(0.001, now + sound.duration);

      // Connect
      oscillator1.connect(gain1);
      oscillator2.connect(gain2);
      oscillator3.connect(gain3);

      gain1.connect(padGain);
      gain2.connect(padGain);
      gain3.connect(padGain);

      // Start
      oscillator1.start(now);
      oscillator2.start(now);
      oscillator3.start(now);

      oscillator1.stop(now + sound.duration);
      oscillator2.stop(now + sound.duration);
      oscillator3.stop(now + sound.duration);

      return {
        source: oscillator1,
        output: padGain,
        additionalSources: [oscillator2, oscillator3],
        effectiveDuration: sound.duration + 0.2 // Add a slightly longer tail for pad sounds
      };
    }

    // For FX or other types, use the default approach
    else {
      if (sound.waveform === "noise") {
        // Create noise source
        const noiseBuffer = createNoiseBuffer(ctx, sound.duration || 1.0);
        const noiseSource = ctx.createBufferSource();
        noiseSource.buffer = noiseBuffer;
        return { source: noiseSource, output: noiseSource };
      } else {
        // Create oscillator
        const oscillator = ctx.createOscillator();
        oscillator.type = sound.waveform as OscillatorType;
        oscillator.frequency.value = 440 * Math.pow(2, sound.pitch / 12); // Apply pitch

        // Set up pitch envelope if defined
        if (sound.pitchEnvelope && sound.pitchEnvelope.amount) {
          const baseFreq = 440 * Math.pow(2, sound.pitch / 12);
          const targetFreq =
            baseFreq * Math.pow(2, sound.pitchEnvelope.amount / 12);

          // Start at the higher frequency
          oscillator.frequency.setValueAtTime(targetFreq, now);

          // Sweep down to the base frequency
          oscillator.frequency.exponentialRampToValueAtTime(
            Math.max(baseFreq, 0.01), // Ensure frequency is positive
            now + (sound.pitchEnvelope.attack || 0.01)
          );
        }

        return { source: oscillator, output: oscillator };
      }
    }
  };

  // Create a noise buffer for noise waveform
  const createNoiseBuffer = (audioContext: AudioContext, duration: number) => {
    const sampleRate = audioContext.sampleRate;
    const bufferSize = sampleRate * duration;
    const buffer = audioContext.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    return buffer;
  };

  // Create a simple impulse response for reverb
  const createImpulseResponse = (
    audioContext: AudioContext,
    duration: number
  ) => {
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
  };

  // Create distortion curve
  const createDistortionCurve = (amount: number) => {
    const k = amount * 100;
    const samples = 44100;
    const curve = new Float32Array(samples);
    const deg = Math.PI / 180;

    for (let i = 0; i < samples; ++i) {
      const x = (i * 2) / samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }

    return curve;
  };

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
