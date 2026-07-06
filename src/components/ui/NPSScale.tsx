"use client";

export function NPSScale({ value, onChange }: { value: number | null; onChange: (value: number) => void }) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Escala de recomendación 0 a 10">
      {Array.from({ length: 11 }, (_, n) => n).map((n) => (
        <button
          type="button"
          key={n}
          onClick={() => onChange(n)}
          aria-pressed={value === n}
          className={`flex h-11 w-11 items-center justify-center rounded-xl border-2 font-bold ${
            value === n ? "border-brand-orange bg-brand-orange text-white" : "border-white/20 text-white/60"
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}
