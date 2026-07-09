import { describe, it, expect } from "vitest";
import { hasLowRating, hasHighRating, type QuestionForRatingCheck } from "@/lib/surveys/rating-alerts";

const questions: QuestionForRatingCheck[] = [
  { id: "q1", type: "RATING_STARS" },
  { id: "q2", type: "NPS" },
  { id: "q3", type: "TEXT" },
];

describe("hasLowRating", () => {
  it("returns true when a RATING_STARS answer is 1 or 2", () => {
    expect(hasLowRating(questions, [{ questionId: "q1", value: 2 }])).toBe(true);
    expect(hasLowRating(questions, [{ questionId: "q1", value: 1 }])).toBe(true);
  });

  it("returns true when an NPS answer is 6 or below", () => {
    expect(hasLowRating(questions, [{ questionId: "q2", value: 6 }])).toBe(true);
    expect(hasLowRating(questions, [{ questionId: "q2", value: 0 }])).toBe(true);
  });

  it("returns false when ratings are fine", () => {
    expect(
      hasLowRating(questions, [
        { questionId: "q1", value: 4 },
        { questionId: "q2", value: 8 },
      ])
    ).toBe(false);
  });

  it("ignores non-rating question types", () => {
    expect(hasLowRating(questions, [{ questionId: "q3", value: "terrible" }])).toBe(false);
  });
});

describe("hasHighRating", () => {
  it("returns true only for a perfect RATING_STARS (5) or NPS (10)", () => {
    expect(hasHighRating(questions, [{ questionId: "q1", value: 5 }])).toBe(true);
    expect(hasHighRating(questions, [{ questionId: "q2", value: 10 }])).toBe(true);
    expect(hasHighRating(questions, [{ questionId: "q1", value: 4 }])).toBe(false);
    expect(hasHighRating(questions, [{ questionId: "q2", value: 9 }])).toBe(false);
  });
});
