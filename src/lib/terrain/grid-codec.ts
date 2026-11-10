// 事前計算グリッドの JSON 形式と符号化。
// 値は base64 の Int16（標高: dm 単位）/ Uint16（日陰: 時刻ごとのビット）で持つ。
// ブラウザと Node の両方で動くよう Buffer/btoa に依存しない実装にしている。

export type ElevationGrid = {
  cellMeters: number;
  originLat: number; // 南西端セルの南西角
  originLng: number;
  cols: number;
  rows: number;
  noData: number;
  data: Int16Array; // dm 単位、行優先・南→北
};

// 日陰グリッドのセル値は Uint16。bit i が times[i] の日陰、bit15 が「評価不能」（地面標高なし等）
export const SHADE_MAX_TIMES = 15;
export const SHADE_UNEVALUABLE = 0x8000;

export type ShadeGrid = {
  cellMeters: number;
  originLat: number;
  originLng: number;
  cols: number;
  rows: number;
  times: { label: string; at: string }[]; // times[i] がビット i に対応（最大 SHADE_MAX_TIMES 個）
  data: Uint16Array; // 行優先・南→北
};

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

export function uint8ToBase64(a: Uint8Array): string {
  let out = "";
  for (let i = 0; i < a.length; i += 3) {
    const b0 = a[i];
    const b1 = i + 1 < a.length ? a[i + 1] : 0;
    const b2 = i + 2 < a.length ? a[i + 2] : 0;
    out += B64[b0 >> 2] + B64[((b0 & 3) << 4) | (b1 >> 4)];
    out += i + 1 < a.length ? B64[((b1 & 15) << 2) | (b2 >> 6)] : "=";
    out += i + 2 < a.length ? B64[b2 & 63] : "=";
  }
  return out;
}

export function base64ToUint8(s: string): Uint8Array {
  const lut = new Map<string, number>([...B64].map((c, i) => [c, i]));
  const body = s.replace(/=+$/, "");
  const len = Math.floor((body.length * 3) / 4);
  const out = new Uint8Array(len);
  let j = 0;
  for (let i = 0; i < body.length; i += 4) {
    const c0 = lut.get(body[i])!;
    const c1 = lut.get(body[i + 1]) ?? 0;
    const c2 = body[i + 2] !== undefined ? (lut.get(body[i + 2]) ?? 0) : 0;
    const c3 = body[i + 3] !== undefined ? (lut.get(body[i + 3]) ?? 0) : 0;
    if (j < len) out[j++] = (c0 << 2) | (c1 >> 4);
    if (j < len) out[j++] = ((c1 & 15) << 4) | (c2 >> 2);
    if (j < len) out[j++] = ((c2 & 3) << 6) | c3;
  }
  return out;
}

export function int16ToBase64(a: Int16Array): string {
  const bytes = new Uint8Array(a.length * 2);
  for (let i = 0; i < a.length; i++) {
    const v = a[i] & 0xffff;
    bytes[i * 2] = v & 0xff;
    bytes[i * 2 + 1] = v >> 8;
  }
  return uint8ToBase64(bytes);
}

export function base64ToInt16(s: string): Int16Array {
  const bytes = base64ToUint8(s);
  const out = new Int16Array(bytes.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = (bytes[i * 2] | (bytes[i * 2 + 1] << 8)) << 16 >> 16;
  }
  return out;
}

export function uint16ToBase64(a: Uint16Array): string {
  const bytes = new Uint8Array(a.length * 2);
  for (let i = 0; i < a.length; i++) {
    bytes[i * 2] = a[i] & 0xff;
    bytes[i * 2 + 1] = a[i] >> 8;
  }
  return uint8ToBase64(bytes);
}

export function base64ToUint16(s: string): Uint16Array {
  const bytes = base64ToUint8(s);
  const out = new Uint16Array(bytes.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = bytes[i * 2] | (bytes[i * 2 + 1] << 8);
  }
  return out;
}

export function encodeElevationGrid(g: ElevationGrid, source: string): string {
  return JSON.stringify({
    format: "yorimichi-elevation-v1",
    source,
    cellMeters: g.cellMeters,
    originLat: g.originLat,
    originLng: g.originLng,
    cols: g.cols,
    rows: g.rows,
    noData: g.noData,
    unit: "dm",
    dataB64: int16ToBase64(g.data),
  });
}

export function decodeElevationGrid(json: string): ElevationGrid {
  const o = JSON.parse(json);
  if (o.format !== "yorimichi-elevation-v1" || o.unit !== "dm") throw new Error(`不明な標高グリッド形式: ${o.format}`);
  const data = base64ToInt16(o.dataB64);
  if (data.length !== o.cols * o.rows) throw new Error("標高グリッドのサイズが合いません");
  return { cellMeters: o.cellMeters, originLat: o.originLat, originLng: o.originLng, cols: o.cols, rows: o.rows, noData: o.noData, data };
}

export function encodeShadeGrid(g: ShadeGrid, source: string): string {
  if (g.times.length > SHADE_MAX_TIMES) throw new Error(`日陰グリッドの時刻は最大 ${SHADE_MAX_TIMES} 個です: ${g.times.length}`);
  return JSON.stringify({
    format: "yorimichi-shade-v2",
    source,
    cellMeters: g.cellMeters,
    originLat: g.originLat,
    originLng: g.originLng,
    cols: g.cols,
    rows: g.rows,
    times: g.times,
    dataB64: uint16ToBase64(g.data),
  });
}

export function decodeShadeGrid(json: string): ShadeGrid {
  const o = JSON.parse(json);
  if (o.format !== "yorimichi-shade-v2") throw new Error(`不明な日陰グリッド形式: ${o.format}`);
  if (!Array.isArray(o.times) || o.times.length > SHADE_MAX_TIMES) throw new Error("日陰グリッドの時刻数が不正です");
  const data = base64ToUint16(o.dataB64);
  if (data.length !== o.cols * o.rows) throw new Error("日陰グリッドのサイズが合いません");
  return { cellMeters: o.cellMeters, originLat: o.originLat, originLng: o.originLng, cols: o.cols, rows: o.rows, times: o.times, data };
}
