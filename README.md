# Opti9ns Map App

Android Jetpack Compose アプリ — 現在地を取得してOpenStreetMapに表示します。

## 機能

- 📍 **現在地取得**: Google Fused Location Provider API (GPS + ネットワーク) を使用
- 🗺️ **OpenStreetMap 表示**: osmdroid ライブラリによる地図表示
- 🔄 **リアルタイム更新**: 5秒ごとに位置情報を更新
- 📌 **マーカー表示**: 現在地にマーカーを配置
- 🔒 **パーミッション管理**: Accompanist Permissions で位置情報権限をハンドリング
- 📊 **位置情報表示**: 緯度・経度・精度を画面下部にオーバーレイ表示

## スクリーンショット

| 権限リクエスト | 地図表示 |
|---|---|
| 起動時に位置情報の権限を要求 | 取得後、現在地を地図上にマーカーで表示 |

## セットアップ

### 必要環境

- Android Studio Hedgehog (2023.1.1) 以降
- JDK 17 以降
- Android SDK 34
- minSdk 24 (Android 7.0 以降)

### ビルド方法

```bash
# リポジトリをクローン
git clone https://github.com/yf-1229/Opti9ns-.git
cd Opti9ns-

# デバッグビルド
./gradlew assembleDebug

# APK は app/build/outputs/apk/debug/app-debug.apk に出力されます
```

## プロジェクト構成

```
app/
├── src/main/
│   ├── AndroidManifest.xml          # 権限 (INTERNET, ACCESS_FINE_LOCATION 等)
│   └── java/com/yf1229/opti9ns/
│       ├── MainActivity.kt          # エントリポイント・権限ハンドリング
│       ├── MapScreen.kt             # OSM地図 Composable (AndroidView + osmdroid)
│       ├── LocationViewModel.kt     # 位置情報ViewModel (StateFlow)
│       └── ui/theme/Theme.kt        # Material3 テーマ
```

## 使用技術

| ライブラリ | バージョン | 用途 |
|---|---|---|
| Jetpack Compose BOM | 2024.06.00 | UI フレームワーク |
| Material3 | - | デザインシステム |
| osmdroid | 6.1.18 | OpenStreetMap 描画 |
| Google Play Services Location | 21.3.0 | Fused Location Provider |
| Accompanist Permissions | 0.34.0 | Compose 権限管理 |
| Lifecycle ViewModel Compose | 2.8.3 | ViewModel 統合 |

## アーキテクチャ

```
MainActivity
    └── LocationPermissionScreen (権限チェック)
            └── MapScreen (地図表示)
                    ├── AndroidView(MapView) ← osmdroid
                    └── LocationViewModel ← StateFlow<LocationState>
                                └── FusedLocationProviderClient
```

## 権限

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

