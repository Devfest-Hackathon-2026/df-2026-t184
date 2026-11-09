export enum Tone {
  Pink = "pink",
  Mint = "mint",
  Sky = "sky",
  Lemon = "lemon",
  Coral = "coral",
  Lilac = "lilac",
}

export enum Tilt {
  None = "none",
  Left = "left",
  Right = "right",
  Slight = "slight",
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

// ChoiceChip で選ばれた面の色。見た目は props ではなく実 input の状態に合わせるため、
// peer-checked: 込みの完全なクラス名で書き出す（Tailwind が静的に拾える形）。
export const TONE_CHECKED_FILL: Record<Tone, string> = {
  [Tone.Pink]: "peer-checked:bg-pink",
  [Tone.Mint]: "peer-checked:bg-mint",
  [Tone.Sky]: "peer-checked:bg-sky",
  [Tone.Lemon]: "peer-checked:bg-lemon",
  [Tone.Coral]: "peer-checked:bg-coral",
  [Tone.Lilac]: "peer-checked:bg-lilac",
};

export const TONE_DEEP_TEXT: Record<Tone, string> = {
  [Tone.Pink]: "text-pink-deep",
  [Tone.Mint]: "text-mint-deep",
  [Tone.Sky]: "text-sky-deep",
  [Tone.Lemon]: "text-lemon-deep",
  [Tone.Coral]: "text-coral-deep",
  [Tone.Lilac]: "text-lilac-deep",
};

export const TILT_CLASS: Record<Tilt, string> = {
  [Tilt.None]: "",
  [Tilt.Left]: "rotate-(--tilt-left)",
  [Tilt.Right]: "rotate-(--tilt-right)",
  [Tilt.Slight]: "rotate-(--tilt-slight)",
};

/** マスの傾き。globals.css の --tilt-cell と同じ値。ChoiceChip の tilt（度）に渡す。 */
export const TILT_CELL_DEG = 2;

export const cx = (...parts: Array<string | false | null | undefined>): string =>
  parts.filter(Boolean).join(" ");
