export type QuestionForKpis = {
  id: string;
  type: "RATING_STARS" | "MULTIPLE_CHOICE" | "TEXT" | "YES_NO" | "NPS";
  text: string;
};

export type AnswerForKpis = {
  questionId: string;
  value: unknown;
};

export type KpiResult = {
  averageRating: number | null;
  yesPercentage: number | null;
  nps: number | null;
  ratingDistribution: Record<1 | 2 | 3 | 4 | 5, number>;
};

export function computeKpis(questions: QuestionForKpis[], answers: AnswerForKpis[]): KpiResult {
  const questionTypeById = new Map(questions.map((q) => [q.id, q.type]));

  const ratingValues: number[] = [];
  const yesNoValues: boolean[] = [];
  const npsValues: number[] = [];

  for (const answer of answers) {
    const type = questionTypeById.get(answer.questionId);
    if (type === "RATING_STARS" && typeof answer.value === "number") {
      ratingValues.push(answer.value);
    } else if (type === "YES_NO" && typeof answer.value === "boolean") {
      yesNoValues.push(answer.value);
    } else if (type === "NPS" && typeof answer.value === "number") {
      npsValues.push(answer.value);
    }
  }

  const averageRating =
    ratingValues.length === 0
      ? null
      : ratingValues.reduce((sum, v) => sum + v, 0) / ratingValues.length;

  const yesPercentage =
    yesNoValues.length === 0
      ? null
      : (yesNoValues.filter(Boolean).length / yesNoValues.length) * 100;

  let nps: number | null = null;
  if (npsValues.length > 0) {
    const promoters = npsValues.filter((v) => v >= 9).length;
    const detractors = npsValues.filter((v) => v <= 6).length;
    nps = Math.round(((promoters - detractors) / npsValues.length) * 100);
  }

  const ratingDistribution: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const value of ratingValues) {
    if (value >= 1 && value <= 5) {
      ratingDistribution[value as 1 | 2 | 3 | 4 | 5] += 1;
    }
  }

  return { averageRating, yesPercentage, nps, ratingDistribution };
}
