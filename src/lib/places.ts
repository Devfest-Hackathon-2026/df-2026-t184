// 出発地・行き先の入力候補を Places API (New) の Autocomplete で出す。
// 費用を抑えるため、入力中の候補取得と、選んだときの座標取得（location だけ）を同じセッショントークンでまとめる。
// 料金・必要な設定は docs/DECISIONS.md を参照。

import { loadGoogleMaps } from "./google-maps";

export type LatLng = { lat: number; lng: number };

/** 候補から選んだ場所。 */
export type PlacePick = { name: string; at: LatLng };

/** 入力欄に出す候補 1 件。pick で座標を取る（取れなければ null）。 */
export type PlaceOption = { id: string; main: string; sub: string; pick: () => Promise<PlacePick | null> };

/** 入力した文字から候補を出す。失敗したら投げる（呼び出し側で候補なしとして扱う）。 */
export type SuggestPlaces = (input: string) => Promise<readonly PlaceOption[]>;

/** Google Maps の Places ライブラリを使う候補取得を作る。1 つの入力欄ごとに 1 つ作る（セッションを分けるため）。 */
export function createPlaceSuggester(): SuggestPlaces {
  let token: google.maps.places.AutocompleteSessionToken | null = null;
  return async (input) => {
    await loadGoogleMaps();
    const { AutocompleteSuggestion, AutocompleteSessionToken } = (await google.maps.importLibrary("places")) as google.maps.PlacesLibrary;
    token ??= new AutocompleteSessionToken();
    const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
      input,
      sessionToken: token,
      language: "ja",
      region: "jp",
      includedRegionCodes: ["jp"],
    });
    return suggestions.flatMap((s) => {
      const p = s.placePrediction;
      if (!p) return [];
      const main = p.mainText?.text ?? p.text.text;
      const pick = async (): Promise<PlacePick | null> => {
        // 選んだらセッションを終える。次の入力は新しいトークンで始める
        token = null;
        const place = p.toPlace();
        await place.fetchFields({ fields: ["location"] });
        const loc = place.location;
        return loc ? { name: main, at: { lat: loc.lat(), lng: loc.lng() } } : null;
      };
      return [{ id: p.placeId, main, sub: p.secondaryText?.text ?? "", pick }];
    });
  };
}
