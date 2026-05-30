import { create } from 'zustand';

interface PhotoBoothStore {
  uris: string[];
  bgColor: string;
  set: (uris: string[], bgColor: string) => void;
  clear: () => void;
}

export const usePhotoBoothStore = create<PhotoBoothStore>((set) => ({
  uris: [],
  bgColor: '#FFFDF5',
  set: (uris, bgColor) => set({ uris, bgColor }),
  clear: () => set({ uris: [], bgColor: '#FFFDF5' }),
}));
