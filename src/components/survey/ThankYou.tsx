"use client";

import { useEffect, useState } from "react";

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
    <div className="flex min-h-screen flex-col items-center justify-center bg-shogun-black px-4 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-shogun-red text-4xl font-black text-white">
        S
      </div>
      <h1 className="mb-2 text-2xl font-extrabold text-white">¡Gracias por tu respuesta!</h1>
      <p className="text-white/60">Volviendo al inicio en {secondsLeft}s...</p>
    </div>
  );
}
