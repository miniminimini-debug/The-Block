import { View, Text, ScrollView, Pressable } from 'react-native';
import { ShelfObject, type ShelfObjectType } from './ShelfObject';

export interface ShelfItem {
  id: string;
  type: ShelfObjectType;
  label: string;
  emoji: string;
  badge?: string;
  isActive?: boolean;
  onPress: () => void;
}

interface ShelfRowProps {
  label: string;
  items: ShelfItem[];
  emptyText?: string;
  onNew?: () => void;
  badge?: string;
}

export function ShelfRow({ label, items, emptyText, onNew, badge }: ShelfRowProps) {
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{
            fontSize: 10,
            color: 'rgba(255,255,255,0.2)',
            fontFamily: 'Inter_600SemiBold',
            letterSpacing: 1.5,
            textTransform: 'uppercase',
          }}>
            {label}
          </Text>
          {badge && (
            <View style={{ backgroundColor: '#C84B6B', borderRadius: 7, paddingHorizontal: 5, paddingVertical: 1 }}>
              <Text style={{ fontSize: 9, color: '#FFF', fontFamily: 'Inter_700Bold' }}>{badge}</Text>
            </View>
          )}
        </View>
        {onNew && (
          <Pressable onPress={onNew}>
            <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontFamily: 'Inter_500Medium' }}>+ new</Text>
          </Pressable>
        )}
      </View>

      {/* Shelf surface */}
      <View style={{ position: 'relative' }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingBottom: 8 }}
        >
          {items.length === 0 && emptyText ? (
            <View style={{
              height: 130, width: 160,
              alignItems: 'center', justifyContent: 'center',
              borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
              borderRadius: 4, borderStyle: 'dashed',
            }}>
              <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.15)', fontFamily: 'Inter_400Regular', textAlign: 'center' }}>
                {emptyText}
              </Text>
            </View>
          ) : (
            items.map((item, i) => (
              <ShelfObject
                key={item.id}
                type={item.type}
                label={item.label}
                emoji={item.emoji}
                badge={item.badge}
                isActive={item.isActive}
                index={i}
                onPress={item.onPress}
              />
            ))
          )}
        </ScrollView>

        {/* Shelf board */}
        <View style={{
          height: 10,
          marginHorizontal: 8,
          backgroundColor: '#2A1F14',
          borderRadius: 2,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.5,
          shadowRadius: 3,
          elevation: 3,
        }} />
      </View>
    </View>
  );
}
