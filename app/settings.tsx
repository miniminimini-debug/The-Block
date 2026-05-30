import { useState } from 'react';
import { View, Text, Pressable, ScrollView, Switch, Alert, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '@stores/auth.store';
import { supabase } from '@lib/supabase';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cancelAllPostNotifications } from '@lib/notifications';

// ─── Setting row ──────────────────────────────────────────────────────────────

function SettingRow({
  emoji,
  label,
  sub,
  value,
  onToggle,
  onPress,
  destructive = false,
  index = 0,
}: {
  emoji: string;
  label: string;
  sub?: string;
  value?: boolean;
  onToggle?: (v: boolean) => void;
  onPress?: () => void;
  destructive?: boolean;
  index?: number;
}) {
  return (
    <MotiView
      from={{ opacity: 0, translateX: -8 }}
      animate={{ opacity: 1, translateX: 0 }}
      transition={{ type: 'spring', damping: 22, stiffness: 200, delay: index * 40 }}
    >
      <Pressable
        onPress={onPress}
        disabled={!onPress && onToggle === undefined}
        style={({ pressed }) => ({
          flexDirection: 'row', alignItems: 'center',
          backgroundColor: pressed && onPress ? '#1A1A2E' : '#12121C',
          borderRadius: 16, borderWidth: 1, borderColor: '#2E2E48',
          paddingHorizontal: 16, paddingVertical: 13,
          gap: 12,
        })}
      >
        <Text style={{ fontSize: 18, width: 28 }}>{emoji}</Text>
        <View style={{ flex: 1, gap: sub ? 2 : 0 }}>
          <Text style={{
            fontSize: 15,
            color: destructive ? '#C05050' : '#EEEEF8',
            fontFamily: 'Inter_400Regular',
          }}>
            {label}
          </Text>
          {sub && (
            <Text style={{ fontSize: 11, color: '#5A5A7A', fontFamily: 'Inter_400Regular' }}>
              {sub}
            </Text>
          )}
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

// ─── Section ──────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.sectionLabel}>{title}</Text>
      {children}
    </View>
  );
}

// ─── SettingsScreen ───────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const qc = useQueryClient();

  const [notifPosts, setNotifPosts] = useState(true);
  const [notifReactions, setNotifReactions] = useState(true);
  const [notifFriends, setNotifFriends] = useState(true);
  const [privateMode, setPrivateMode] = useState(false);

  const { mutate: deleteAccount, isPending: deleting } = useMutation({
    mutationFn: async () => {
      if (!user) return;
      // Delete user data (cascade handles children)
      await supabase.from('users').delete().eq('id', user.id);
      await cancelAllPostNotifications();
    },
    onSuccess: async () => {
      await signOut();
      qc.clear();
    },
  });

  const handleDeleteAccount = () => {
    Alert.alert(
      'delete account',
      'this will permanently delete your profile, photos, and friendships. this cannot be undone.',
      [
        { text: 'cancel', style: 'cancel' },
        {
          text: 'delete forever',
          style: 'destructive',
          onPress: () => deleteAccount(),
        },
      ],
    );
  };

  const handleSignOut = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await cancelAllPostNotifications();
    await signOut();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <Text style={styles.title}>settings</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 40, gap: 24 }}
      >
        {/* Account */}
        <Section title="account">
          <View style={styles.accountCard}>
            <View style={styles.accountAvatar}>
              <Text style={{ fontSize: 24 }}>{user?.avatar_emoji ?? '🌙'}</Text>
            </View>
            <View style={{ gap: 2 }}>
              <Text style={styles.accountName}>{user?.display_name ?? user?.username}</Text>
              <Text style={styles.accountSub}>@{user?.username} · {user?.room_type ?? 'bedroom'}</Text>
            </View>
          </View>
        </Section>

        {/* Notifications */}
        <Section title="notifications">
          <SettingRow
            emoji="📷" label="new photos" sub="when a photo from a friend is ready"
            value={notifPosts} onToggle={setNotifPosts} index={0}
          />
          <SettingRow
            emoji="✨" label="reactions" sub="when someone reacts to your photo"
            value={notifReactions} onToggle={setNotifReactions} index={1}
          />
          <SettingRow
            emoji="👥" label="friend requests"
            value={notifFriends} onToggle={setNotifFriends} index={2}
          />
        </Section>

        {/* Privacy */}
        <Section title="privacy">
          <SettingRow
            emoji="🔒" label="private mode" sub="only accepted friends can see you"
            value={privateMode} onToggle={setPrivateMode} index={0}
          />
          <SettingRow emoji="🗑️" label="clear my roll" sub="delete all received photos" onPress={() => {}} index={1} />
        </Section>

        {/* About */}
        <Section title="about">
          <SettingRow emoji="💬" label="give me feedback" onPress={() => {}} index={0} />
          <SettingRow emoji="📋" label="privacy policy" onPress={() => {}} index={1} />
          <SettingRow emoji="📄" label="terms of service" onPress={() => {}} index={2} />
          <View style={[styles.versionRow]}>
            <Text style={styles.versionText}>the block · v0.1.0</Text>
          </View>
        </Section>

        {/* Danger zone */}
        <Section title="danger zone">
          <SettingRow
            emoji="🚪" label="sign out"
            onPress={handleSignOut}
            index={0}
          />
          <SettingRow
            emoji="💣" label="delete account"
            sub="permanently remove everything"
            onPress={handleDeleteAccount}
            destructive
            index={1}
          />
        </Section>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#08080F' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12, marginBottom: 4,
  },
  backText: { fontSize: 20, color: '#5A5A7A', width: 36 },
  title: { fontSize: 18, color: '#EEEEF8', fontFamily: 'Inter_700Bold' },
  sectionLabel: {
    fontSize: 10, color: '#3D3D5E',
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 1, textTransform: 'uppercase',
    marginBottom: 4,
  },
  accountCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#12121C', borderRadius: 16,
    borderWidth: 1, borderColor: '#2E2E48',
    padding: 14, marginBottom: 4,
  },
  accountAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#1A1240', borderWidth: 1.5, borderColor: '#3A2E70',
    alignItems: 'center', justifyContent: 'center',
  },
  accountName: { fontSize: 16, color: '#EEEEF8', fontFamily: 'Inter_600SemiBold' },
  accountSub: { fontSize: 12, color: '#5A5A7A', fontFamily: 'Inter_400Regular' },
  versionRow: { alignItems: 'center', paddingVertical: 10 },
  versionText: { fontSize: 11, color: '#2E2E48', fontFamily: 'Inter_400Regular' },
});
