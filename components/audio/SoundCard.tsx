import React from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { SoundType } from '@/types/audio';
import { cn } from '@/lib/utils/format';
import { 
  FaDrum, 
  FaGuitar, 
  FaMusic, 
  FaMagic, 
  FaMicrophone, 
  FaWind, 
  FaVolumeUp, 
  FaRandom 
} from 'react-icons/fa';

interface SoundCardProps {
  type: SoundType;
  onClick: () => void;
}

const SoundCard: React.FC<SoundCardProps> = ({ type, onClick }) => {
  // Map sound types to icons and colors
  const getIconAndColor = (type: SoundType): { icon: React.ReactNode; color: string } => {
    switch (type) {
      case 'Bass Kick':
        return { icon: <FaDrum size={32} />, color: 'from-purple-500 to-purple-700' };
      case 'Bass':
        return { icon: <FaGuitar size={32} />, color: 'from-blue-500 to-blue-700' };
      case 'Synth':
        return { icon: <FaMusic size={32} />, color: 'from-green-500 to-green-700' };
      case 'FX':
        return { icon: <FaMagic size={32} />, color: 'from-yellow-500 to-yellow-700' };
      case 'Percussion':
        return { icon: <FaDrum size={32} />, color: 'from-red-500 to-red-700' };
      case 'Vocal':
        return { icon: <FaMicrophone size={32} />, color: 'from-pink-500 to-pink-700' };
      case 'Ambient':
        return { icon: <FaWind size={32} />, color: 'from-cyan-500 to-cyan-700' };
      case 'Noise':
        return { icon: <FaRandom size={32} />, color: 'from-gray-500 to-gray-700' };
      default:
        return { icon: <FaVolumeUp size={32} />, color: 'from-gray-500 to-gray-700' };
    }
  };
  
  const { icon, color } = getIconAndColor(type);
  
  return (
    <Card 
      variant="neumorphic" 
      onClick={onClick}
      className="cursor-pointer transition-all duration-300 hover:scale-105"
    >
      <div className={cn(
        'h-32 flex flex-col items-center justify-center p-4 text-center',
        'bg-gradient-to-br',
        color
      )}>
        <div className="mb-2 text-white">
          {icon}
        </div>
        <h3 className="text-lg font-semibold text-white">{type}</h3>
      </div>
    </Card>
  );
};

export default SoundCard;