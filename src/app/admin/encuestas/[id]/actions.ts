"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { Prisma, QuestionType } from "@prisma/client";
import { isValidImageFile, resolveImageId } from "@/lib/images";
import { buildOptionsFromRows } from "@/lib/surveys/options";

export async function toggleSurveyActiveAction(surveyId: string, isActive: boolean) {
  await db.survey.update({ where: { id: surveyId }, data: { isActive } });
  revalidatePath(`/admin/encuestas/${surveyId}`);
}

async function createImage(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const image = await db.image.create({ data: { data: buffer, mimeType: file.type } });
  return image.id;
}

async function resolveQuestionImageId(
  formData: FormData,
  existingImageId: string | null
): Promise<string | null> {
  const file = formData.get("questionImage");
  const removeImage = String(formData.get("questionRemoveImage") ?? "") === "true";
  const newImageId = file instanceof File && isValidImageFile(file) ? await createImage(file) : null;
  return resolveImageId({ existingImageId, removeImage, newImageId }) ?? null;
}

async function resolveOptionsFromFormData(formData: FormData) {
  const labels = formData.getAll("optionLabel").map((v) => String(v));
  const files = formData.getAll("optionImage");
  const existingIds = formData.getAll("optionExistingImageId").map((v) => String(v));
  const removeFlags = formData.getAll("optionRemoveImage").map((v) => String(v) === "true");

  const resolvedImageIds: (string | null)[] = [];
  for (let i = 0; i < labels.length; i++) {
    const file = files[i];
    const newImageId = file instanceof File && isValidImageFile(file) ? await createImage(file) : null;
    const resolved = resolveImageId({
      existingImageId: existingIds[i] || null,
      removeImage: removeFlags[i] ?? false,
      newImageId,
    });
    resolvedImageIds.push(resolved ?? null);
  }

  return buildOptionsFromRows(labels, resolvedImageIds);
}

async function resolveCollaboratorImageId(
  formData: FormData,
  existingImageId: string | null
): Promise<string | null> {
  const file = formData.get("collaboratorImage");
  const removeImage = String(formData.get("collaboratorRemoveImage") ?? "") === "true";
  const newImageId = file instanceof File && isValidImageFile(file) ? await createImage(file) : null;
  return resolveImageId({ existingImageId, removeImage, newImageId }) ?? null;
}

export async function addCollaboratorAction(formData: FormData) {
  const surveyId = String(formData.get("surveyId"));
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const imageId = await resolveCollaboratorImageId(formData, null);

  const maxOrder = await db.collaborator.aggregate({
    where: { surveyId },
    _max: { order: true },
  });

  await db.collaborator.create({
    data: {
      surveyId,
      name,
      imageId,
      order: (maxOrder._max.order ?? -1) + 1,
    },
  });

  revalidatePath(`/admin/encuestas/${surveyId}`);
}

export async function updateCollaboratorAction(formData: FormData) {
  const id = String(formData.get("id"));
  const surveyId = String(formData.get("surveyId"));
  const name = String(formData.get("name") ?? "").trim();
  const existingImageId = String(formData.get("collaboratorExistingImageId") ?? "") || null;

  if (!name) return;

  const imageId = await resolveCollaboratorImageId(formData, existingImageId);

  await db.collaborator.update({
    where: { id },
    data: { name, imageId },
  });

  revalidatePath(`/admin/encuestas/${surveyId}`);
}

export async function deleteCollaboratorAction(id: string, surveyId: string) {
  await db.collaborator.delete({ where: { id } });
  revalidatePath(`/admin/encuestas/${surveyId}`);
}

export async function reorderCollaboratorsAction(surveyId: string, orderedIds: string[]) {
  await db.$transaction(
    orderedIds.map((id, index) => db.collaborator.update({ where: { id }, data: { order: index } }))
  );
  revalidatePath(`/admin/encuestas/${surveyId}`);
}

export async function addQuestionAction(formData: FormData) {
  const surveyId = String(formData.get("surveyId"));
  const type = String(formData.get("type")) as QuestionType;
  const text = String(formData.get("text") ?? "").trim();
  const required = formData.get("required") === "on";

  if (!text) return;

  const imageId = await resolveQuestionImageId(formData, null);
  const options = type === "MULTIPLE_CHOICE" ? await resolveOptionsFromFormData(formData) : [];

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
      imageId,
      order: (maxOrder._max.order ?? -1) + 1,
      options: type === "MULTIPLE_CHOICE" && options.length > 0 ? options : undefined,
    },
  });

  revalidatePath(`/admin/encuestas/${surveyId}`);
}

export async function updateQuestionAction(formData: FormData) {
  const id = String(formData.get("id"));
  const surveyId = String(formData.get("surveyId"));
  const text = String(formData.get("text") ?? "").trim();
  const required = formData.get("required") === "on";
  const type = String(formData.get("type")) as QuestionType;
  const existingQuestionImageId = String(formData.get("questionExistingImageId") ?? "") || null;

  if (!text) return;

  const imageId = await resolveQuestionImageId(formData, existingQuestionImageId);
  const options = type === "MULTIPLE_CHOICE" ? await resolveOptionsFromFormData(formData) : [];

  await db.question.update({
    where: { id },
    data: {
      text,
      required,
      type,
      imageId,
      options: type === "MULTIPLE_CHOICE" && options.length > 0 ? options : Prisma.JsonNull,
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

export async function updateSurveyInfoAction(formData: FormData) {
  const surveyId = String(formData.get("surveyId"));
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const emoji = String(formData.get("emoji") ?? "").trim();

  if (!title) return;

  await db.survey.update({
    where: { id: surveyId },
    data: { title, description: description || null, emoji: emoji || null },
  });

  revalidatePath(`/admin/encuestas/${surveyId}`);
}

type FactorySnapshotQuestion = {
  type: QuestionType;
  text: string;
  required: boolean;
  order: number;
  options: Prisma.JsonValue | null;
};

type FactorySnapshotCollaborator = {
  name: string;
  imageId: string | null;
  order: number;
};

type FactorySnapshot = {
  title: string;
  description: string | null;
  emoji: string | null;
  questions: FactorySnapshotQuestion[];
  collaborators?: FactorySnapshotCollaborator[];
};

export async function resetSurveyAction(surveyId: string) {
  const survey = await db.survey.findUnique({ where: { id: surveyId } });
  if (!survey || !survey.factorySnapshot) return;

  const snapshot = survey.factorySnapshot as unknown as FactorySnapshot;

  await db.$transaction([
    db.response.deleteMany({ where: { surveyId } }),
    db.question.deleteMany({ where: { surveyId } }),
    db.survey.update({
      where: { id: surveyId },
      data: {
        title: snapshot.title,
        description: snapshot.description,
        emoji: snapshot.emoji,
        questions: {
          create: snapshot.questions.map((q) => ({
            type: q.type,
            text: q.text,
            required: q.required,
            order: q.order,
            options: q.options ?? undefined,
          })),
        },
      },
    }),
  ]);

  revalidatePath(`/admin/encuestas/${surveyId}`);
}
