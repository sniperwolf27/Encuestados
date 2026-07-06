"use client";

import { Star } from "lucide-react";

export function StarRating({ value, onChange }: { value: number | null; onChange: (value: number) => void }) {
  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          type="button"
          key={n}
          onClick={() => onChange(n)}
          aria-label={`${n} estrellas`}
          className="flex h-11 w-11 items-center justify-center"
        >
          <Star
            size={26}
            className={value !== null && value >= n ? "fill-brand-orange text-brand-orange" : "text-white/25"}
          />
        </button>
      ))}
    </div>
  );
}
