import { ref, set, onValue, off, DataSnapshot } from 'firebase/database';
import { rtdb } from '../config/firebase';
import { LocationData } from '../types';

/**
 * 自分の現在地を Firebase Realtime Database に書き込む。
 * 友達側はこの値をリアルタイムで購読して「P2P的」に位置情報を受け取る。
 */
export function publishLocation(uid: string, location: LocationData) {
  const locationRef = ref(rtdb, `locations/${uid}`);
  return set(locationRef, {
    latitude: location.latitude,
    longitude: location.longitude,
    timestamp: Date.now(),
  });
}

/**
 * 指定ユーザーの位置情報をリアルタイム購読する。
 * 返却された unsubscribe 関数を呼ぶと購読を解除できる。
 */
export function subscribeToLocation(
  uid: string,
  callback: (location: LocationData | null) => void
): () => void {
  const locationRef = ref(rtdb, `locations/${uid}`);
  const handler = (snapshot: DataSnapshot) => {
    callback(snapshot.exists() ? (snapshot.val() as LocationData) : null);
  };
  onValue(locationRef, handler);
  return () => off(locationRef, 'value', handler);
}
