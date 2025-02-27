import { getAudioContext } from './audioContext';
import { SoundParameters, TimelineState } from '@/types/audio';
import { ExportOptions } from './exporters';
import { createSpecializedSource, createNoiseBuffer, createImpulseResponse, createDistortionCurve } from './soundGenerators';

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
    
    // Debug log to help diagnose volume issues
    console.log("Volumes being used for tracks:", 
      timeline.tracks.map(t => ({ 
        trackId: t.id, 
        volume: t.volume,
        soundId: t.soundId,
        soundVolume: sounds.find(s => s.id === t.soundId)?.volume || 'unknown'
      }))
    );
    
    // Render the audio
    const renderedBuffer = await offlineCtx.startRendering();
    
    // Report progress after rendering (80%)
    onProgress?.(80);
    
    console.log("Rendering complete:", {
      duration: renderedBuffer.duration,
      channels: renderedBuffer.numberOfChannels,
      length: renderedBuffer.length,
    });
    
    // Apply normalization if requested, with a gentler approach
    if (normalize) {
      // Use a more gentle normalization (75% instead of 90%) for a more natural sound
      normalizeAudioBuffer(renderedBuffer, 0.75);
    }
    
    // Encode to requested format
    const outputBlob = await encodeAudioFormat(renderedBuffer, format, quality);
    
    // Cleanup clip resources only (not track nodes since they're handled by the offline context)
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
  duration: number,
  trackVolume: number = 1.0  // Default to 1.0 if not provided
): Promise<{ source: AudioNode, cleanup: () => void } | null> {
  const now = startTime;
  
  try {
    // Create a proper copy of sound parameters, preserving all properties
    const soundCopy = { ...soundParams };
    
    // Make sure we preserve nested objects correctly
    if (soundParams.filterEnvelope) soundCopy.filterEnvelope = { ...soundParams.filterEnvelope };
    if (soundParams.pitchEnvelope) soundCopy.pitchEnvelope = { ...soundParams.pitchEnvelope };
    
    // Create all audio nodes
    const gainNode = offlineCtx.createGain();
    const filterNode = offlineCtx.createBiquadFilter();
    const distortionNode = offlineCtx.createWaveShaper();
    
    // Create reverb nodes
    const reverbNode = offlineCtx.createConvolver();
    const reverbGainNode = offlineCtx.createGain();
    const dryGainNode = offlineCtx.createGain();
    
    // Create delay nodes
    const delayNode = offlineCtx.createDelay(5.0);
    const delayFeedbackNode = offlineCtx.createGain();
    const delayDryNode = offlineCtx.createGain();
    const delayWetNode = offlineCtx.createGain();
    
    // Setup filter
    filterNode.type = soundCopy.filterType as BiquadFilterType || 'lowpass';
    filterNode.frequency.value = soundCopy.filterCutoff || 1000;
    filterNode.Q.value = soundCopy.filterResonance || 1;
    
    // Apply filter envelope if present
    if (soundCopy.filterEnvelope && soundCopy.filterEnvelope.amount) {
      const baseFreq = soundCopy.filterCutoff || 1000;
      const targetFreq = baseFreq + soundCopy.filterEnvelope.amount;
      
      filterNode.frequency.setValueAtTime(baseFreq, now);
      filterNode.frequency.linearRampToValueAtTime(
        targetFreq,
        now + (soundCopy.filterEnvelope.attack || 0.01)
      );
      
      if (soundCopy.filterEnvelope.decay && soundCopy.filterEnvelope.decay > 0) {
        filterNode.frequency.linearRampToValueAtTime(
          baseFreq,
          now + (soundCopy.filterEnvelope.attack || 0.01) + (soundCopy.filterEnvelope.decay || 0.1)
        );
      }
    }
    
    // Setup distortion
    if (soundCopy.distortion && soundCopy.distortion > 0) {
      distortionNode.curve = createDistortionCurve(soundCopy.distortion);
      distortionNode.oversample = '4x';
    }
    
    // Setup reverb
    if (soundCopy.reverbMix && soundCopy.reverbMix > 0) {
      reverbNode.buffer = createImpulseResponse(offlineCtx, soundCopy.reverbDecay || 1.0);
      reverbGainNode.gain.value = soundCopy.reverbMix;
      dryGainNode.gain.value = 1 - soundCopy.reverbMix;
    } else {
      // Bypass reverb
      reverbGainNode.gain.value = 0;
      dryGainNode.gain.value = 1;
    }
    
    // Setup delay
    if (soundCopy.delayMix && soundCopy.delayMix > 0) {
      delayNode.delayTime.value = soundCopy.delayTime || 0.5;
      delayFeedbackNode.gain.value = soundCopy.delayFeedback || 0.3;
      delayWetNode.gain.value = soundCopy.delayMix;
      delayDryNode.gain.value = 1 - soundCopy.delayMix;
    } else {
      // Bypass delay
      delayWetNode.gain.value = 0;
      delayDryNode.gain.value = 1;
    }
    
    // Use the shared specialized sound creation
    const sourceInfo = createSpecializedSource(offlineCtx, soundCopy, now);
    const source = sourceInfo.source;
    const output = sourceInfo.output || source;
    const additionalSources = sourceInfo.additionalSources || [];
    
    // Apply ADSR envelope (except for specialized percussions that have their own envelopes)
    if (!["Bass Kick", "Snare", "Hi-Hat"].includes(soundCopy.type || '')) {
      // Apply full ADSR envelope
      const adjustedDuration = Math.min(duration, soundCopy.duration || duration);
      
      // Multiply sound volume by track volume (just like in timeline playback)
      const effectiveVolume = (soundCopy.volume || 0.8) * trackVolume;
      
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(
        effectiveVolume, 
        now + (soundCopy.attack || 0.01)
      );
      
      gainNode.gain.linearRampToValueAtTime(
        effectiveVolume * (soundCopy.sustain || 0.7),
        now + (soundCopy.attack || 0.01) + (soundCopy.decay || 0.1)
      );
      
      gainNode.gain.setValueAtTime(
        effectiveVolume * (soundCopy.sustain || 0.7),
        now + adjustedDuration - (soundCopy.release || 0.1)
      );
      
      gainNode.gain.linearRampToValueAtTime(0.001, now + adjustedDuration);
    } else {
      // For specialized percussion sounds, just set a fixed gain
      // Multiply sound volume by track volume (just like in timeline playback)
      gainNode.gain.value = (soundCopy.volume || 0.8) * trackVolume;
    }

    // Connect the audio chain
    // Source -> Gain -> Filter -> Distortion -> [Dry/Wet Split] -> [Delay Split]
    output.connect(gainNode);
    gainNode.connect(filterNode);
    filterNode.connect(distortionNode);
    
    // For reverb, split into dry and wet paths
    if (soundCopy.reverbMix && soundCopy.reverbMix > 0) {
      // Dry path
      distortionNode.connect(dryGainNode);
      
      // Wet (reverb) path
      distortionNode.connect(reverbNode);
      reverbNode.connect(reverbGainNode);
      
      // Combine paths to output
      dryGainNode.connect(outputNode);
      reverbGainNode.connect(outputNode);
    } else {
      // No reverb, direct connection
      distortionNode.connect(outputNode);
    }
    
    // Start the sources
    source.start(now);
    source.stop(now + duration + 0.5); // Add tail for effects
    
    // Start any additional sources
    additionalSources.forEach(src => {
      src.start(now);
      src.stop(now + duration + 0.5);
    });
    
    // Create cleanup function
    const cleanup = () => {
      try {
        // Disconnect all nodes
        if (source) source.disconnect();
        gainNode.disconnect();
        filterNode.disconnect();
        distortionNode.disconnect();
        reverbNode.disconnect();
        reverbGainNode.disconnect();
        dryGainNode.disconnect();
        delayNode.disconnect();
        delayFeedbackNode.disconnect();
        delayDryNode.disconnect();
        delayWetNode.disconnect();
        
        // Disconnect additional sources
        additionalSources.forEach(src => {
          try {
            src.disconnect();
          } catch (e) {
            // Ignore errors
          }
        });
      } catch (e) {
        // Ignore cleanup errors
      }
    };
    
    // Return the source and cleanup function
    return {
      source,
      cleanup
    };
  } catch (error) {
    console.error('Error rendering clip:', error);
    return null;
  }
}

// We're now using the imported createNoiseBuffer from soundGenerators.ts

/**
 * Normalizes an audio buffer to use a specified portion of the dynamic range
 * @param buffer The audio buffer to normalize
 * @param targetAmplitude The target amplitude (0.0-1.0) to normalize to (default 0.75)
 */
function normalizeAudioBuffer(buffer: AudioBuffer, targetAmplitude: number = 0.75): void {
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
    // Use the specified target amplitude (default is gentler 75% of max)
    const gain = targetAmplitude / maxSample;
    
    // Only normalize if the gain would be greater than 1 (if sound is too quiet)
    // or if the sound is significantly clipping above 1.0
    if (gain > 1.1 || maxSample > 1.05) {
      for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
        const data = buffer.getChannelData(channel);
        for (let i = 0; i < data.length; i++) {
          data[i] *= gain;
        }
      }
      
      console.log(`Normalized audio by ${gain.toFixed(2)}x gain (peak was ${maxSample.toFixed(2)}, target ${targetAmplitude})`);
    } else {
      console.log(`Audio level is good (peak: ${maxSample.toFixed(2)}), no normalization needed`);
    }
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