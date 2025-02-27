import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { soundsSlice, SoundsSlice } from './slices/soundsSlice';
import { timelineSlice, TimelineSlice } from './slices/timelineSlice';
import { uiSlice, UISlice } from './slices/uiSlice';

export type StoreState = SoundsSlice & TimelineSlice & UISlice;

export const useStore = create<StoreState>()(
  devtools(
    persist(
      (...a) => ({
        ...soundsSlice(...a),
        ...timelineSlice(...a),
        ...uiSlice(...a),
      }),
      {
        name: 'soundcraft-storage',
        partialize: (state) => ({
          sounds: state.sounds,
          presets: state.presets,
          timelinePresets: state.timelinePresets,
        }),
      }
    )
  )
);