import { Pressable, ActivityIndicator, type ViewStyle } from 'react-native';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { BlockText } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface BlockButtonProps {
  variant?: Variant;
  size?: Size;
  onPress: () => void;
  children: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
}

const sizeMap = {
  sm: { py: 10, px: 16, radius: 12, textPreset: 'caption' as const },
  md: { py: 17, px: 24, radius: 16, textPreset: 'bodyMedium' as const },
  lg: { py: 21, px: 32, radius: 18, textPreset: 'bodyMedium' as const },
};

export function BlockButton({
  variant = 'primary',
  size = 'md',
  onPress,
  children,
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
}: BlockButtonProps) {
  const { py, px, radius, textPreset } = sizeMap[size];
  const isDisabled = disabled || loading;

  const handlePress = () => {
    if (isDisabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const content = loading ? (
    <ActivityIndicator color="#EEEEF8" size="small" />
  ) : (
    <BlockText preset={textPreset} className="text-block-snow">
      {children}
    </BlockText>
  );

  return (
    <MotiView
      animate={{ scale: 1, opacity: isDisabled ? 0.5 : 1 }}
      transition={{ type: 'spring', damping: 15, stiffness: 300 }}
      style={[fullWidth ? { width: '100%' } : undefined, style]}
    >
      <Pressable
        onPress={handlePress}
        disabled={isDisabled}
        style={({ pressed }) => ({
          transform: [{ scale: pressed ? 0.96 : 1 }],
          borderRadius: radius,
          overflow: 'hidden',
        })}
      >
        {variant === 'primary' ? (
          <LinearGradient
            colors={isDisabled ? ['#2E2E48', '#3D3D5E'] : ['#8B76F0', '#4C32C0']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ paddingVertical: py, paddingHorizontal: px, alignItems: 'center' }}
          >
            {content}
          </LinearGradient>
        ) : variant === 'secondary' ? (
          <MotiView
            style={{
              paddingVertical: py,
              paddingHorizontal: px,
              alignItems: 'center',
              backgroundColor: '#1A1240',
              borderWidth: 1.5,
              borderColor: '#4C32C0',
              borderRadius: radius,
            }}
          >
            <BlockText preset={textPreset} className="text-block-lavender-light">
              {children}
            </BlockText>
          </MotiView>
        ) : variant === 'danger' ? (
          <MotiView
            style={{
              paddingVertical: py,
              paddingHorizontal: px,
              alignItems: 'center',
              backgroundColor: 'rgba(255,107,107,0.1)',
              borderWidth: 1.5,
              borderColor: 'rgba(255,107,107,0.3)',
              borderRadius: radius,
            }}
          >
            <BlockText preset={textPreset} className="text-block-error">
              {children}
            </BlockText>
          </MotiView>
        ) : (
          // ghost
          <MotiView
            style={{ paddingVertical: py, paddingHorizontal: px, alignItems: 'center' }}
          >
            <BlockText preset={textPreset} className="text-block-silver">
              {children}
            </BlockText>
          </MotiView>
        )}
      </Pressable>
    </MotiView>
  );
}
