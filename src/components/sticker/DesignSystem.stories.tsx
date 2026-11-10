import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

import { ButtonSize, ButtonVariant, StickerButton } from "./StickerButton";
import { StickerCard } from "./StickerCard";
import { StickerCheckbox } from "./StickerCheckbox";
import { ChoiceChip } from "./ChoiceChip";
import { Cluster, Stack } from "./Layout";
import { TextAreaField, TextField } from "./TextField";

const meta: Meta = { title: "Design System/Catalog" };
export default meta;

type Story = StoryObj;

const Swatch = ({ name, className, border }: { name: string; className: string; border?: boolean }): React.ReactElement => (
  <figure className="flex w-28 flex-col gap-1">
    <div className={`h-14 rounded-(--radius-chip) ${border ? "border border-border" : ""} ${className}`} />
    <figcaption className="font-note text-xs text-fg-subtle">{name}</figcaption>
  </figure>
);

export const SemanticColors: Story = {
  name: "色（セマンティックトークン）",
  render: () => (
    <Stack gap="gap-5">
      <p className="max-w-md font-note text-sm text-fg-subtle">
        役割で名前を付けた色。コンポーネントはこちらを使い、パステルの生色（プリミティブ）は直接参照しない。
      </p>
      <Cluster gap="gap-4">
        <Swatch name="fg / 本文" className="bg-fg" />
        <Swatch name="fg-subtle / 補助" className="bg-fg-subtle" />
        <Swatch name="canvas / 外枠" className="bg-canvas" />
        <Swatch name="surface / 紙" className="bg-surface" border />
        <Swatch name="surface-raised / ステッカー" className="bg-surface-raised" border />
        <Swatch name="surface-disabled" className="bg-surface-disabled" border />
        <Swatch name="border / 縁取り" className="bg-border" />
        <Swatch name="focus / フォーカス" className="bg-focus" />
        <Swatch name="danger / 危険" className="bg-danger" />
        <Swatch name="danger-surface" className="bg-danger-surface" />
      </Cluster>
    </Stack>
  ),
};

export const Typography: Story = {
  name: "文字",
  render: () => (
    <Stack gap="gap-4">
      <p className="font-hand text-2xl leading-snug text-fg">font-hand（Hachi Maru Pop）— 見出し・ボタン・数字</p>
      <p className="max-w-md font-note text-base leading-relaxed text-fg">
        font-note（Yomogi）— 本文・メモ・説明。どちらも太字は使わず、強調は大きさと色、またはマーカーの塗りで出す。
      </p>
      <Stack gap="gap-1">
        <p className="font-hand text-2xl text-fg">text-2xl / 画面タイトル</p>
        <p className="font-hand text-xl text-fg">text-xl / セクション見出し</p>
        <p className="font-note text-base text-fg">text-base / 本文</p>
        <p className="font-note text-sm text-fg">text-sm / 補助ラベル</p>
        <p className="font-note text-xs text-fg-subtle">text-xs / ヒント・注記（fg-subtle）</p>
      </Stack>
    </Stack>
  ),
};

export const Spacing: Story = {
  name: "余白（方眼グリッド）",
  render: () => (
    <Stack gap="gap-4">
      <p className="max-w-md font-note text-sm text-fg-subtle">
        紙の方眼 1 マス（22px）が余白の物差し。<code>gap-grid</code>・<code>p-grid</code> のように使う。それより細かい余白は Tailwind の標準スケール。
      </p>
      <div className="flex items-end gap-4">
        {[1, 2, 4].map((n) => (
          <figure key={n} className="flex flex-col items-center gap-1">
            <div className="border border-dashed border-border-subtle bg-mint" style={{ width: 22 * n, height: 22 * n }} />
            <figcaption className="font-note text-xs text-fg-subtle">{n}マス</figcaption>
          </figure>
        ))}
      </div>
    </Stack>
  ),
};

export const FocusAndStates: Story = {
  name: "フォーカスと状態",
  render: () => (
    <Stack gap="gap-5">
      <p className="max-w-md font-note text-sm text-fg-subtle">
        フォーカスは白フチ＋濃い水色の輪郭（focus-ring）。Tab キーで確認できる。押せない状態は色を薄く、影をなくす。
      </p>
      <Cluster gap="gap-4">
        <StickerButton>通常</StickerButton>
        <StickerButton className="focus-ring">フォーカス時の見た目</StickerButton>
        <StickerButton disabled>押せない</StickerButton>
      </Cluster>
    </Stack>
  ),
};

export const Buttons: Story = {
  name: "ボタン",
  render: () => (
    <Stack gap="gap-4">
      <Cluster gap="gap-3">
        <StickerButton>主操作（solid / lemon）</StickerButton>
        <StickerButton>達成・進行（mint）</StickerButton>
        <StickerButton variant={ButtonVariant.Plain}>副操作（plain）</StickerButton>
        <StickerButton variant={ButtonVariant.Danger}>削除（danger）</StickerButton>
      </Cluster>
      <Cluster gap="gap-3">
        <StickerButton size={ButtonSize.Lg}>大きい主操作</StickerButton>
        <StickerButton disabled>押せない</StickerButton>
      </Cluster>
    </Stack>
  ),
};

export const Fields: Story = {
  name: "入力フィールド",
  render: () => (
    <Stack gap="gap-4" className="w-80">
      <TextField id="ds-dest" label="行き先" placeholder="行き先を入力" required />
      <TextField id="ds-dest-err" label="行き先" defaultValue="" error="行き先を入力してください" />
      <TextAreaField id="ds-memo" label="ひとことメモ" hint="30字まで" placeholder="気づいたことを一言" />
      <TextAreaField id="ds-memo-err" label="ひとことメモ" defaultValue="あ" error="長すぎます" hint="30字まで" />
    </Stack>
  ),
};

const ChoiceDemo = (): React.ReactElement => {
  const [picked, setPicked] = useState("a");
  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
      <legend className="float-left w-full p-0 pb-2 font-hand text-sm text-ink">今の気分（実際のラジオ。矢印キーで移動できる）</legend>
      <Cluster gap="gap-3">
        {[
          ["a", "静けさ"],
          ["b", "レトロ"],
          ["c", "グルメ"],
        ].map(([value, label]) => (
          <ChoiceChip key={value} name="ds-mood" value={value} checked={picked === value} onSelect={() => setPicked(value)} className="px-4 py-2 font-hand">
            {label}
          </ChoiceChip>
        ))}
        <ChoiceChip name="ds-mood" checked={false} onSelect={() => {}} disabled className="px-4 py-2 font-hand">
          選べない
        </ChoiceChip>
      </Cluster>
    </fieldset>
  );
};

export const Choices: Story = {
  name: "選択コントロール",
  render: () => (
    <Stack gap="gap-5" className="w-96">
      <ChoiceDemo />
      <Stack gap="gap-2">
        <StickerCheckbox defaultChecked>写真を残す</StickerCheckbox>
        <StickerCheckbox>ひとことメモも残す</StickerCheckbox>
        <StickerCheckbox disabled>選べない項目</StickerCheckbox>
      </Stack>
    </Stack>
  ),
};

export const Layouts: Story = {
  name: "レイアウト（Stack / Cluster）",
  render: () => (
    <Stack gap="gap-5">
      <StickerCard className="w-80">
        <p className="font-hand text-sm">Stack — 縦に積む（gap-3 既定）</p>
        <Stack gap="gap-2" className="mt-2">
          <div className="rounded-(--radius-chip) bg-sky px-3 py-2 font-note text-sm">1 枚目</div>
          <div className="rounded-(--radius-chip) bg-lemon px-3 py-2 font-note text-sm">2 枚目</div>
        </Stack>
      </StickerCard>
      <StickerCard className="w-80">
        <p className="font-hand text-sm">Cluster — 横に並べて折り返す</p>
        <Cluster gap="gap-2" className="mt-2">
          {["静けさ", "レトロ", "グルメ", "路地", "水辺"].map((t) => (
            <span key={t} className="rounded-full border border-border bg-pink px-2.5 py-1 font-hand text-xs">
              {t}
            </span>
          ))}
        </Cluster>
      </StickerCard>
    </Stack>
  ),
};
