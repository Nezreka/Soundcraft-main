import React, { useState, useEffect } from 'react';
import { useStore } from '@/store';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { FaSave, FaTrash } from 'react-icons/fa';

interface TimelinePresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'save' | 'load';
}

const TimelinePresetModal: React.FC<TimelinePresetModalProps> = ({ 
  isOpen, 
  onClose, 
  mode 
}) => {
  const {
    timelinePresets,
    saveTimelinePreset,
    loadTimelinePreset,
    deleteTimelinePreset
  } = useStore();

  const [presetName, setPresetName] = useState('');

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setPresetName('');
    }
  }, [isOpen]);

  const handleSavePreset = () => {
    if (!presetName.trim()) return;
    
    saveTimelinePreset(presetName);
    setPresetName('');
    onClose();
  };

  const handleLoadPreset = (presetId: string) => {
    loadTimelinePreset(presetId);
    onClose();
  };

  const handleDeletePreset = (e: React.MouseEvent, presetId: string) => {
    e.stopPropagation();
    deleteTimelinePreset(presetId);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'save' ? 'Save Timeline Preset' : 'Load Timeline Preset'}
    >
      <div className="p-4">
        {mode === 'save' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1">
                Preset Name
              </label>
              <input
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                className="w-full p-2 bg-surface-darker border border-white/10 rounded focus:ring-2 focus:ring-primary focus:outline-none"
                placeholder="Enter preset name..."
              />
            </div>
            
            <div className="flex justify-end">
              <Button 
                onClick={handleSavePreset} 
                disabled={!presetName.trim()}
              >
                <FaSave className="mr-2" />
                Save Preset
              </Button>
            </div>
          </div>
        ) : (
          <div>
            {timelinePresets.length === 0 ? (
              <p className="text-text-secondary text-center py-8">
                No timeline presets saved
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 max-h-96 overflow-y-auto">
                {timelinePresets.map((preset) => (
                  <Card
                    key={preset.id}
                    variant="neumorphic"
                    className="cursor-pointer"
                    onClick={() => handleLoadPreset(preset.id)}
                  >
                    <CardContent className="flex justify-between items-center p-4">
                      <div>
                        <h4 className="font-medium">{preset.name}</h4>
                        <p className="text-xs text-text-secondary">
                          {new Date(preset.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleDeletePreset(e, preset.id)}
                      >
                        <FaTrash />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default TimelinePresetModal;