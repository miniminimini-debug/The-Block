import { useEffect, useRef } from 'react';
import { View, Text, Pressable } from 'react-native';
import { MotiView, AnimatePresence } from 'moti';
import * as Haptics from 'expo-haptics';
import { useUIStore, type Toast, type ToastType } from '@stores/ui.store';

const toastConfig: Record<ToastType, { bg: string; border: string; icon: string; textColor: string }> = {
  success: { bg: '#0D2010', border: '#4ADE8040', icon: '✓', textColor: '#4ADE80' },
  error:   { bg: '#200D0D', border: '#FF6B6B40', icon: '✕', textColor: '#FF6B6B' },
  info:    { bg: '#12121C', border: '#2E2E48',   icon: '·', textColor: '#A0A0C0' },
  cozy:    { bg: '#1A1208', border: '#FFB83040', icon: '✦', textColor: '#FFB830' },
};

function ToastItem({ toast }: { toast: Toast }) {
  const dismiss = useUIStore((s) => s.dismissToast);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const config = toastConfig[toast.type];

  useEffect(() => {
    if (toast.type === 'error') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else if (toast.type === 'success') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    timerRef.current = setTimeout(() => dismiss(toast.id), toast.duration ?? 3000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  return (
    <MotiView
      from={{ opacity: 0, translateY: 16, scale: 0.95 }}
      animate={{ opacity: 1, translateY: 0, scale: 1 }}
      exit={{ opacity: 0, translateY: -8, scale: 0.95 }}
      transition={{ type: 'spring', damping: 18, stiffness: 200 }}
    >
      <Pressable
        onPress={() => dismiss(toast.id)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          backgroundColor: config.bg,
          borderWidth: 1,
          borderColor: config.border,
          borderRadius: 14,
          paddingHorizontal: 14,
          paddingVertical: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 10,
          elevation: 6,
        }}
      >
        <Text style={{ fontSize: 14, color: config.textColor, fontFamily: 'Inter_600SemiBold' }}>
          {config.icon}
        </Text>
        <Text
          style={{ flex: 1, fontSize: 13, color: '#EEEEF8', fontFamily: 'Inter_400Regular', lineHeight: 18 }}
          numberOfLines={2}
        >
          {toast.message}
        </Text>
      </Pressable>
    </MotiView>
  );
}

export function ToastContainer() {
  const toasts = useUIStore((s) => s.toasts);

  return (
    <View
      style={{
        position: 'absolute',
        bottom: 100,
        left: 16,
        right: 16,
        gap: 8,
        zIndex: 9999,
        pointerEvents: 'box-none',
      }}
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </AnimatePresence>
    </View>
  );
}

// Convenience hook
export function useToast() {
  const showToast = useUIStore((s) => s.showToast);
  return {
    success: (msg: string) => showToast(msg, 'success'),
    error:   (msg: string) => showToast(msg, 'error'),
    info:    (msg: string) => showToast(msg, 'info'),
    cozy:    (msg: string) => showToast(msg, 'cozy'),
  };
}
