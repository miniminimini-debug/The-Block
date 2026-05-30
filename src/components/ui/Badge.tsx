import { View, Text, type ViewStyle } from 'react-native';

type Variant = 'new' | 'count' | 'mood' | 'label' | 'online';

interface BadgeProps {
  variant?: Variant;
  label?: string;
  count?: number;
  color?: string;
  style?: ViewStyle;
}

export function Badge({ variant = 'label', label, count, color, style }: BadgeProps) {
  if (variant === 'new') {
    return (
      <View style={[{ backgroundColor: '#6B52E0', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }, style]}>
        <Text style={{ fontSize: 10, color: '#EEEEF8', fontFamily: 'Inter_600SemiBold', letterSpacing: 0.5 }}>
          NEW
        </Text>
      </View>
    );
  }

  if (variant === 'count') {
    const display = (count ?? 0) > 99 ? '99+' : String(count ?? 0);
    return (
      <View style={[{
        minWidth: 18, height: 18,
        borderRadius: 9,
        backgroundColor: '#6B52E0',
        paddingHorizontal: 4,
        alignItems: 'center',
        justifyContent: 'center',
      }, style]}>
        <Text style={{ fontSize: 10, color: '#EEEEF8', fontFamily: 'Inter_700Bold' }}>
          {display}
        </Text>
      </View>
    );
  }

  if (variant === 'online') {
    return (
      <View style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#4ADE80' }, style]} />
    );
  }

  if (variant === 'mood' && color) {
    return (
      <View style={[{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: color + '20',
        borderWidth: 1,
        borderColor: color + '60',
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 4,
      }, style]}>
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
        {label && (
          <Text style={{ fontSize: 11, color, fontFamily: 'Inter_500Medium' }}>
            {label}
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={[{
      backgroundColor: '#2E2E48',
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 3,
    }, style]}>
      <Text style={{ fontSize: 11, color: '#A0A0C0', fontFamily: 'Inter_500Medium' }}>
        {label}
      </Text>
    </View>
  );
}
