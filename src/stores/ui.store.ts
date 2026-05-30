import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export type ToastType = 'success' | 'error' | 'info' | 'cozy';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface UIState {
  toasts: Toast[];
  activeModalId: string | null;

  showToast: (message: string, type?: ToastType, duration?: number) => void;
  dismissToast: (id: string) => void;
  openModal: (id: string) => void;
  closeModal: () => void;
}

export const useUIStore = create<UIState>()(
  immer((set) => ({
    toasts: [],
    activeModalId: null,

    showToast: (message, type = 'info', duration = 3000) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      set((s) => {
        s.toasts.push({ id, type, message, duration });
        // Cap at 3 concurrent toasts
        if (s.toasts.length > 3) s.toasts.shift();
      });
    },

    dismissToast: (id) =>
      set((s) => {
        s.toasts = s.toasts.filter((t) => t.id !== id);
      }),

    openModal: (id) =>
      set((s) => {
        s.activeModalId = id;
      }),

    closeModal: () =>
      set((s) => {
        s.activeModalId = null;
      }),
  }))
);
