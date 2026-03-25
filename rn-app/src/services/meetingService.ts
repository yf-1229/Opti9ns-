import {
  collection,
  doc,
  addDoc,
  updateDoc,
  query,
  where,
  getDocs,
  onSnapshot,
  serverTimestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { MeetingSession, LocationData } from '../types';

// ─── セッション作成 ──────────────────────────────────────────────────────────

export async function createMeetingSession(
  userAUid: string,
  userBUid: string
): Promise<string> {
  // 既存のアクティブセッションを確認
  const existing = await getActiveMeetingSession(userAUid, userBUid);
  if (existing) return existing.id;

  const docRef = await addDoc(collection(db, 'sessions'), {
    userAUid,
    userBUid,
    userADest: null,
    userBDest: null,
    active: true,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

// ─── アクティブセッション取得 ─────────────────────────────────────────────────

export async function getActiveMeetingSession(
  userAUid: string,
  userBUid: string
): Promise<MeetingSession | null> {
  // A→B 方向
  const q1 = query(
    collection(db, 'sessions'),
    where('userAUid', '==', userAUid),
    where('userBUid', '==', userBUid),
    where('active', '==', true)
  );
  // B→A 方向
  const q2 = query(
    collection(db, 'sessions'),
    where('userAUid', '==', userBUid),
    where('userBUid', '==', userAUid),
    where('active', '==', true)
  );

  const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
  const allDocs = [...snap1.docs, ...snap2.docs];
  if (allDocs.length === 0) return null;

  const d = allDocs[0];
  return { id: d.id, ...d.data() } as MeetingSession;
}

// ─── セッションのリアルタイム購読 ─────────────────────────────────────────────

export function subscribeToSession(
  sessionId: string,
  callback: (session: MeetingSession | null) => void
): Unsubscribe {
  return onSnapshot(doc(db, 'sessions', sessionId), (snap) => {
    callback(snap.exists() ? ({ id: snap.id, ...snap.data() } as MeetingSession) : null);
  });
}

// ─── 目的地の更新 ─────────────────────────────────────────────────────────────

export async function updateDestination(
  sessionId: string,
  role: 'userA' | 'userB',
  destination: LocationData
): Promise<void> {
  const field = role === 'userA' ? 'userADest' : 'userBDest';
  await updateDoc(doc(db, 'sessions', sessionId), {
    [field]: {
      latitude: destination.latitude,
      longitude: destination.longitude,
      timestamp: Date.now(),
    },
  });
}

// ─── セッション終了 ───────────────────────────────────────────────────────────

export async function endMeetingSession(sessionId: string): Promise<void> {
  await updateDoc(doc(db, 'sessions', sessionId), { active: false });
}
