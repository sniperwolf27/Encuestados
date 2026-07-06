"use client";

import { useActionState } from "react";
import { changePasswordAction, type ChangePasswordState } from "./actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const initialState: ChangePasswordState = { error: null, success: false };

export default function ConfiguracionPage() {
  const [state, formAction, pending] = useActionState(changePasswordAction, initialState);

  return (
    <div className="max-w-sm">
      <h1 className="mb-6 text-[26px] font-extrabold tracking-tight text-brand-navy">Configuración</h1>
      <Card variant="solid" className="p-6">
        <form action={formAction}>
          <label className="mb-1 block text-sm font-semibold text-brand-navy">Contraseña actual</label>
          <input
            type="password"
            name="currentPassword"
            required
            className="mb-4 w-full rounded-xl border border-system-separator px-3 py-2.5"
          />
          <label className="mb-1 block text-sm font-semibold text-brand-navy">Nueva contraseña</label>
          <input
            type="password"
            name="newPassword"
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
    </div>
  );
}
