// /api/quests の IP ごとの回数制限（メモリ内、固定窓）。
// メモリ内なので、サーバーのインスタンスごと・再起動で数え直しになる。Gemini の呼び出し回数（費用）を
// 1人が使い切らないための歯止めで、厳密な上限の保証ではない（判断の記録: docs/decisions/2026-11-10-f04-rate-limit.md）。
// 接続元は、App Hosting が付けた x-fah-client-ip で決める。X-Forwarded-For の左側は利用者が書けるので使わない（clientKey）。

import { NextResponse } from "next/server";

import { QuestFailure } from "./quests";

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSec: number };

export type RateLimiter = {
  check: (key: string) => RateLimitResult;
  reset: () => void;
};

type Options = {
  /** 窓の中で許す回数。 */
  limit: number;
  /** 窓の長さ（ミリ秒）。 */
  windowMs: number;
  /** 覚えておくキーの上限。超えたら期限切れを捨て、それでも多ければ古い順に捨てる（メモリを使い切らないため）。 */
  maxKeys?: number;
  now?: () => number;
};

export const createRateLimiter = ({ limit, windowMs, maxKeys = 10_000, now = Date.now }: Options): RateLimiter => {
  const hits = new Map<string, { count: number; resetAt: number }>();

  const prune = (t: number) => {
    for (const [k, v] of hits) if (v.resetAt <= t) hits.delete(k);
    // Map は挿入順なので、先頭から捨てると古い窓から消える。
    for (const k of hits.keys()) {
      if (hits.size < maxKeys) break;
      hits.delete(k);
    }
  };

  return {
    check(key) {
      const t = now();
      const entry = hits.get(key);
      if (!entry || entry.resetAt <= t) {
        if (entry) hits.delete(key);
        if (hits.size >= maxKeys) prune(t);
        hits.set(key, { count: 1, resetAt: t + windowMs });
        return { ok: true };
      }
      if (entry.count >= limit) return { ok: false, retryAfterSec: Math.max(1, Math.ceil((entry.resetAt - t) / 1000)) };
      entry.count += 1;
      return { ok: true };
    },
    reset: () => hits.clear(),
  };
};

/** App Hosting（stg・prod）の前段が接続元 IP を入れて渡すヘッダー。利用者が同じ名前で送った値は
 *  前段で実際の接続元 IP に上書きされる（stg で実測: 偽の値を送っても `x-fah-client-ip` は接続元 IP のまま。
 *  計測の記録は evidence/F04/stg-headers.txt。X-Forwarded-For は左側を利用者が書けるうえ、末尾に付く
 *  プロキシの数が hosted.app 経由で実測2つと資料より1つ多いので、位置を当てにせずこのヘッダーを使う）。 */
const FAH_CLIENT_IP = "x-fah-client-ip";

/** 前段のプロキシがない（ヘッダーを信用できない）ときの、全員共通のキー。 */
export const LOCAL_KEY = "local";
/** ヘッダーから接続元を決められないときの、共通のキー（制限を外さず、まとめて数える）。 */
export const UNKNOWN_KEY = "unknown";

/** IPv4・IPv6 に使う文字だけで、長さが IP として妥当か。 */
const IP_LIKE = /^[0-9A-Fa-f:.]{2,45}$/;

export type ClientKeyOptions = {
  /** 前段に信頼できるプロキシ（App Hosting のフロントエンド）があるか。ないときヘッダーは利用者が自由に書けるので使わない。 */
  behindTrustedProxy: boolean;
};

/** 回数を数えるキー（接続元 IP）。利用者が送った X-Forwarded-For や x-fah-client-ip の値そのものは信用しない。
 *  前段のプロキシがない環境（ローカル）ではヘッダーを無視して全員を1つにまとめる。 */
export const clientKey = (req: Request, { behindTrustedProxy }: ClientKeyOptions): string => {
  if (!behindTrustedProxy) return LOCAL_KEY;
  const ip = req.headers.get(FAH_CLIENT_IP)?.trim() ?? "";
  return IP_LIKE.test(ip) ? ip : UNKNOWN_KEY;
};

/** stg・prod（App Hosting）のときだけ、前段にロードバランサがあるとみなす。それ以外（local・未設定）はヘッダーを信用しない。 */
export const isBehindTrustedProxy = (appEnv: string | undefined): boolean => {
  const env = appEnv?.trim().toLowerCase();
  return env === "stg" || env === "prod";
};

/** 1分の窓。 */
const MINUTE_MS = 60_000;

/** 1つの IP が1分に呼べる回数。会場の Wi-Fi など多人数が同じ IP に見える場面でも、デモ中に見本へ
 *  落ちない値にした（/walk は1回の体験で1回、/prompt-lab は一度に3回呼ぶ）。1人が使い切る歯止めは残る。 */
export const RATE_LIMIT_PER_MINUTE = 60;

export const questsLimiter = createRateLimiter({ limit: RATE_LIMIT_PER_MINUTE, windowMs: MINUTE_MS });

export const RATE_LIMIT_TEXT = "呼び出しが多すぎます。しばらく待ってからもう一度試してください";

/** 制限を超えていれば 429 の応答を返す。超えていなければ null。 */
export const rateLimitResponse = (limiter: RateLimiter, req: Request, tag: string): NextResponse | null => {
  const result = limiter.check(clientKey(req, { behindTrustedProxy: isBehindTrustedProxy(process.env.NEXT_PUBLIC_APP_ENV) }));
  if (result.ok) return null;
  console.warn(`[${tag}] rate limited`, JSON.stringify({ retryAfterSec: result.retryAfterSec }));
  return NextResponse.json(
    { error: RATE_LIMIT_TEXT, reason: QuestFailure.RateLimited },
    { status: 429, headers: { "Retry-After": String(result.retryAfterSec) } },
  );
};
