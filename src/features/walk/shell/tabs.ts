import { IconName, Tone } from "@/components/sticker";

export enum Tab {
  Walk = "walk",
  Album = "album",
  Stamps = "stamps",
  Feed = "feed",
}

export type TabItem = { id: Tab; label: string; icon: IconName; tone: Tone };

export const TABS: readonly TabItem[] = [
  { id: Tab.Walk, label: "さがす", icon: IconName.Walk, tone: Tone.Pink },
  { id: Tab.Album, label: "アルバム", icon: IconName.Camera, tone: Tone.Sky },
  { id: Tab.Stamps, label: "ハンコ帳", icon: IconName.Check, tone: Tone.Mint },
  { id: Tab.Feed, label: "ともだち", icon: IconName.Heart, tone: Tone.Lemon },
];
