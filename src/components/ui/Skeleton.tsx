import { View, type ViewStyle } from 'react-native';
import { MotiView } from 'moti';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  radius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 16, radius = 8, style }: SkeletonProps) {
  return (
    <MotiView
      from={{ opacity: 0.3 }}
      animate={{ opacity: [0.3, 0.6, 0.3] }}
      transition={{ type: 'timing', duration: 1400, loop: true }}
      style={[
        {
          width: width as any,
          height,
          borderRadius: radius,
          backgroundColor: '#2E2E48',
        },
        style,
      ]}
    />
  );
}

// Preset skeleton layouts
export function SkeletonPost() {
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Skeleton width={44} height={44} radius={22} />
        <View style={{ flex: 1, gap: 6 }}>
          <Skeleton width="50%" height={12} />
          <Skeleton width="30%" height={10} />
        </View>
      </View>
      <Skeleton width="100%" height={240} radius={16} />
      <Skeleton width="60%" height={12} />
    </View>
  );
}

export function SkeletonFriend() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }}>
      <Skeleton width={48} height={48} radius={24} />
      <View style={{ flex: 1, gap: 6 }}>
        <Skeleton width="45%" height={13} />
        <Skeleton width="30%" height={11} />
      </View>
    </View>
  );
}
