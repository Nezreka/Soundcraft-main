import { getAudioContext } from './audioContext';
import { SoundParameters, TimelineState } from '@/types/audio';
import { ExportOptions } from './exporters';

// Define our timeline export options
export interface TimelineExportOptions {
  timeline: TimelineState;
  sounds: SoundParameters[];
  settings: ExportOptions;
  onProgress?: (percent: number) => void;
}

/**
 * Exports the entire timeline as an audio file.
 * 
 * This function:
 * 1. Creates an offline audio context for the timeline duration
 * 2. Renders all sound clips at their correct start times and durations
 * 3. Applies track-level effects (volume, panning)
 * 4. Exports the result as WAV or MP3
 */
export async function exportTimeline(options: TimelineExportOptions): Promise<Blob> {
  try {
    const { timeline, sounds, settings, onProgress } = options;
    const { duration, format, quality, normalize } = settings;
    
    console.log("Starting timeline export...", {
      tracks: timeline.tracks.length,
      duration: duration,
      format: format,
    });
    
    // Report initial progress
    onProgress?.(0);
    
    // Create offline audio context for rendering
    const sampleRate = 44100;
    const offlineCtx = new OfflineAudioContext(
      2, // Stereo
      Math.ceil(sampleRate * duration), 
      sampleRate
    );
    
    // Create master gain node
    const masterGain = offlineCtx.createGain();
    masterGain.gain.value = 1.0;
    masterGain.connect(offlineCtx.destination);
    
    // Track clips that need to be rendered
    type ClipToRender = {
      source: AudioNode;
      startTime: number;
      endTime: number;
      cleanup: () => void;
    };
    
    const clipsToRender: ClipToRender[] = [];
    
    // Create audio nodes for each track
    for (const track of timeline.tracks) {
      // Skip muted tracks
      if (track.muted) {
        console.log(`Track ${track.id} is muted, skipping`);
        continue;
      }
      
      // Create track volume and pan nodes
      const trackGain = offlineCtx.createGain();
      const trackPanner = offlineCtx.createStereoPanner();
      
      // Set track volume and pan
      trackGain.gain.value = track.volume;
      trackPanner.pan.value = track.pan;
      
      // Connect track nodes to master
      trackGain.connect(trackPanner);
      trackPanner.connect(masterGain);
      
      // Find sound parameters for this track
      const soundParams = sounds.find(s => s.id === track.soundId);
      if (!soundParams) {
        console.warn(`Sound not found for track ${track.id}, skipping`);
        continue;
      }
      
      console.log(`Rendering track ${track.id} with sound ${soundParams.type}`);
      
      // Process each clip in the track
      for (const clip of track.clips) {
        // Make sure clip is within export range
        if (clip.startTime > duration) {
          continue;
        }
        
        const clipEndTime = clip.startTime + clip.duration;
        if (clipEndTime <= 0) {
          continue;
        }
        
        // Render this clip
        try {
          const clipResult = await renderClip(
            offlineCtx, 
            trackGain, 
            soundParams, 
            clip.startTime, 
            clip.duration
          );
          
          if (clipResult) {
            clipsToRender.push({
              ...clipResult,
              startTime: clip.startTime,
              endTime: clipEndTime,
            });
          }
        } catch (err) {
          console.error(`Error rendering clip at ${clip.startTime}s:`, err);
        }
      }
      
      // Report progress after each track (20% of total)
      onProgress?.(20 * (timeline.tracks.indexOf(track) + 1) / timeline.tracks.length);
    }
    
    // Start all audio sources
    console.log(`Starting render of ${clipsToRender.length} clips...`);
    
    // Render the audio
    const renderedBuffer = await offlineCtx.startRendering();
    
    // Report progress after rendering (80%)
    onProgress?.(80);
    
    console.log("Rendering complete:", {
      duration: renderedBuffer.duration,
      channels: renderedBuffer.numberOfChannels,
      length: renderedBuffer.length,
    });
    
    // Apply normalization if requested
    if (normalize) {
      normalizeAudioBuffer(renderedBuffer);
    }
    
    // Encode to requested format
    const outputBlob = await encodeAudioFormat(renderedBuffer, format, quality);
    
    // Cleanup any resources
    clipsToRender.forEach(clip => clip.cleanup());
    
    // Generate a filename
    const filename = `timeline_export_${new Date().toISOString().replace(/[:.]/g, '-')}.${format}`;
    
    // Trigger download
    downloadBlob(outputBlob, filename);
    
    // Report 100% progress
    onProgress?.(100);
    
    return outputBlob;
  } catch (error) {
    console.error("Timeline export failed:", error);
    throw error;
  }
}

/**
 * Renders a single sound clip for the timeline
 */
async function renderClip(
  offlineCtx: OfflineAudioContext, 
  outputNode: AudioNode, 
  soundParams: SoundParameters, 
  startTime: number,
  duration: number
): Promise<{ source: AudioNode, cleanup: () => void } | null> {
  const now = startTime;
  
  // Create source based on sound type
  if (soundParams.waveform === 'noise') {
    // Create noise buffer
    const noiseBuffer = createNoiseBuffer(offlineCtx, duration);
    const noiseSource = offlineCtx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    
    // Handle filters and effects
    const gainNode = offlineCtx.createGain();
    const filter = offlineCtx.createBiquadFilter();
    
    // Set filter parameters
    filter.type = (soundParams.filterType as BiquadFilterType) || 'lowpass';
    filter.frequency.value = soundParams.filterCutoff || 1000;
    filter.Q.value = soundParams.filterResonance || 1;
    
    // Set envelope
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(soundParams.volume || 0.8, now + (soundParams.attack || 0.01));
    gainNode.gain.linearRampToValueAtTime(
      (soundParams.volume || 0.8) * (soundParams.sustain || 0.5),
      now + (soundParams.attack || 0.01) + (soundParams.decay || 0.1)
    );
    gainNode.gain.linearRampToValueAtTime(0.001, now + duration);
    
    // Connect nodes
    noiseSource.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(outputNode);
    
    // Start the source
    noiseSource.start(now);
    noiseSource.stop(now + duration);
    
    return {
      source: noiseSource,
      cleanup: () => {
        try {
          noiseSource.disconnect();
          filter.disconnect();
          gainNode.disconnect();
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    };
  } else {
    // Create oscillator for other sound types
    const oscillator = offlineCtx.createOscillator();
    
    // Set waveform type
    if (['sine', 'square', 'sawtooth', 'triangle'].includes(soundParams.waveform)) {
      oscillator.type = soundParams.waveform as OscillatorType;
    } else {
      oscillator.type = 'sine'; // Default
    }
    
    // Apply specialized parameters based on sound type
    if (soundParams.type === 'Bass Kick' || soundParams.name === 'Bass Kick') {
      // Special kick drum with pitch sweep
      const baseFreq = 40 * Math.pow(2, (soundParams.pitch || 0) / 12);
      const clickFreq = 160 * Math.pow(2, (soundParams.pitch || 0) / 12);
      
      oscillator.frequency.setValueAtTime(clickFreq, now);
      oscillator.frequency.exponentialRampToValueAtTime(baseFreq, now + 0.03);
    } else {
      // Standard oscillator frequency setting
      const baseFreq = 440 * Math.pow(2, (soundParams.pitch || 0) / 12);
      oscillator.frequency.value = baseFreq;
    }
    
    // Create envelope and filter
    const gainNode = offlineCtx.createGain();
    const filter = offlineCtx.createBiquadFilter();
    
    // Set filter parameters
    filter.type = (soundParams.filterType as BiquadFilterType) || 'lowpass';
    filter.frequency.value = soundParams.filterCutoff || 1000;
    filter.Q.value = soundParams.filterResonance || 1;
    
    // Set envelope based on sound type
    if (soundParams.type === 'Bass Kick' || soundParams.name === 'Bass Kick') {
      gainNode.gain.setValueAtTime(soundParams.volume || 0.8, now);
      gainNode.gain.linearRampToValueAtTime(
        (soundParams.volume || 0.8) * 0.1,
        now + 0.3
      );
      gainNode.gain.linearRampToValueAtTime(0.001, now + duration);
    } else {
      // Standard ADSR envelope
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(
        soundParams.volume || 0.8,
        now + (soundParams.attack || 0.01)
      );
      gainNode.gain.linearRampToValueAtTime(
        (soundParams.volume || 0.8) * (soundParams.sustain || 0.5),
        now + (soundParams.attack || 0.01) + (soundParams.decay || 0.1)
      );
      gainNode.gain.linearRampToValueAtTime(0.001, now + duration);
    }
    
    // Connect nodes
    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(outputNode);
    
    // Start the oscillator
    oscillator.start(now);
    oscillator.stop(now + duration);
    
    // Return source and cleanup function
    return {
      source: oscillator,
      cleanup: () => {
        try {
          oscillator.disconnect();
          filter.disconnect();
          gainNode.disconnect();
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    };
  }
}

/**
 * Creates a buffer of white noise for noise-based sounds
 */
function createNoiseBuffer(context: BaseAudioContext, duration: number): AudioBuffer {
  const sampleRate = context.sampleRate;
  const bufferSize = Math.ceil(sampleRate * duration);
  const buffer = context.createBuffer(2, bufferSize, sampleRate);
  
  // Fill both channels with noise
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  }
  
  return buffer;
}

/**
 * Normalizes an audio buffer to use the full dynamic range
 */
function normalizeAudioBuffer(buffer: AudioBuffer): void {
  // Find the peak amplitude across all channels
  let maxSample = 0;
  
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < data.length; i++) {
      maxSample = Math.max(maxSample, Math.abs(data[i]));
    }
  }
  
  // Apply normalization if needed
  if (maxSample > 0 && maxSample !== 1) {
    // Target 90% of max to avoid clipping
    const gain = 0.9 / maxSample;
    
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < data.length; i++) {
        data[i] *= gain;
      }
    }
    
    console.log(`Normalized audio by ${gain.toFixed(2)}x gain (peak was ${maxSample.toFixed(2)})`);
  }
}

/**
 * Encodes an audio buffer to the requested format
 */
async function encodeAudioFormat(
  buffer: AudioBuffer, 
  format: 'wav' | 'mp3',
  quality: number
): Promise<Blob> {
  if (format === 'wav') {
    return encodeWAV(buffer);
  } else if (format === 'mp3') {
    // Note: MP3 encoding would require a library like lamejs
    // For now, we'll just use WAV format
    console.warn("MP3 encoding not implemented, using WAV instead");
    return encodeWAV(buffer);
  }
  
  throw new Error(`Unsupported format: ${format}`);
}

/**
 * Encodes an audio buffer as WAV
 */
function encodeWAV(buffer: AudioBuffer): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      const numChannels = buffer.numberOfChannels;
      const sampleRate = buffer.sampleRate;
      const length = buffer.length * numChannels * 2; // 16-bit samples = 2 bytes
      
      // Create WAV file header + data
      const wavBuffer = new ArrayBuffer(44 + length);
      const view = new DataView(wavBuffer);
      
      // Write RIFF header
      writeString(view, 0, 'RIFF');
      view.setUint32(4, 36 + length, true);
      writeString(view, 8, 'WAVE');
      
      // Write fmt chunk
      writeString(view, 12, 'fmt ');
      view.setUint32(16, 16, true); // fmt chunk size
      view.setUint16(20, 1, true); // PCM format
      view.setUint16(22, numChannels, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * numChannels * 2, true); // byte rate
      view.setUint16(32, numChannels * 2, true); // block align
      view.setUint16(34, 16, true); // bits per sample
      
      // Write data chunk
      writeString(view, 36, 'data');
      view.setUint32(40, length, true);
      
      // Get channel data
      const channelData: Float32Array[] = [];
      for (let i = 0; i < numChannels; i++) {
        channelData.push(buffer.getChannelData(i));
      }
      
      // Interleave channel data and convert to 16-bit PCM
      let offset = 44;
      for (let i = 0; i < buffer.length; i++) {
        for (let channel = 0; channel < numChannels; channel++) {
          const sample = Math.max(-1, Math.min(1, channelData[channel][i]));
          const value = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
          view.setInt16(offset, value, true);
          offset += 2;
        }
      }
      
      resolve(new Blob([wavBuffer], { type: 'audio/wav' }));
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Helper to write a string into a DataView
 */
function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Triggers download of a blob as a file
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  
  document.body.appendChild(link);
  link.click();
  
  // Cleanup
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}