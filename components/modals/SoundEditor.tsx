import React, { useState, useEffect } from "react";
import { useStore } from "@/store";
import { Modal } from "@/components/ui/Modal";
import { Tabs } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { Knob } from "@/components/ui/Knob";
import { Slider } from "@/components/ui/Slider";
import Waveform from "@/components/audio/Waveform";
import Spectrum from "@/components/audio/Spectrum";
import EnvelopeControls from "@/components/controls/EnvelopeControls";
import FilterControls from "@/components/controls/FilterControls";
import EffectsControls from "@/components/controls/EffectsControls";
import { useAudioNode } from "@/lib/hooks/useAudioNode";
import { exportSingleSound } from "@/lib/audio/exporters";
import { FaPlay, FaStop } from "react-icons/fa";

const SoundEditor: React.FC = () => {
  const {
    soundEditorOpen,
    closeSoundEditor,
    openPresetModal,
    sounds,
    currentSoundId,
    updateSound,
  } = useStore();

  const currentSound = sounds.find((s) => s.id === currentSoundId) || null;
  // Force update when sound state changes
  const [playButtonState, setPlayButtonState] = useState(false);
  
  // Use the audio node hook with a callback for state changes
  const { isPlaying, toggle, analyzer } = useAudioNode(currentSound);
  
  // Handle button state for regular sounds (not special types)
  useEffect(() => {
    // Check if this is a special sound type
    const isSpecialSound = currentSound && [
      "Bass Kick", "Percussion", "Bass", "Synth", "Ambient", 
      "Bass Synth", "Lead Synth", "Sub Bass", "Pad"
    ].includes(currentSound.type);
    
    // Only update state for non-special sounds
    // Special sounds are handled by the timer in the click handler
    if (!isSpecialSound) {
      setPlayButtonState(isPlaying);
    }
  }, [isPlaying, currentSound]);
  
  // Use a ref to track our audio context and nodes to prevent recreation
  const audioContextRef = React.useRef<{
    ctx: AudioContext;
    analyzer: AnalyserNode;
    oscillator: OscillatorNode | null;
    noiseSource: AudioBufferSourceNode | null;
    gainNode: GainNode;
  } | null>(null);
  
  // Set up spectrum analyzer for visualization
  const [demoAnalyzer, setDemoAnalyzer] = React.useState<AnalyserNode | null>(null);
  
  // Memoize the waveform audio buffer to prevent constant regeneration
  const [waveformBuffer, setWaveformBuffer] = React.useState<AudioBuffer | undefined>(undefined);
  
  // Export dropdown state
  const [showExportDropdown, setShowExportDropdown] = React.useState(false);
  
  // Click outside handler for export dropdown
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.export-dropdown-container')) {
        setShowExportDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Handle exporting the sound
  const handleExportSound = async (format: 'wav' | 'mp3') => {
    if (!currentSound) return;
    
    try {
      console.log('Exporting sound with parameters:', {
        type: currentSound.type,
        waveform: currentSound.waveform,
        pitch: currentSound.pitch,
        volume: currentSound.volume,
        attack: currentSound.attack,
        decay: currentSound.decay,
        sustain: currentSound.sustain,
        release: currentSound.release,
        filterType: currentSound.filterType,
        filterCutoff: currentSound.filterCutoff
      });
      
      // Make a deep copy of the sound to ensure we have all parameters
      const soundCopy = JSON.parse(JSON.stringify(currentSound));
      
      // Ensure parameters have sensible default values if missing
      if (!soundCopy.volume || soundCopy.volume < 0.1) soundCopy.volume = 0.8;
      if (!soundCopy.attack) soundCopy.attack = 0.01;
      if (!soundCopy.decay) soundCopy.decay = 0.1;
      if (!soundCopy.sustain) soundCopy.sustain = 0.7;
      if (!soundCopy.release) soundCopy.release = 0.3;
      if (!soundCopy.filterCutoff) soundCopy.filterCutoff = 2000;
      if (!soundCopy.filterResonance) soundCopy.filterResonance = 1;
      
      await exportSingleSound(soundCopy, format);
      setShowExportDropdown(false);
    } catch (error) {
      console.error('Failed to export sound:', error);
    }
  };
  
  // Update the waveform buffer when the sound changes
  React.useEffect(() => {
    if (currentSound) {
      const buffer = generateAudioBuffer(currentSound);
      console.log("Generated waveform buffer:", buffer);
      setWaveformBuffer(buffer);
    }
  }, [currentSound?.waveform, currentSound?.pitch, currentSound?.attack, 
      currentSound?.decay, currentSound?.sustain, currentSound?.release, 
      currentSound?.type, currentSound?.id]);
  
  // Set up visualization
  React.useEffect(() => {
    // Skip setup if we're not playing
    if (!playButtonState) {
      // Clean up any existing visualization
      if (audioContextRef.current) {
        if (audioContextRef.current.oscillator) {
          try {
            audioContextRef.current.oscillator.stop();
            audioContextRef.current.oscillator.disconnect();
            audioContextRef.current.oscillator = null;
          } catch (e) {
            console.error("Error stopping oscillator:", e);
          }
        }
        
        if (audioContextRef.current.noiseSource) {
          try {
            audioContextRef.current.noiseSource.stop();
            audioContextRef.current.noiseSource.disconnect();
            audioContextRef.current.noiseSource = null;
          } catch (e) {
            console.error("Error stopping noise source:", e);
          }
        }
      }
      
      setDemoAnalyzer(null);
      return;
    }
    
    // Create visualization
    if (!audioContextRef.current) return;
    
    try {
      console.log("Creating visualization for sound:", currentSound?.type);
      
      const ctx = audioContextRef.current.ctx;
      
      // Create an oscillator for visualization
      const oscillator = ctx.createOscillator();
      oscillator.type = 'sawtooth';
      oscillator.frequency.value = 440;
      
      // Create a gain node to control volume
      const gainNode = ctx.createGain();
      gainNode.gain.value = 0.5;
      
      // Connect oscillator to gain
      oscillator.connect(gainNode);
      
      // Connect gain to analyzer
      gainNode.connect(audioContextRef.current.analyzer);
      
      // Store for cleanup
      audioContextRef.current.oscillator = oscillator;
      
      // Start the oscillator
      oscillator.start();
      
      // Set the analyzer for visualization
      setDemoAnalyzer(audioContextRef.current.analyzer);
      
      console.log("Visualization created successfully");
    } catch (e) {
      console.error("Error creating visualization:", e);
    }
    
    // Clean up when unmounting or when play state changes
    return () => {
      if (audioContextRef.current) {
        if (audioContextRef.current.oscillator) {
          try {
            audioContextRef.current.oscillator.stop();
            audioContextRef.current.oscillator.disconnect();
            audioContextRef.current.oscillator = null;
          } catch (e) {
            console.error("Error cleaning up oscillator:", e);
          }
        }
      }
    };
  }, [playButtonState, currentSound?.type]);

  // Set up initial audio context for the editor
  React.useEffect(() => {
    // Only create if we're on client side
    if (typeof window === 'undefined') return;
    
    // Create audio context if needed
    if (!audioContextRef.current) {
      try {
        // Create audio context and placeholder analyzer (will be replaced by actual analyzer when playing)
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const newAnalyzer = ctx.createAnalyser();
        newAnalyzer.fftSize = 256;
        
        const gainNode = ctx.createGain();
        gainNode.gain.value = 0; // Silent - we're not using it for sound
        
        // Connect the analyzer for visualization
        gainNode.connect(newAnalyzer);
        
        // Store all nodes in ref
        audioContextRef.current = {
          ctx,
          analyzer: newAnalyzer,
          oscillator: null,
          noiseSource: null,
          gainNode
        };
      } catch (error) {
        console.error("Error setting up audio context:", error);
      }
    }
    
    // Cleanup function
    return () => {
      if (audioContextRef.current) {
        if (audioContextRef.current.oscillator) {
          audioContextRef.current.oscillator.stop();
          audioContextRef.current.oscillator.disconnect();
        }
        
        if (audioContextRef.current.noiseSource) {
          audioContextRef.current.noiseSource.stop();
          audioContextRef.current.noiseSource.disconnect();
        }
      }
    };
  }, [currentSound]);

  // Generate a simple audio buffer based on the current sound for visualization
  const generateAudioBuffer = (sound: any) => {
    try {
      if (typeof window === 'undefined') return undefined;
      
      // Use existing audio context if possible to prevent multiple context creation
      const audioContext = audioContextRef.current?.ctx || 
        new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const sampleRate = audioContext.sampleRate;
      const duration = 2; // 2 seconds of data
      const buffer = audioContext.createBuffer(
        1,
        sampleRate * duration,
        sampleRate
      );
      const channelData = buffer.getChannelData(0);

      // Generate appropriate waveform for all sound types
      if (sound.waveform === "noise" || 
          sound.type === "Noise" || 
          sound.type === "Snare" || 
          sound.type === "Hi-Hat" ||
          sound.type === "Clap" ||
          sound.type === "Percussion" ||
          sound.type === "Impact") {
        // Generate noise-based waveform
        for (let i = 0; i < channelData.length; i++) {
          channelData[i] = Math.random() * 2 - 1;
        }
      } else {
        // Generate standard waveform based on parameters
        const frequency = 440 * Math.pow(2, sound.pitch / 12); // Apply pitch
        const samplesPerCycle = sampleRate / frequency;
        
        // Handle specialized sound types
        let waveformType = sound.waveform;
        
        // Override for special sound types
        if (sound.type === "Bass Kick") {
          // Generate a realistic kick drum waveform with frequency drop
          for (let i = 0; i < channelData.length; i++) {
            // Calculate the current time in seconds
            const time = i / sampleRate;
            
            // Calculate the frequency, which drops exponentially
            const freqAtTime = 150 * Math.max(0.1, Math.exp(-time * 10)) + 40;
            
            // Calculate the phase based on the varying frequency
            const phase = ((i / sampleRate) * freqAtTime) % 1;
            
            // Create a sine wave for the kick
            channelData[i] = Math.sin(phase * Math.PI * 2);
            
            // Apply amplitude envelope (quick attack, exponential decay)
            channelData[i] *= Math.exp(-time * 5);
          }
        } else {
          // Generate standard waveforms
          for (let i = 0; i < channelData.length; i++) {
            const phase = (i % samplesPerCycle) / samplesPerCycle;
  
            switch (waveformType) {
              case "sine":
                channelData[i] = Math.sin(phase * Math.PI * 2);
                break;
              case "square":
                channelData[i] = phase < 0.5 ? 1 : -1;
                break;
              case "sawtooth":
                channelData[i] = 2 * (phase - Math.floor(phase + 0.5));
                break;
              case "triangle":
                channelData[i] = 1 - 4 * Math.abs(Math.round(phase) - phase);
                break;
              default:
                channelData[i] = Math.sin(phase * Math.PI * 2);
            }
          }
        }
      }

      // Calculate envelope parameters with fallbacks for malformed values
      const attackSamples = Math.min(
        Math.floor((sound.attack || 0.01) * sampleRate), 
        sampleRate / 2
      ); // Cap at half the buffer to prevent errors
      
      const decaySamples = Math.min(
        Math.floor((sound.decay || 0.1) * sampleRate), 
        sampleRate / 2
      );
      
      const releaseSamples = Math.min(
        Math.floor((sound.release || 0.1) * sampleRate), 
        sampleRate / 2
      );
      
      const sustainLevel = Math.max(0.001, Math.min(1, sound.sustain || 0.5));
      
      // Calculate envelope sections - ensure we don't have negative sustain
      const availableSamples = channelData.length;
      const minimumSustainSamples = sampleRate / 10; // At least 100ms of sustain
      
      let sustainSamples = availableSamples - attackSamples - decaySamples - releaseSamples;
      
      // If sustain would be negative or too short, adjust envelope phases
      if (sustainSamples < minimumSustainSamples) {
        // Scale down each envelope phase proportionally
        const totalRequested = attackSamples + decaySamples + releaseSamples + minimumSustainSamples;
        const ratio = (availableSamples - minimumSustainSamples) / totalRequested;
        
        // Adjust samples for each phase
        const adjustedAttack = Math.floor(attackSamples * ratio);
        const adjustedDecay = Math.floor(decaySamples * ratio);
        const adjustedRelease = Math.floor(releaseSamples * ratio);
        
        // Recalculate sustain samples
        sustainSamples = availableSamples - adjustedAttack - adjustedDecay - adjustedRelease;
      }
      
      // Apply the envelope
      let currentSample = 0;
      
      // Apply attack
      for (let i = 0; i < attackSamples && currentSample < channelData.length; i++, currentSample++) {
        const factor = i / attackSamples;
        channelData[currentSample] *= factor;
      }
      
      // Apply decay to sustain
      for (let i = 0; i < decaySamples && currentSample < channelData.length; i++, currentSample++) {
        const factor = 1 - (1 - sustainLevel) * (i / decaySamples);
        channelData[currentSample] *= factor;
      }
      
      // Apply sustain
      for (let i = 0; i < sustainSamples && currentSample < channelData.length; i++, currentSample++) {
        channelData[currentSample] *= sustainLevel;
      }
      
      // Apply release
      for (let i = 0; i < releaseSamples && currentSample < channelData.length; i++, currentSample++) {
        const factor = sustainLevel * (1 - i / releaseSamples);
        channelData[currentSample] *= factor;
      }
      
      // Fill any remaining samples with zeros
      while (currentSample < channelData.length) {
        channelData[currentSample++] = 0;
      }

      return buffer;
    } catch (error) {
      console.error("Error generating audio buffer:", error);
      return undefined;
    }
  };

  if (!currentSound) {
    return null;
  }

  const editorTabs = [
    {
      id: "main",
      label: "Main",
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
          <div>
            <h3 className="text-lg font-semibold mb-4">Basic Controls</h3>

            {/* Add the sound name input field */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Sound Name
              </label>
              <input
                type="text"
                value={currentSound.name}
                onChange={(e) =>
                  updateSound(currentSound.id, { name: e.target.value })
                }
                className="w-full p-2 bg-surface-darker border border-white/10 rounded focus:ring-2 focus:ring-primary focus:outline-none text-black"
                placeholder="Enter sound name..."
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Knob
                label="Volume"
                value={currentSound.volume}
                min={0}
                max={1}
                step={0.01}
                onChange={(value) =>
                  updateSound(currentSound.id, { volume: value })
                }
              />
              <Knob
                label="Pan"
                value={currentSound.pan}
                min={-1}
                max={1}
                step={0.01}
                onChange={(value) =>
                  updateSound(currentSound.id, { pan: value })
                }
                bipolar
              />
              <Knob
                label="Pitch"
                value={currentSound.pitch}
                min={-12}
                max={12}
                step={1}
                onChange={(value) =>
                  updateSound(currentSound.id, { pitch: value })
                }
                bipolar
                unit=" st"
              />
            </div>

            <div className="mt-6 space-y-4">
              <Slider
                label="Time Stretch"
                value={currentSound.timeStretch}
                min={0.5}
                max={2}
                step={0.01}
                onChange={(value) =>
                  updateSound(currentSound.id, { timeStretch: value })
                }
                unit="x"
              />

              <Slider
                label="Duration"
                value={currentSound.duration || 1.0}
                min={0.1}
                max={3}
                step={0.1}
                onChange={(value) =>
                  updateSound(currentSound.id, { duration: value })
                }
                unit="s"
              />
            </div>

            <div className="mt-6">
              <h4 className="text-sm font-medium mb-2">Waveform</h4>
              <div className="flex flex-wrap gap-2">
                {["sine", "square", "sawtooth", "triangle", "noise"].map(
                  (type) => (
                    <button
                      key={type}
                      className={`px-3 py-2 rounded ${
                        currentSound.waveform === type
                          ? "bg-primary text-white"
                          : "bg-surface-dark hover:bg-surface-darker"
                      }`}
                      onClick={() =>
                        updateSound(currentSound.id, { waveform: type as any })
                      }
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  )
                )}
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Visualization</h3>
            <div className="h-[100px] w-full mb-4 neumorphic-inset p-2">
              <Waveform
                className="h-full w-full"
                audioBuffer={waveformBuffer}
                color="var(--color-primary)"
                height={80}
              />
            </div>
            <div className="h-[120px] w-full">
              <Spectrum 
                analyser={playButtonState ? (analyzer || demoAnalyzer) : null}
                color="var(--color-primary)"
                height={120}
                className="h-full w-full" 
              />
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "envelope",
      label: "Envelope",
      content: <EnvelopeControls sound={currentSound} onChange={updateSound} />,
    },
    {
      id: "filter",
      label: "Filter",
      content: <FilterControls sound={currentSound} onChange={updateSound} />,
    },
    {
      id: "effects",
      label: "Effects",
      content: <EffectsControls sound={currentSound} onChange={updateSound} />,
    },
  ];

  return (
    <Modal
      isOpen={soundEditorOpen}
      onClose={closeSoundEditor}
      title={`Sound Editor - ${currentSound.name}`}
      preventOutsideClose={true}
    >
      <div className="space-y-6">
        <Tabs tabs={editorTabs} />

        <div className="flex justify-between items-center p-4 border-t border-white/10">
          <div>
            <Button
              variant={playButtonState ? "destructive" : "default"}
              onClick={() => {
                // Check if this is a special sound type that needs special handling
                const isSpecialSound = currentSound && [
                  "Bass Kick", "Percussion", "Bass", "Synth", "Ambient", 
                  "Bass Synth", "Lead Synth", "Sub Bass", "Pad"
                ].includes(currentSound.type);
                
                if (playButtonState) {
                  // Already playing, stop it
                  console.log("Stopping sound");
                  toggle();
                  setPlayButtonState(false);
                } else {
                  // Play the sound
                  console.log("Playing sound");
                  toggle();
                  setPlayButtonState(true);
                  
                  // For special sounds, set a timeout to reset the button
                  if (isSpecialSound) {
                    console.log("Setting direct timeout for special sound");
                    
                    // Calculate a dynamic timeout based on the sound's duration
                    // Use at least 1 second, or the sound duration if longer (plus a buffer)
                    let timeoutDuration = Math.max(1000, (currentSound.duration || 1) * 1000 + 200);
                    
                    // Add extra time for effects
                    if (currentSound.reverbMix > 0) {
                      timeoutDuration += 500; // Add time for reverb tail
                    }
                    
                    if (currentSound.delayMix > 0) {
                      timeoutDuration += 500; // Add time for delay tail
                    }
                    
                    console.log(`Setting timer for ${timeoutDuration}ms based on sound duration ${currentSound.duration}`);
                    
                    setTimeout(() => {
                      console.log("Special sound timer complete - resetting button");
                      setPlayButtonState(false);
                    }, timeoutDuration)
                  }
                }
              }}
              className="flex items-center"
            >
              {playButtonState ? (
                <>
                  <FaStop className="mr-2" /> Stop
                </>
              ) : (
                <>
                  <FaPlay className="mr-2" /> Play
                </>
              )}
            </Button>
          </div>

          <div className="flex space-x-2">
            <Button variant="outline" onClick={closeSoundEditor}>
              Close
            </Button>
            <Button onClick={openPresetModal}>Save / Load Preset</Button>
            <div className="relative export-dropdown-container">
              <Button 
                onClick={() => setShowExportDropdown(!showExportDropdown)}
                variant="secondary"
              >
                Export Sound
              </Button>
              {showExportDropdown && (
                <div className="absolute right-0 bottom-full mb-1 glass-panel border border-white/10 rounded-md shadow-lg z-10">
                  <button
                    className="block w-full text-left px-4 py-2 hover:bg-white/10"
                    onClick={() => handleExportSound('wav')}
                  >
                    Export as WAV
                  </button>
                  <button
                    className="block w-full text-left px-4 py-2 hover:bg-white/10"
                    onClick={() => handleExportSound('mp3')}
                  >
                    Export as MP3
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default SoundEditor;
