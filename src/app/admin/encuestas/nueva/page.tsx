"use client";

import { useActionState } from "react";
import { createSurveyAction, type CreateSurveyState } from "./actions";

const initialState: CreateSurveyState = { error: null };

export default function NewSurveyPage() {
  const [state, formAction, pending] = useActionState(createSurveyAction, initialState);

  return (
    <div className="max-w-lg">
      <h1 className="mb-6 text-2xl font-extrabold text-brand-navy">Nueva encuesta</h1>
      <form action={formAction} className="rounded-xl bg-white p-6 shadow-sm">
        <label className="mb-1 block text-sm font-semibold text-brand-navy">Título</label>
        <input
          name="title"
          required
          className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2"
        />
        <label className="mb-1 block text-sm font-semibold text-brand-navy">Descripción</label>
        <textarea
          name="description"
          className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2"
        />
        {state.error && <p className="mb-4 text-sm text-brand-orange">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-brand-orange px-4 py-2 font-bold text-white disabled:opacity-60"
        >
          {pending ? "Creando..." : "Crear encuesta"}
        </button>
      </form>
    </div>
  );
}
