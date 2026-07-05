"use client";

import { useActionState } from "react";
import { changePasswordAction, type ChangePasswordState } from "./actions";

const initialState: ChangePasswordState = { error: null, success: false };

export default function ConfiguracionPage() {
  const [state, formAction, pending] = useActionState(changePasswordAction, initialState);

  return (
    <div className="max-w-sm">
      <h1 className="mb-6 text-2xl font-extrabold text-brand-navy">Configuración</h1>
      <form action={formAction} className="rounded-xl bg-white p-6 shadow-sm">
        <label className="mb-1 block text-sm font-semibold text-brand-navy">Contraseña actual</label>
        <input
          type="password"
          name="currentPassword"
          required
          className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2"
        />
        <label className="mb-1 block text-sm font-semibold text-brand-navy">Nueva contraseña</label>
        <input
          type="password"
          name="newPassword"
          required
          minLength={8}
          className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2"
        />
        {state.error && <p className="mb-4 text-sm text-brand-orange">{state.error}</p>}
        {state.success && <p className="mb-4 text-sm text-green-600">Contraseña actualizada</p>}
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-brand-orange px-4 py-2 font-bold text-white disabled:opacity-60"
        >
          {pending ? "Guardando..." : "Cambiar contraseña"}
        </button>
      </form>
    </div>
  );
}
