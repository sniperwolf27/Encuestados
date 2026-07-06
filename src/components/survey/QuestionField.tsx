"use client";

import type { Question } from "@prisma/client";
import type { SurveyOption as Option } from "@/lib/surveys/options";

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
  const options: Option[] = Array.isArray(question.options) ? (question.options as Option[]) : [];
  const hasOptionImages = options.some((o) => o.imageId);

  return (
    <div className="mb-6">
      {question.imageId && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/images/${question.imageId}`}
          alt=""
          className="mb-3 max-h-48 w-full rounded-lg object-cover"
        />
      )}
      <p className="mb-2 font-semibold text-brand-navy">
        {question.text}
        {question.required && <span className="text-brand-orange"> *</span>}
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
              value === true ? "border-brand-orange text-brand-orange" : "border-gray-200 text-gray-400"
            }`}
          >
            Sí
          </button>
          <button
            type="button"
            onClick={() => onChange(false)}
            className={`rounded-lg border-2 px-6 py-3 font-bold ${
              value === false ? "border-brand-orange text-brand-orange" : "border-gray-200 text-gray-400"
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
                value === n ? "border-brand-orange bg-brand-orange text-white" : "border-gray-200 text-gray-500"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      )}

      {question.type === "MULTIPLE_CHOICE" && hasOptionImages && (
        <div className="flex flex-wrap gap-3">
          {options.map((option) => (
            <button
              type="button"
              key={option.label}
              onClick={() => onChange(option.label)}
              className={`w-24 rounded-lg border-2 p-2 text-center ${
                value === option.label ? "border-brand-orange" : "border-gray-200"
              }`}
            >
              {option.imageId ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/images/${option.imageId}`}
                  alt={option.label}
                  className="mb-1 h-20 w-20 rounded-full object-cover"
                />
              ) : (
                <div className="mb-1 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 text-2xl">
                  👤
                </div>
              )}
              <span className="text-xs font-semibold text-brand-navy">{option.label}</span>
            </button>
          ))}
        </div>
      )}

      {question.type === "MULTIPLE_CHOICE" && !hasOptionImages && (
        <div className="flex flex-wrap gap-2">
          {options.map((option) => (
            <button
              type="button"
              key={option.label}
              onClick={() => onChange(option.label)}
              className={`rounded-lg border-2 px-4 py-2 font-semibold ${
                value === option.label ? "border-brand-orange text-brand-orange" : "border-gray-200 text-gray-500"
              }`}
            >
              {option.label}
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

      {error && <p className="mt-1 text-sm text-brand-orange">{error}</p>}
    </div>
  );
}
