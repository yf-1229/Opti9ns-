import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Modal,
  FlatList,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../contexts/AuthContext';
import { RootStackParamList, Friend, MeetingSession, LocationData } from '../types';
import { subscribeToFriends } from '../services/friendService';
import {
  createMeetingSession,
  subscribeToSession,
  endMeetingSession,
} from '../services/meetingService';
import { publishLocation, subscribeToLocation } from '../services/locationService';
import { calcMeetingInfo } from '../utils/meetingAlgorithm';
import { openGoogleMapsRoute } from '../utils/googleMaps';
import { logout } from '../services/authService';

const UPDATE_INTERVAL_MS = 5000;

export default function MapScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const mapRef = useRef<MapView>(null);

  // 位置情報
  const [myLocation, setMyLocation] = useState<LocationData | null>(null);
  const [friendLocation, setFriendLocation] = useState<LocationData | null>(null);

  // フレンド・セッション
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [session, setSession] = useState<MeetingSession | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showFriendPicker, setShowFriendPicker] = useState(false);

  const [loading, setLoading] = useState(true);

  // ─── 位置情報取得 ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) return;

    let locationSub: Location.LocationSubscription | null = null;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('位置情報の権限が必要です', '設定から位置情報へのアクセスを許可してください。');
        setLoading(false);
        return;
      }

      // 初期位置取得
      const initial = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const loc: LocationData = {
        latitude: initial.coords.latitude,
        longitude: initial.coords.longitude,
        timestamp: initial.timestamp,
      };
      setMyLocation(loc);
      setLoading(false);

      // リアルタイム更新
      locationSub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: UPDATE_INTERVAL_MS,
          distanceInterval: 10,
        },
        (pos) => {
          const updated: LocationData = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            timestamp: pos.timestamp,
          };
          setMyLocation(updated);
          publishLocation(user.uid, updated).catch(() => {});
        }
      );
    })();

    return () => {
      locationSub?.remove();
    };
  }, [user]);

  // ─── フレンドリスト購読 ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) return;
    return subscribeToFriends(user.uid, setFriends);
  }, [user]);

  // ─── セッション・相手位置購読 ─────────────────────────────────────────────────

  useEffect(() => {
    if (!sessionId) return;
    return subscribeToSession(sessionId, setSession);
  }, [sessionId]);

  useEffect(() => {
    if (!selectedFriend) {
      setFriendLocation(null);
      return;
    }
    return subscribeToLocation(selectedFriend.uid, setFriendLocation);
  }, [selectedFriend]);

  // ─── 合流ポイント計算 ─────────────────────────────────────────────────────────

  const myRole: 'userA' | 'userB' | null =
    session && user
      ? session.userAUid === user.uid
        ? 'userA'
        : 'userB'
      : null;

  const myDest = session && myRole ? (myRole === 'userA' ? session.userADest : session.userBDest) : null;
  const friendDest = session && myRole ? (myRole === 'userA' ? session.userBDest : session.userADest) : null;

  const meetingInfo =
    myLocation && friendLocation
      ? calcMeetingInfo(
          myLocation,
          myDest ?? null,
          friendLocation,
          friendDest ?? null
        )
      : null;

  // ─── フレンド選択 → セッション開始 ───────────────────────────────────────────

  const handleSelectFriend = useCallback(
    async (friend: Friend) => {
      if (!user) return;
      setShowFriendPicker(false);
      setSelectedFriend(friend);
      try {
        const id = await createMeetingSession(user.uid, friend.uid);
        setSessionId(id);
      } catch (e: unknown) {
        Alert.alert('エラー', e instanceof Error ? e.message : String(e));
      }
    },
    [user]
  );

  // ─── セッション終了 ───────────────────────────────────────────────────────────

  const handleEndSession = useCallback(async () => {
    if (!sessionId) return;
    await endMeetingSession(sessionId);
    setSessionId(null);
    setSession(null);
    setSelectedFriend(null);
    setFriendLocation(null);
  }, [sessionId]);

  // ─── Googleマップで経路表示 ──────────────────────────────────────────────────

  const handleNavigate = () => {
    if (!meetingInfo) return;
    openGoogleMapsRoute(meetingInfo.meetingPoint.latitude, meetingInfo.meetingPoint.longitude);
  };

  // ─── 目的地設定画面へ ─────────────────────────────────────────────────────────

  const handleSetDestination = () => {
    if (!sessionId || !myRole || !myLocation) return;
    navigation.navigate('SetDestination', {
      sessionId,
      role: myRole,
      currentLocation: myLocation,
    });
  };

  // ─── ログアウト ───────────────────────────────────────────────────────────────

  const handleLogout = () => {
    Alert.alert('ログアウト', 'ログアウトしますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: 'ログアウト',
        style: 'destructive',
        onPress: async () => {
          if (sessionId) await endMeetingSession(sessionId).catch(() => {});
          await logout();
        },
      },
    ]);
  };

  // ─── 地図の初期中心 ──────────────────────────────────────────────────────────

  const initialRegion = myLocation
    ? {
        latitude: myLocation.latitude,
        longitude: myLocation.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }
    : {
        latitude: 35.6812,
        longitude: 139.7671,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>位置情報を取得中...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ヘッダーアクション */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => setShowFriendPicker(true)}>
          <Ionicons name="people" size={16} color="#fff" />
          <Text style={styles.headerButtonText}>
            {selectedFriend ? selectedFriend.displayName : 'フレンドを選択'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#888" />
        </TouchableOpacity>
      </View>

      {/* マップ */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={initialRegion}
        showsUserLocation={false}
        showsMyLocationButton={false}
      >
        {/* 自分の現在地 */}
        {myLocation && (
          <Marker
            coordinate={{ latitude: myLocation.latitude, longitude: myLocation.longitude }}
            title="現在地"
            description={user?.displayName ?? '自分'}
            pinColor="#4CAF50"
          />
        )}

        {/* 自分の目的地 */}
        {myDest && (
          <Marker
            coordinate={{ latitude: myDest.latitude, longitude: myDest.longitude }}
            title="自分の目的地"
            pinColor="#2196F3"
          />
        )}

        {/* フレンドの現在地 */}
        {friendLocation && (
          <Marker
            coordinate={{ latitude: friendLocation.latitude, longitude: friendLocation.longitude }}
            title={`${selectedFriend?.displayName ?? 'フレンド'}の現在地`}
            pinColor="#FF9800"
          />
        )}

        {/* フレンドの目的地 */}
        {friendDest && (
          <Marker
            coordinate={{ latitude: friendDest.latitude, longitude: friendDest.longitude }}
            title={`${selectedFriend?.displayName ?? 'フレンド'}の目的地`}
            pinColor="#FF5722"
          />
        )}

        {/* 合流ポイント */}
        {meetingInfo && (
          <Marker
            coordinate={{
              latitude: meetingInfo.meetingPoint.latitude,
              longitude: meetingInfo.meetingPoint.longitude,
            }}
            title="合流ポイント"
            description={`自分: ${Math.round(meetingInfo.distanceFromA)}m / フレンド: ${Math.round(meetingInfo.distanceFromB)}m`}
            pinColor="#9C27B0"
          />
        )}

        {/* 自分のルート（現在地→合流ポイント）*/}
        {myLocation && meetingInfo && (
          <Polyline
            coordinates={[
              { latitude: myLocation.latitude, longitude: myLocation.longitude },
              {
                latitude: meetingInfo.meetingPoint.latitude,
                longitude: meetingInfo.meetingPoint.longitude,
              },
            ]}
            strokeColor="#4CAF50"
            strokeWidth={2}
            lineDashPattern={[6, 4]}
          />
        )}

        {/* フレンドのルート（現在地→合流ポイント）*/}
        {friendLocation && meetingInfo && (
          <Polyline
            coordinates={[
              { latitude: friendLocation.latitude, longitude: friendLocation.longitude },
              {
                latitude: meetingInfo.meetingPoint.latitude,
                longitude: meetingInfo.meetingPoint.longitude,
              },
            ]}
            strokeColor="#FF9800"
            strokeWidth={2}
            lineDashPattern={[6, 4]}
          />
        )}
      </MapView>

      {/* 下部パネル */}
      {selectedFriend && session && (
        <View style={styles.panel}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.panelRow}>
              {/* 目的地設定 */}
              <TouchableOpacity style={styles.panelButton} onPress={handleSetDestination}>
                <Ionicons name="flag" size={18} color="#fff" />
                <Text style={styles.panelButtonText}>目的地を設定</Text>
              </TouchableOpacity>

              {/* Googleマップで経路 */}
              {meetingInfo && (
                <TouchableOpacity style={[styles.panelButton, styles.mapsButton]} onPress={handleNavigate}>
                  <Ionicons name="navigate" size={18} color="#fff" />
                  <Text style={styles.panelButtonText}>Googleマップで経路</Text>
                </TouchableOpacity>
              )}

              {/* セッション終了 */}
              <TouchableOpacity style={[styles.panelButton, styles.endButton]} onPress={handleEndSession}>
                <Ionicons name="close-circle" size={18} color="#fff" />
                <Text style={styles.panelButtonText}>終了</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* 合流情報 */}
          {meetingInfo && (
            <View style={styles.meetingInfo}>
              <Text style={styles.meetingTitle}>🤝 合流ポイント</Text>
              <Text style={styles.meetingDetail}>
                自分まで約{Math.round(meetingInfo.distanceFromA / 10) * 10}m ／{' '}
                {selectedFriend.displayName}まで約{Math.round(meetingInfo.distanceFromB / 10) * 10}m
              </Text>
              {!myDest && (
                <Text style={styles.hint}>💡 目的地を設定するとより正確な合流点が計算されます</Text>
              )}
            </View>
          )}

          {!friendLocation && (
            <Text style={styles.waitingText}>
              ⏳ {selectedFriend.displayName}の位置情報を待っています...
            </Text>
          )}
        </View>
      )}

      {/* フレンド選択モーダル */}
      <Modal visible={showFriendPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>フレンドを選択</Text>
              <TouchableOpacity onPress={() => setShowFriendPicker(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={friends}
              keyExtractor={(item) => item.uid}
              ListEmptyComponent={
                <Text style={styles.emptyText}>
                  フレンドがいません。{'\n'}「フレンド」タブから追加してください。
                </Text>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.friendItem}
                  onPress={() => handleSelectFriend(item)}
                >
                  <Ionicons name="person-circle" size={40} color="#4CAF50" />
                  <View>
                    <Text style={styles.friendName}>{item.displayName}</Text>
                    <Text style={styles.friendEmail}>{item.email}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#666', fontSize: 14 },
  header: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 8,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  headerButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  logoutButton: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  map: { flex: 1 },
  panel: {
    backgroundColor: '#fff',
    padding: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  panelRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  panelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  mapsButton: { backgroundColor: '#1976D2' },
  endButton: { backgroundColor: '#f44336' },
  panelButtonText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  meetingInfo: {
    backgroundColor: '#f3e5f5',
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
  },
  meetingTitle: { fontSize: 14, fontWeight: '700', color: '#7B1FA2', marginBottom: 4 },
  meetingDetail: { fontSize: 13, color: '#555' },
  hint: { fontSize: 11, color: '#888', marginTop: 4 },
  waitingText: { fontSize: 13, color: '#888', marginTop: 8, textAlign: 'center' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '60%',
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#333' },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  friendName: { fontSize: 15, fontWeight: '600', color: '#333' },
  friendEmail: { fontSize: 12, color: '#888' },
  emptyText: { textAlign: 'center', color: '#aaa', padding: 32, fontSize: 13, lineHeight: 22 },
});
