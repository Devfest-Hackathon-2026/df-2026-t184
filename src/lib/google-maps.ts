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
    const s = document.createElement("script");
    const params = new URLSearchParams({ key: MAPS_API_KEY, v: "weekly", loading: "async", language: "ja", region: "JP" });
    s.src = `https://maps.googleapis.com/maps/api/js?${params}`;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      loading = null;
      reject(new Error("Google Maps の読み込みに失敗しました"));
    };
    document.head.appendChild(s);
  });
  return loading;
}
