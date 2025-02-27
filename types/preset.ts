import { SoundParameters } from './audio';

export interface Preset {
  id: string;
  name: string;
  category: string;
  parameters: SoundParameters;
  createdAt: string;
  updatedAt: string;
}

export interface TimelinePreset {
  id: string;
  name: string;
  timeline: {
    tracks: {
      id: string;
      soundId: string;
      clips: {
        id: string;
        startTime: number;
        duration: number;
        offset: number;
      }[];
    }[];
    duration: number;
  };
  createdAt: string;
  updatedAt: string;
}