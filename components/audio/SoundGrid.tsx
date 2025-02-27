import React from 'react';
import SoundCard from './SoundCard';
import { SoundType } from '@/types/audio';
import { useStore } from '@/store';

const SoundGrid: React.FC = () => {
  const { addSound, openSoundEditor } = useStore();
  
  const soundTypes: SoundType[] = [
    'Bass Kick',
    'Bass',
    'Synth',
    'FX',
    'Percussion',
    'Vocal',
    'Ambient',
    'Noise',
  ];
  
  const handleCardClick = (type: SoundType) => {
    const soundId = addSound(type);
    openSoundEditor(soundId);
  };
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {soundTypes.map((type) => (
        <SoundCard 
          key={type} 
          type={type} 
          onClick={() => handleCardClick(type)} 
        />
      ))}
    </div>
  );
};

export default SoundGrid;