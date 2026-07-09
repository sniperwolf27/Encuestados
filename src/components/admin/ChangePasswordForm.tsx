"use client";

import { useActionState } from "react";
import { changePasswordAction, type ChangePasswordState } from "@/app/admin/configuracion/actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const initialState: ChangePasswordState = { error: null, success: false };

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changePasswordAction, initialState);

  return (
    <Card variant="solid" className="p-6">
      <form action={formAction}>
        <label htmlFor="current-password" className="mb-1 block text-sm font-semibold text-brand-navy">
          Contraseña actual
        </label>
        <input
          id="current-password"
          type="password"
          name="currentPassword"
          autoComplete="current-password"
          required
          className="mb-4 w-full rounded-xl border border-system-separator px-3 py-2.5"
        />
        <label htmlFor="new-password" className="mb-1 block text-sm font-semibold text-brand-navy">
          Nueva contraseña
        </label>
        <input
          id="new-password"
          type="password"
          name="newPassword"
          autoComplete="new-password"
          required
          minLength={8}
          className="mb-4 w-full rounded-xl border border-system-separator px-3 py-2.5"
        />
        {state.error && <p className="mb-4 text-sm text-red-600">{state.error}</p>}
        {state.success && <p className="mb-4 text-sm text-green-600">Contraseña actualizada</p>}
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando..." : "Cambiar contraseña"}
        </Button>
      </form>
    </Card>
  );
}
