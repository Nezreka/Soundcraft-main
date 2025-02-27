'use client';

import { useEffect } from 'react';
import SoundGrid from '@/components/audio/SoundGrid';
import Timeline from '@/components/audio/Timeline';
import SoundEditor from '@/components/modals/SoundEditor';
import ExportModal from '@/components/modals/ExportModal';
import PresetModal from '@/components/modals/PresetModal';
import { useStore } from '@/store';
import { ensureAudioContext } from '@/lib/audio/audioContext';
import { FaVolumeUp, FaCog, FaQuestion } from 'react-icons/fa';
import { Button } from '@/components/ui/Button';

export default function Home() {
  const { timelineHeight } = useStore();
  
  // Initialize audio context on user interaction
  useEffect(() => {
    const initAudio = async () => {
      try {
        await ensureAudioContext();
        console.log('Audio context initialized');
      } catch (error) {
        console.error('Failed to initialize audio context:', error);
      }
    };
    
    const handleUserInteraction = () => {
      initAudio();
      // Remove event listeners after first interaction
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };
    
    // Add event listeners for user interaction
    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);
    document.addEventListener('touchstart', handleUserInteraction);
    
    return () => {
      // Clean up event listeners
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };
  }, []);
  
  return (
    <div className="flex flex-col h-screen">
      <header className="p-4 glass-panel m-4 mb-0 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">SoundCraft</h1>
        
        <div className="flex items-center gap-2">
          <Button variant="neumorphic" size="icon">
            <FaVolumeUp />
          </Button>
          <Button variant="neumorphic" size="icon">
            <FaCog />
          </Button>
          <Button variant="neumorphic" size="icon">
            <FaQuestion />
          </Button>
        </div>
      </header>
      
      <main className="flex-1 overflow-hidden p-4">
        <SoundGrid />
      </main>
      
      <Timeline />
      
      {/* Modals */}
      <SoundEditor />
      <ExportModal />
      <PresetModal />
    </div>
  );
}