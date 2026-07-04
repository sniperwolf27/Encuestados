import { describe, it, expect } from "vitest";
import { validateAnswers, type QuestionForValidation } from "@/lib/surveys/validate-answers";

const questions: QuestionForValidation[] = [
  { id: "q1", type: "RATING_STARS", required: true, options: null },
  { id: "q2", type: "YES_NO", required: true, options: null },
  { id: "q3", type: "MULTIPLE_CHOICE", required: true, options: ["A", "B"] },
  { id: "q4", type: "NPS", required: true, options: null },
  { id: "q5", type: "TEXT", required: false, options: null },
];

describe("validateAnswers", () => {
  it("passes when all required answers are valid", () => {
    const result = validateAnswers(questions, {
      q1: 4,
      q2: true,
      q3: "A",
      q4: 8,
      q5: "",
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it("fails when a required question is missing", () => {
    const result = validateAnswers(questions, { q1: 4, q2: true, q4: 8 });
    expect(result.valid).toBe(false);
    expect(result.errors.q3).toBeDefined();
  });

  it("does not flag a missing optional question as an error", () => {
    const result = validateAnswers(questions, { q1: 4, q2: true, q3: "A", q4: 8 });
    expect(result.errors.q5).toBeUndefined();
  });

  it("fails when a rating is out of range", () => {
    const result = validateAnswers(questions, { q1: 7, q2: true, q3: "A", q4: 8 });
    expect(result.valid).toBe(false);
    expect(result.errors.q1).toBeDefined();
  });

  it("fails when NPS is out of range", () => {
    const result = validateAnswers(questions, { q1: 4, q2: true, q3: "A", q4: 11 });
    expect(result.valid).toBe(false);
    expect(result.errors.q4).toBeDefined();
  });

  it("fails when multiple choice value is not one of the options", () => {
    const result = validateAnswers(questions, { q1: 4, q2: true, q3: "Z", q4: 8 });
    expect(result.valid).toBe(false);
    expect(result.errors.q3).toBeDefined();
  });

  it("allows an optional text question to be omitted entirely", () => {
    const result = validateAnswers(questions, { q1: 4, q2: true, q3: "A", q4: 8 });
    expect(result.valid).toBe(true);
  });
});
