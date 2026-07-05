"use client";

import type { Question } from "@prisma/client";

export function QuestionField({
  question,
  value,
  error,
  onChange,
}: {
  question: Question;
  value: unknown;
  error?: string;
  onChange: (value: unknown) => void;
}) {
  return (
    <div className="mb-6">
      <p className="mb-2 font-semibold text-shogun-black">
        {question.text}
        {question.required && <span className="text-shogun-red"> *</span>}
      </p>

      {question.type === "RATING_STARS" && (
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              type="button"
              key={n}
              onClick={() => onChange(n)}
              className={`text-4xl ${
                typeof value === "number" && value >= n ? "opacity-100" : "opacity-25"
              }`}
              aria-label={`${n} estrellas`}
            >
              ⭐
            </button>
          ))}
        </div>
      )}

      {question.type === "YES_NO" && (
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => onChange(true)}
            className={`rounded-lg border-2 px-6 py-3 font-bold ${
              value === true ? "border-shogun-red text-shogun-red" : "border-gray-200 text-gray-400"
            }`}
          >
            Sí
          </button>
          <button
            type="button"
            onClick={() => onChange(false)}
            className={`rounded-lg border-2 px-6 py-3 font-bold ${
              value === false ? "border-shogun-red text-shogun-red" : "border-gray-200 text-gray-400"
            }`}
          >
            No
          </button>
        </div>
      )}

      {question.type === "NPS" && (
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 11 }, (_, n) => n).map((n) => (
            <button
              type="button"
              key={n}
              onClick={() => onChange(n)}
              className={`h-10 w-10 rounded-lg border-2 font-bold ${
                value === n ? "border-shogun-red bg-shogun-red text-white" : "border-gray-200 text-gray-500"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      )}

      {question.type === "MULTIPLE_CHOICE" && (
        <div className="flex flex-wrap gap-2">
          {(Array.isArray(question.options) ? (question.options as string[]) : []).map((option) => (
            <button
              type="button"
              key={option}
              onClick={() => onChange(option)}
              className={`rounded-lg border-2 px-4 py-2 font-semibold ${
                value === option ? "border-shogun-red text-shogun-red" : "border-gray-200 text-gray-500"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      )}

      {question.type === "TEXT" && (
        <textarea
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
          rows={3}
        />
      )}

      {error && <p className="mt-1 text-sm text-shogun-red">{error}</p>}
    </div>
  );
}
