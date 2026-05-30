import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0D0D14' },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="welcome" options={{ animation: 'fade' }} />
      <Stack.Screen name="login" />
      <Stack.Screen name="phone" />
      <Stack.Screen name="verify" />
      <Stack.Screen name="onboarding/invite" />
      <Stack.Screen name="onboarding/username" />
      <Stack.Screen name="onboarding/avatar" />
      <Stack.Screen name="onboarding/room" />
    </Stack>
  );
}
