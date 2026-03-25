/**
 * 合流ポイント探索アルゴリズム
 *
 * ユーザーAとユーザーBそれぞれの「現在地→目的地」のルート（直線近似）を考え、
 * 2本の線分間の最近接点を求めることで「両者の寄り道コストが最小になる合流点」を算出する。
 *
 * 【アルゴリズム詳細】
 *   P(t) = posA + t*(destA - posA),  t ∈ [0,1]  ... Aのルート
 *   Q(s) = posB + s*(destB - posB),  s ∈ [0,1]  ... Bのルート
 *   目的: |P(t) - Q(s)|² を最小化する t, s を解析的に求める。
 *   解: t = (b*e - c*d) / denom,  s = (a*e - b*d) / denom
 *   合流点 M = (P(t) + Q(s)) / 2
 *
 * 目的地が未設定の場合は両者の現在地の中点を返す。
 */

export interface LatLng {
  latitude: number;
  longitude: number;
}

/** ハーバーサイン距離（メートル） */
export function haversineDistance(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLng = ((b.longitude - a.longitude) * Math.PI) / 180;
  const sin2Lat = Math.sin(dLat / 2) ** 2;
  const sin2Lng = Math.sin(dLng / 2) ** 2;
  const x =
    sin2Lat +
    Math.cos((a.latitude * Math.PI) / 180) *
      Math.cos((b.latitude * Math.PI) / 180) *
      sin2Lng;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

/** 2点の中点 */
function midpoint(a: LatLng, b: LatLng): LatLng {
  return {
    latitude: (a.latitude + b.latitude) / 2,
    longitude: (a.longitude + b.longitude) / 2,
  };
}

/**
 * 2線分間の最近接点を解析的に求め、合流点を返す。
 *
 * @param posA  ユーザーAの現在地
 * @param destA ユーザーAの目的地（null の場合は中点を返す）
 * @param posB  ユーザーBの現在地
 * @param destB ユーザーBの目的地（null の場合は中点を返す）
 * @returns 合流ポイント
 */
export function findMeetingPoint(
  posA: LatLng,
  destA: LatLng | null,
  posB: LatLng,
  destB: LatLng | null
): LatLng {
  // 目的地が片方でも未設定なら単純中点
  if (!destA || !destB) {
    return midpoint(posA, posB);
  }

  // 方向ベクトル
  const da = { lat: destA.latitude - posA.latitude, lng: destA.longitude - posA.longitude };
  const db = { lat: destB.latitude - posB.latitude, lng: destB.longitude - posB.longitude };
  // r = posA - posB
  const r = { lat: posA.latitude - posB.latitude, lng: posA.longitude - posB.longitude };

  const a = da.lat * da.lat + da.lng * da.lng; // da·da
  const b = da.lat * db.lat + da.lng * db.lng; // da·db
  const c = db.lat * db.lat + db.lng * db.lng; // db·db
  const d = r.lat * da.lat + r.lng * da.lng;   // r·da
  const e = r.lat * db.lat + r.lng * db.lng;   // r·db

  const denom = a * c - b * b;

  let t: number;
  let s: number;

  if (Math.abs(denom) < 1e-12) {
    // 2路線がほぼ平行 → t=0 固定、s はAの出発点からBの路線へ射影
    t = 0;
    s = Math.abs(c) > 1e-12 ? (b * 0 - e) / c : 0;
  } else {
    t = (b * e - c * d) / denom;
    s = (a * e - b * d) / denom;
  }

  // パラメーターを [0,1] にクランプ（ルート範囲内に制限）
  t = Math.max(0, Math.min(1, t));
  s = Math.max(0, Math.min(1, s));

  const pointA: LatLng = {
    latitude: posA.latitude + t * da.lat,
    longitude: posA.longitude + t * da.lng,
  };
  const pointB: LatLng = {
    latitude: posB.latitude + s * db.lat,
    longitude: posB.longitude + s * db.lng,
  };

  // 両ルート上の最近接点の中点を合流ポイントとする
  return midpoint(pointA, pointB);
}

/** 合流ポイントまでの概算距離情報（表示用） */
export interface MeetingInfo {
  meetingPoint: LatLng;
  distanceFromA: number; // メートル
  distanceFromB: number; // メートル
}

export function calcMeetingInfo(
  posA: LatLng,
  destA: LatLng | null,
  posB: LatLng,
  destB: LatLng | null
): MeetingInfo {
  const meetingPoint = findMeetingPoint(posA, destA, posB, destB);
  return {
    meetingPoint,
    distanceFromA: haversineDistance(posA, meetingPoint),
    distanceFromB: haversineDistance(posB, meetingPoint),
  };
}
