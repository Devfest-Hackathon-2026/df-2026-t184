// 太陽位置の計算（NOAA の近似式ベース・純粋関数）。
// 出典: NOAA Solar Calculations（https://gml.noaa.gov/grad/solcalc/solareqns.PDF）
// 日陰グリッドの時刻固定の事前計算と、画面での時刻表示に使う。

export type SolarPosition = {
  altitudeDeg: number; // 地平線からの仰角（正なら昼）
  azimuthDeg: number; // 北=0、東=90、南=180（時計回り）
};

const rad = Math.PI / 180;

// 太陽高度が0以下（夜間）は null を返す
export function solarPosition(dateUtc: Date, lat: number, lng: number): SolarPosition | null {
  const start = Date.UTC(dateUtc.getUTCFullYear(), 0, 0);
  const dayOfYear = Math.floor((dateUtc.getTime() - start) / 86400000);
  const fractionalYear = ((2 * Math.PI) / 365) * (dayOfYear - 1 + (dateUtc.getUTCHours() - 12) / 24);

  const eqTimeMin =
    229.18 *
    (0.000075 + 0.001868 * Math.cos(fractionalYear) - 0.032077 * Math.sin(fractionalYear) - 0.014615 * Math.cos(2 * fractionalYear) - 0.040849 * Math.sin(2 * fractionalYear));
  const declRad =
    0.006918 -
    0.399912 * Math.cos(fractionalYear) +
    0.070257 * Math.sin(fractionalYear) -
    0.006758 * Math.cos(2 * fractionalYear) +
    0.000907 * Math.sin(2 * fractionalYear) -
    0.002697 * Math.cos(3 * fractionalYear) +
    0.00148 * Math.sin(3 * fractionalYear);

  const minutesUtc = dateUtc.getUTCHours() * 60 + dateUtc.getUTCMinutes() + dateUtc.getUTCSeconds() / 60;
  const trueSolarTimeMin = (minutesUtc + eqTimeMin + 4 * lng) % 1440;
  const hourAngleDeg = trueSolarTimeMin / 4 - 180;
  const latRad = lat * rad;

  const cosZenith = Math.sin(latRad) * Math.sin(declRad) + Math.cos(latRad) * Math.cos(declRad) * Math.cos(hourAngleDeg * rad);
  const altitudeDeg = 90 - Math.acos(Math.min(1, Math.max(-1, cosZenith))) / rad;
  if (altitudeDeg <= 0) return null;

  const azRad = Math.atan2(
    Math.sin(hourAngleDeg * rad),
    Math.cos(hourAngleDeg * rad) * Math.sin(latRad) - Math.tan(declRad) * Math.cos(latRad),
  );
  // atan2 の結果は「南から西へ+」の約180°ずれがあるので北基準に直す
  const azimuthDeg = ((azRad / rad + 180) % 360 + 360) % 360;
  return { altitudeDeg, azimuthDeg };
}
