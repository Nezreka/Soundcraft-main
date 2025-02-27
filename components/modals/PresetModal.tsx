// components/modals/PresetModal.tsx
import React, { useState, useEffect } from "react";
import { useStore } from "@/store";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { FaSave, FaTrash } from "react-icons/fa";

const PresetModal: React.FC = () => {
  const {
    presetModalOpen,
    closePresetModal,
    currentSoundId,
    presets,
    savePreset,
    loadPreset,
    deletePreset,
    sounds,
  } = useStore();

  const currentSound = sounds.find((s) => s.id === currentSoundId);

  const [presetName, setPresetName] = useState("");
  const [activeTab, setActiveTab] = useState<"save" | "load">("save");

  // Initialize preset name with current sound name when modal opens
  useEffect(() => {
    if (presetModalOpen && currentSound) {
      setPresetName(currentSound.name);
    } else {
      setPresetName("");
    }
  }, [presetModalOpen, currentSound]);

  // Filter presets by the current sound type
  const filteredPresets = currentSound
    ? presets.filter(preset => preset.category === currentSound.type)
    : [];

  const handleSavePreset = () => {
    if (!presetName.trim() || !currentSoundId) return;

    savePreset(presetName, currentSoundId);
    setPresetName("");
    closePresetModal();
  };

  const handleLoadPreset = (presetId: string) => {
    loadPreset(presetId);
    closePresetModal();
  };

  const handleDeletePreset = (presetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deletePreset(presetId);
  };

  // Safety check for currentSound
  if (!currentSound && activeTab === "save") {
    return (
      <Modal
        isOpen={presetModalOpen}
        onClose={closePresetModal}
        title="Preset Manager"
      >
        <div className="p-4">
          <p className="text-text-secondary text-center py-8">
            No sound selected to save
          </p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={presetModalOpen}
      onClose={closePresetModal}
      title={`Preset Manager - ${currentSound?.type || 'Presets'}`}
    >
      <div className="p-4">
        <div className="flex border-b border-white/10 mb-4">
          <button
            className={`px-4 py-2 ${
              activeTab === "save"
                ? "text-primary border-b-2 border-primary"
                : "text-text-secondary"
            }`}
            onClick={() => setActiveTab("save")}
          >
            Save Preset
          </button>
          <button
            className={`px-4 py-2 ${
              activeTab === "load"
                ? "text-primary border-b-2 border-primary"
                : "text-text-secondary"
            }`}
            onClick={() => setActiveTab("load")}
          >
            Load Preset
          </button>
        </div>

        {activeTab === "save" ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1">
                Preset Name
              </label>
              <input
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                className="w-full p-2 bg-surface-darker border border-white/10 rounded focus:ring-2 focus:ring-primary focus:outline-none text-black"
                placeholder="Enter preset name..."
              />
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSavePreset} disabled={!presetName.trim()}>
                <FaSave className="mr-2" />
                Save Preset
              </Button>
            </div>
          </div>
        ) : (
          <div>
            {filteredPresets.length === 0 ? (
              <p className="text-text-secondary text-center py-8">
                No presets found for {currentSound?.type || 'this sound type'}
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                {filteredPresets.map((preset) => (
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
                          {preset.category}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleDeletePreset(preset.id, e)}
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

export default PresetModal;