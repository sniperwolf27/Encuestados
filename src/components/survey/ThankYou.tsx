"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";

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
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-brand-navy to-brand-navy-dark px-4 text-center">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
        className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-brand-orange shadow-lg shadow-brand-orange/40"
      >
        <Check size={40} className="text-white" strokeWidth={3} />
      </motion.div>
      <h1 className="mb-2 text-[26px] font-extrabold text-white">¡Gracias por tu respuesta!</h1>
      <p className="text-[15px] text-white/55">Volviendo al inicio en {secondsLeft}s...</p>
    </div>
  );
}
