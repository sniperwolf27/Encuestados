"use client";

import { resetSurveyAction } from "@/app/admin/encuestas/[id]/actions";
import { Button } from "@/components/ui/Button";

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
      <Button type="submit" variant="destructive" size="compact">
        Resetear encuesta
      </Button>
    </form>
  );
}
