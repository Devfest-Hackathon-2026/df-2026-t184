import { fireEvent, screen } from "@testing-library/react";

/** 行き先が入った状態から、残りの質問は今の答えのまま進めて、ルート作りを始める。 */
export const answerQuestionsAndStart = (): void => {
  fireEvent.click(screen.getByRole("button", { name: "次へ" }));
  fireEvent.click(screen.getByRole("button", { name: "次へ" }));
  fireEvent.click(screen.getByRole("button", { name: "寄り道ルートを作る" }));
};
