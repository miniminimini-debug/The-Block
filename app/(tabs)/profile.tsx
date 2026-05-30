import { useState } from 'react';
import {
  View, Text, Pressable, ScrollView, StyleSheet,
  Platform, Switch, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView, AnimatePresence } from 'moti';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useAuthStore } from '@stores/auth.store';
import { isDemoMode } from '@lib/demo';
import { useCopyInviteCode } from '@hooks/useInvite';
import { useTheme } from '@hooks/useTheme';
import { useThemeOverrideStore } from '@stores/themeOverride.store';
import { THEMES, type TimeOfDay } from '@lib/theme';
import { cancelAllPostNotifications } from '@lib/notifications';
import { supabase } from '@lib/supabase';
import { useMutation, useQueryClient } from '@tanstack/react-query';


function SettingRow({
  emoji, label, sub, value, onToggle, onPress, destructive = false, index = 0,
}: {
  emoji: string; label: string; sub?: string;
  value?: boolean; onToggle?: (v: boolean) => void;
  onPress?: () => void; destructive?: boolean; index?: number;
}) {
  return (
    <MotiView
      from={{ opacity: 0, translateX: -8 }}
      animate={{ opacity: 1, translateX: 0 }}
      transition={{ type: 'spring', damping: 22, stiffness: 200, delay: index * 35 }}
    >
      <Pressable
        onPress={onPress}
        disabled={!onPress && onToggle === undefined}
        style={({ pressed }) => ({
          flexDirection: 'row', alignItems: 'center',
          backgroundColor: pressed && onPress ? '#1A1A2E' : '#12121C',
          borderRadius: 16, borderWidth: 1, borderColor: '#2E2E48',
          paddingHorizontal: 16, paddingVertical: 13, gap: 12,
        })}
      >
        <Text style={{ fontSize: 18, width: 28 }}>{emoji}</Text>
        <View style={{ flex: 1, gap: sub ? 2 : 0 }}>
          <Text style={{ fontSize: 15, color: destructive ? '#C05050' : '#EEEEF8', fontFamily: 'Inter_400Regular' }}>
            {label}
          </Text>
          {sub && <Text style={{ fontSize: 11, color: '#5A5A7A', fontFamily: 'Inter_400Regular' }}>{sub}</Text>}
        </View>
        {onToggle !== undefined && value !== undefined ? (
          <Switch
            value={value}
            onValueChange={(v) => { Haptics.selectionAsync(); onToggle(v); }}
            trackColor={{ false: '#2E2E48', true: '#6B52E0' }}
            thumbColor="#EEEEF8"
          />
        ) : onPress ? (
          <Text style={{ fontSize: 18, color: '#3D3D5E' }}>›</Text>
        ) : null}
      </Pressable>
    </MotiView>
  );
}

function SectionLabel({ title }: { title: string }) {
  return (
    <Text style={{ fontSize: 10, color: '#3D3D5E', fontFamily: 'Inter_600SemiBold', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4, marginTop: 4 }}>
      {title}
    </Text>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const qc = useQueryClient();

  const { copy: copyCode, code: inviteCode } = useCopyInviteCode();
  const themeOverride = useThemeOverrideStore((s) => s.override);
  const setThemeOverride = useThemeOverrideStore((s) => s.setOverride);

  const [codeCopied, setCodeCopied] = useState(false);
  const [localAvatarUri, setLocalAvatarUri] = useState<string | null>(user?.avatar_url ?? null);

  // Settings state
  const [notifPosts,      setNotifPosts]      = useState(true);
  const [notifReactions,  setNotifReactions]  = useState(true);
  const [notifFriends,    setNotifFriends]    = useState(true);
  const [privateMode,     setPrivateMode]     = useState(false);

  const { mutate: deleteAccount } = useMutation({
    mutationFn: async () => {
      if (!user) return;
      await supabase.from('users').delete().eq('id', user.id);
      await cancelAllPostNotifications();
    },
    onSuccess: async () => { await signOut(); qc.clear(); },
  });

  const handlePickPhoto = async () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e: any) => {
        const file = e.target.files?.[0];
        if (file) setLocalAvatarUri(URL.createObjectURL(file));
      };
      input.click();
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      setLocalAvatarUri(result.assets[0].uri);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleCopyCode = async () => {
    const ok = await copyCode();
    if (ok) { setCodeCopied(true); setTimeout(() => setCodeCopied(false), 2000); }
  };

  const handleSignOut = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await cancelAllPostNotifications();
    await signOut();
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'delete account',
      'this will permanently delete your profile, photos, and friendships. this cannot be undone.',
      [
        { text: 'cancel', style: 'cancel' },
        { text: 'delete forever', style: 'destructive', onPress: () => deleteAccount() },
      ],
    );
  };

  const rawBirthday = isDemoMode() ? '1999-06-15' : (user?.birthday ?? null);
  const birthdayDisplay = rawBirthday
    ? `born ${new Date(rawBirthday + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    : null;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: insets.bottom + 100 }}
      >
        {/* Polaroid */}
        <View style={{ alignItems: 'center', marginBottom: 28 }}>
          <MotiView
            from={{ opacity: 0, scale: 0.92, translateY: 10 }}
            animate={{ opacity: 1, scale: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 18, stiffness: 160, delay: 60 }}
            style={[styles.polaroid, { transform: [{ rotate: '-1.5deg' }] }]}
          >
            <Pressable onPress={handlePickPhoto} style={styles.photoArea}>
              {localAvatarUri ? (
                <Image source={{ uri: localAvatarUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
              ) : (
                <View style={[StyleSheet.absoluteFill, styles.photoPlaceholder]}>
                  <Text style={{ fontSize: 52 }}>{user?.avatar_emoji ?? '🌙'}</Text>
                </View>
              )}
              <View style={styles.photoEditOverlay}>
                <Text style={{ fontSize: 11, color: '#FFF', fontFamily: 'Inter_600SemiBold', opacity: 0.85 }}>
                  {localAvatarUri ? 'change' : 'add photo'}
                </Text>
              </View>
            </Pressable>
            <View style={styles.handwritingStrip}>
              <Text style={styles.handwritingName}>{user?.display_name ?? user?.username ?? 'you'}</Text>
              {birthdayDisplay && <Text style={styles.handwritingSub}>{birthdayDisplay}</Text>}
            </View>
          </MotiView>
        </View>

        {/* Invite code — always visible */}
        <MotiView
          from={{ opacity: 0, translateY: 8 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 22, stiffness: 200, delay: 100 }}
          style={{ paddingHorizontal: 20, marginBottom: 16 }}
        >
          <View style={styles.codeCard}>
            <Text style={{ fontSize: 11, color: theme.textDim, fontFamily: 'Inter_500Medium', letterSpacing: 0.5, textTransform: 'uppercase' }}>
              your invite code
            </Text>
            <Text style={{ fontSize: 12, color: theme.textDimmer, fontFamily: 'Inter_400Regular', lineHeight: 18 }}>
              share this to welcome someone to the block
            </Text>
            <View style={styles.codeDisplay}>
              <Text style={{ fontSize: 28, color: theme.accentLight, fontFamily: 'Inter_700Bold', letterSpacing: 4 }}>
                {inviteCode ?? '——'}
              </Text>
            </View>
            <Pressable
              onPress={handleCopyCode}
              style={({ pressed }) => [
                styles.copyBtn,
                codeCopied ? styles.copyBtnDone : (pressed ? { backgroundColor: theme.accentDim } : {}),
              ]}
            >
              <Text style={{ fontSize: 14, color: codeCopied ? '#6BCB77' : theme.accentLight, fontFamily: 'Inter_600SemiBold' }}>
                {codeCopied ? '✓ copied' : 'tap to copy'}
              </Text>
            </Pressable>
          </View>
        </MotiView>

        {/* Settings button */}
        <MotiView
          from={{ opacity: 0, translateY: 8 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 22, stiffness: 200, delay: 180 }}
          style={{ paddingHorizontal: 20 }}
        >
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/settings'); }}
            style={({ pressed }) => [{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              backgroundColor: pressed ? theme.surfaceElevated : theme.surface,
              borderRadius: 18, borderWidth: 1, borderColor: theme.border,
              paddingHorizontal: 18, paddingVertical: 16,
            }]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Text style={{ fontSize: 20 }}>⚙️</Text>
              <Text style={{ fontSize: 15, color: theme.text, fontFamily: 'Inter_500Medium' }}>settings</Text>
            </View>
            <Text style={{ fontSize: 18, color: theme.textDim }}>›</Text>
          </Pressable>
        </MotiView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  polaroid: {
    backgroundColor: '#F5F0E8', padding: 12, paddingBottom: 16,
    borderRadius: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45, shadowRadius: 16, elevation: 12, width: 220,
  },
  photoArea: { width: '100%', aspectRatio: 1, backgroundColor: '#D8D0C4', overflow: 'hidden', borderRadius: 1 },
  photoPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#E8E0D4' },
  photoEditOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingVertical: 6, backgroundColor: 'rgba(0,0,0,0.38)', alignItems: 'center',
  },
  handwritingStrip: { paddingTop: 12, paddingBottom: 4, alignItems: 'center', gap: 2 },
  handwritingName: { fontSize: 17, color: '#2A2820', fontFamily: 'Inter_400Regular', fontStyle: 'italic', letterSpacing: 0.3 },
  handwritingSub: { fontSize: 11, color: '#8A8070', fontFamily: 'Inter_400Regular', fontStyle: 'italic' },
  tabChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 9, borderRadius: 20, borderWidth: 1, borderColor: '#2E2E48', backgroundColor: 'transparent',
  },
  tabLabel: { fontSize: 11, color: '#5A5A7A', fontFamily: 'Inter_500Medium' },
  codeCard: { backgroundColor: '#12121C', borderRadius: 20, borderWidth: 1, borderColor: '#2E2E48', padding: 20, gap: 12 },
  codeDisplay: {
    backgroundColor: '#0D0D14', borderRadius: 14, borderWidth: 1.5, borderColor: '#2E2E48',
    paddingHorizontal: 20, paddingVertical: 14, alignItems: 'center',
  },
  copyBtn: { borderRadius: 14, paddingVertical: 12, alignItems: 'center', backgroundColor: '#1A1240', borderWidth: 1, borderColor: '#3A2E70' },
  copyBtnDone: { backgroundColor: '#0D1F0D', borderColor: '#3A7A3A' },
});
