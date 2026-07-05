"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const RESET_SECONDS = 6;

export function ThankYou({ onReset }: { onReset: () => void }) {
  const [secondsLeft, setSecondsLeft] = useState(RESET_SECONDS);

  useEffect(() => {
    if (secondsLeft <= 0) {
      onReset();
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft, onReset]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-brand-navy px-4 text-center">
      <Image src="/logo.jpg" alt="David Fotocolor" width={180} height={112} className="mb-6 rounded-lg" />
      <h1 className="mb-2 text-2xl font-extrabold text-white">¡Gracias por tu respuesta!</h1>
      <p className="text-white/60">Volviendo al inicio en {secondsLeft}s...</p>
    </div>
  );
}
