"use client";

import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = { error: null };

function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/admin";
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="w-full max-w-sm rounded-xl bg-white p-8 shadow-lg">
      <Image src="/logo.jpg" alt="David Fotocolor" width={140} height={88} className="mx-auto mb-4 rounded" priority />
      <h1 className="mb-6 text-center text-2xl font-extrabold text-brand-navy">
        Encuestas <span className="text-brand-orange">David Fotocolor</span>
      </h1>
      <input type="hidden" name="next" value={next} />
      <label className="mb-1 block text-sm font-semibold text-brand-navy">Usuario</label>
      <input
        name="username"
        required
        className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2"
      />
      <label className="mb-1 block text-sm font-semibold text-brand-navy">Contraseña</label>
      <input
        type="password"
        name="password"
        required
        className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2"
      />
      {state.error && <p className="mb-4 text-sm text-brand-orange">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-brand-orange py-2 font-bold text-white disabled:opacity-60"
      >
        {pending ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-navy px-4">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
