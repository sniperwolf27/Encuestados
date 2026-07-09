export type QuestionForRatingCheck = {
  id: string;
  type: "RATING_STARS" | "MULTIPLE_CHOICE" | "TEXT" | "YES_NO" | "NPS";
};

export type AnswerForRatingCheck = { questionId: string; value: unknown };

function typeById(questions: QuestionForRatingCheck[]): Map<string, QuestionForRatingCheck["type"]> {
  return new Map(questions.map((q) => [q.id, q.type]));
}

export function hasLowRating(questions: QuestionForRatingCheck[], answers: AnswerForRatingCheck[]): boolean {
  const types = typeById(questions);
  return answers.some((a) => {
    const type = types.get(a.questionId);
    if (type === "RATING_STARS" && typeof a.value === "number") return a.value <= 2;
    if (type === "NPS" && typeof a.value === "number") return a.value <= 6;
    return false;
  });
}

export function hasHighRating(questions: QuestionForRatingCheck[], answers: AnswerForRatingCheck[]): boolean {
  const types = typeById(questions);
  return answers.some((a) => {
    const type = types.get(a.questionId);
    if (type === "RATING_STARS" && typeof a.value === "number") return a.value === 5;
    if (type === "NPS" && typeof a.value === "number") return a.value === 10;
    return false;
  });
}
