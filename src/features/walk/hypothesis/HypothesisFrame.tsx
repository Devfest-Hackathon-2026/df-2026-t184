import { Stamp } from "@/components/sticker";

import { MOCK_DATA_NOTICE, type Scenario } from "./scenarios";


type HypothesisFrameProps = {
  scenario: Scenario;
  children: React.ReactNode;
};

type FactProps = { term: string; children: React.ReactNode };

const Fact = ({ term, children }: FactProps): React.ReactElement => (
  <div>
    <dt className="font-hand text-xs text-ink-soft">{term}</dt>
    <dd className="text-sm leading-relaxed text-ink">{children}</dd>
  </div>
);

/**
 * Storybook 専用の外枠。仮説の対象・困りごと・期待変化・評価質問と
 * 見本データの注意を、アプリ本体の画面の外に添えて見せる。
 */
export const HypothesisFrame = ({ scenario, children }: HypothesisFrameProps): React.ReactElement => (
  <div className="flex flex-col items-center gap-6 py-4">
    <section
      aria-label={`検証用モック ${scenario.label}`}
      className="relative w-full max-w-97.5 rounded-(--radius-sticker) border border-line bg-sticker p-5 font-note shadow-sticker"
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <p className="font-hand text-xs text-ink-soft">検証用モック（仮説・未検証）</p>
          <h2 className="font-hand text-xl leading-snug text-ink">{scenario.label}</h2>
        </div>
        <span aria-hidden="true" className="shrink-0">
          <Stamp>見本</Stamp>
        </span>
      </header>

      <dl className="mt-3 flex flex-col gap-2">
        <Fact term="対象">{scenario.target}</Fact>
        <Fact term="困りごと（仮説）">{scenario.problem}</Fact>
        <Fact term="期待する変化（仮説）">{scenario.expected}</Fact>
      </dl>

      <div className="mt-3">
        <p className="font-hand text-xs text-ink-soft">評価してほしいこと</p>
        <ul className="mt-1 list-disc pl-5 text-sm leading-relaxed text-ink">
          {scenario.questions.map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ul>
      </div>

      <p className="mt-3 border-t border-dashed border-line pt-3 text-xs leading-relaxed text-ink-soft">
        {MOCK_DATA_NOTICE}
      </p>
    </section>

    <div className="w-full max-w-97.5">{children}</div>
  </div>
);
