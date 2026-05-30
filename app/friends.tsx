import { useState, useCallback } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatePresence, MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import {
  useFriends,
  useIncomingFriendRequests,
  useSendFriendRequest,
  useAcceptFriendRequest,
  useDeclineFriendRequest,
} from '@hooks/useFriendships';
import { useShareInvite, useCopyInviteCode } from '@hooks/useInvite';
import { supabase } from '@lib/supabase';
import { FriendCard } from '@/components/friends/FriendCard';
import { FriendRequestCard } from '@/components/friends/FriendRequestCard';

type Tab = 'friends' | 'requests' | 'add';

export default function FriendsScreen() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('friends');
  const [copiedCode, setCopiedCode] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [codeResult, setCodeResult] = useState<{ id: string; username: string; display_name: string | null; avatar_emoji: string | null } | null>(null);
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeError, setCodeError] = useState('');

  const { friends, isLoading: friendsLoading } = useFriends();
  const { requests } = useIncomingFriendRequests();
  const { mutate: sendRequest, isPending: sending } = useSendFriendRequest();
  const { mutateAsync: acceptRequest } = useAcceptFriendRequest();
  const { mutateAsync: declineRequest } = useDeclineFriendRequest();
  const { share: shareInvite, code: inviteCode } = useShareInvite();
  const { copy: copyCode } = useCopyInviteCode();

  const lookupByCode = useCallback(async () => {
    const code = codeInput.trim().toUpperCase();
    if (!code) return;
    setCodeLoading(true);
    setCodeResult(null);
    setCodeError('');
    const { data, error } = await supabase
      .from('users')
      .select('id, username, display_name, avatar_emoji')
      .eq('invite_code', code)
      .single();
    setCodeLoading(false);
    if (error || !data) {
      setCodeError('no one found with that code');
    } else {
      setCodeResult(data);
    }
  }, [codeInput]);

  const handleCopyCode = async () => {
    const ok = await copyCode();
    if (ok) {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const TABS: { id: Tab; label: string; count?: number }[] = [
    { id: 'friends',  label: 'friends',  count: friends.length },
    { id: 'requests', label: 'requests', count: requests.length || undefined },
    { id: 'add',      label: 'add'       },
  ];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#08080F' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 20, paddingBottom: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
          <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
            <Text style={{ fontSize: 15, color: '#5A5A7A', fontFamily: 'Inter_400Regular' }}>
              ←
            </Text>
          </Pressable>
          <Text style={{ fontSize: 20, color: '#EEEEF8', fontFamily: 'Inter_700Bold', flex: 1, letterSpacing: -0.5 }}>
            your block
          </Text>
        </View>

        {/* Tab row */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <Pressable
                key={t.id}
                onPress={() => { setTab(t.id); Haptics.selectionAsync(); }}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 5,
                  paddingHorizontal: 16, paddingVertical: 8,
                  borderRadius: 20, borderWidth: 1.5,
                  borderColor: active ? '#8B76F0' : '#2E2E48',
                  backgroundColor: active ? '#1A1240' : 'transparent',
                }}
              >
                <Text style={{
                  fontSize: 13, fontFamily: active ? 'Inter_600SemiBold' : 'Inter_400Regular',
                  color: active ? '#A99BFF' : '#5A5A7A',
                }}>
                  {t.label}
                </Text>
                {t.count !== undefined && t.count > 0 && (
                  <View style={{
                    minWidth: 18, height: 18, borderRadius: 9,
                    backgroundColor: active ? '#6B52E0' : '#2E2E48',
                    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
                  }}>
                    <Text style={{ fontSize: 10, color: '#EEEEF8', fontFamily: 'Inter_700Bold' }}>
                      {t.count}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 40 }}
      >
        {/* ── Friends tab ─────────────────────────────────────── */}
        {tab === 'friends' && (
          <AnimatePresence>
            {friendsLoading ? (
              <MotiView
                key="loading"
                from={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ alignItems: 'center', paddingTop: 60 }}
              >
                <ActivityIndicator color="#6B52E0" />
              </MotiView>
            ) : friends.length === 0 ? (
              <MotiView
                key="empty"
                from={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', damping: 22, stiffness: 200 }}
                style={{ alignItems: 'center', paddingTop: 60, gap: 16 }}
              >
                <Text style={{ fontSize: 48 }}>🏠</Text>
                <Text style={{ fontSize: 18, color: '#EEEEF8', fontFamily: 'Inter_600SemiBold' }}>
                  your block is quiet
                </Text>
                <Text style={{ fontSize: 14, color: '#5A5A7A', fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 20 }}>
                  invite a friend to join{'\n'}and light up their window
                </Text>
                <Pressable
                  onPress={() => setTab('add')}
                  style={{ backgroundColor: '#6B52E0', borderRadius: 16, paddingHorizontal: 24, paddingVertical: 12, marginTop: 4 }}
                >
                  <Text style={{ color: '#EEEEF8', fontFamily: 'Inter_600SemiBold', fontSize: 15 }}>
                    add someone
                  </Text>
                </Pressable>
              </MotiView>
            ) : (
              <View key="list" style={{ gap: 8 }}>
                {friends.map((f, i) => (
                  <FriendCard
                    key={f.friendId}
                    friend={f}
                    index={i}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      router.push(`/board/user/${f.friendId}?name=${encodeURIComponent(f.displayName ?? f.username)}` as any);
                    }}
                  />
                ))}
              </View>
            )}
          </AnimatePresence>
        )}

        {/* ── Requests tab ────────────────────────────────────── */}
        {tab === 'requests' && (
          <View style={{ gap: 10 }}>
            {requests.length === 0 ? (
              <MotiView
                from={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ alignItems: 'center', paddingTop: 60, gap: 12 }}
              >
                <Text style={{ fontSize: 36 }}>📬</Text>
                <Text style={{ fontSize: 15, color: '#5A5A7A', fontFamily: 'Inter_400Regular' }}>
                  no pending requests
                </Text>
              </MotiView>
            ) : (
              <AnimatePresence>
                {requests.map((r, i) => (
                  <FriendRequestCard
                    key={r.id}
                    request={r}
                    index={i}
                    onAccept={() => acceptRequest({ requestId: r.id, requesterId: r.userId })}
                    onDecline={() => declineRequest(r.id)}
                  />
                ))}
              </AnimatePresence>
            )}
          </View>
        )}

        {/* ── Add tab ──────────────────────────────────────────── */}
        {tab === 'add' && (
          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 200 }}
            style={{ gap: 20 }}
          >
            {/* Invite code card */}
            <View style={{
              backgroundColor: '#12121C', borderRadius: 20,
              borderWidth: 1, borderColor: '#2E2E48',
              padding: 20, gap: 14,
            }}>
              <View style={{ gap: 4 }}>
                <Text style={{ fontSize: 13, color: '#5A5A7A', fontFamily: 'Inter_500Medium', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                  your invite code
                </Text>
                <Text style={{ fontSize: 12, color: '#3D3D5E', fontFamily: 'Inter_400Regular', lineHeight: 18 }}>
                  share this with someone you want to welcome to the block
                </Text>
              </View>

              {/* Code display */}
              <View style={{
                backgroundColor: '#0D0D14', borderRadius: 14,
                borderWidth: 1.5, borderColor: '#2E2E48',
                paddingHorizontal: 20, paddingVertical: 16,
                alignItems: 'center',
              }}>
                <Text style={{
                  fontSize: 26, color: '#A99BFF',
                  fontFamily: 'Inter_700Bold',
                  letterSpacing: 4,
                }}>
                  {inviteCode ?? '——'}
                </Text>
              </View>

              {/* Action buttons */}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable
                  onPress={handleCopyCode}
                  style={({ pressed }) => ({
                    flex: 1, borderRadius: 12, paddingVertical: 11, alignItems: 'center',
                    backgroundColor: copiedCode ? '#1A3A1A' : (pressed ? '#1A1A2E' : '#1E1E30'),
                    borderWidth: 1, borderColor: copiedCode ? '#3A7A3A' : '#2E2E48',
                  })}
                >
                  <Text style={{
                    fontSize: 13, fontFamily: 'Inter_500Medium',
                    color: copiedCode ? '#6BCB77' : '#7A7A9A',
                  }}>
                    {copiedCode ? '✓ copied' : 'copy code'}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={shareInvite}
                  style={({ pressed }) => ({
                    flex: 1, borderRadius: 12, paddingVertical: 11, alignItems: 'center',
                    backgroundColor: pressed ? '#5A40C0' : '#6B52E0',
                  })}
                >
                  <Text style={{ fontSize: 13, color: '#EEEEF8', fontFamily: 'Inter_600SemiBold' }}>
                    share invite
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Find by code divider */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: '#1E1E30' }} />
              <Text style={{ fontSize: 11, color: '#3D3D5E', fontFamily: 'Inter_400Regular', letterSpacing: 0.5 }}>
                OR ENTER THEIR CODE
              </Text>
              <View style={{ flex: 1, height: 1, backgroundColor: '#1E1E30' }} />
            </View>

            {/* Code input */}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{
                flex: 1, borderRadius: 14, borderWidth: 1.5, borderColor: '#2E2E48',
                backgroundColor: '#12121C', paddingHorizontal: 14,
                flexDirection: 'row', alignItems: 'center',
              }}>
                <TextInput
                  value={codeInput}
                  onChangeText={(t) => { setCodeInput(t); setCodeResult(null); setCodeError(''); }}
                  placeholder="friend's invite code"
                  placeholderTextColor="#3D3D5E"
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={10}
                  style={{
                    flex: 1, fontSize: 16, color: '#A99BFF',
                    fontFamily: 'Inter_700Bold', letterSpacing: 3,
                    paddingVertical: 14, padding: 0,
                  }}
                />
              </View>
              <Pressable
                onPress={lookupByCode}
                disabled={codeInput.trim().length < 4 || codeLoading}
                style={({ pressed }) => ({
                  borderRadius: 14, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: codeInput.trim().length >= 4 ? (pressed ? '#5A40C0' : '#6B52E0') : '#1E1E30',
                })}
              >
                {codeLoading
                  ? <ActivityIndicator size="small" color="#EEEEF8" />
                  : <Text style={{ fontSize: 13, color: '#EEEEF8', fontFamily: 'Inter_600SemiBold' }}>find</Text>}
              </Pressable>
            </View>

            {/* Code result */}
            {codeError ? (
              <Text style={{ fontSize: 13, color: '#5A5A7A', fontFamily: 'Inter_400Regular', textAlign: 'center' }}>
                {codeError}
              </Text>
            ) : codeResult ? (
              <MotiView
                from={{ opacity: 0, translateY: 6 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'spring', damping: 22, stiffness: 200 }}
              >
                <View style={{
                  flexDirection: 'row', alignItems: 'center',
                  backgroundColor: '#12121C', borderRadius: 16,
                  borderWidth: 1, borderColor: '#2E2E48',
                  padding: 12, gap: 12,
                }}>
                  <View style={{
                    width: 44, height: 44, borderRadius: 22,
                    backgroundColor: '#1A1A2E', borderWidth: 1.5, borderColor: '#2E2E48',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{ fontSize: 22 }}>{codeResult.avatar_emoji ?? '🌙'}</Text>
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ fontSize: 14, color: '#EEEEF8', fontFamily: 'Inter_600SemiBold' }}>
                      {codeResult.display_name ?? codeResult.username}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#5A5A7A', fontFamily: 'Inter_400Regular' }}>
                      @{codeResult.username}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => { sendRequest(codeResult!.id); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); setCodeResult(null); setCodeInput(''); }}
                    disabled={sending}
                    style={({ pressed }) => ({
                      borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8,
                      backgroundColor: pressed ? '#5A40C0' : '#6B52E0',
                    })}
                  >
                    <Text style={{ fontSize: 12, color: '#EEEEF8', fontFamily: 'Inter_600SemiBold' }}>add</Text>
                  </Pressable>
                </View>
              </MotiView>
            ) : null}
          </MotiView>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
