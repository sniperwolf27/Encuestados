export type QuestionForValidation = {
  id: string;
  type: "RATING_STARS" | "MULTIPLE_CHOICE" | "TEXT" | "YES_NO" | "NPS";
  required: boolean;
  options: string[] | null;
};

export type ValidationResult = {
  valid: boolean;
  errors: Record<string, string>;
};

export function validateAnswers(
  questions: QuestionForValidation[],
  answers: Record<string, unknown>
): ValidationResult {
  const errors: Record<string, string> = {};

  for (const question of questions) {
    const value = answers[question.id];
    const isEmpty =
      value === undefined || value === null || (typeof value === "string" && value.trim() === "");

    if (isEmpty) {
      if (question.required) {
        errors[question.id] = "Esta pregunta es obligatoria";
      }
      continue;
    }

    switch (question.type) {
      case "RATING_STARS": {
        if (typeof value !== "number" || value < 1 || value > 5) {
          errors[question.id] = "Debe ser un número entre 1 y 5";
        }
        break;
      }
      case "NPS": {
        if (typeof value !== "number" || value < 0 || value > 10) {
          errors[question.id] = "Debe ser un número entre 0 y 10";
        }
        break;
      }
      case "YES_NO": {
        if (typeof value !== "boolean") {
          errors[question.id] = "Debe ser sí o no";
        }
        break;
      }
      case "MULTIPLE_CHOICE": {
        if (typeof value !== "string" || !(question.options ?? []).includes(value)) {
          errors[question.id] = "Selecciona una opción válida";
        }
        break;
      }
      case "TEXT": {
        if (typeof value !== "string") {
          errors[question.id] = "Debe ser texto";
        }
        break;
      }
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}
