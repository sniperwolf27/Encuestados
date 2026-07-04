"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = { error: null };

export default function LoginPage() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/admin";
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <main className="flex min-h-screen items-center justify-center bg-shogun-black px-4">
      <form
        action={formAction}
        className="w-full max-w-sm rounded-xl bg-white p-8 shadow-lg"
      >
        <h1 className="mb-6 text-2xl font-extrabold text-shogun-black">
          Encuestas <span className="text-shogun-red">SHOGUN</span>
        </h1>
        <input type="hidden" name="next" value={next} />
        <label className="mb-1 block text-sm font-semibold text-shogun-black">Usuario</label>
        <input
          name="username"
          required
          className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2"
        />
        <label className="mb-1 block text-sm font-semibold text-shogun-black">Contraseña</label>
        <input
          type="password"
          name="password"
          required
          className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2"
        />
        {state.error && <p className="mb-4 text-sm text-shogun-red">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-shogun-red py-2 font-bold text-white disabled:opacity-60"
        >
          {pending ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </main>
  );
}
