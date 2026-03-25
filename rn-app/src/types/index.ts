// ユーザー情報
export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  createdAt: number;
}

// 位置情報
export interface LocationData {
  latitude: number;
  longitude: number;
  timestamp: number;
}

// フレンドリクエスト
export interface FriendRequest {
  id: string;
  fromUid: string;
  toUid: string;
  fromDisplayName: string;
  fromEmail: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: number;
}

// フレンド情報（フレンドリスト内の各要素）
export interface Friend {
  uid: string;
  displayName: string;
  email: string;
}

// 合流セッション
export interface MeetingSession {
  id: string;
  userAUid: string;
  userBUid: string;
  userADest: LocationData | null;
  userBDest: LocationData | null;
  active: boolean;
  createdAt: number;
}

// ナビゲーション型定義
export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Main: undefined;
  SetDestination: {
    sessionId: string;
    /** 自分が userA か userB か */
    role: 'userA' | 'userB';
    currentLocation: LocationData;
  };
};

export type MainTabParamList = {
  Map: undefined;
  Friends: undefined;
};
