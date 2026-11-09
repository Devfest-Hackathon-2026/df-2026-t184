import { StickerCard, Tone } from "@/components/sticker";

import { Budget, eta } from "../flow";

type EtaNoteProps = {
  budget: Budget;
};

/** 最短の直線と、回り道の点線を並べた小さな図。 */
const DetourDoodle = (): React.ReactElement => (
  <svg aria-hidden="true" viewBox="0 0 64 40" className="h-10 w-16 shrink-0" fill="none" strokeLinecap="round">
    <path d="M6 10 H58" stroke="var(--color-ink-soft)" strokeWidth="2.5" />
    <path d="M6 28 q8 -12 16 0 t16 0 t20 -2" stroke="var(--color-pink-deep)" strokeWidth="3.5" strokeDasharray="0.1 6" />
    <circle cx="6" cy="10" r="3" fill="var(--color-ink)" />
    <circle cx="6" cy="28" r="3" fill="var(--color-ink)" />
  </svg>
);

/** 選んだ寄り道時間から、全体の所要時間と最短との差を見せる付箋。 */
export const EtaNote = ({ budget }: EtaNoteProps): React.ReactElement => {
  const { total, extra } = eta(budget);
  return (
    <StickerCard tone={Tone.Lemon} className="flex items-center gap-3 px-4 py-3">
      <DetourDoodle />
      <p className="flex flex-col">
        <span className="font-hand text-xl">約{total}分</span>
        <span className="font-note text-sm text-ink-soft">最短より{extra}分長い寄り道</span>
      </p>
    </StickerCard>
  );
};
