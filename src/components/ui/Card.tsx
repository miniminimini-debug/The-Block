import { View, type ViewStyle } from 'react-native';

type Variant = 'elevated' | 'outlined' | 'filled' | 'ghost';

interface CardProps {
  children: React.ReactNode;
  variant?: Variant;
  style?: ViewStyle;
  padded?: boolean;
}

const variantStyles: Record<Variant, ViewStyle> = {
  elevated: {
    backgroundColor: '#1A1A28',
    borderWidth: 1,
    borderColor: '#2E2E48',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  outlined: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#2E2E48',
  },
  filled: {
    backgroundColor: '#12121C',
    borderWidth: 0,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
};

export function Card({ children, variant = 'elevated', style, padded = true }: CardProps) {
  return (
    <View
      style={[
        { borderRadius: 20 },
        variantStyles[variant],
        padded && { padding: 16 },
        style,
      ]}
    >
      {children}
    </View>
  );
}
