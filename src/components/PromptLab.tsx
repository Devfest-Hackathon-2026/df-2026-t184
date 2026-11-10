"use client";

import { useState } from "react";
import type { Quest } from "@/lib/quests";

// 気分・時間の番号は src/app/api/quests/route.ts と同じ（0,1,2）
const MOODS = ["静けさ優先", "レトロ・ノスタルジック", "ローカルグルメ"];
const BUDGETS = ["+10分", "+20分", "+30分"];

// docs/prompt-guide.md の「試す入力」と同じ
const PRESETS = [
  { dest: "上野公園", mood: 0, budget: 1 },
  { dest: "浅草寺", mood: 1, budget: 1 },
  { dest: "谷中銀座", mood: 2, budget: 0 },
];

type Run = {
  dest: string;
  mood: number;
  budget: number;
  status: "running" | "ok" | "error";
  quests?: Quest[];
  error?: string;
};

async function generate(dest: string, mood: number, budget: number): Promise<Pick<Run, "status" | "quests" | "error">> {
  try {
    const res = await fetch("/api/quests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dest, mood, budget }),
      signal: AbortSignal.timeout(30_000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { status: "error", error: data?.error ?? `HTTP ${res.status}` };
    return { status: "ok", quests: data.quests };
  } catch {
    return { status: "error", error: "通信に失敗しました" };
  }
}

function toText(r: Run): string {
  const head = `【${r.dest} / ${MOODS[r.mood]} / ${BUDGETS[r.budget]}】`;
  if (!r.quests) return `${head}\n(失敗: ${r.error})`;
  return [head, ...r.quests.map((q, i) => `${i + 1}. ${q.cp}\n   ${q.title}\n   ${q.why}\n   静け${q.s[0]} / レトロ${q.s[1]} / ローカル${q.s[2]}`)].join("\n");
}

export default function PromptLab() {
  const [dest, setDest] = useState("上野公園");
  const [mood, setMood] = useState(0);
  const [budget, setBudget] = useState(1);
  const [runs, setRuns] = useState<Run[]>([]);
  const busy = runs.some((r) => r.status === "running");

  const runAll = async (inputs: { dest: string; mood: number; budget: number }[]) => {
    const base = inputs.map<Run>((i) => ({ ...i, status: "running" }));
    setRuns(base);
    await Promise.all(
      inputs.map(async (i, idx) => {
        const r = await generate(i.dest, i.mood, i.budget);
        setRuns((cur) => cur.map((x, k) => (k === idx ? { ...x, ...r } : x)));
      }),
    );
  };

  const copyAll = () => navigator.clipboard?.writeText(runs.map(toText).join("\n\n")).catch(() => {});

  const box = "rounded-lg border border-zinc-300 bg-white p-4";
  const btn = "rounded-md border border-zinc-900 px-3 py-2 text-sm font-bold disabled:opacity-40";

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6 text-zinc-900">
      <header>
        <h1 className="text-2xl font-black">プロンプト調整ページ（開発用）</h1>
        <p className="mt-1 text-sm text-zinc-600">
          <code>src/lib/prompts/quests.ts</code> を保存してから「生成」を押すと、新しい指示で結果が出ます。このページは本番では表示されません。
        </p>
      </header>

      <section className={box}>
        <h2 className="mb-3 font-bold">1つ試す</h2>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            目的地
            <input value={dest} onChange={(e) => setDest(e.target.value)} maxLength={60} className="mt-1 block rounded-md border border-zinc-300 px-2 py-1.5" />
          </label>
          <label className="text-sm">
            気分
            <select value={mood} onChange={(e) => setMood(Number(e.target.value))} className="mt-1 block rounded-md border border-zinc-300 px-2 py-2">
              {MOODS.map((m, i) => <option key={m} value={i}>{m}</option>)}
            </select>
          </label>
          <label className="text-sm">
            時間
            <select value={budget} onChange={(e) => setBudget(Number(e.target.value))} className="mt-1 block rounded-md border border-zinc-300 px-2 py-2">
              {BUDGETS.map((b, i) => <option key={b} value={i}>{b}</option>)}
            </select>
          </label>
          <button disabled={busy || !dest.trim()} onClick={() => runAll([{ dest: dest.trim(), mood, budget }])} className={`${btn} bg-amber-400`}>
            生成
          </button>
        </div>
      </section>

      <section className={box}>
        <h2 className="mb-1 font-bold">いつもの3件をまとめて試す</h2>
        <ul className="mb-3 text-sm text-zinc-600">
          {PRESETS.map((p) => <li key={p.dest}>{p.dest} / {MOODS[p.mood]} / {BUDGETS[p.budget]}</li>)}
        </ul>
        <button disabled={busy} onClick={() => runAll(PRESETS)} className={`${btn} bg-amber-400`}>3件を生成</button>
      </section>

      {runs.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">結果</h2>
            <button disabled={busy} onClick={copyAll} className={btn}>全部コピー（Discord用）</button>
          </div>
          {runs.map((r, i) => (
            <article key={i} className={box}>
              <h3 className="mb-2 text-sm font-bold text-teal-800">{r.dest} / {MOODS[r.mood]} / {BUDGETS[r.budget]}</h3>
              {r.status === "running" && <p className="text-sm text-zinc-500">生成中…</p>}
              {r.status === "error" && <p className="text-sm text-red-700">失敗: {r.error}</p>}
              {r.quests && (
                <ol className="space-y-3">
                  {r.quests.map((q) => (
                    <li key={q.cp} className="text-sm">
                      <div className="font-bold">{q.cp}</div>
                      <div>{q.title}</div>
                      <div className="text-zinc-600">{q.why}</div>
                      <div className="text-xs text-zinc-500">静けさ {q.s[0]} / レトロ {q.s[1]} / ローカル {q.s[2]}</div>
                    </li>
                  ))}
                </ol>
              )}
            </article>
          ))}
          <p className="text-xs text-zinc-500">確認: 3つとも実在するか（地図で検索）／気分に合うか／夜道や危ない場所を勧めていないか</p>
        </section>
      )}
    </main>
  );
}
