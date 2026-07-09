"use client";

import { useActionState } from "react";
import { updateSettingsAction, type UpdateSettingsState } from "@/app/admin/configuracion/actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const initialState: UpdateSettingsState = { error: null, success: false };

export function SettingsForm({
  alertEmail,
  googleReviewLink,
}: {
  alertEmail: string | null;
  googleReviewLink: string | null;
}) {
  const [state, formAction, pending] = useActionState(updateSettingsAction, initialState);

  return (
    <Card variant="solid" className="mb-6 p-6">
      <form action={formAction}>
        <label htmlFor="alert-email" className="mb-1 block text-sm font-semibold text-brand-navy">
          Correo para alertas de calificación baja
        </label>
        <input
          id="alert-email"
          type="email"
          name="alertEmail"
          defaultValue={alertEmail ?? ""}
          placeholder="tucorreo@ejemplo.com"
          className="mb-4 w-full rounded-xl border border-system-separator px-3 py-2.5"
        />
        <label htmlFor="google-review-link" className="mb-1 block text-sm font-semibold text-brand-navy">
          Link de reseña de Google
        </label>
        <input
          id="google-review-link"
          type="url"
          name="googleReviewLink"
          defaultValue={googleReviewLink ?? ""}
          placeholder="https://g.page/r/..."
          className="mb-4 w-full rounded-xl border border-system-separator px-3 py-2.5"
        />
        {state.error && <p className="mb-4 text-sm text-red-600">{state.error}</p>}
        {state.success && <p className="mb-4 text-sm text-green-600">Configuración guardada</p>}
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando..." : "Guardar configuración"}
        </Button>
      </form>
    </Card>
  );
}
