import React, { useState, useEffect } from 'react';
import { useStore } from '@/store';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { SoundType } from '@/types/audio';
import { FaSearch, FaPlus } from 'react-icons/fa';

interface AddSoundModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddSoundModal: React.FC<AddSoundModalProps> = ({ isOpen, onClose }) => {
  const { 
    sounds, 
    presets, 
    addTrack
  } = useStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<SoundType | 'All'>('All');
  
  // Get unique sound types from presets
  const soundTypes = Array.from(
    new Set(presets.map(preset => preset.category))
  ).sort() as SoundType[];
  
  // Filter presets based on search and type
  const filteredPresets = presets.filter(preset => {
    const matchesType = selectedType === 'All' || preset.category === selectedType;
    const matchesSearch = searchTerm === '' || 
      preset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      preset.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesType && matchesSearch;
  });
  
  // Handle adding a sound to the timeline
  const handleAddSound = (presetId: string) => {
    const preset = presets.find(p => p.id === presetId);
    if (!preset) return;
    
    // Add a new track with this sound
    addTrack(preset.parameters.id, preset.name);
    onClose();
  };
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Sound to Timeline"
    >
      <div className="p-4">
        {/* Search and filter */}
        <div className="mb-4 space-y-2">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search sounds..."
              className="w-full p-2 pl-8 bg-surface-darker border border-white/10 rounded focus:ring-2 focus:ring-primary focus:outline-none"
            />
            <FaSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-text-secondary" />
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedType === 'All' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setSelectedType('All')}
            >
              All
            </Button>
            
            {soundTypes.map(type => (
              <Button
                key={type}
                variant={selectedType === type ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setSelectedType(type)}
              >
                {type}
              </Button>
            ))}
          </div>
        </div>
        
        {/* Preset list */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
          {filteredPresets.length === 0 ? (
            <p className="text-text-secondary text-center py-8 col-span-2">
              No sounds found matching your search
            </p>
          ) : (
            filteredPresets.map(preset => (
              <Card
                key={preset.id}
                variant="neumorphic"
                className="cursor-pointer"
                onClick={() => handleAddSound(preset.id)}
              >
                <CardContent className="flex justify-between items-center p-4">
                  <div>
                    <h4 className="font-medium">{preset.name}</h4>
                    <p className="text-xs text-text-secondary">
                      {preset.category}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-primary"
                  >
                    <FaPlus />
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
};

export default AddSoundModal;