import { useRef, useCallback } from 'react';
import { useCameraPermissions, CameraView } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useCameraStore } from '@stores/camera.store';

export function useCamera() {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const setStage = useCameraStore((s) => s.setStage);
  const setCaptureUri = useCameraStore((s) => s.setCaptureUri);
  const toggleFlash = useCameraStore((s) => s.toggleFlash);
  const toggleCamera = useCameraStore((s) => s.toggleCamera);
  const isFlashOn = useCameraStore((s) => s.isFlashOn);
  const isFrontCamera = useCameraStore((s) => s.isFrontCamera);

  const capture = useCallback(async () => {
    if (!cameraRef.current) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        skipProcessing: false,
      });
      if (photo?.uri) {
        setCaptureUri(photo.uri);
        setStage('composer');
      }
    } catch {
      // Camera capture can fail if app is backgrounded mid-capture
    }
  }, []);

  return {
    cameraRef,
    permission,
    requestPermission,
    capture,
    toggleFlash,
    toggleCamera,
    isFlashOn,
    isFrontCamera,
  };
}
