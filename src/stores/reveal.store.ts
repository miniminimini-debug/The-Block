import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { ReceivedPost } from '@hooks/usePosts';

interface RevealState {
  // The post currently in the full-screen ceremony
  ceremonyPost: ReceivedPost | null;
  // How many darkroom (unviewed developed) posts the user has
  darkroomCount: number;

  openCeremony: (post: ReceivedPost) => void;
  closeCeremony: () => void;
  setDarkroomCount: (count: number) => void;
}

export const useRevealStore = create<RevealState>()(
  immer((set) => ({
    ceremonyPost: null,
    darkroomCount: 0,

    openCeremony: (post) =>
      set((s) => {
        s.ceremonyPost = post as any;
      }),

    closeCeremony: () =>
      set((s) => {
        s.ceremonyPost = null;
      }),

    setDarkroomCount: (count) =>
      set((s) => {
        s.darkroomCount = count;
      }),
  }))
);
