"use client";

import { useEffect, useReducer, useRef, useState } from "react";

import { PaperScreen } from "@/components/sticker";

import { requestQuests as requestQuestsFromApi } from "./api";
import { moodById, questsOf, SAMPLE_ALBUM, type AlbumEntry } from "./content";
import { eta, initialWalk, QuestSource, Screen, walkReducer, type WalkAction, type WalkState } from "./flow";
import { AlbumScreen } from "./screens/AlbumScreen";
import { CaptureScreen } from "./screens/CaptureScreen";
import { FeedScreen } from "./screens/FeedScreen";
import { InputScreen } from "./screens/InputScreen";
import { LoadingScreen } from "./screens/LoadingScreen";
import { MemoryScreen } from "./screens/MemoryScreen";
import { OnboardingScreen } from "./screens/OnboardingScreen";
import { RouteScreen } from "./screens/RouteScreen";
import { StampsScreen } from "./screens/StampsScreen";
import { Tab } from "./shell/tabs";
import { TabBar } from "./shell/TabBar";

// 探索中の 1 段階ぶんの見せ時間。
const STAGE_MS = 700;

// 歩いている途中はタブを隠して、地図とクエストに集中してもらう。
const SCREENS_WITH_TABS: ReadonlySet<Screen> = new Set([Screen.Input, Screen.Memory]);

const todayLabel = (): string => {
  const d = new Date();
  return `${d.getMonth() + 1}月${d.getDate()}日`;
};

const albumEntryOf = (s: WalkState): AlbumEntry => ({
  id: `walk-${Date.now()}`,
  dest: s.dest,
  mood: s.mood,
  walkedOn: todayLabel(),
  extraMinutes: eta(s.budget).extra,
  quests: questsOf(s),
  shots: s.shots,
  memos: s.memos,
});

type WalkAppProps = {
  /** Storybook のシナリオが入れる開始状態。省略時は最初から。 */
  initial?: WalkState;
  /** Gemini のクエストと Google Maps の地図を使う。省略時は見本データだけで動く。 */
  live?: boolean;
  /** はじめての案内から見せる。 */
  onboarding?: boolean;
};

/** 入力から思い出カード、ともだちの寄り道までを 1 本の流れでつなぐ。 */
export const WalkApp = ({ initial, live = false, onboarding = false }: WalkAppProps): React.ReactElement => {
  const [state, rawDispatch] = useReducer(walkReducer, initial ?? initialWalk);
  const [tab, setTab] = useState(Tab.Walk);
  // 思い出カードから「ともだち」を開いたときだけ、戻るボタンで思い出カードに戻す。
  const [feedFromMemory, setFeedFromMemory] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(onboarding);
  const [album, setAlbum] = useState<readonly AlbumEntry[]>(SAMPLE_ALBUM);
  // スコアの演出は歩き終えた直後の 1 回だけ。タブから戻ったときは止まった状態で出す。
  const [celebrate, setCelebrate] = useState(false);
  const request = useRef<AbortController | null>(null);

  // 探索中の演出はタイマー（外部の時計）との同期なので effect で進める。
  useEffect(() => {
    if (state.screen !== Screen.Loading) return;
    const timer = window.setTimeout(() => rawDispatch({ type: "advanceStage" }), STAGE_MS);
    return () => window.clearTimeout(timer);
  }, [state.screen, state.stage]);

  useEffect(() => () => request.current?.abort(), []);

  // 通信はボタンを押したときに 1 回だけ始める。effect にすると開発時の二重実行で 2 回呼んでしまう。
  const requestQuests = (): void => {
    request.current?.abort();
    request.current = null;
    const { dest, mood, budget, care } = state;
    if (!dest.trim()) return;
    const sample = moodById(mood).quests;
    if (!live) {
      rawDispatch({ type: "receivePlan", plan: { source: QuestSource.Sample, quests: sample } });
      return;
    }
    const controller = new AbortController();
    request.current = controller;
    void requestQuestsFromApi({ dest, mood, budget, care }, controller.signal).then((outcome) => {
      if (controller.signal.aborted) return;
      rawDispatch({
        type: "receivePlan",
        plan:
          "quests" in outcome
            ? { source: QuestSource.Ai, quests: outcome.quests }
            : { source: QuestSource.Fallback, quests: sample, failure: outcome.failure },
      });
    });
  };

  const dispatch = (action: WalkAction): void => {
    // 思い出カードに着いた瞬間を、イベントの中で 1 回だけ拾ってアルバムに残す。
    const next = walkReducer(state, action);
    if (state.screen !== Screen.Memory && next.screen === Screen.Memory) {
      setAlbum((prev) => [albumEntryOf(next), ...prev]);
      setCelebrate(true);
    }
    rawDispatch(action);
    if (action.type === "start") requestQuests();
    if (action.type === "backToInput" || action.type === "restart") request.current?.abort();
  };

  const openFeedFromMemory = (): void => {
    setTab(Tab.Feed);
    setCelebrate(false);
    setFeedFromMemory(true);
  };

  const changeTab = (next: Tab): void => {
    setTab(next);
    setCelebrate(false);
    setFeedFromMemory(false);
  };

  const renderWalk = (): React.ReactElement => {
    switch (state.screen) {
      case Screen.Input:
        return <InputScreen state={state} dispatch={dispatch} />;
      case Screen.Loading:
        return <LoadingScreen state={state} />;
      case Screen.Route:
        return <RouteScreen state={state} dispatch={dispatch} realMap={live} />;
      case Screen.Capture:
        return <CaptureScreen state={state} dispatch={dispatch} />;
      case Screen.Memory:
        return <MemoryScreen state={state} dispatch={dispatch} onOpenFeed={openFeedFromMemory} celebrate={celebrate} />;
    }
  };

  const renderTab = (): React.ReactElement => {
    switch (tab) {
      case Tab.Walk:
        return renderWalk();
      case Tab.Album:
        return <AlbumScreen album={album} />;
      case Tab.Stamps:
        return <StampsScreen album={album} />;
      case Tab.Feed:
        return <FeedScreen onBack={feedFromMemory ? () => changeTab(Tab.Walk) : undefined} />;
    }
  };

  if (showOnboarding) {
    return (
      <PaperScreen>
        <OnboardingScreen onDone={() => setShowOnboarding(false)} realMap={live} />
      </PaperScreen>
    );
  }

  const tabsVisible = tab !== Tab.Walk || SCREENS_WITH_TABS.has(state.screen);
  return (
    <PaperScreen>
      {renderTab()}
      {tabsVisible ? <TabBar current={tab} onChange={changeTab} /> : null}
    </PaperScreen>
  );
};
