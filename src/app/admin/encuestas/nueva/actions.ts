"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";

export type CreateSurveyState = { error: string | null };

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function createSurveyAction(
  _prevState: CreateSurveyState,
  formData: FormData
): Promise<CreateSurveyState> {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const emoji = String(formData.get("emoji") ?? "").trim();

  if (!title) {
    return { error: "El título es obligatorio" };
  }

  const slug = slugify(title);
  const existing = await db.survey.findUnique({ where: { slug } });
  if (existing) {
    return { error: "Ya existe una encuesta con un título muy similar (slug duplicado)" };
  }

  const maxOrder = await db.survey.aggregate({ _max: { order: true } });
  const survey = await db.survey.create({
    data: {
      title,
      description: description || null,
      emoji: emoji || null,
      slug,
      order: (maxOrder._max.order ?? -1) + 1,
      factorySnapshot: {
        title,
        description: description || null,
        emoji: emoji || null,
        questions: [],
        collaborators: [],
      },
    },
  });

  redirect(`/admin/encuestas/${survey.id}`);
}
