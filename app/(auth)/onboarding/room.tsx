import { useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '@stores/auth.store';

interface RoomOption {
  id: string;
  label: string;
  emoji: string;
  description: string;
  gradient: [string, string];
  accent: string;
  windowColor: string;
}

const ROOM_OPTIONS: RoomOption[] = [
  { id: 'bedroom',  label: 'bedroom',  emoji: '🛏️', description: 'cozy and personal. soft lights, warm walls.',         gradient: ['#2A2040', '#1A1430'], accent: '#8B76F0', windowColor: '#FFE0A0' },
  { id: 'studio',   label: 'studio',   emoji: '🎨', description: 'where you make things. bright, open, creative.',       gradient: ['#1E2A3A', '#111E2A'], accent: '#4A9EBF', windowColor: '#A0C8FF' },
  { id: 'loft',     label: 'loft',     emoji: '🏙️', description: 'city views. exposed brick. golden evenings.',          gradient: ['#2A1E1E', '#1A1010'], accent: '#D4704A', windowColor: '#FFB07A' },
  { id: 'treehouse',label: 'treehouse',emoji: '🌿', description: 'hidden in the canopy. green light. birdsong.',          gradient: ['#1A2A1A', '#0E1A0E'], accent: '#4ABF70', windowColor: '#A8E6CF' },
  { id: 'rooftop',  label: 'rooftop',  emoji: '🌃', description: 'above it all. stars close. city below.',              gradient: ['#1A1A2A', '#0E0E1A'], accent: '#7A70D4', windowColor: '#C8C0FF' },
  { id: 'cabin',    label: 'cabin',    emoji: '🪵', description: 'wood and fire. quiet woods. no signal, no problem.',   gradient: ['#2A1E0A', '#1A1205'], accent: '#BF8A40', windowColor: '#FFCE70' },
  { id: 'basement', label: 'basement', emoji: '🎮', description: 'low lighting. good vibes. your world.',                gradient: ['#1E1E1A', '#12120E'], accent: '#A0906A', windowColor: '#FFD0A8' },
  { id: 'van',      label: 'van',      emoji: '🚐', description: 'always moving. every night is different.',             gradient: ['#10202A', '#081318'], accent: '#4A8ABF', windowColor: '#70C0FF' },
];

const STEP_INDICATOR = '5 of 5';

export default function RoomScreen() {
  const [selectedId, setSelectedId] = useState('bedroom');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding);

  const selected = ROOM_OPTIONS.find((r) => r.id === selectedId)!;

  const handleConfirm = async () => {
    setError(null);
    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const { error: err } = await completeOnboarding(selectedId);
    setIsLoading(false);
    if (err) {
      setError('something went wrong. try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace('/(tabs)');
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#08080F' }}>
      {/* Header */}
      <View style={{ paddingTop: 60, paddingHorizontal: 24, paddingBottom: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <Pressable onPress={() => router.back()}>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 16, color: '#A0A0C0' }}>← back</Text>
          </Pressable>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: '#5A5A7A' }}>{STEP_INDICATOR}</Text>
        </View>
        <MotiView
          from={{ opacity: 0, translateY: 12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 150 }}
        >
          <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 30, color: '#EEEEF8', letterSpacing: -1, marginBottom: 6 }}>
            choose your room
          </Text>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 15, color: '#7A7A9A', lineHeight: 22 }}>
            this is where you'll live on the block
          </Text>
        </MotiView>
      </View>

      {/* Preview of selected room */}
      <MotiView
        key={selectedId}
        from={{ opacity: 0.6, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', damping: 18, stiffness: 200 }}
        style={{ marginHorizontal: 24, marginBottom: 16, borderRadius: 20, overflow: 'hidden', borderWidth: 1.5, borderColor: selected.accent + '60' }}
      >
        <LinearGradient
          colors={selected.gradient}
          style={{ height: 100, padding: 20, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}
        >
          <View style={{ gap: 6 }}>
            {[[true, false], [true, true]].map((row, ri) => (
              <View key={ri} style={{ flexDirection: 'row', gap: 5 }}>
                {row.map((lit, wi) => (
                  <View key={wi} style={{ width: 16, height: 16, borderRadius: 3, backgroundColor: lit ? selected.windowColor : '#1A1A28', opacity: lit ? 0.85 : 0.25 }} />
                ))}
              </View>
            ))}
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <Text style={{ fontSize: 28 }}>{selected.emoji}</Text>
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: selected.accent }}>
              {selected.label}
            </Text>
          </View>
        </LinearGradient>
        <View style={{ backgroundColor: selected.gradient[1], paddingHorizontal: 20, paddingVertical: 12 }}>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: '#A0A0C0', lineHeight: 19 }}>
            {selected.description}
          </Text>
        </View>
      </MotiView>

      {/* Room grid */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 140 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {ROOM_OPTIONS.map((room, i) => {
            const isSelected = room.id === selectedId;
            return (
              <MotiView
                key={room.id}
                from={{ opacity: 0, translateY: 8 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'spring', damping: 20, stiffness: 150, delay: i * 35 }}
                style={{ width: '47%' }}
              >
                <Pressable
                  onPress={() => { setSelectedId(room.id); Haptics.selectionAsync(); }}
                  style={{
                    borderRadius: 16, borderWidth: 1.5,
                    borderColor: isSelected ? room.accent : '#2E2E48',
                    backgroundColor: isSelected ? room.gradient[0] : '#12121C',
                    paddingVertical: 14, paddingHorizontal: 14,
                    flexDirection: 'row', alignItems: 'center', gap: 10,
                  }}
                >
                  <Text style={{ fontSize: 20 }}>{room.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: isSelected ? '#EEEEF8' : '#7A7A9A' }}>
                      {room.label}
                    </Text>
                    {isSelected && (
                      <View style={{ width: 18, height: 2, borderRadius: 1, backgroundColor: room.accent, marginTop: 3 }} />
                    )}
                  </View>
                </Pressable>
              </MotiView>
            );
          })}
        </View>
      </ScrollView>

      {/* Sticky confirm */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 24, paddingBottom: 36, paddingTop: 16, backgroundColor: '#08080F', borderTopWidth: 1, borderTopColor: '#1A1A28' }}>
        {error && (
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: '#FF6B6B', textAlign: 'center', marginBottom: 10 }}>
            {error}
          </Text>
        )}
        <Pressable
          onPress={handleConfirm}
          disabled={isLoading}
          style={{ borderRadius: 18, paddingVertical: 18, alignItems: 'center', backgroundColor: isLoading ? '#2E2E48' : '#6B52E0' }}
        >
          {isLoading
            ? <ActivityIndicator color="#EEEEF8" />
            : <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 17, color: '#EEEEF8' }}>move in →</Text>
          }
        </Pressable>
      </View>
    </View>
  );
}
