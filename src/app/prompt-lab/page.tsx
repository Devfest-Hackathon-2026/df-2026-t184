import { notFound } from "next/navigation";
import PromptLab from "@/components/PromptLab";

// 開発中だけ使うページ。本番ビルドでは 404 にする。
export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <PromptLab />;
}
