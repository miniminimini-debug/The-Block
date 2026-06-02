import { useState, useRef } from 'react';
import {
  View, Text, Pressable, Modal, ScrollView,
  Dimensions, StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';

const { width: SW } = Dimensions.get('window');
const FRAME_SIZE = SW - 64; // square photo area

interface Props {
  visible: boolean;
  imageUri: string | null;
  onConfirm: (uri: string) => void;
  onCancel: () => void;
}

export function PolaroidCropModal({ visible, imageUri, onConfirm, onCancel }: Props) {
  if (!imageUri) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <MotiView
          from={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 22, stiffness: 240 }}
          style={styles.container}
        >
          {/* Polaroid frame */}
          <View style={styles.polaroidFrame}>
            {/* Photo — use ScrollView for pan/zoom */}
            <View style={{ width: FRAME_SIZE, height: FRAME_SIZE, overflow: 'hidden', backgroundColor: '#E8E0D0' }}>
              <ScrollView
                style={{ width: FRAME_SIZE, height: FRAME_SIZE }}
                contentContainerStyle={{ width: FRAME_SIZE * 1.5, height: FRAME_SIZE * 1.5, alignItems: 'center', justifyContent: 'center' }}
                minimumZoomScale={0.5}
                maximumZoomScale={3}
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
                scrollEnabled
                bouncesZoom
                centerContent
              >
                <Image
                  source={{ uri: imageUri }}
                  style={{ width: FRAME_SIZE * 1.5, height: FRAME_SIZE * 1.5 }}
                  contentFit="contain"
                />
              </ScrollView>
            </View>

            {/* White bottom strip */}
            <View style={styles.strip}>
              <Text style={{ fontSize: 11, color: '#9A8A78', fontFamily: 'Inter_400Regular' }}>
                pinch to zoom · drag to reposition
              </Text>
            </View>
          </View>

          {/* Buttons */}
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 20, paddingHorizontal: 8 }}>
            <Pressable onPress={onCancel} style={styles.cancelBtn}>
              <Text style={{ fontSize: 14, color: 'rgba(80,40,10,0.6)', fontFamily: 'Inter_500Medium' }}>cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); onConfirm(imageUri); }}
              style={styles.confirmBtn}
            >
              <Text style={{ fontSize: 14, color: '#FFF', fontFamily: 'Inter_600SemiBold' }}>pin it 📌</Text>
            </Pressable>
          </View>
        </MotiView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  container: {
    alignItems: 'center',
  },
  polaroidFrame: {
    backgroundColor: '#F5F0E8',
    padding: 8,
    paddingBottom: 0,
    borderRadius: 4,
    shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 18, shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  strip: {
    height: 44, alignItems: 'center', justifyContent: 'center',
  },
  cancelBtn: {
    flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center',
    backgroundColor: 'rgba(255,253,245,0.9)',
  },
  confirmBtn: {
    flex: 2, borderRadius: 14, paddingVertical: 14, alignItems: 'center',
    backgroundColor: '#5A3A10',
  },
});
