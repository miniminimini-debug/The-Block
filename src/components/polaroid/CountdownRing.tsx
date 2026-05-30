import { View, Text } from 'react-native';
import { MotiView } from 'moti';

interface CountdownRingProps {
  label: string;       // "2h", "45m", "ready ✦"
  progress: number;    // 0→1 (1 = fully developed)
  size?: number;
}

export function CountdownRing({ label, progress, size = 52 }: CountdownRingProps) {
  const isReady = progress >= 1 || label.includes('ready');
  const borderColor = isReady ? '#6BCB77' : '#3A2E70';
  const textColor = isReady ? '#6BCB77' : '#A99BFF';

  return (
    <MotiView
      animate={{
        borderColor,
        opacity: isReady ? 1 : [0.7, 1, 0.7],
      }}
      transition={
        isReady
          ? { type: 'timing', duration: 300 }
          : { type: 'timing', duration: 2400, loop: true }
      }
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 1.5,
        borderColor,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: isReady ? '#0D2010' : '#0D0D1C',
      }}
    >
      <Text
        style={{
          fontSize: size < 48 ? 9 : 11,
          color: textColor,
          fontFamily: 'Inter_600SemiBold',
          letterSpacing: 0.2,
          textAlign: 'center',
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </MotiView>
  );
}
