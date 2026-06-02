import { useState } from 'react';
import { Tabs } from 'expo-router';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRevealStore } from '@stores/reveal.store';

const IC = 26;

function HomeIcon({ active }: { active: boolean }) {
  const c = active ? '#A99BFF' : '#5A5A7A';
  return (
    <View style={{ width: IC, height: IC, alignItems: 'center', justifyContent: 'center' }}>
      {/* Roof triangle */}
      <View style={{
        width: 0, height: 0,
        borderStyle: 'solid',
        borderLeftWidth: 11, borderRightWidth: 11, borderBottomWidth: 10,
        borderLeftColor: 'transparent', borderRightColor: 'transparent',
        borderBottomColor: c,
        marginBottom: -1,
      }} />
      {/* Body — no door cutout */}
      <View style={{ width: 16, height: 12, backgroundColor: c, opacity: 0.75, borderBottomLeftRadius: 2, borderBottomRightRadius: 2 }} />
    </View>
  );
}

function ShelfIcon({ active }: { active: boolean }) {
  const c = active ? '#A99BFF' : '#5A5A7A';
  // Three upright books of similar heights, side by side
  const books = [
    { h: 17, w: 6, opacity: 1.0 },
    { h: 15, w: 5, opacity: 0.75 },
    { h: 16, w: 6, opacity: 0.9 },
  ];
  return (
    <View style={{ width: IC, height: IC, alignItems: 'center', justifyContent: 'flex-end' }}>
      {/* Shelf base line */}
      <View style={{ position: 'absolute', bottom: 1, left: 2, right: 2, height: 1.5, backgroundColor: c, borderRadius: 1, opacity: 0.6 }} />
      {/* Books */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, paddingBottom: 2 }}>
        {books.map((b, i) => (
          <View key={i} style={{ width: b.w, height: b.h, borderRadius: 1.5, backgroundColor: c, opacity: b.opacity }} />
        ))}
      </View>
    </View>
  );
}

function CameraIcon({ active }: { active: boolean }) {
  const c = active ? '#A99BFF' : '#5A5A7A';
  const bg = active ? '#1A1240' : '#08080F';
  return (
    <View style={{ width: IC, height: IC, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ alignSelf: 'flex-start', marginLeft: 5, width: 8, height: 4, borderTopLeftRadius: 2, borderTopRightRadius: 2, backgroundColor: c, marginBottom: -1 }} />
      <View style={{ width: 24, height: 16, borderRadius: 4, backgroundColor: c, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: c, opacity: 0.5 }} />
        </View>
      </View>
    </View>
  );
}

function CorkIcon({ active }: { active: boolean }) {
  const c = active ? '#A99BFF' : '#5A5A7A';
  return (
    <View style={{ width: IC, height: IC, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 22, height: 20, borderRadius: 4, borderWidth: 2, borderColor: c }}>
        <View style={{ position: 'absolute', top: 3, left: 3, width: 5, height: 5, borderRadius: 3, backgroundColor: c }} />
        <View style={{ position: 'absolute', top: 3, right: 3, width: 4, height: 4, borderRadius: 2, backgroundColor: c, opacity: 0.7 }} />
        <View style={{ position: 'absolute', bottom: 3, left: 7, width: 4, height: 4, borderRadius: 2, backgroundColor: c, opacity: 0.55 }} />
      </View>
    </View>
  );
}

function ProfileIcon({ active }: { active: boolean }) {
  const c = active ? '#A99BFF' : '#5A5A7A';
  return (
    <View style={{ width: IC, height: IC, alignItems: 'center', justifyContent: 'center', gap: 3 }}>
      <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: c }} />
      <View style={{ width: 20, height: 8, borderTopLeftRadius: 10, borderTopRightRadius: 10, backgroundColor: c, opacity: 0.65 }} />
    </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const darkroomCount = useRevealStore((s) => s.darkroomCount);
  const [barWidth, setBarWidth] = useState(0);

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={({ state, navigation }) => {
        const itemWidth = barWidth > 0 ? barWidth / state.routes.length : 0;

        return (
          <View
            onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
            style={[styles.tabBar, { paddingBottom: insets.bottom + 10 }]}
          >
            {state.routes.map((route, index) => {
              const isFocused = state.index === index;

              const onPress = () => {
                if (!isFocused) {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  navigation.navigate(route.name);
                }
              };

              const icon = () => {
                switch (route.name) {
                  case 'index':    return <HomeIcon active={isFocused} />;
                  case 'memories': return (
                    <View>
                      <ShelfIcon active={isFocused} />
                      {darkroomCount > 0 && (
                        <View style={{ position: 'absolute', top: -4, right: -4, minWidth: 14, height: 14, borderRadius: 7, backgroundColor: '#6B52E0', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 }}>
                          <Text style={{ fontSize: 8, color: '#EEEEF8', fontFamily: 'Inter_700Bold' }}>{darkroomCount > 9 ? '9+' : darkroomCount}</Text>
                        </View>
                      )}
                    </View>
                  );
                  case 'camera':   return <CameraIcon active={isFocused} />;
                  case 'cork':     return <CorkIcon active={isFocused} />;
                  case 'profile':  return <ProfileIcon active={isFocused} />;
                  default:         return null;
                }
              };

              return (
                <Pressable
                  key={route.key}
                  onPress={onPress}
                  style={{ width: itemWidth || undefined, flex: itemWidth ? undefined : 1, alignItems: 'center', justifyContent: 'center' }}
                >
                  <MotiView
                    animate={{ scale: isFocused ? 1.08 : 1 }}
                    transition={{ type: 'spring', damping: 15, stiffness: 300 }}
                    style={{
                      width: 44, height: 44,
                      borderRadius: 13,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isFocused ? '#1A1240' : 'transparent',
                    }}
                  >
                    {icon()}
                  </MotiView>
                </Pressable>
              );
            })}
          </View>
        );
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="memories" />
      <Tabs.Screen name="camera" />
      <Tabs.Screen name="cork" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#12121C',
    borderTopWidth: 1,
    borderTopColor: '#2E2E48',
    paddingTop: 10,
  },
});
