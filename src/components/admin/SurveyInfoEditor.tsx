"use client";

import { useState } from "react";
import { updateSurveyInfoAction } from "@/app/admin/encuestas/[id]/actions";

export function SurveyInfoEditor({
  surveyId,
  title,
  description,
  emoji,
}: {
  surveyId: string;
  title: string;
  description: string | null;
  emoji: string | null;
}) {
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <button onClick={() => setEditing(true)} className="text-sm font-semibold text-brand-orange">
        Editar
      </button>
    );
  }

  return (
    <form
      action={async (formData) => {
        await updateSurveyInfoAction(formData);
        setEditing(false);
      }}
      className="mb-4 space-y-2 rounded-lg border border-gray-200 bg-white p-4"
    >
      <input type="hidden" name="surveyId" value={surveyId} />
      <label className="block text-xs font-semibold text-gray-500">Título</label>
      <input name="title" defaultValue={title} required className="block w-full rounded border px-2 py-1 text-sm" />
      <label className="block text-xs font-semibold text-gray-500">Descripción</label>
      <textarea
        name="description"
        defaultValue={description ?? ""}
        className="block w-full rounded border px-2 py-1 text-sm"
      />
      <label className="block text-xs font-semibold text-gray-500">Emoji</label>
      <input name="emoji" defaultValue={emoji ?? ""} className="block w-32 rounded border px-2 py-1 text-sm" />
      <div className="flex gap-2">
        <button className="rounded bg-brand-orange px-3 py-1 text-sm font-bold text-white">Guardar</button>
        <button type="button" onClick={() => setEditing(false)} className="rounded border px-3 py-1 text-sm">
          Cancelar
        </button>
      </div>
    </form>
  );
}
