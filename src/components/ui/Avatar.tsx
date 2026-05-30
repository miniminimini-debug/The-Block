import { View, Text, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { MotiView } from 'moti';

type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  uri?: string | null;
  emoji?: string;
  displayName?: string | null;
  size?: Size;
  online?: boolean;
  hasNewPost?: boolean;
  style?: ViewStyle;
}

const sizeMap: Record<Size, { container: number; font: number; dot: number; dotOffset: number }> = {
  xs: { container: 28, font: 14,  dot: 7,  dotOffset: 0  },
  sm: { container: 36, font: 18,  dot: 8,  dotOffset: 1  },
  md: { container: 48, font: 24,  dot: 10, dotOffset: 1  },
  lg: { container: 64, font: 32,  dot: 12, dotOffset: 2  },
  xl: { container: 88, font: 44,  dot: 14, dotOffset: 3  },
};

function getInitials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

export function Avatar({ uri, emoji, displayName, size = 'md', online, hasNewPost, style }: AvatarProps) {
  const { container, font, dot, dotOffset } = sizeMap[size];
  const radius = container / 2;

  return (
    <View style={[{ width: container, height: container }, style]}>
      <View
        style={{
          width: container,
          height: container,
          borderRadius: radius,
          backgroundColor: '#241860',
          borderWidth: hasNewPost ? 2 : 1.5,
          borderColor: hasNewPost ? '#8B76F0' : '#2E2E48',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {uri ? (
          <Image
            source={{ uri }}
            style={{ width: container, height: container }}
            contentFit="cover"
          />
        ) : emoji ? (
          <Text style={{ fontSize: font }}>{emoji}</Text>
        ) : displayName ? (
          <Text style={{ fontSize: font * 0.45, color: '#A99BFF', fontFamily: 'Inter_600SemiBold' }}>
            {getInitials(displayName)}
          </Text>
        ) : (
          <Text style={{ fontSize: font * 0.5 }}>👤</Text>
        )}
      </View>

      {/* Online indicator */}
      {online !== undefined && (
        <MotiView
          animate={{ scale: online ? 1 : 0.7, opacity: online ? 1 : 0.4 }}
          transition={{ type: 'spring', damping: 15, stiffness: 200 }}
          style={{
            position: 'absolute',
            bottom: dotOffset,
            right: dotOffset,
            width: dot,
            height: dot,
            borderRadius: dot / 2,
            backgroundColor: online ? '#4ADE80' : '#3D3D5E',
            borderWidth: 1.5,
            borderColor: '#0D0D14',
          }}
        />
      )}

      {/* New post glow ring */}
      {hasNewPost && (
        <MotiView
          from={{ opacity: 0.4, scale: 0.9 }}
          animate={{ opacity: [0.4, 0.8, 0.4], scale: [0.9, 1.05, 0.9] }}
          transition={{ type: 'timing', duration: 2000, loop: true }}
          style={{
            position: 'absolute',
            top: -3,
            left: -3,
            right: -3,
            bottom: -3,
            borderRadius: radius + 3,
            borderWidth: 2,
            borderColor: '#8B76F0',
          }}
        />
      )}
    </View>
  );
}
