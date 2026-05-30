import { View, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSeasonalRecap, useOpenRecap } from '@hooks/useSeasonalRecaps';
import { RecapCeremony } from '@/components/recap/RecapCeremony';
import { useTheme } from '@hooks/useTheme';
import { useEffect } from 'react';

export default function RecapScreen() {
  const { recapId } = useLocalSearchParams<{ recapId: string }>();
  const theme = useTheme();

  const { recap, isLoading } = useSeasonalRecap(recapId ?? '');
  const { mutateAsync: openRecap } = useOpenRecap();

  useEffect(() => {
    if (recap && !recap.isOpened) {
      openRecap(recap.id).catch(() => {});
    }
  }, [recap?.id]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  if (!recap) return null;

  return (
    <RecapCeremony
      recap={recap}
      onClose={() => router.back()}
    />
  );
}
