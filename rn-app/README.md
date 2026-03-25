# Opti9ns — React Native App

友達とリアルタイムで位置情報を共有し、最適な合流ポイントを見つけるアプリです。

## 機能

| # | 機能 | 詳細 |
|---|------|------|
| ① | **フレンド機能** | メールアドレスでフレンドを検索・リクエスト送信・承認 |
| ② | **リアルタイム位置共有** | Firebase Realtime Database を介して双方向にリアルタイム位置情報を送受信（P2P的通信） |
| ③ | **合流ポイント探索** | 両ユーザーの現在地と目的地を考慮し、迂回コストが最小になる合流点を解析的に算出 |
| ④ | **合流ポイント表示** | マップ上に合流ポイントとそれぞれの距離を表示 |
| ⑤ | **Googleマップ連携** | 合流ポイントまでの経路をGoogleマップアプリで開く（iOS/Android対応） |

## セットアップ

### 1. 依存パッケージのインストール

```bash
cd rn-app
npm install
```

### 2. Firebase プロジェクトの作成

1. [Firebase Console](https://console.firebase.google.com/) でプロジェクトを作成
2. 以下のサービスを有効化:
   - **Authentication** → メール/パスワード認証を有効化
   - **Firestore Database** → 作成してルールを設定
   - **Realtime Database** → 作成してルールを設定
3. ウェブアプリを追加し、設定値を取得

### 3. Firebase 設定を入力

`src/config/firebase.ts` の `firebaseConfig` に取得した設定値を入力してください。

```typescript
const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_AUTH_DOMAIN',
  databaseURL: 'YOUR_DATABASE_URL',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_STORAGE_BUCKET',
  messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
  appId: 'YOUR_APP_ID',
};
```

### 4. Firebase セキュリティルール

**Firestore Rules:**
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == uid;
    }
    match /friends/{uid}/list/{friendUid} {
      allow read, write: if request.auth.uid == uid;
    }
    match /friendRequests/{reqId} {
      allow read: if request.auth.uid == resource.data.fromUid
                  || request.auth.uid == resource.data.toUid;
      allow create: if request.auth.uid == request.resource.data.fromUid;
      allow update: if request.auth.uid == resource.data.toUid;
    }
    match /sessions/{sessionId} {
      allow read, write: if request.auth.uid == resource.data.userAUid
                         || request.auth.uid == resource.data.userBUid;
      allow create: if request.auth != null;
    }
  }
}
```

**Realtime Database Rules:**
```json
{
  "rules": {
    "locations": {
      "$uid": {
        ".read": "auth != null",
        ".write": "auth.uid === $uid"
      }
    }
  }
}
```

### 5. Google Maps API キー（任意）

`app.json` の `YOUR_IOS_GOOGLE_MAPS_API_KEY` / `YOUR_ANDROID_GOOGLE_MAPS_API_KEY` に
[Google Cloud Console](https://console.cloud.google.com/) で発行したAPIキーを入力すると、
地図が正しく表示されます。Expo Go での開発時は不要です。

### 6. アプリを起動

```bash
# Expo Go で動作確認（最も簡単）
npm start

# Android 実機/エミュレーター
npm run android

# iOS 実機/シミュレーター
npm run ios
```

## アーキテクチャ

```
App.tsx
└── AuthProvider (Firebase Auth 状態管理)
    └── AppNavigator
        ├── [未認証] LoginScreen / RegisterScreen
        └── [認証済] Bottom Tabs
            ├── MapScreen        ... 地図・合流ポイント表示
            ├── FriendsScreen    ... フレンド管理
            └── SetDestinationScreen (Modal) ... 目的地設定

src/
├── config/firebase.ts         Firebase 初期化
├── types/index.ts             型定義
├── contexts/AuthContext.tsx   認証コンテキスト
├── navigation/AppNavigator.tsx ナビゲーション定義
├── screens/                   各画面
├── services/
│   ├── authService.ts         ログイン・登録・ログアウト
│   ├── locationService.ts     Firebase RTDB への位置情報送受信
│   ├── friendService.ts       フレンド管理 (Firestore)
│   └── meetingService.ts      合流セッション管理 (Firestore)
└── utils/
    ├── meetingAlgorithm.ts    合流ポイント探索アルゴリズム
    └── googleMaps.ts          Googleマップ連携
```

## 合流ポイント探索アルゴリズム

両ユーザーのルート（現在地→目的地の直線）を2本の線分として扱い、
2線分間の最近接点を解析的に求めます。

```
P(t) = posA + t*(destA - posA),  t ∈ [0,1]
Q(s) = posB + s*(destB - posB),  s ∈ [0,1]
```

`|P(t) - Q(s)|²` を最小化する `t, s` を連立方程式で解き、
`P(t)` と `Q(s)` の中点を合流ポイントとして返します。
目的地が未設定の場合は両者の現在地の中点を返します。

## マップの凡例

| マーカー色 | 意味 |
|-----------|------|
| 🟢 緑 | 自分の現在地 |
| 🔵 青 | 自分の目的地 |
| 🟠 橙 | フレンドの現在地 |
| 🔴 赤橙 | フレンドの目的地 |
| 🟣 紫 | 合流ポイント |
