import os

def create_structure():
    # Base directory (current directory)
    base_dir = "."
    
    # Directories and their files
    directories = {
        "public/fonts": [],
        "public/icons": [],
        "public/presets": [],
        
        "app/api/export": ["route.ts"],
        "app/api/presets": ["route.ts"],
        
        "components/ui": [
            "Button.tsx", "Slider.tsx", "Knob.tsx", "Switch.tsx", 
            "Card.tsx", "Modal.tsx", "Tabs.tsx", "Dropdown.tsx", "Tooltip.tsx"
        ],
        "components/layout": ["Header.tsx", "Footer.tsx", "Sidebar.tsx"],
        "components/audio": [
            "SoundGrid.tsx", "SoundCard.tsx", "Timeline.tsx", "Track.tsx",
            "TrackControls.tsx", "TimelineControls.tsx", "Waveform.tsx", "Spectrum.tsx"
        ],
        "components/modals": ["SoundEditor.tsx", "ExportModal.tsx", "PresetModal.tsx"],
        "components/controls": [
            "VolumeControl.tsx", "PanControl.tsx", "PitchControl.tsx", 
            "FilterControls.tsx", "EnvelopeControls.tsx", "LFOControls.tsx",
            "EffectsControls.tsx", "EQControls.tsx", "DynamicsControls.tsx", "SpatialControls.tsx"
        ],
        
        "lib/audio": ["audioContext.ts", "generators.ts", "processors.ts", "effects.ts", "exporters.ts"],
        "lib/hooks": ["useAudioNode.ts", "useTimeline.ts", "usePresets.ts", "useDragResize.ts"],
        "lib/utils": ["animations.ts", "storage.ts", "format.ts"],
        
        "types": ["audio.ts", "preset.ts", "ui.ts"],
        
        "store": ["index.ts"],
        "store/slices": ["timelineSlice.ts", "soundsSlice.ts", "uiSlice.ts"]
    }
    
    # Create directories and their files
    for directory, files in directories.items():
        full_dir_path = os.path.join(base_dir, directory)
        if not os.path.exists(full_dir_path):
            os.makedirs(full_dir_path)
            print(f"Created directory: {directory}")
        
        for file in files:
            file_path = os.path.join(full_dir_path, file)
            if not os.path.exists(file_path):
                with open(file_path, 'w') as f:
                    pass
                print(f"Created file: {directory}/{file}")
    
    print("Successfully extended project structure.")

if __name__ == "__main__":
    create_structure()