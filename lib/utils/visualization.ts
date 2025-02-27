/**
 * Utility for generating visible waveforms and spectrum data
 */

// Generate a waveform visualization data for canvas rendering
export function generateWaveformData(
  canvas: HTMLCanvasElement,
  audioBuffer: AudioBuffer | null,
  color: string = '#BB86FC'
): void {
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Set up drawing
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  
  if (!audioBuffer) {
    // Draw placeholder waveform (sine wave)
    ctx.beginPath();
    
    const amplitude = canvas.height / 4;
    const centerY = canvas.height / 2;
    
    for (let x = 0; x < canvas.width; x++) {
      const frequency = 0.02;
      const y = centerY + Math.sin(x * frequency) * amplitude;
      
      if (x === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    
    ctx.stroke();
    return;
  }
  
  // Get audio data
  const channelData = audioBuffer.getChannelData(0); // Use first channel
  const step = Math.ceil(channelData.length / canvas.width);
  
  // Start drawing path
  ctx.beginPath();
  ctx.moveTo(0, canvas.height / 2);
  
  // Draw the waveform
  for (let i = 0; i < canvas.width; i++) {
    const dataIndex = Math.min(i * step, channelData.length - 1);
    const value = channelData[dataIndex];
    
    // Scale the value to fit in the canvas
    const y = (value * 0.8 + 1) * canvas.height / 2;
    
    ctx.lineTo(i, y);
  }
  
  ctx.stroke();
}

// Generate a spectrum visualization data for canvas rendering
export function generateSpectrumData(
  canvas: HTMLCanvasElement,
  analyser: AnalyserNode | null,
  color: string = '#03DAC6'
): void {
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  if (!analyser) {
    // Draw placeholder bars
    ctx.fillStyle = color;
    
    const barCount = 32;
    const barWidth = canvas.width / barCount - 1;
    
    for (let i = 0; i < barCount; i++) {
      // Generate random heights for placeholder
      const barHeight = Math.random() * canvas.height * 0.8;
      const x = i * (barWidth + 1);
      
      ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
    }
    return;
  }
  
  // Get frequency data from analyser
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  analyser.getByteFrequencyData(dataArray);
  
  // Set up drawing
  ctx.fillStyle = color;
  
  // Calculate bar width
  const barWidth = canvas.width / bufferLength * 2.5;
  let x = 0;
  
  // Draw frequency bars
  for (let i = 0; i < bufferLength; i++) {
    const barHeight = (dataArray[i] / 255) * canvas.height;
    
    ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
    
    x += barWidth + 1;
    if (x > canvas.width) break;
  }
}

// Create a simple audio buffer for any waveform type
export function createAudioBufferForWaveform(
  waveformType: string = 'sine',
  frequency: number = 440,
  duration: number = 2
): AudioBuffer | null {
  try {
    const audioContext = new (window.AudioContext || 
      (window as any).webkitAudioContext)();
    const sampleRate = audioContext.sampleRate;
    const buffer = audioContext.createBuffer(
      1, 
      sampleRate * duration, 
      sampleRate
    );
    const channelData = buffer.getChannelData(0);
    
    const samplesPerCycle = sampleRate / frequency;
    
    for (let i = 0; i < channelData.length; i++) {
      const phase = (i % samplesPerCycle) / samplesPerCycle;
      
      switch (waveformType) {
        case 'sine':
          channelData[i] = Math.sin(phase * Math.PI * 2);
          break;
        case 'square':
          channelData[i] = phase < 0.5 ? 1 : -1;
          break;
        case 'sawtooth':
          channelData[i] = 2 * (phase - Math.floor(phase + 0.5));
          break;
        case 'triangle':
          channelData[i] = 1 - 4 * Math.abs(Math.round(phase) - phase);
          break;
        case 'noise':
          channelData[i] = Math.random() * 2 - 1;
          break;
        default:
          channelData[i] = Math.sin(phase * Math.PI * 2);
      }
    }
    
    console.log(`Created audio buffer for ${waveformType} waveform`);
    return buffer;
  } catch (error) {
    console.error('Error creating audio buffer:', error);
    return null;
  }
}