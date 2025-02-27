// lib/audio/soundGenerators.ts
import { SoundParameters } from "@/types/audio";

// Create a noise buffer for noise waveform
export const createNoiseBuffer = (audioContext: AudioContext, duration: number) => {
  const sampleRate = audioContext.sampleRate;
  const bufferSize = sampleRate * duration;
  const buffer = audioContext.createBuffer(1, bufferSize, sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  return buffer;
};

// Create distortion curve
export const createDistortionCurve = (amount: number) => {
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

// Create a simple impulse response for reverb
export const createImpulseResponse = (
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

// Create specialized sound sources for different types
export const createSpecializedSource = (
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

    // Start the oscillator
    oscillator.start(now);
    oscillator.stop(now + sound.duration + 0.1); // Add a little buffer

    return { source: oscillator, output: kickEnvelope };
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
      additionalSources: [toneOsc] 
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

    return { source: oscillator, output: leadGain };
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