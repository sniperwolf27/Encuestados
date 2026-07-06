"use client";

import { useState } from "react";
import { updateSurveyInfoAction } from "@/app/admin/encuestas/[id]/actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

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
    <Card variant="solid" className="mb-4 space-y-2 p-4">
      <form
        action={async (formData) => {
          await updateSurveyInfoAction(formData);
          setEditing(false);
        }}
        className="space-y-2"
      >
        <input type="hidden" name="surveyId" value={surveyId} />
        <label className="block text-xs font-semibold text-system-secondary">Título</label>
        <input name="title" defaultValue={title} required className="block w-full rounded-lg border border-system-separator px-2 py-1 text-sm" />
        <label className="block text-xs font-semibold text-system-secondary">Descripción</label>
        <textarea
          name="description"
          defaultValue={description ?? ""}
          className="block w-full rounded-lg border border-system-separator px-2 py-1 text-sm"
        />
        <label className="block text-xs font-semibold text-system-secondary">Emoji</label>
        <input name="emoji" defaultValue={emoji ?? ""} className="block w-32 rounded-lg border border-system-separator px-2 py-1 text-sm" />
        <div className="flex gap-2">
          <Button type="submit">Guardar</Button>
          <Button type="button" variant="secondary" onClick={() => setEditing(false)}>
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  );
}
