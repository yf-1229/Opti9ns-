import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { Friend, FriendRequest } from '../types';
import {
  sendFriendRequest,
  subscribeToIncomingRequests,
  acceptFriendRequest,
  rejectFriendRequest,
  subscribeToFriends,
} from '../services/friendService';

export default function FriendsScreen() {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [emailInput, setEmailInput] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsubFriends = subscribeToFriends(user.uid, setFriends);
    const unsubRequests = subscribeToIncomingRequests(user.uid, setRequests);
    return () => {
      unsubFriends();
      unsubRequests();
    };
  }, [user]);

  const handleSendRequest = async () => {
    if (!user || !emailInput.trim()) return;
    setSending(true);
    try {
      await sendFriendRequest(
        user.uid,
        user.displayName ?? user.email ?? 'ユーザー',
        user.email ?? '',
        emailInput.trim()
      );
      Alert.alert('送信完了', 'フレンドリクエストを送りました。');
      setEmailInput('');
    } catch (e: unknown) {
      Alert.alert('エラー', e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  };

  const handleAccept = async (requestId: string) => {
    try {
      await acceptFriendRequest(requestId);
    } catch (e: unknown) {
      Alert.alert('エラー', e instanceof Error ? e.message : String(e));
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      await rejectFriendRequest(requestId);
    } catch (e: unknown) {
      Alert.alert('エラー', e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <View style={styles.container}>
      {/* フレンド追加 */}
      <View style={styles.addSection}>
        <Text style={styles.sectionTitle}>フレンドを追加</Text>
        <View style={styles.row}>
          <TextInput
            style={styles.input}
            placeholder="相手のメールアドレス"
            value={emailInput}
            onChangeText={setEmailInput}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={[styles.sendButton, sending && styles.disabled]}
            onPress={handleSendRequest}
            disabled={sending}
          >
            {sending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="person-add" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* 受信中のリクエスト */}
      {requests.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>届いたリクエスト ({requests.length})</Text>
          {requests.map((req) => (
            <View key={req.id} style={styles.requestCard}>
              <View style={styles.requestInfo}>
                <Ionicons name="person-circle-outline" size={36} color="#4CAF50" />
                <View style={styles.requestText}>
                  <Text style={styles.requestName}>{req.fromDisplayName}</Text>
                  <Text style={styles.requestEmail}>{req.fromEmail}</Text>
                </View>
              </View>
              <View style={styles.requestActions}>
                <TouchableOpacity
                  style={styles.acceptButton}
                  onPress={() => handleAccept(req.id)}
                >
                  <Ionicons name="checkmark" size={18} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.rejectButton}
                  onPress={() => handleReject(req.id)}
                >
                  <Ionicons name="close" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* フレンドリスト */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>フレンド ({friends.length})</Text>
        <FlatList
          data={friends}
          keyExtractor={(item) => item.uid}
          ListEmptyComponent={
            <Text style={styles.emptyText}>フレンドがいません。上のフォームから追加しましょう。</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.friendCard}>
              <Ionicons name="person-circle" size={40} color="#4CAF50" />
              <View style={styles.friendInfo}>
                <Text style={styles.friendName}>{item.displayName}</Text>
                <Text style={styles.friendEmail}>{item.email}</Text>
              </View>
            </View>
          )}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  addSection: { backgroundColor: '#fff', padding: 16, marginBottom: 8 },
  section: { backgroundColor: '#fff', padding: 16, marginBottom: 8, flex: 1 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#fafafa',
  },
  sendButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.6 },
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  requestInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  requestText: { flex: 1 },
  requestName: { fontSize: 15, fontWeight: '600', color: '#333' },
  requestEmail: { fontSize: 12, color: '#888' },
  requestActions: { flexDirection: 'row', gap: 8 },
  acceptButton: { backgroundColor: '#4CAF50', padding: 8, borderRadius: 6 },
  rejectButton: { backgroundColor: '#f44336', padding: 8, borderRadius: 6 },
  friendCard: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  friendInfo: { flex: 1 },
  friendName: { fontSize: 15, fontWeight: '600', color: '#333' },
  friendEmail: { fontSize: 12, color: '#888' },
  emptyText: { color: '#aaa', textAlign: 'center', marginTop: 20, fontSize: 13 },
});
