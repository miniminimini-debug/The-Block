import { create } from 'zustand';
import type { TimeOfDay } from '@lib/theme';

interface ThemeOverrideStore {
  override: TimeOfDay | null;
  setOverride: (t: TimeOfDay | null) => void;
}

export const useThemeOverrideStore = create<ThemeOverrideStore>((set) => ({
  override: null,
  setOverride: (override) => set({ override }),
}));
