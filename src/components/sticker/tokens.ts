export enum Tone {
  Pink = "pink",
  Mint = "mint",
  Sky = "sky",
  Lemon = "lemon",
  Coral = "coral",
  Lilac = "lilac",
}

// Tailwind はクラス名を静的に拾うので、組み立てずに全部書き出す。
export const TONE_FILL: Record<Tone, string> = {
  [Tone.Pink]: "bg-pink",
  [Tone.Mint]: "bg-mint",
  [Tone.Sky]: "bg-sky",
  [Tone.Lemon]: "bg-lemon",
  [Tone.Coral]: "bg-coral",
  [Tone.Lilac]: "bg-lilac",
};

export const TONE_DEEP_FILL: Record<Tone, string> = {
  [Tone.Pink]: "bg-pink-deep",
  [Tone.Mint]: "bg-mint-deep",
  [Tone.Sky]: "bg-sky-deep",
  [Tone.Lemon]: "bg-lemon-deep",
  [Tone.Coral]: "bg-coral-deep",
  [Tone.Lilac]: "bg-lilac-deep",
};

export const TONE_DEEP_TEXT: Record<Tone, string> = {
  [Tone.Pink]: "text-pink-deep",
  [Tone.Mint]: "text-mint-deep",
  [Tone.Sky]: "text-sky-deep",
  [Tone.Lemon]: "text-lemon-deep",
  [Tone.Coral]: "text-coral-deep",
  [Tone.Lilac]: "text-lilac-deep",
};

export const cx = (...parts: Array<string | false | null | undefined>): string =>
  parts.filter(Boolean).join(" ");
