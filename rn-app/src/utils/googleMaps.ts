import { Linking, Platform, Alert } from 'react-native';

/**
 * Googleマップを開き、指定した合流ポイントまでのルートを表示する。
 *
 * ① iOS: Googleマップアプリ（comgooglemaps://）→ 未インストール時はブラウザへフォールバック
 * ② Android: geo: URI → 未インストール時はブラウザへフォールバック
 * ③ ブラウザ（共通）: https://www.google.com/maps/dir/
 */
export async function openGoogleMapsRoute(
  latitude: number,
  longitude: number,
  label = '合流ポイント'
): Promise<void> {
  const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=walking`;

  const nativeUrl =
    Platform.OS === 'ios'
      ? `comgooglemaps://?daddr=${latitude},${longitude}&directionsmode=walking`
      : `geo:${latitude},${longitude}?q=${latitude},${longitude}(${encodeURIComponent(label)})`;

  try {
    const supported = await Linking.canOpenURL(nativeUrl);
    await Linking.openURL(supported ? nativeUrl : webUrl);
  } catch {
    Alert.alert(
      'マップを開けません',
      'Googleマップがインストールされていないか、リンクを開けませんでした。',
      [{ text: 'ブラウザで開く', onPress: () => Linking.openURL(webUrl) }, { text: 'キャンセル' }]
    );
  }
}
