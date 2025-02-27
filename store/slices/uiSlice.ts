import { StateCreator } from 'zustand';
import { SoundParameters } from '@/types/audio';

export interface UISlice {
  soundEditorOpen: boolean;
  timelineHeight: number;
  timelineExpanded: boolean;
  exportModalOpen: boolean;
  presetModalOpen: boolean;
  presetNameInput: string; // Add this for preset naming
  
  openSoundEditor: (soundId: string | null) => void;
  closeSoundEditor: () => void;
  
  setTimelineHeight: (height: number) => void;
  toggleTimelineExpanded: () => void;
  
  openExportModal: () => void;
  closeExportModal: () => void;
  
  openPresetModal: () => void;
  closePresetModal: () => void;
  setPresetNameInput: (name: string) => void; // Add this action
}

const MIN_TIMELINE_HEIGHT = 150;
const MAX_TIMELINE_HEIGHT = 400;
const DEFAULT_TIMELINE_HEIGHT = 200;

export const uiSlice: StateCreator<UISlice> = (set, get) => ({
  soundEditorOpen: false,
  timelineHeight: DEFAULT_TIMELINE_HEIGHT,
  timelineExpanded: false,
  exportModalOpen: false,
  presetModalOpen: false,
  presetNameInput: '',
  
  openSoundEditor: (soundId) => {
    // Only set soundEditorOpen to true, don't create a new sound here
    set({
      soundEditorOpen: true,
    });
  },
  
  closeSoundEditor: () => {
    set({
      soundEditorOpen: false,
    });
  },
  
  setTimelineHeight: (height) => {
    const clampedHeight = Math.max(MIN_TIMELINE_HEIGHT, Math.min(height, MAX_TIMELINE_HEIGHT));
    set(state => ({
      timelineHeight: clampedHeight,
      timelineExpanded: clampedHeight >= MAX_TIMELINE_HEIGHT,
    }));
  },
  
  toggleTimelineExpanded: () => {
    const isExpanded = get().timelineExpanded;
    set(state => ({
      timelineExpanded: !isExpanded,
      timelineHeight: !isExpanded ? MAX_TIMELINE_HEIGHT : DEFAULT_TIMELINE_HEIGHT,
    }));
  },
  
  openExportModal: () => {
    set({ exportModalOpen: true });
  },
  
  closeExportModal: () => {
    set({ exportModalOpen: false });
  },
  
  openPresetModal: () => {
    set({ presetModalOpen: true });
  },
  
  closePresetModal: () => {
    set({ presetModalOpen: false });
  },
  
  setPresetNameInput: (name) => {
    set({ presetNameInput: name });
  },
});