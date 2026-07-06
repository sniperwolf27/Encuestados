"use client";

import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { loginAction, type LoginState } from "./actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const initialState: LoginState = { error: null };

function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/admin";
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <Card variant="solid" className="w-full max-w-sm p-8">
      <form action={formAction}>
        <Image src="/logo.jpg" alt="David Fotocolor" width={140} height={88} className="mx-auto mb-4 rounded-lg" priority />
        <h1 className="mb-6 text-center text-2xl font-extrabold text-brand-navy">
          Encuestas <span className="text-brand-orange">David Fotocolor</span>
        </h1>
        <input type="hidden" name="next" value={next} />
        <label htmlFor="login-username" className="mb-1 block text-sm font-semibold text-brand-navy">Usuario</label>
        <input
          id="login-username"
          name="username"
          autoComplete="username"
          required
          className="mb-4 w-full rounded-xl border border-system-separator px-3 py-2.5"
        />
        <label htmlFor="login-password" className="mb-1 block text-sm font-semibold text-brand-navy">Contraseña</label>
        <input
          id="login-password"
          type="password"
          name="password"
          autoComplete="current-password"
          required
          className="mb-4 w-full rounded-xl border border-system-separator px-3 py-2.5"
        />
        {state.error && <p className="mb-4 text-sm text-red-600">{state.error}</p>}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Entrando..." : "Entrar"}
        </Button>
      </form>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-brand-navy to-[#0d1d38] px-4">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
