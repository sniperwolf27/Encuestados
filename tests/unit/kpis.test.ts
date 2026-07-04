import { describe, it, expect } from "vitest";
import { computeKpis, type AnswerForKpis, type QuestionForKpis } from "@/lib/surveys/kpis";

const questions: QuestionForKpis[] = [
  { id: "q1", type: "RATING_STARS", text: "Calidad" },
  { id: "q2", type: "YES_NO", text: "¿Puntual?" },
  { id: "q3", type: "NPS", text: "Recomendación" },
];

describe("computeKpis", () => {
  it("computes overall average rating across RATING_STARS answers", () => {
    const answers: AnswerForKpis[] = [
      { questionId: "q1", value: 4 },
      { questionId: "q1", value: 2 },
    ];
    const result = computeKpis(questions, answers);
    expect(result.averageRating).toBe(3);
  });

  it("computes yes percentage for YES_NO questions", () => {
    const answers: AnswerForKpis[] = [
      { questionId: "q2", value: true },
      { questionId: "q2", value: true },
      { questionId: "q2", value: false },
    ];
    const result = computeKpis(questions, answers);
    expect(result.yesPercentage).toBeCloseTo(66.67, 1);
  });

  it("computes NPS as promoters minus detractors percentage", () => {
    // 4 responses: 9 (promoter), 10 (promoter), 6 (detractor), 7 (passive)
    const answers: AnswerForKpis[] = [
      { questionId: "q3", value: 9 },
      { questionId: "q3", value: 10 },
      { questionId: "q3", value: 6 },
      { questionId: "q3", value: 7 },
    ];
    const result = computeKpis(questions, answers);
    // promoters 2/4 = 50%, detractors 1/4 = 25% -> NPS = 25
    expect(result.nps).toBe(25);
  });

  it("returns nulls when there is no data for a metric", () => {
    const result = computeKpis(questions, []);
    expect(result.averageRating).toBeNull();
    expect(result.yesPercentage).toBeNull();
    expect(result.nps).toBeNull();
  });

  it("builds a rating distribution for chart display", () => {
    const answers: AnswerForKpis[] = [
      { questionId: "q1", value: 5 },
      { questionId: "q1", value: 5 },
      { questionId: "q1", value: 3 },
    ];
    const result = computeKpis(questions, answers);
    expect(result.ratingDistribution).toEqual({ 1: 0, 2: 0, 3: 1, 4: 0, 5: 2 });
  });
});
