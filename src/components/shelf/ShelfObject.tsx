import { View, Text, Pressable } from 'react-native';
import { MotiView } from 'moti';

export type ShelfObjectType = 'roll' | 'capsule' | 'pass' | 'scrapbook' | 'board' | 'recap';

interface ShelfObjectProps {
  type: ShelfObjectType;
  label: string;
  emoji: string;
  badge?: string;
  isActive?: boolean;
  index?: number;
  onPress: () => void;
}

const SPINE_COLORS: Record<ShelfObjectType, string[]> = {
  roll: ['#3A2A10', '#5A4020', '#2A1A08'],
  capsule: ['#1A1240', '#2A1A60', '#0A0820'],
  pass: ['#2A1A30', '#3A2A40', '#1A0A20'],
  scrapbook: ['#1A2A1A', '#2A3A2A', '#0A1A0A'],
  board: ['#2A1A0A', '#3A2A18', '#1A0A04'],
  recap: ['#1A1A2A', '#2A2A3A', '#0A0A1A'],
};

const BOOK_WIDTH = 42;
const BOOK_HEIGHT = 130;

export function ShelfObject({ type, label, emoji, badge, isActive, index = 0, onPress }: ShelfObjectProps) {
  const colors = SPINE_COLORS[type];

  return (
    <MotiView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'spring', damping: 22, stiffness: 200, delay: index * 60 }}
    >
      <Pressable
        onPress={onPress}
        style={{ alignItems: 'center', gap: 6 }}
      >
        {/* Badge */}
        {badge && (
          <View style={{
            position: 'absolute', top: -6, right: -6, zIndex: 10,
            backgroundColor: '#C84B6B', borderRadius: 8,
            paddingHorizontal: 5, paddingVertical: 2,
          }}>
            <Text style={{ fontSize: 9, color: '#FFF', fontFamily: 'Inter_700Bold' }}>{badge}</Text>
          </View>
        )}

        {/* Book spine */}
        <View style={{
          width: BOOK_WIDTH,
          height: BOOK_HEIGHT,
          backgroundColor: colors[0],
          borderRadius: 3,
          borderLeftWidth: 4,
          borderLeftColor: colors[1],
          shadowColor: '#000',
          shadowOffset: { width: 3, height: 4 },
          shadowOpacity: 0.4,
          shadowRadius: 4,
          elevation: 5,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          overflow: 'hidden',
        }}>
          {/* Active indicator stripe */}
          {isActive && (
            <View style={{
              position: 'absolute',
              top: 0, left: 0, right: 0,
              height: 3,
              backgroundColor: '#A99BFF',
            }} />
          )}

          {/* Emoji */}
          <Text style={{ fontSize: 18 }}>{emoji}</Text>

          {/* Vertical label */}
          <Text
            style={{
              fontSize: 9,
              color: 'rgba(255,255,255,0.6)',
              fontFamily: 'Inter_600SemiBold',
              transform: [{ rotate: '90deg' }],
              width: BOOK_HEIGHT - 24,
              textAlign: 'center',
              letterSpacing: 0.5,
            }}
            numberOfLines={1}
          >
            {label.toUpperCase()}
          </Text>

          {/* Bottom accent */}
          <View style={{
            position: 'absolute',
            bottom: 0, left: 0, right: 0,
            height: 8,
            backgroundColor: colors[2],
          }} />
        </View>

        {/* Label below */}
        <Text style={{
          fontSize: 9,
          color: 'rgba(255,255,255,0.35)',
          fontFamily: 'Inter_400Regular',
          maxWidth: BOOK_WIDTH + 8,
          textAlign: 'center',
        }} numberOfLines={2}>
          {label}
        </Text>
      </Pressable>
    </MotiView>
  );
}
