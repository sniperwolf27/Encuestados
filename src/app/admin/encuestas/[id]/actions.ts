"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { Prisma, QuestionType } from "@prisma/client";

export async function toggleSurveyActiveAction(surveyId: string, isActive: boolean) {
  await db.survey.update({ where: { id: surveyId }, data: { isActive } });
  revalidatePath(`/admin/encuestas/${surveyId}`);
}

export async function addQuestionAction(formData: FormData) {
  const surveyId = String(formData.get("surveyId"));
  const type = String(formData.get("type")) as QuestionType;
  const text = String(formData.get("text") ?? "").trim();
  const required = formData.get("required") === "on";
  const optionsRaw = String(formData.get("options") ?? "").trim();

  if (!text) return;

  const maxOrder = await db.question.aggregate({
    where: { surveyId },
    _max: { order: true },
  });

  await db.question.create({
    data: {
      surveyId,
      type,
      text,
      required,
      order: (maxOrder._max.order ?? -1) + 1,
      options:
        type === "MULTIPLE_CHOICE" && optionsRaw
          ? optionsRaw.split(",").map((o) => o.trim()).filter(Boolean)
          : undefined,
    },
  });

  revalidatePath(`/admin/encuestas/${surveyId}`);
}

export async function updateQuestionAction(formData: FormData) {
  const id = String(formData.get("id"));
  const surveyId = String(formData.get("surveyId"));
  const text = String(formData.get("text") ?? "").trim();
  const required = formData.get("required") === "on";
  const optionsRaw = String(formData.get("options") ?? "").trim();
  const type = String(formData.get("type")) as QuestionType;

  if (!text) return;

  await db.question.update({
    where: { id },
    data: {
      text,
      required,
      type,
      options:
        type === "MULTIPLE_CHOICE" && optionsRaw
          ? optionsRaw.split(",").map((o) => o.trim()).filter(Boolean)
          : Prisma.JsonNull,
    },
  });

  revalidatePath(`/admin/encuestas/${surveyId}`);
}

export async function deleteQuestionAction(id: string, surveyId: string) {
  await db.question.delete({ where: { id } });
  revalidatePath(`/admin/encuestas/${surveyId}`);
}

export async function reorderQuestionsAction(surveyId: string, orderedIds: string[]) {
  await db.$transaction(
    orderedIds.map((id, index) =>
      db.question.update({ where: { id }, data: { order: index } })
    )
  );
  revalidatePath(`/admin/encuestas/${surveyId}`);
}
