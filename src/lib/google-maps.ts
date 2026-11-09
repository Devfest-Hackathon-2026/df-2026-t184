// Google Maps JavaScript API を1回だけ読み込む。
// キーはブラウザに公開される前提なので、Cloud Console で
// 「HTTP リファラー制限」と「Maps JavaScript API / Geocoding API のみ許可」を必ず設定すること。

export const MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

let loading: Promise<void> | null = null;

export function loadGoogleMaps(): Promise<void> {
  if (!MAPS_API_KEY) return Promise.reject(new Error("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY が未設定です"));
  if (typeof window === "undefined") return Promise.reject(new Error("browser only"));
  if (typeof window.google?.maps?.importLibrary === "function") return Promise.resolve();
  if (loading) return loading;

  loading = new Promise<void>((resolve, reject) => {
    const fail = (msg: string) => {
      loading = null;
      reject(new Error(msg));
    };
    // API の準備ができたときに呼ばれる。script の onload だけでは importLibrary がまだ無いことがある
    const cbName = "__gmapsReady";
    (window as unknown as Record<string, unknown>)[cbName] = () => {
      if (typeof window.google?.maps?.importLibrary === "function") resolve();
      else fail("Google Maps の初期化に失敗しました（広告ブロッカー等が通信を止めている可能性）");
    };
    const s = document.createElement("script");
    const params = new URLSearchParams({ key: MAPS_API_KEY, v: "weekly", loading: "async", language: "ja", region: "JP", callback: cbName });
    s.src = `https://maps.googleapis.com/maps/api/js?${params}`;
    s.async = true;
    s.onerror = () => fail("Google Maps の読み込みに失敗しました");
    document.head.appendChild(s);
    setTimeout(() => fail("Google Maps の読み込みがタイムアウトしました"), 15_000); // 解決済みなら無視される
  });
  return loading;
}
