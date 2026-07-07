"use server";

import { db } from "@/lib/db";
import { validateAnswers, type QuestionForValidation } from "@/lib/surveys/validate-answers";

export type SubmitResult = { success: boolean; errors?: Record<string, string> };

export async function submitResponseAction(
  slug: string,
  answers: Record<string, unknown>,
  respondentName: string,
  respondentPhone: string,
  collaboratorId: string | null
): Promise<SubmitResult> {
  const survey = await db.survey.findUnique({
    where: { slug },
    include: { questions: true },
  });

  if (!survey || !survey.isActive) {
    return { success: false, errors: { _form: "Esta encuesta ya no está disponible" } };
  }

  const questionsForValidation: QuestionForValidation[] = survey.questions.map((q) => ({
    id: q.id,
    type: q.type,
    required: q.required,
    options: Array.isArray(q.options)
      ? (q.options as { label: string; imageId?: string }[]).map((o) => o.label)
      : null,
  }));

  const validation = validateAnswers(questionsForValidation, answers);
  if (!validation.valid) {
    return { success: false, errors: validation.errors };
  }

  await db.response.create({
    data: {
      surveyId: survey.id,
      respondentName: respondentName.trim() || null,
      respondentPhone: respondentPhone.trim() || null,
      collaboratorId,
      answers: {
        create: survey.questions
          .filter((q) => answers[q.id] !== undefined)
          .map((q) => ({ questionId: q.id, value: answers[q.id] as object | string | number | boolean })),
      },
    },
  });

  return { success: true };
}
