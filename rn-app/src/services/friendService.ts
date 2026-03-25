import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  query,
  where,
  setDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Friend, FriendRequest } from '../types';

// ─── フレンドリクエスト送信 ───────────────────────────────────────────────────

export async function sendFriendRequest(
  fromUid: string,
  fromDisplayName: string,
  fromEmail: string,
  toEmail: string
): Promise<void> {
  // 相手ユーザーをメールで検索
  const usersQ = query(collection(db, 'users'), where('email', '==', toEmail));
  const snap = await getDocs(usersQ);
  if (snap.empty) throw new Error('ユーザーが見つかりませんでした。');

  const toUser = snap.docs[0];
  const toUid = toUser.id;
  if (toUid === fromUid) throw new Error('自分自身にリクエストは送れません。');

  // 重複チェック
  const existQ = query(
    collection(db, 'friendRequests'),
    where('fromUid', '==', fromUid),
    where('toUid', '==', toUid),
    where('status', '==', 'pending')
  );
  const existSnap = await getDocs(existQ);
  if (!existSnap.empty) throw new Error('すでにリクエスト済みです。');

  await addDoc(collection(db, 'friendRequests'), {
    fromUid,
    toUid,
    fromDisplayName,
    fromEmail,
    status: 'pending',
    createdAt: serverTimestamp(),
  });
}

// ─── 受信済みリクエストのリアルタイム購読 ─────────────────────────────────────

export function subscribeToIncomingRequests(
  uid: string,
  callback: (requests: FriendRequest[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'friendRequests'),
    where('toUid', '==', uid),
    where('status', '==', 'pending')
  );
  return onSnapshot(q, (snap) => {
    const requests = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FriendRequest));
    callback(requests);
  });
}

// ─── フレンドリクエスト承認 ──────────────────────────────────────────────────

export async function acceptFriendRequest(requestId: string): Promise<void> {
  const reqRef = doc(db, 'friendRequests', requestId);
  const reqSnap = await getDoc(reqRef);
  if (!reqSnap.exists()) throw new Error('リクエストが見つかりません。');

  const { fromUid, toUid, fromDisplayName, fromEmail } = reqSnap.data() as FriendRequest;

  // 相手のプロフィールを取得
  const toUserSnap = await getDoc(doc(db, 'users', toUid));
  const toUserData = toUserSnap.data() ?? {};

  // 双方向でフレンド登録
  await Promise.all([
    setFriend(fromUid, toUid, toUserData.displayName ?? '', toUserData.email ?? ''),
    setFriend(toUid, fromUid, fromDisplayName, fromEmail),
    updateDoc(reqRef, { status: 'accepted' }),
  ]);
}

async function setFriend(
  uid: string,
  friendUid: string,
  displayName: string,
  email: string
): Promise<void> {
  await setDoc(doc(db, `friends/${uid}/list/${friendUid}`), { displayName, email }, { merge: true });
}

// ─── フレンドリクエスト拒否 ──────────────────────────────────────────────────

export async function rejectFriendRequest(requestId: string): Promise<void> {
  await updateDoc(doc(db, 'friendRequests', requestId), { status: 'rejected' });
}

// ─── フレンドリストのリアルタイム購読 ─────────────────────────────────────────

export function subscribeToFriends(
  uid: string,
  callback: (friends: Friend[]) => void
): Unsubscribe {
  const friendsRef = collection(db, `friends/${uid}/list`);
  return onSnapshot(friendsRef, (snap) => {
    const friends = snap.docs.map((d) => ({ uid: d.id, ...d.data() } as Friend));
    callback(friends);
  });
}
