"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import RouteMap from "@/components/RouteMap";
import { MAPS_API_KEY } from "@/lib/google-maps";
import type { Quest } from "@/lib/quests";

type Screen = "input" | "loading" | "route" | "capture" | "memory";

type SampleQuest = Quest & { color: string };

type SampleMood = {
  label: string;
  desc: string;
  essay: string;
  quests: SampleQuest[];
};

// 地名・口コミ・スコアはすべてサンプルデータ（モックと同じ）
const MOODS: SampleMood[] = [
  {
    label: "静けさ優先",
    desc: "人の少ない路地や小道を選ぶ",
    essay:
      "人の声が遠のいた路地で、風鈴だけが小さく鳴っていた。遠回りした分だけ、今日の街は少し静かに、少し近くなった。",
    quests: [
      { cp: "裏通りの小さな神社", title: "鳥居の奥で、風鈴の音を探せ", why: "口コミで「昼でも人がまばら」と言われる境内を通ります。", s: [94, 72, 70], color: "#9FB8A8" },
      { cp: "古書店の並ぶ路地", title: "店先でいちばん古い本の年を見つけよう", why: "「時間がゆっくり流れる通り」という声が多い一本裏の道です。", s: [90, 84, 76], color: "#C7B79A" },
      { cp: "川沿いのベンチ", title: "水面の音だけを1分聞いてみよう", why: "大通りの混雑を避け、川沿いから目的地へ抜けます。", s: [96, 60, 74], color: "#9CBFC6" },
    ],
  },
  {
    label: "レトロ・ノスタルジック",
    desc: "古い看板や昔ながらの店をめぐる",
    essay:
      "色あせた看板と、銭湯の煙突。知らないはずの昭和が、角を曲がるたびに顔を出した。最短ルートでは出会えない時間だった。",
    quests: [
      { cp: "昭和の喫茶店前", title: "色あせた看板の文字を読み解け", why: "「看板が当時のまま」という口コミが目立つ喫茶店です。", s: [80, 93, 78], color: "#C9A27A" },
      { cp: "銭湯のある角", title: "煙突を見上げて写真に収めよう", why: "「街並みがタイムスリップしたよう」という声がある一角です。", s: [78, 95, 82], color: "#B7A59A" },
      { cp: "路地裏の商店", title: "ガラスケースの駄菓子を1つ選べ", why: "観光客の少ない時間帯でも開いている、地元の商店です。", s: [74, 90, 88], color: "#D3B58A" },
    ],
  },
  {
    label: "ローカルグルメ",
    desc: "地元の人が通う小さな店に寄る",
    essay:
      "総菜屋の行列に並び、焼きたてのパンの匂いに足を止めた。寄り道の数だけ、この街の味をひとつずつ覚えていく。",
    quests: [
      { cp: "商店街の総菜屋", title: "地元の人が並ぶ一品を見つけよう", why: "口コミで「近所の人ばかり」と言われる総菜屋の前を通ります。", s: [66, 74, 94], color: "#D9A86C" },
      { cp: "路地の老舗パン屋", title: "焼きたての時間を店主に聞いてみよう", why: "「昔から変わらない味」という声が多いパン屋です。", s: [72, 80, 92], color: "#CFAE84" },
      { cp: "角のたい焼き屋", title: "しっぽまで餡が入っているか確かめよう", why: "観光ガイドに載らない、地元の評価が高い店です。", s: [70, 82, 96], color: "#C79A6A" },
    ],
  },
];

const BUDGETS = [10, 20, 30];
const EXTRA = [8, 14, 23];
const SHORT_MIN = 18;
const POS = [
  { x: 50, y: 70 },
  { x: 245, y: 175 },
  { x: 245, y: 295 },
  { x: 120, y: 405 },
];
const STAGES = [
  { label: "周辺スポットを取得", api: "Google Maps Platform / Places API" },
  { label: "口コミを読み解き、気分に合う場所を採点", api: "Gemini" },
  { label: "混雑の少ない道で寄り道ルートを作成", api: "Routes API" },
  { label: "チェックポイントごとにクエストを生成", api: "Gemini" },
];
const TILE_LABELS = ["静けさ", "レトロ度", "ローカル感"];

const C = {
  ink: "#1B2433",
  sub: "#4A5568",
  bg: "#F4F1EA",
  line: "#C9C2B2",
  map: "#E9E4D8",
  amber: "#E8A33D",
  teal: "#1F6F78",
  gray: "#8A93A3",
};

const FONT = "var(--font-zen), 'Zen Kaku Gothic New', sans-serif";

const btn = (extra: CSSProperties): CSSProperties => ({
  cursor: "pointer",
  fontFamily: "inherit",
  ...extra,
});

const BackIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.ink} strokeWidth="2.4" aria-hidden="true">
    <path d="M15 5l-7 7 7 7" />
  </svg>
);

const Photo = ({ color, label, withWindow }: { color: string; label: string; withWindow?: boolean }) => (
  <svg width="100%" height="100%" viewBox="0 0 120 90" preserveAspectRatio="xMidYMid slice" role="img" aria-label={label}>
    <rect width="120" height="90" fill={color} />
    <circle cx="92" cy="22" r="10" fill={C.amber} />
    <path d="M0 90V52h22V40h18v50zM46 90V30h26v60zM78 90V48h20v-8h22v50z" fill={C.ink} opacity=".55" />
    {withWindow && <rect x="52" y="38" width="14" height="8" fill={C.bg} opacity=".8" />}
    <path d="M0 80h120v10H0z" fill={C.ink} opacity=".35" />
  </svg>
);

export default function YorimichiApp() {
  const [screen, setScreen] = useState<Screen>("input");
  const [dest, setDest] = useState("");
  const [mood, setMood] = useState(0);
  const [budget, setBudget] = useState(1);
  const [step, setStep] = useState(0);
  const [stage, setStage] = useState(0);
  const [shots, setShots] = useState([false, false, false]);
  const [memos, setMemos] = useState(["", "", ""]);
  const [shared, setShared] = useState(false);
  const [aiQuests, setAiQuests] = useState<Quest[] | null>(null);
  const [aiFailed, setAiFailed] = useState(false);
  const runRef = useRef(0);
  const [mapFailed, setMapFailed] = useState(false);
  const useRealMap = !!MAPS_API_KEY && !mapFailed; // キー未設定・読込失敗時は従来のSVG地図

  const timers = useRef<{ iv?: ReturnType<typeof setInterval>; t?: ReturnType<typeof setTimeout> }>({});
  useEffect(() => {
    const ref = timers.current;
    return () => {
      clearInterval(ref.iv);
      clearTimeout(ref.t);
    };
  }, []);

  const M = MOODS[mood];
  const qi = Math.min(step, 2);
  // Gemini の結果があればそれを使い、なければサンプル。写真ダミーの色は気分ごとのサンプルから借りる
  const quests = aiQuests ? aiQuests.map((a, i) => ({ ...a, color: M.quests[i].color })) : M.quests;
  const q = quests[qi];
  const extraMin = EXTRA[budget];
  const dot = (i: number) => (step > i ? C.teal : step === i ? C.amber : C.gray);

  const start = () => {
    setScreen("loading");
    setStage(0);
    setStep(0);
    setShots([false, false, false]);
    setMemos(["", "", ""]);
    setShared(false);
    clearInterval(timers.current.iv);
    setAiQuests(null);
    setAiFailed(false);
    const runId = ++runRef.current;

    // Gemini でクエストを作る。目的地が空・失敗・不正な出力のときは null（サンプルを使う）
    const request: Promise<Quest[] | null> = dest.trim()
      ? fetch("/api/quests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dest: dest.trim(), mood, budget }),
          signal: AbortSignal.timeout(25_000),
        })
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => (Array.isArray(d?.quests) && d.quests.length === 3 ? (d.quests as Quest[]) : null))
          .catch(() => null)
      : Promise.resolve(null);

    // 演出（4段階）が終わり、かつ結果が返ったら地図へ。結果待ちの間は最後の段階で待つ
    let animDone = false;
    let result: Quest[] | null | undefined;
    const finish = () => {
      if (runId !== runRef.current) return;
      setAiQuests(result ?? null);
      setAiFailed(dest.trim() !== "" && !result);
      setStage(4);
      setScreen("route");
    };
    let n = 0;
    timers.current.iv = setInterval(() => {
      n += 1;
      if (n >= 4) {
        clearInterval(timers.current.iv);
        animDone = true;
        if (result !== undefined) finish();
      } else {
        setStage(n);
      }
    }, 650);
    request.then((r) => {
      result = r;
      if (animDone) finish();
    });
  };

  const advance = (to: Screen) => {
    const n = step + 1;
    if (n >= 3) {
      setScreen("memory");
      setStep(3);
    } else {
      setScreen(to);
      setStep(n);
    }
  };

  const restart = () => {
    clearInterval(timers.current.iv);
    runRef.current += 1; // 実行中のGemini結果を捨てる
    setScreen("input");
    setStep(0);
    setStage(0);
  };

  const share = () => {
    setShared(true);
    clearTimeout(timers.current.t);
    timers.current.t = setTimeout(() => setShared(false), 1800);
  };

  const label12: CSSProperties = { fontSize: 12, fontWeight: 700, color: C.sub };
  const inputBox: CSSProperties = {
    display: "flex", alignItems: "center", gap: 8, minHeight: 46, boxSizing: "border-box",
    border: `1.5px solid ${C.line}`, borderRadius: 12, padding: "0 12px", background: "#fff",
  };
  const inputEl: CSSProperties = {
    flex: 1, border: 0, outline: "none", font: `500 15px ${FONT}`, color: C.ink, background: "transparent", minWidth: 0,
  };
  const chip = (color: string): CSSProperties => ({
    background: "#fff", borderRadius: 999, padding: "8px 12px", fontSize: 12, fontWeight: 700, color,
  });

  return (
    <div style={{ minHeight: "100dvh", display: "flex", justifyContent: "center", background: "#E3DFD3" }}>
      <div
        style={{
          width: "100%", maxWidth: 390, height: 844, maxHeight: "100dvh", position: "relative",
          overflow: "hidden", background: C.bg, fontFamily: FONT, color: C.ink,
        }}
      >
        {screen === "input" && (
          <div style={{ height: "100%", boxSizing: "border-box", padding: "52px 24px 28px", display: "flex", flexDirection: "column", gap: 20, overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <svg width="34" height="34" viewBox="0 0 36 36" fill="none" stroke={C.ink} strokeWidth="2" aria-hidden="true">
                <circle cx="18" cy="18" r="15" />
                <path d="M23 13l-3 8-8 3 3-8z" fill={C.amber} />
              </svg>
              <div style={{ fontWeight: 900, fontSize: 20 }}>寄り道コンパス</div>
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 28, lineHeight: 1.32, fontWeight: 900 }}>
                最短じゃない道で、<br />まだ知らない街へ。
              </h1>
              <p style={{ margin: "8px 0 0", fontSize: 13, lineHeight: 1.7, color: C.sub }}>
                混雑を避けて、静かな裏道とちいさなクエストを。
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label htmlFor="from" style={label12}>現在地</label>
                <div style={inputBox}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.teal} strokeWidth="2.2" aria-hidden="true">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                  </svg>
                  <input id="from" defaultValue="現在地を使用" readOnly style={inputEl} />
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label htmlFor="to" style={label12}>目的地</label>
                <div style={inputBox}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.amber} strokeWidth="2.2" aria-hidden="true">
                    <path d="M12 21s-6-5.6-6-11a6 6 0 0 1 12 0c0 5.4-6 11-6 11z" />
                    <circle cx="12" cy="10" r="2.2" />
                  </svg>
                  <input id="to" value={dest} onChange={(e) => setDest(e.target.value)} placeholder="行き先を入力" style={inputEl} />
                </div>
              </div>
            </div>
            <div>
              <div style={{ ...label12, marginBottom: 8 }}>今の気分</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {MOODS.map((m, i) => {
                  const on = mood === i;
                  const fg = on ? C.bg : C.ink;
                  return (
                    <button
                      key={m.label}
                      onClick={() => setMood(i)}
                      aria-pressed={on}
                      style={btn({
                        display: "flex", alignItems: "center", gap: 12, minHeight: 52, boxSizing: "border-box",
                        padding: "0 14px", borderRadius: 14, border: `1.5px solid ${C.ink}`,
                        background: on ? C.ink : "#fff", color: fg, textAlign: "left",
                      })}
                    >
                      <span style={{ width: 18, height: 18, boxSizing: "border-box", borderRadius: 999, border: `2px solid ${fg}`, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                        <span style={{ width: 8, height: 8, borderRadius: 999, background: on ? C.amber : "transparent" }} />
                      </span>
                      <span style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                        <span style={{ fontSize: 15, fontWeight: 900 }}>{m.label}</span>
                        <span style={{ fontSize: 12, fontWeight: 500, opacity: 0.85 }}>{m.desc}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <div style={{ ...label12, marginBottom: 8 }}>寄り道してもいい時間</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
                {BUDGETS.map((b, i) => {
                  const on = budget === i;
                  return (
                    <button
                      key={b}
                      onClick={() => setBudget(i)}
                      aria-pressed={on}
                      style={btn({
                        minHeight: 44, borderRadius: 999, border: `1.5px solid ${C.ink}`,
                        background: on ? C.ink : "#fff", color: on ? C.bg : C.ink, font: `700 14px ${FONT}`,
                      })}
                    >
                      +{b}分まで
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: 13, color: C.sub, borderTop: `1px dashed ${C.line}`, paddingTop: 10 }}>
                <span>最短ルート {SHORT_MIN}分</span>
                <span style={{ color: C.teal, fontWeight: 700 }}>寄り道ルート 約{SHORT_MIN + extraMin}分（+{extraMin}分）</span>
              </div>
              <button onClick={start} style={btn({ minHeight: 56, border: 0, borderRadius: 14, background: C.amber, color: C.ink, font: `900 17px ${FONT}` })}>
                寄り道ルートを作る
              </button>
            </div>
          </div>
        )}

        {screen === "loading" && (
          <div style={{ height: "100%", boxSizing: "border-box", padding: "0 36px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 28 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, textAlign: "center" }}>
              <svg width="72" height="72" viewBox="0 0 36 36" fill="none" stroke={C.ink} strokeWidth="2" aria-hidden="true" style={{ transform: `rotate(${stage * 90}deg)`, transition: "transform .6s ease" }}>
                <circle cx="18" cy="18" r="15" />
                <path d="M23 13l-3 8-8 3 3-8z" fill={C.amber} />
              </svg>
              <div style={{ fontSize: 19, fontWeight: 900 }}>口コミから裏道を探しています</div>
              <div style={{ fontSize: 13, lineHeight: 1.8, color: C.sub }}>
                周辺スポットの口コミを読み取り、<br />「{M.label}」に合う道を選んでいます
              </div>
            </div>
            <div role="status" style={{ display: "flex", flexDirection: "column", gap: 10, background: "#fff", borderRadius: 16, padding: 16, boxShadow: "0 6px 20px rgba(27,36,51,.08)" }}>
              {STAGES.map((g, i) => {
                const done = stage > i;
                const cur = stage === i;
                return (
                  <div key={g.label} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 36 }}>
                    <span style={{ width: 24, height: 24, borderRadius: 999, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: done ? C.teal : "#fff", border: `2px solid ${done ? C.teal : cur ? C.amber : C.line}`, boxSizing: "border-box" }}>
                      {done && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" aria-hidden="true">
                          <path d="M5 12l5 5 9-10" />
                        </svg>
                      )}
                    </span>
                    <span style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: done || cur ? C.ink : C.sub }}>{g.label}</span>
                      <span style={{ fontSize: 11, color: C.sub }}>{g.api}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {screen === "route" && (
          <div style={{ height: "100%", position: "relative", background: C.map }}>
            {useRealMap ? (
              <RouteMap dest={dest} places={aiQuests ? aiQuests.map((a) => a.cp) : undefined} step={step} onError={() => setMapFailed(true)} />
            ) : (
            <svg width="390" height="540" viewBox="0 0 390 540" style={{ position: "absolute", left: 0, top: 0 }} role="img" aria-label="混雑エリアを避けた寄り道ルートと最短ルートを重ねた地図">
              <rect width="390" height="540" fill={C.map} />
              <path d="M0 500 C90 470 160 520 250 490 S360 470 390 480 L390 540 L0 540 Z" fill="#C8DCE0" />
              <g fill={C.bg}>
                <rect x="20" y="96" width="90" height="64" rx="4" /><rect x="130" y="96" width="100" height="64" rx="4" /><rect x="260" y="96" width="110" height="64" rx="4" />
                <rect x="20" y="190" width="90" height="90" rx="4" /><rect x="130" y="190" width="100" height="90" rx="4" /><rect x="260" y="190" width="110" height="90" rx="4" />
                <rect x="20" y="310" width="90" height="80" rx="4" /><rect x="130" y="310" width="100" height="80" rx="4" /><rect x="260" y="310" width="110" height="80" rx="4" />
                <rect x="20" y="420" width="350" height="44" rx="4" />
              </g>
              <rect x="146" y="206" width="70" height="58" rx="6" fill="#CFE3D4" />
              <g fill={C.amber} opacity=".25">
                <circle cx="150" cy="196" r="44" /><circle cx="228" cy="296" r="40" /><circle cx="300" cy="384" r="34" />
              </g>
              <g fontFamily="Zen Kaku Gothic New" fontSize="11" fontWeight="700" fill="#8A5A12">
                <text x="128" y="160">混雑</text><text x="208" y="262">混雑</text><text x="292" y="360">混雑</text>
              </g>
              <path d="M50 70 L340 440" stroke={C.gray} strokeWidth="5" fill="none" strokeLinecap="round" />
              <path d="M50 70 L50 175 L245 175 L245 295 L120 295 L120 405 L340 405 L340 440" stroke={C.teal} strokeWidth="5" fill="none" strokeDasharray="2 9" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="340" cy="440" r="12" fill={C.amber} stroke="#fff" strokeWidth="3" />
              <circle cx="245" cy="175" r="15" fill={dot(0)} stroke="#fff" strokeWidth="3" />
              <circle cx="245" cy="295" r="15" fill={dot(1)} stroke="#fff" strokeWidth="3" />
              <circle cx="120" cy="405" r="15" fill={dot(2)} stroke="#fff" strokeWidth="3" />
              <g fontFamily="Zen Kaku Gothic New" fontWeight="900" fontSize="13" textAnchor="middle" fill="#fff">
                <text x="245" y="180">1</text><text x="245" y="300">2</text><text x="120" y="410">3</text>
              </g>
              <circle cx={POS[Math.min(step, 3)].x} cy={POS[Math.min(step, 3)].y} r="18" fill={C.ink} opacity=".15" />
              <circle cx={POS[Math.min(step, 3)].x} cy={POS[Math.min(step, 3)].y} r="8" fill={C.ink} stroke="#fff" strokeWidth="3" />
            </svg>
            )}
            <div style={{ position: "absolute", left: 16, top: 48, right: 16, display: "flex", gap: 8, alignItems: "center" }}>
              <button onClick={restart} aria-label="入力に戻る" style={btn({ width: 44, height: 44, borderRadius: 999, border: 0, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(27,36,51,.12)" })}>
                <BackIcon />
              </button>
              <span style={chip(C.teal)}>点線: 寄り道</span>
              <span style={chip(C.sub)}>実線: 最短</span>
              <span style={chip("#8A5A12")}>混雑を回避</span>
            </div>
            {aiFailed && (
              <div role="status" style={{ position: "absolute", left: 16, right: 16, top: 104, background: C.ink, color: C.bg, borderRadius: 12, padding: "8px 12px", fontSize: 12, fontWeight: 700 }}>
                AIがうまく動かなかったため、サンプルのクエストを表示しています
              </div>
            )}
            <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 344, boxSizing: "border-box", background: "#fff", borderRadius: "24px 24px 0 0", padding: "12px 20px 26px", display: "flex", flexDirection: "column", gap: 12, boxShadow: "0 -6px 24px rgba(27,36,51,.15)" }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: C.line, alignSelf: "center" }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.teal }}>クエスト {qi + 1} / 3</div>
                <div style={{ fontSize: 13, color: C.sub }}>+{extraMin}分の寄り道・{M.label}</div>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: C.map }}>
                <div style={{ width: `${Math.round((step / 3) * 100)}%`, height: 6, borderRadius: 3, background: C.teal, transition: "width .4s ease" }} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.sub }}>{q.cp}</div>
                <div style={{ fontSize: 20, fontWeight: 900, lineHeight: 1.4, marginTop: 2 }}>{q.title}</div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: C.bg, borderRadius: 12, padding: "10px 12px" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.teal} strokeWidth="2.2" aria-hidden="true" style={{ flex: "none", marginTop: 2 }}>
                  <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
                </svg>
                <div style={{ fontSize: 12, lineHeight: 1.6 }}>
                  <b style={{ color: C.teal }}>なぜこの道？</b> {q.why}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {TILE_LABELS.map((l, i) => {
                  const hi = MOODS.indexOf(M) === i;
                  return (
                    <div key={l} style={{ flex: 1, borderRadius: 12, padding: "6px 10px", fontSize: 12, color: C.sub, background: hi ? "#E6F0F0" : C.bg, border: `1.5px solid ${hi ? C.teal : C.line}` }}>
                      {l}
                      <b style={{ display: "block", fontSize: 20, fontWeight: 900, color: C.ink }}>{q.s[i]}</b>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: "auto" }}>
                <button onClick={() => setScreen("capture")} style={btn({ flex: 1, minHeight: 52, border: `1.5px solid ${C.ink}`, borderRadius: 14, background: "#fff", color: C.ink, font: `700 15px ${FONT}` })}>
                  写真・メモ
                </button>
                <button onClick={() => advance("route")} style={btn({ flex: 1.4, minHeight: 52, border: 0, borderRadius: 14, background: C.amber, color: C.ink, font: `900 16px ${FONT}` })}>
                  見つけた！
                </button>
              </div>
            </div>
          </div>
        )}

        {screen === "capture" && (
          <div style={{ height: "100%", boxSizing: "border-box", padding: "48px 24px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button onClick={() => setScreen("route")} aria-label="地図に戻る" style={btn({ width: 44, height: 44, borderRadius: 999, border: `1.5px solid ${C.line}`, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" })}>
                <BackIcon />
              </button>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.teal }}>チェックポイント {qi + 1} / 3</div>
                <div style={{ fontSize: 18, fontWeight: 900 }}>{q.cp}</div>
              </div>
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.6, color: C.sub }}>クエスト：{q.title}</div>
            <div style={{ height: 250, borderRadius: 16, overflow: "hidden", position: "relative", background: C.map }}>
              {shots[qi] ? (
                <>
                  <Photo color={q.color} label="撮影した写真（ダミー）" withWindow />
                  <button
                    onClick={() => setShots((a) => a.map((v, i) => (i === qi ? true : v)))}
                    style={btn({ position: "absolute", right: 12, bottom: 12, minHeight: 36, padding: "0 14px", borderRadius: 999, border: 0, background: "rgba(255,255,255,.92)", color: C.ink, font: `700 13px ${FONT}` })}
                  >
                    撮り直す
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShots((a) => a.map((v, i) => (i === qi ? true : v)))}
                  style={btn({ width: "100%", height: "100%", border: `2px dashed ${C.line}`, borderRadius: 16, background: "transparent", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, color: C.sub, font: `700 14px ${FONT}` })}
                >
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={C.ink} strokeWidth="1.8" aria-hidden="true">
                    <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
                    <circle cx="12" cy="13" r="3.5" />
                  </svg>
                  タップして撮影
                </button>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label htmlFor="memo" style={label12}>ひとことメモ</label>
              <textarea
                id="memo"
                value={memos[qi]}
                onChange={(e) => setMemos((a) => a.map((v, i) => (i === qi ? e.target.value : v)))}
                placeholder="気づいたこと、感じたことを一言"
                style={{ boxSizing: "border-box", width: "100%", height: 84, resize: "none", border: `1.5px solid ${C.line}`, borderRadius: 12, padding: "10px 12px", font: `400 15px/1.6 ${FONT}`, color: C.ink, background: "#fff" }}
              />
              <div style={{ fontSize: 11, color: C.sub }}>写真とメモから、Geminiが最後に思い出カードを書きます</div>
            </div>
            <button onClick={() => advance("route")} style={btn({ marginTop: "auto", minHeight: 56, border: 0, borderRadius: 14, background: C.amber, color: C.ink, font: `900 17px ${FONT}` })}>
              記録して次へ
            </button>
          </div>
        )}

        {screen === "memory" && (
          <div style={{ height: "100%", boxSizing: "border-box", padding: "52px 24px 28px", display: "flex", flexDirection: "column", gap: 16, overflowY: "auto" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.teal }}>散策おつかれさまでした</div>
              <h1 style={{ margin: "4px 0 0", fontSize: 26, fontWeight: 900 }}>今日の思い出カード</h1>
            </div>
            <div style={{ background: "#fff", borderRadius: 18, padding: 14, boxShadow: "0 6px 20px rgba(27,36,51,.12)", display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 6 }}>
                {quests.map((x, i) => (
                  <div key={x.cp} style={{ height: 104, borderRadius: 10, overflow: "hidden", background: C.map, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {shots[i] ? <Photo color={x.color} label={`${x.cp}の写真（ダミー）`} /> : <span style={{ fontSize: 11, color: C.sub }}>写真なし</span>}
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.sub }}>
                {new Date().toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" }).replaceAll("/", ".")} ／ チェックポイント 3/3 達成
              </div>
              <p style={{ margin: 0, fontSize: 15, lineHeight: 1.9 }}>{M.essay}</p>
              {quests.map((x, i) =>
                memos[i] ? (
                  <div key={x.cp} style={{ fontSize: 12, lineHeight: 1.6, color: C.sub, borderTop: `1px dashed ${C.line}`, paddingTop: 6 }}>
                    <b style={{ color: C.ink }}>{x.cp}</b>　{memos[i]}
                  </div>
                ) : null,
              )}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", gap: 6, fontSize: 12, fontWeight: 700 }}>
                  <span style={{ background: C.map, borderRadius: 999, padding: "6px 10px" }}>{M.label}</span>
                  <span style={{ background: C.map, borderRadius: 999, padding: "6px 10px" }}>混雑回避</span>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.teal }}>+{extraMin}分の寄り道</div>
              </div>
              <div style={{ fontSize: 10, color: C.sub, textAlign: "right" }}>文章は写真とメモからGeminiが生成（現在はサンプル文）</div>
            </div>
            {shared && (
              <div role="status" style={{ alignSelf: "center", background: C.ink, color: C.bg, borderRadius: 999, padding: "10px 16px", fontSize: 13, fontWeight: 700 }}>
                共有リンクをコピーしました
              </div>
            )}
            <div style={{ marginTop: "auto", display: "flex", gap: 10 }}>
              <button onClick={restart} style={btn({ flex: 1, minHeight: 52, border: `1.5px solid ${C.ink}`, borderRadius: 14, background: "#fff", color: C.ink, font: `700 15px ${FONT}` })}>
                もう一度歩く
              </button>
              <button onClick={share} style={btn({ flex: 1.4, minHeight: 52, border: 0, borderRadius: 14, background: C.amber, color: C.ink, font: `900 15px ${FONT}` })}>
                シェアする
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
