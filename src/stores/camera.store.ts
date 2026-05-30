import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { MoodType } from '@types/database';
import type { CameraMode } from '@types/models';

export type DevelopmentDelay = 15 | 60 | 240 | 'overnight';

export type CameraStage =
  | 'viewfinder'
  | 'composer'
  | 'uploading'
  | 'sent'
  // booth-specific stages
  | 'booth-countdown'
  | 'booth-capturing'
  | 'booth-strip';

interface CameraState {
  stage: CameraStage;
  captureUri: string | null;
  note: string;
  mood: MoodType | null;
  selectedRecipientIds: string[];
  developmentDelay: DevelopmentDelay;
  isFlashOn: boolean;
  isFrontCamera: boolean;
  uploadProgress: number;

  // Camera mode
  cameraMode: CameraMode;

  // Booth-specific
  boothCaptures: string[];   // up to 4 local URIs
  boothShotIndex: number;    // which shot we're on (0–3)
  boothCountdown: number;    // 3,2,1 countdown value

  setStage: (stage: CameraStage) => void;
  setCaptureUri: (uri: string | null) => void;
  setNote: (note: string) => void;
  setMood: (mood: MoodType | null) => void;
  toggleRecipient: (userId: string) => void;
  setRecipients: (ids: string[]) => void;
  setDelay: (delay: DevelopmentDelay) => void;
  toggleFlash: () => void;
  toggleCamera: () => void;
  setUploadProgress: (p: number) => void;
  setCameraMode: (mode: CameraMode) => void;
  addBoothCapture: (uri: string) => void;
  setBoothCountdown: (n: number) => void;
  reset: () => void;
  resetBooth: () => void;
}

const defaults = {
  stage: 'viewfinder' as CameraStage,
  captureUri: null,
  note: '',
  mood: null,
  selectedRecipientIds: [] as string[],
  developmentDelay: 60 as DevelopmentDelay,
  isFlashOn: false,
  isFrontCamera: false,
  uploadProgress: 0,
  cameraMode: 'oneshot' as CameraMode,
  boothCaptures: [] as string[],
  boothShotIndex: 0,
  boothCountdown: 3,
};

export const useCameraStore = create<CameraState>()(
  immer((set) => ({
    ...defaults,

    setStage: (stage) => set((s) => { s.stage = stage; }),
    setCaptureUri: (uri) => set((s) => { s.captureUri = uri; }),
    setNote: (note) => set((s) => { s.note = note; }),
    setMood: (mood) => set((s) => { s.mood = mood; }),

    toggleRecipient: (userId) =>
      set((s) => {
        const idx = s.selectedRecipientIds.indexOf(userId);
        if (idx >= 0) s.selectedRecipientIds.splice(idx, 1);
        else s.selectedRecipientIds.push(userId);
      }),

    setRecipients: (ids) => set((s) => { s.selectedRecipientIds = ids; }),
    setDelay: (delay) => set((s) => { s.developmentDelay = delay; }),
    toggleFlash: () => set((s) => { s.isFlashOn = !s.isFlashOn; }),
    toggleCamera: () => set((s) => { s.isFrontCamera = !s.isFrontCamera; }),
    setUploadProgress: (p) => set((s) => { s.uploadProgress = p; }),
    setCameraMode: (mode) => set((s) => {
      s.cameraMode = mode;
      // Reset booth state when switching modes
      s.boothCaptures = [];
      s.boothShotIndex = 0;
      s.boothCountdown = 3;
      s.stage = 'viewfinder';
    }),

    addBoothCapture: (uri) =>
      set((s) => {
        s.boothCaptures.push(uri);
        s.boothShotIndex = s.boothCaptures.length;
      }),

    setBoothCountdown: (n) => set((s) => { s.boothCountdown = n; }),

    reset: () => set((s) => Object.assign(s, defaults)),
    resetBooth: () =>
      set((s) => {
        s.boothCaptures = [];
        s.boothShotIndex = 0;
        s.boothCountdown = 3;
        s.stage = 'viewfinder';
      }),
  }))
);
