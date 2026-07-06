"use client";

import { useActionState } from "react";
import { createSurveyAction, type CreateSurveyState } from "./actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const initialState: CreateSurveyState = { error: null };

export default function NewSurveyPage() {
  const [state, formAction, pending] = useActionState(createSurveyAction, initialState);

  return (
    <div className="max-w-lg">
      <h1 className="mb-6 text-[26px] font-extrabold tracking-tight text-brand-navy">Nueva encuesta</h1>
      <Card variant="solid" className="p-6">
        <form action={formAction}>
          <label htmlFor="survey-title" className="mb-1 block text-sm font-semibold text-brand-navy">Título</label>
          <input
            id="survey-title"
            name="title"
            required
            className="mb-4 w-full rounded-xl border border-system-separator px-3 py-2.5"
          />
          <label htmlFor="survey-description" className="mb-1 block text-sm font-semibold text-brand-navy">Descripción</label>
          <textarea
            id="survey-description"
            name="description"
            className="mb-4 w-full rounded-xl border border-system-separator px-3 py-2.5"
          />
          <label htmlFor="survey-emoji" className="mb-1 block text-sm font-semibold text-brand-navy">Emoji (opcional)</label>
          <input
            id="survey-emoji"
            name="emoji"
            placeholder="📷"
            className="mb-4 w-full rounded-xl border border-system-separator px-3 py-2.5"
          />
          {state.error && <p className="mb-4 text-sm text-red-600">{state.error}</p>}
          <Button type="submit" disabled={pending}>
            {pending ? "Creando..." : "Crear encuesta"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
