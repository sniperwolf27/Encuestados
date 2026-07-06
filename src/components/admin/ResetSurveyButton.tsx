"use client";

import { resetSurveyAction } from "@/app/admin/encuestas/[id]/actions";

export function ResetSurveyButton({ surveyId }: { surveyId: string }) {
  return (
    <form
      action={resetSurveyAction.bind(null, surveyId)}
      onSubmit={(e) => {
        const confirmed = window.confirm(
          "Esto borrará todas las respuestas y volverá el título, descripción y preguntas a como estaban al crear la encuesta. ¿Continuar?"
        );
        if (!confirmed) e.preventDefault();
      }}
    >
      <button className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50">
        Resetear encuesta
      </button>
    </form>
  );
}
