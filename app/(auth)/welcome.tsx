import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: '#08080F' }}>
      <LinearGradient
        colors={['#08080F', '#0D0D14', '#1A1240']}
        locations={[0, 0.5, 1]}
        style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}
      />

      {/* Stars */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        {STARS.map((star, i) => (
          <MotiView
            key={i}
            from={{ opacity: 0 }}
            animate={{ opacity: star.opacity }}
            transition={{ type: 'timing', duration: 1000, delay: i * 40 }}
            style={{
              position: 'absolute',
              left: star.x,
              top: star.y,
              width: star.size,
              height: star.size,
              borderRadius: star.size,
              backgroundColor: '#C8C8E0',
            }}
          />
        ))}
      </View>

      {/* Title — centred inside the star field */}
      <MotiView
        from={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', damping: 20, stiffness: 150, delay: 400 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: '44%', alignItems: 'center', justifyContent: 'center' }}
      >
        <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 52, letterSpacing: -2, color: '#EEEEF8' }}>
          your block
        </Text>
        <View style={{ width: 40, height: 2, backgroundColor: '#6B52E0', borderRadius: 999, marginTop: 10 }} />
      </MotiView>

      {/* Bottom content */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 24, paddingBottom: insets.bottom + 40, gap: 16 }}>
        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ type: 'timing', duration: 600, delay: 700 }}
          style={{ alignItems: 'center', marginBottom: 4 }}
        >
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 15, lineHeight: 24, color: '#A0A0C0', textAlign: 'center' }}>
            send polaroids to the people{'\n'}who actually matter.
          </Text>
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 18, stiffness: 130, delay: 1000 }}
          style={{ gap: 10 }}
        >
          {/* Create account */}
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/(auth)/signup' as any); }}
            style={{ borderRadius: 20, overflow: 'hidden' }}
          >
            <LinearGradient
              colors={['#8B76F0', '#4C32C0']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={{ paddingVertical: 18, alignItems: 'center' }}
            >
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 17, color: '#EEEEF8' }}>create account</Text>
            </LinearGradient>
          </Pressable>

          {/* Sign in */}
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/(auth)/login'); }}
            style={{ paddingVertical: 16, alignItems: 'center', borderRadius: 20, borderWidth: 1.5, borderColor: '#2E2E48', backgroundColor: '#12121C' }}
          >
            <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 16, color: '#7A7A9A' }}>sign in</Text>
          </Pressable>
        </MotiView>
      </View>
    </View>
  );
}

// Deterministic star layout
const STARS = Array.from({ length: 40 }, (_, i) => ({
  x: `${(Math.sin(i * 137.508) * 0.5 + 0.5) * 95}%`,
  y: `${(Math.cos(i * 137.508) * 0.5 + 0.5) * 55}%`,
  size: (Math.sin(i * 23.1) * 0.5 + 0.5) * 2 + 0.5,
  opacity: (Math.sin(i * 57.3) * 0.5 + 0.5) * 0.5 + 0.1,
}));
