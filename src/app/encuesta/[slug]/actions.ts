"use server";

import { db } from "@/lib/db";
import { validateAnswers, type QuestionForValidation } from "@/lib/surveys/validate-answers";
import { hasLowRating, hasHighRating } from "@/lib/surveys/rating-alerts";
import { sendLowRatingAlert } from "@/lib/email";

export type SubmitResult = {
  success: boolean;
  errors?: Record<string, string>;
  googleReviewLink?: string | null;
};

export async function submitResponseAction(
  slug: string,
  answers: Record<string, unknown>,
  respondentName: string,
  respondentPhone: string,
  collaboratorId: string | null
): Promise<SubmitResult> {
  const survey = await db.survey.findUnique({
    where: { slug },
    include: { questions: true, collaborators: true },
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

  if (collaboratorId && !survey.collaborators.some((c) => c.id === collaboratorId)) {
    return { success: false, errors: { _form: "Colaborador inválido" } };
  }

  if (survey.collaboratorRequired && survey.collaborators.length > 0 && !collaboratorId) {
    return { success: false, errors: { _form: "Debes seleccionar quién te atendió" } };
  }

  const trimmedName = respondentName.trim() || null;
  const trimmedPhone = respondentPhone.trim() || null;

  const response = await db.response.create({
    data: {
      surveyId: survey.id,
      respondentName: trimmedName,
      respondentPhone: trimmedPhone,
      collaboratorId,
      answers: {
        create: survey.questions
          .filter((q) => answers[q.id] !== undefined)
          .map((q) => ({ questionId: q.id, value: answers[q.id] as object | string | number | boolean })),
      },
    },
  });

  const answersForRatingCheck = survey.questions
    .filter((q) => answers[q.id] !== undefined)
    .map((q) => ({ questionId: q.id, value: answers[q.id] }));

  const isLowRating = hasLowRating(survey.questions, answersForRatingCheck);
  const isHighRating = hasHighRating(survey.questions, answersForRatingCheck);

  let googleReviewLink: string | null = null;

  if (isLowRating || isHighRating) {
    const setting = await db.setting.findUnique({ where: { id: "singleton" } });

    if (isLowRating && setting?.alertEmail) {
      void sendLowRatingAlert({
        to: setting.alertEmail,
        surveyTitle: survey.title,
        respondentName: trimmedName,
        respondentPhone: trimmedPhone,
        createdAt: response.createdAt,
      });
    }

    if (isHighRating) {
      googleReviewLink = setting?.googleReviewLink ?? null;
    }
  }

  return { success: true, googleReviewLink };
}
