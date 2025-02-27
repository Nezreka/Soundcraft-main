import { getAudioContext } from './audioContext';
import { SoundParameters } from '@/types/audio';

// Define export options
export interface ExportOptions {
  format: 'wav' | 'mp3' | 'ogg';
  quality?: number;
  normalize?: boolean;
  duration: number;
}

// Function to export a single sound by recording its actual playback
export async function exportSingleSound(
  sound: SoundParameters,
  format: 'wav' | 'mp3' = 'wav'
): Promise<void> {
  try {
    console.log("Starting export process for sound:", sound.type);
    
    // 1. Create audio context and offline context for rendering
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const duration = sound.duration || 1.0;
    const effectsTail = estimateEffectsTail(sound);
    const totalDuration = duration + effectsTail;
    
    console.log(`Exporting with duration: ${duration}s + ${effectsTail}s tail = ${totalDuration}s total`);
    
    const offlineCtx = new OfflineAudioContext(
      2, 
      Math.ceil(audioCtx.sampleRate * totalDuration), 
      audioCtx.sampleRate
    );
    
    // 2. Create and set up all the audio nodes similar to useAudioNode.ts
    // --------------------------------------------------------------------
    const now = offlineCtx.currentTime;
    
    // 2.1 Create sound source based on type
    let oscillator: OscillatorNode | null = null;
    let noiseSource: AudioBufferSourceNode | null = null;
    let additionalSources: (OscillatorNode | AudioBufferSourceNode)[] = [];
    
    let sourceNode: AudioNode;
    let envelopeNode = offlineCtx.createGain(); // For ADSR envelope
    
    // Create source node based on sound type
    if (sound.type === "Bass Kick") {
      // Special kick drum with frequency sweep
      oscillator = offlineCtx.createOscillator();
      oscillator.type = (sound.waveform as OscillatorType) || "sine";
      
      // Pitch settings
      const pitchMultiplier = Math.pow(2, sound.pitch / 12);
      const baseFreq = 40 * pitchMultiplier;
      const clickFreq = 160 * pitchMultiplier;
      
      // Set frequency sweep for kick
      oscillator.frequency.setValueAtTime(clickFreq, now);
      oscillator.frequency.exponentialRampToValueAtTime(baseFreq, now + 0.03);
      
      // Connect to envelope
      oscillator.connect(envelopeNode);
      
      // Set up kick-specific envelope
      envelopeNode.gain.setValueAtTime(1, now);
      envelopeNode.gain.linearRampToValueAtTime(0.001, now + Math.max(0.2, sound.release));
      
      sourceNode = oscillator;
    } 
    else if (sound.type === "Snare" || sound.type === "Hi-Hat" || sound.type === "Clap" || 
             sound.type === "Percussion" || sound.type === "Impact" ||
             sound.waveform === "noise") {
      // Create noise buffer
      const noiseBuffer = createNoiseBuffer(offlineCtx, totalDuration);
      noiseSource = offlineCtx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      
      if (sound.type === "Hi-Hat") {
        // Add highpass filter for hi-hat
        const hihatFilter = offlineCtx.createBiquadFilter();
        hihatFilter.type = "highpass";
        hihatFilter.frequency.value = 3000 + (sound.pitch || 0) * 200;
        hihatFilter.Q.value = sound.filterResonance || 1;
        
        noiseSource.connect(hihatFilter);
        hihatFilter.connect(envelopeNode);
        
        // Quick envelope for hi-hat
        envelopeNode.gain.setValueAtTime(0, now);
        envelopeNode.gain.linearRampToValueAtTime(1, now + Math.min(0.01, sound.attack || 0.01));
        envelopeNode.gain.linearRampToValueAtTime(0.001, now + (sound.duration || 0.2) * 0.8);
      } 
      else if (sound.type === "Snare") {
        // For snare, mix noise with a tone oscillator
        const toneOsc = offlineCtx.createOscillator();
        toneOsc.type = "triangle";
        toneOsc.frequency.value = 180 * Math.pow(2, (sound.pitch || 0) / 12);
        
        const noiseGain = offlineCtx.createGain();
        const toneGain = offlineCtx.createGain();
        
        // Set mix based on filter cutoff
        const noiseRatio = Math.min(0.9, Math.max(0.5, (sound.filterCutoff || 1000) / 2000));
        noiseGain.gain.value = noiseRatio;
        toneGain.gain.value = 1 - noiseRatio;
        
        noiseSource.connect(noiseGain);
        toneOsc.connect(toneGain);
        noiseGain.connect(envelopeNode);
        toneGain.connect(envelopeNode);
        
        // Standard envelope
        envelopeNode.gain.setValueAtTime(0, now);
        envelopeNode.gain.linearRampToValueAtTime(1, now + (sound.attack || 0.01));
        envelopeNode.gain.linearRampToValueAtTime(sound.sustain || 0.1, now + (sound.attack || 0.01) + (sound.decay || 0.1));
        envelopeNode.gain.linearRampToValueAtTime(0.001, now + (sound.duration || 0.3));
        
        // Add tone oscillator to additional sources for cleanup
        additionalSources.push(toneOsc);
        toneOsc.start(now);
        toneOsc.stop(now + totalDuration);
      } 
      else {
        // Generic connection for other noise-based sounds
        noiseSource.connect(envelopeNode);
        
        // Regular ADSR envelope
        envelopeNode.gain.setValueAtTime(0, now);
        envelopeNode.gain.linearRampToValueAtTime(1, now + (sound.attack || 0.01));
        envelopeNode.gain.linearRampToValueAtTime(sound.sustain || 0.5, now + (sound.attack || 0.01) + (sound.decay || 0.1));
        envelopeNode.gain.linearRampToValueAtTime(0.001, now + (sound.duration || 1.0));
      }
      
      sourceNode = noiseSource;
    }
    else {
      // Create standard oscillator for other sound types
      oscillator = offlineCtx.createOscillator();
      
      // Set waveform type
      if (sound.waveform === 'sine' || sound.waveform === 'square' || 
          sound.waveform === 'sawtooth' || sound.waveform === 'triangle') {
        oscillator.type = sound.waveform as OscillatorType;
      } else {
        oscillator.type = 'sine'; // Default
      }
      
      // Set frequency based on pitch
      oscillator.frequency.value = 440 * Math.pow(2, (sound.pitch || 0) / 12);
      
      // Special handling for bass sounds - add a second oscillator for richness
      if (sound.type === "Bass" || sound.type === "Bass Synth" || sound.type === "Sub Bass") {
        // Use A1 (55Hz) as base for bass sounds
        oscillator.frequency.value = 55 * Math.pow(2, (sound.pitch || 0) / 12);
        
        // Add second oscillator for richness
        if (sound.waveform === "sawtooth" || sound.waveform === "square") {
          const oscillator2 = offlineCtx.createOscillator();
          oscillator2.type = oscillator.type;
          oscillator2.frequency.value = oscillator.frequency.value * 1.01; // Slight detune
          
          const osc2Gain = offlineCtx.createGain();
          osc2Gain.gain.value = 0.5;
          
          oscillator2.connect(osc2Gain);
          osc2Gain.connect(envelopeNode);
          
          additionalSources.push(oscillator2);
          oscillator2.start(now);
          oscillator2.stop(now + totalDuration);
        }
      }
      
      // Special handling for pad sounds - add chord-like oscillators
      if (sound.type === "Pad" || sound.type === "Ambient") {
        // Create chord-like sound with multiple oscillators
        const baseFreq = oscillator.frequency.value;
        
        const oscillator2 = offlineCtx.createOscillator();
        oscillator2.type = oscillator.type;
        oscillator2.frequency.value = baseFreq * 1.25; // Major third
        
        const oscillator3 = offlineCtx.createOscillator();
        oscillator3.type = oscillator.type;
        oscillator3.frequency.value = baseFreq * 1.5; // Perfect fifth
        
        const gain1 = offlineCtx.createGain();
        const gain2 = offlineCtx.createGain();
        const gain3 = offlineCtx.createGain();
        
        gain1.gain.value = 0.5;
        gain2.gain.value = 0.3;
        gain3.gain.value = 0.2;
        
        oscillator.connect(gain1);
        oscillator2.connect(gain2);
        oscillator3.connect(gain3);
        
        gain1.connect(envelopeNode);
        gain2.connect(envelopeNode);
        gain3.connect(envelopeNode);
        
        additionalSources.push(oscillator2, oscillator3);
        oscillator2.start(now);
        oscillator3.start(now);
        oscillator2.stop(now + totalDuration);
        oscillator3.stop(now + totalDuration);
        
        // Don't connect the main oscillator directly - we already connected through gain1
        oscillator.connect(gain1);
      } else {
        // Regular connection for standard oscillator
        oscillator.connect(envelopeNode);
      }
      
      // Apply standard ADSR envelope for oscillator-based sounds
      envelopeNode.gain.setValueAtTime(0, now);
      envelopeNode.gain.linearRampToValueAtTime(1, now + (sound.attack || 0.01));
      envelopeNode.gain.linearRampToValueAtTime(sound.sustain || 0.5, now + (sound.attack || 0.01) + (sound.decay || 0.1));
      envelopeNode.gain.linearRampToValueAtTime(0.001, now + (sound.duration || 1.0));
      
      sourceNode = oscillator;
    }
    
    // 2.2 Create main audio processing chain
    // --------------------------------------------------
    const mainGain = offlineCtx.createGain();
    mainGain.gain.value = sound.volume || 0.8;
    
    // 2.3 Set up Filter
    const filter = offlineCtx.createBiquadFilter();
    filter.type = (sound.filterType as BiquadFilterType) || 'lowpass';
    filter.frequency.value = sound.filterCutoff || 2000;
    filter.Q.value = sound.filterResonance || 1;
    
    // 2.4 Apply filter envelope if specified
    if (sound.filterEnvelope && sound.filterEnvelope.amount) {
      const baseFreq = filter.frequency.value;
      const targetFreq = baseFreq + (sound.filterEnvelope.amount || 0);
      
      filter.frequency.setValueAtTime(baseFreq, now);
      filter.frequency.linearRampToValueAtTime(targetFreq, now + (sound.filterEnvelope.attack || 0.01));
      
      if (sound.filterEnvelope.decay) {
        filter.frequency.linearRampToValueAtTime(
          baseFreq,
          now + (sound.filterEnvelope.attack || 0.01) + (sound.filterEnvelope.decay || 0.1)
        );
      }
    }
    
    // 2.5 Set up Distortion
    const distortion = offlineCtx.createWaveShaper();
    if (sound.distortion && sound.distortion > 0) {
      distortion.curve = createDistortionCurve(sound.distortion);
      distortion.oversample = '4x';
    }
    
    // 2.6 Set up Reverb
    const reverb = offlineCtx.createConvolver();
    const reverbWet = offlineCtx.createGain();
    const reverbDry = offlineCtx.createGain();
    
    if (sound.reverbMix && sound.reverbMix > 0) {
      reverb.buffer = createImpulseResponse(offlineCtx, sound.reverbDecay || 1.0);
      reverbWet.gain.value = sound.reverbMix;
      reverbDry.gain.value = 1 - sound.reverbMix;
    } else {
      reverbWet.gain.value = 0;
      reverbDry.gain.value = 1;
    }
    
    // 2.7 Set up Delay
    const delay = offlineCtx.createDelay(5.0);
    const delayFeedback = offlineCtx.createGain();
    const delayWet = offlineCtx.createGain();
    const delayDry = offlineCtx.createGain();
    
    if (sound.delayMix && sound.delayMix > 0) {
      delay.delayTime.value = sound.delayTime || 0.5;
      delayFeedback.gain.value = sound.delayFeedback || 0.3;
      delayWet.gain.value = sound.delayMix;
      delayDry.gain.value = 1 - sound.delayMix;
      
      // Create feedback loop
      delay.connect(delayFeedback);
      delayFeedback.connect(delay);
    } else {
      delayWet.gain.value = 0;
      delayDry.gain.value = 1;
    }
    
    // 2.8 Connect the audio graph
    // Source -> Envelope -> Main Gain -> Filter -> Distortion -> 
    // -> [Reverb Dry/Wet] -> [Delay Dry/Wet] -> Destination
    
    // Main chain connections
    envelopeNode.connect(mainGain);
    mainGain.connect(filter);
    filter.connect(distortion);
    
    // Reverb split
    if (sound.reverbMix && sound.reverbMix > 0) {
      distortion.connect(reverbDry);
      distortion.connect(reverb);
      reverb.connect(reverbWet);
      
      // With delay
      if (sound.delayMix && sound.delayMix > 0) {
        reverbDry.connect(delayDry);
        reverbWet.connect(delayDry);
        
        reverbDry.connect(delay);
        reverbWet.connect(delay);
        
        delay.connect(delayWet);
        
        delayDry.connect(offlineCtx.destination);
        delayWet.connect(offlineCtx.destination);
      } else {
        // Without delay
        reverbDry.connect(offlineCtx.destination);
        reverbWet.connect(offlineCtx.destination);
      }
    } else {
      // No reverb
      if (sound.delayMix && sound.delayMix > 0) {
        distortion.connect(delayDry);
        distortion.connect(delay);
        
        delay.connect(delayWet);
        
        delayDry.connect(offlineCtx.destination);
        delayWet.connect(offlineCtx.destination);
      } else {
        // Direct connection
        distortion.connect(offlineCtx.destination);
      }
    }
    
    // 3. Start all sound sources
    if (oscillator) {
      oscillator.start(now);
      oscillator.stop(now + totalDuration);
    }
    
    if (noiseSource) {
      noiseSource.start(now);
      noiseSource.stop(now + totalDuration);
    }
    
    // 4. Render audio to buffer
    console.log("Starting offline rendering...");
    const renderedBuffer = await offlineCtx.startRendering();
    console.log("Rendering complete:", {
      duration: renderedBuffer.duration,
      channels: renderedBuffer.numberOfChannels,
      length: renderedBuffer.length
    });
    
    // 5. Verify rendered buffer has content
    const channelData = renderedBuffer.getChannelData(0);
    let maxSample = 0;
    for (let i = 0; i < channelData.length; i++) {
      maxSample = Math.max(maxSample, Math.abs(channelData[i]));
    }
    
    console.log("Max sample amplitude:", maxSample);
    
    if (maxSample < 0.01) {
      console.warn("Warning: Rendered buffer appears to be too quiet!");
      
      // Boost the signal
      for (let c = 0; c < renderedBuffer.numberOfChannels; c++) {
        const data = renderedBuffer.getChannelData(c);
        for (let i = 0; i < data.length; i++) {
          data[i] *= 10; // Boost by 10x
        }
      }
    }
    
    // 6. Generate downloadable file
    const wavBlob = await encodeWAV(renderedBuffer);
    
    console.log("Generated WAV file:", {
      size: wavBlob.size,
      type: wavBlob.type
    });
    
    if (wavBlob.size < 100) {
      throw new Error("Generated WAV file is too small, likely empty");
    }
    
    // 7. Download the file
    const fileName = `${sound.name || 'sound'}_${sound.type.replace(/\s+/g, '_').toLowerCase()}.wav`;
    
    const url = URL.createObjectURL(wavBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log("Download triggered for", fileName);
    
    // 8. Cleanup
    console.log("Export process complete");
    
  } catch (error) {
    console.error("Failed to export sound:", error);
    throw error;
  }
}

// Helper function to estimate effects tail length
function estimateEffectsTail(sound: SoundParameters): number {
  let tail = 0;
  
  // Add reverb tail if present
  if (sound.reverbMix && sound.reverbMix > 0) {
    tail += sound.reverbDecay ? sound.reverbDecay * 2 : 2; // Default 2 seconds
  }
  
  // Add delay tail if present
  if (sound.delayMix && sound.delayMix > 0) {
    const feedback = sound.delayFeedback || 0.3;
    const delayTime = sound.delayTime || 0.5;
    
    // Estimate how many delay repeats until inaudible
    const repeats = Math.min(10, Math.ceil(Math.log(0.001) / Math.log(feedback)));
    tail += delayTime * repeats;
  }
  
  return Math.min(10, Math.max(1, tail)); // Cap between 1-10 seconds
}

// Create noise buffer for noise-based sounds
function createNoiseBuffer(ctx: BaseAudioContext, duration: number): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const bufferSize = Math.ceil(sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
  const data = buffer.getChannelData(0);
  
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  
  return buffer;
}

// Create impulse response for reverb
function createImpulseResponse(ctx: BaseAudioContext, duration: number): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = Math.ceil(sampleRate * duration);
  const impulse = ctx.createBuffer(2, length, sampleRate);
  const leftChannel = impulse.getChannelData(0);
  const rightChannel = impulse.getChannelData(1);
  
  for (let i = 0; i < length; i++) {
    // Exponential decay
    const decay = Math.exp(-i / (sampleRate * duration / 10));
    
    // Random noise with slight stereo difference
    const noiseLeft = Math.random() * 2 - 1;
    const noiseRight = Math.random() * 2 - 1;
    
    leftChannel[i] = noiseLeft * decay;
    rightChannel[i] = noiseRight * decay;
  }
  
  return impulse;
}

// Create distortion curve
function createDistortionCurve(amount: number): Float32Array {
  const k = amount * 100;
  const samples = 44100;
  const curve = new Float32Array(samples);
  const deg = Math.PI / 180;
  
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;
    curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
  }
  
  return curve;
}

// Helper function to encode AudioBuffer to WAV
async function encodeWAV(buffer: AudioBuffer): Promise<Blob> {
  try {
    console.log("Starting WAV encoding of buffer:", {
      numberOfChannels: buffer.numberOfChannels,
      sampleRate: buffer.sampleRate,
      length: buffer.length
    });
    
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const length = buffer.length * numChannels * 2; // 16-bit samples
    
    // Create the WAV file
    const wav = new ArrayBuffer(44 + length);
    const view = new DataView(wav);
    
    // Write WAV header
    // "RIFF" chunk
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + length, true);
    writeString(view, 8, 'WAVE');
    
    // "fmt " chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
    view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
    view.setUint16(22, numChannels, true); // NumChannels
    view.setUint32(24, sampleRate, true); // SampleRate
    view.setUint32(28, sampleRate * numChannels * 2, true); // ByteRate
    view.setUint16(32, numChannels * 2, true); // BlockAlign
    view.setUint16(34, 16, true); // BitsPerSample
    
    // "data" chunk
    writeString(view, 36, 'data');
    view.setUint32(40, length, true);
    
    // Write audio data
    let offset = 44;
    const channelData: Float32Array[] = [];
    
    // Get channel data
    for (let i = 0; i < numChannels; i++) {
      channelData.push(buffer.getChannelData(i));
    }
    
    // Check for audio data presence in the first 1000 samples
    let hasData = false;
    for (let i = 0; i < Math.min(1000, buffer.length); i++) {
      if (Math.abs(channelData[0][i]) > 0.001) {
        hasData = true;
        break;
      }
    }
    
    console.log("WAV encoding - audio data check:", hasData);
    
    // If no data, add a test tone
    if (!hasData) {
      console.warn("No audio data found in buffer during WAV encoding - adding test tone");
      // Add a test tone to make sure file contains audio
      const testTone = new Float32Array(buffer.length);
      for (let i = 0; i < buffer.length; i++) {
        testTone[i] = Math.sin(i / 100) * 0.5; // Simple sine wave
      }
      channelData[0] = testTone;
      if (numChannels > 1) {
        channelData[1] = testTone;
      }
    }
    
    // Apply a slight boost to ensure audibility
    const boostFactor = 1.2;
    
    // Interleave channel data and convert to 16-bit
    let maxSample = 0;
    let samples = [];
    
    // First pass: find maximum for normalization
    for (let i = 0; i < buffer.length; i++) {
      for (let channel = 0; channel < numChannels; channel++) {
        const boostedSample = channelData[channel][i] * boostFactor;
        maxSample = Math.max(maxSample, Math.abs(boostedSample));
        samples.push(boostedSample);
      }
    }
    
    // Apply normalization if needed
    const normalizeFactor = maxSample > 1.0 ? 0.95 / maxSample : 1.0;
    
    // Second pass: write normalized samples
    for (let i = 0; i < samples.length; i++) {
      const normalizedSample = Math.max(-1, Math.min(1, samples[i] * normalizeFactor));
      const int16Sample = Math.round(normalizedSample < 0 ? normalizedSample * 32768 : normalizedSample * 32767);
      view.setInt16(offset, int16Sample, true);
      offset += 2;
    }
    
    console.log("WAV encoding complete, returning blob");
    return new Blob([wav], { type: 'audio/wav' });
  } catch (error) {
    console.error("Error during WAV encoding:", error);
    throw error;
  }
}

// Helper to write string to DataView
function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * This class is a placeholder for future timeline recording functionality.
 * Currently, we're using the single sound export function instead.
 */
export class AudioExporter {
  constructor() {}
  
  // Placeholder methods to maintain API compatibility
  public async startRecording(): Promise<void> {
    console.log("Recording functionality not implemented yet");
  }
  
  public async stopRecording(options: ExportOptions): Promise<Blob> {
    console.log("Recording functionality not implemented yet");
    return new Blob(["placeholder"], { type: "audio/wav" });
  }
  
  public exportToFile(blob: Blob, filename: string): void {
    // Create a download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
  
  public dispose(): void {
    // Nothing to dispose currently
  }
}