import { Pressable, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

interface ShutterButtonProps {
  onPress: () => void;
  disabled?: boolean;
}

export function ShutterButton({ onPress, disabled }: ShutterButtonProps) {
  const scale = useSharedValue(1);
  const innerScale = useSharedValue(1);

  const outerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const innerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: innerScale.value }],
  }));

  const handlePress = () => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    scale.value = withSequence(
      withTiming(0.9, { duration: 80 }),
      withSpring(1, { damping: 10, stiffness: 300 })
    );
    innerScale.value = withSequence(
      withTiming(0.7, { duration: 80 }),
      withSpring(1, { damping: 12, stiffness: 350 })
    );
    onPress();
  };

  return (
    <Pressable onPress={handlePress} disabled={disabled}>
      <Animated.View
        style={[
          {
            width: 80,
            height: 80,
            borderRadius: 40,
            borderWidth: 3.5,
            borderColor: disabled ? '#5A5A7A' : '#EEEEF8',
            alignItems: 'center',
            justifyContent: 'center',
          },
          outerStyle,
        ]}
      >
        <Animated.View
          style={[
            {
              width: 60,
              height: 60,
              borderRadius: 30,
              backgroundColor: disabled ? '#5A5A7A' : '#EEEEF8',
            },
            innerStyle,
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}
