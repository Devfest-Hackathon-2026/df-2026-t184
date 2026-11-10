"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** 地図の高さの初期値(px)。 */
export const MAP_HEIGHT_DEFAULT = 224;
/** 地図の高さの下限(px)。 */
export const MAP_HEIGHT_MIN = 160;
/** 下の地点リストに残す高さ(px)。上限 = 画面の高さ − この値。 */
const LIST_MIN_HEIGHT = 160;
/** 矢印キー 1 回で変える量(px)。 */
const STEP = 32;
/** SSR では画面の高さが分からないので、上限は仮の値にして表示後に実際の値へ直す。 */
const SSR_MAX = 608;

const viewportMax = (): number =>
  typeof window === "undefined" ? SSR_MAX : Math.max(MAP_HEIGHT_MIN, window.innerHeight - LIST_MIN_HEIGHT);

/** 地図の高さ(px)と、境目のハンドルが使う上下限。ドラッグ・矢印キーのどちらの値も上下限で丸める。 */
export const useMapHeight = (): {
  height: number;
  min: number;
  max: number;
  setHeight: (height: number) => void;
} => {
  const [height, setHeight] = useState(MAP_HEIGHT_DEFAULT);
  const [max, setMax] = useState(SSR_MAX);
  useEffect(() => {
    const update = (): void => setMax(viewportMax());
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  const set = useCallback((next: number): void => {
    setHeight(Math.min(Math.max(Math.round(next), MAP_HEIGHT_MIN), viewportMax()));
  }, []);
  return { height, min: MAP_HEIGHT_MIN, max, setHeight: set };
};

type MapResizeHandleProps = {
  /** いまの地図の高さ(px)。 */
  height: number;
  min: number;
  max: number;
  /** 新しい高さの希望値(px)。上下限での丸めは呼び出し側（useMapHeight）で行う。 */
  onChange: (height: number) => void;
};

/** 地図と地点リストの境目の持ち手。ドラッグか矢印キー（上下）で地図の高さを変える。 */
export const MapResizeHandle = ({ height, min, max, onChange }: MapResizeHandleProps): React.ReactElement => {
  const drag = useRef<{ pointerId: number; startY: number; startHeight: number } | null>(null);

  const onPointerDown = (e: React.PointerEvent<HTMLElement>): void => {
    // jsdom など setPointerCapture がない環境でもドラッグ自体は動くように任意呼び出しにする。
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drag.current = { pointerId: e.pointerId, startY: e.clientY, startHeight: height };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLElement>): void => {
    const d = drag.current;
    if (d === null || d.pointerId !== e.pointerId) return;
    onChange(d.startHeight + e.clientY - d.startY);
  };
  const endDrag = (e: React.PointerEvent<HTMLElement>): void => {
    if (drag.current?.pointerId === e.pointerId) drag.current = null;
  };
  const onKeyDown = (e: React.KeyboardEvent<HTMLElement>): void => {
    const delta = e.key === "ArrowDown" ? STEP : e.key === "ArrowUp" ? -STEP : 0;
    if (delta === 0) return;
    e.preventDefault();
    onChange(height + delta);
  };

  return (
    <div className="relative z-10 flex h-0 justify-center">
      <div
        role="separator"
        aria-orientation="horizontal"
        aria-label="地図の高さを変える"
        aria-valuenow={Math.round(height)}
        aria-valuemin={min}
        aria-valuemax={max}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
        className="absolute -top-5 flex h-11 w-16 cursor-row-resize touch-none items-center justify-center rounded-full focus-visible:focus-ring"
      >
        <span aria-hidden className="h-1 w-8 rounded-full bg-ink-soft" />
      </div>
    </div>
  );
};
