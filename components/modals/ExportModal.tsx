import React, { useState } from 'react';
import { useStore } from '@/store';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Slider } from '@/components/ui/Slider';
import { Dropdown } from '@/components/ui/Dropdown';
import { Switch } from '@/components/ui/Switch';

const ExportModal: React.FC = () => {
  const { exportModalOpen, closeExportModal } = useStore();
  
  const [format, setFormat] = useState('wav');
  const [quality, setQuality] = useState(0.8);
  const [normalize, setNormalize] = useState(true);
  const [exportSelection, setExportSelection] = useState(false);
  
  const handleExport = () => {
    // Here we would call the audio export function
    // For now, we'll just close the modal
    closeExportModal();
  };
  
  return (
    <Modal
      isOpen={exportModalOpen}
      onClose={closeExportModal}
      title="Export Audio"
    >
      <div className="space-y-6 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">Export Settings</h3>
            
            <div className="space-y-4">
              <Dropdown
                label="Format"
                options={[
                  { value: 'wav', label: 'WAV (Uncompressed)' },
                  { value: 'mp3', label: 'MP3 (Compressed)' },
                  { value: 'ogg', label: 'OGG (Compressed)' },
                ]}
                value={format}
                onChange={setFormat}
              />
              
              <Slider
                label="Quality"
                value={quality}
                min={0}
                max={1}
                step={0.1}
                onChange={setQuality}
                unit="%"
              />
              
              <Switch
                label="Normalize Audio"
                checked={normalize}
                onChange={setNormalize}
              />
              
              <Switch
                label="Export Selection Only"
                checked={exportSelection}
                onChange={setExportSelection}
              />
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Export Preview</h3>
            <div className="neumorphic-inset p-4 h-40 flex items-center justify-center">
              <p className="text-text-secondary text-center">
                Export preview will be shown here
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end space-x-2 pt-4 border-t border-white/10">
          <Button variant="outline" onClick={closeExportModal}>
            Cancel
          </Button>
          <Button onClick={handleExport}>
            Export
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ExportModal;