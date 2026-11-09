"use client";

import { useEffect, useReducer, useState } from "react";

import { PaperScreen } from "@/components/sticker";

import { initialWalk, Screen, walkReducer, type WalkState } from "./flow";
import { CaptureScreen } from "./screens/CaptureScreen";
import { FeedScreen } from "./screens/FeedScreen";
import { InputScreen } from "./screens/InputScreen";
import { LoadingScreen } from "./screens/LoadingScreen";
import { MemoryScreen } from "./screens/MemoryScreen";
import { RouteScreen } from "./screens/RouteScreen";

// 探索中の 1 段階ぶんの見せ時間。本番では API の応答で進める。
const STAGE_MS = 700;

type WalkAppProps = {
  /** Storybook のシナリオが入れる開始状態。省略時は最初から。 */
  initial?: WalkState;
};

/** 入力から思い出カード、ともだちの寄り道までを 1 本の流れでつなぐ。 */
export const WalkApp = ({ initial }: WalkAppProps): React.ReactElement => {
  const [state, dispatch] = useReducer(walkReducer, initial ?? initialWalk);
  const [feedOpen, setFeedOpen] = useState(false);

  // 探索中の演出はタイマー（外部の時計）との同期なので effect で進める。
  useEffect(() => {
    if (state.screen !== Screen.Loading) return;
    const timer = window.setTimeout(() => dispatch({ type: "advanceStage" }), STAGE_MS);
    return () => window.clearTimeout(timer);
  }, [state.screen, state.stage]);

  const renderScreen = (): React.ReactElement => {
    if (feedOpen) return <FeedScreen onBack={() => setFeedOpen(false)} />;
    switch (state.screen) {
      case Screen.Input:
        return <InputScreen state={state} dispatch={dispatch} />;
      case Screen.Loading:
        return <LoadingScreen state={state} />;
      case Screen.Route:
        return <RouteScreen state={state} dispatch={dispatch} />;
      case Screen.Capture:
        return <CaptureScreen state={state} dispatch={dispatch} />;
      case Screen.Memory:
        return <MemoryScreen state={state} dispatch={dispatch} onOpenFeed={() => setFeedOpen(true)} />;
    }
  };

  return <PaperScreen>{renderScreen()}</PaperScreen>;
};
