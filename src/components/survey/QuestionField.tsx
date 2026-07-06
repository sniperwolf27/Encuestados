"use client";

import type { Question } from "@prisma/client";
import type { SurveyOption as Option } from "@/lib/surveys/options";
import { Card } from "@/components/ui/Card";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { StarRating } from "@/components/ui/StarRating";
import { NPSScale } from "@/components/ui/NPSScale";
import { Avatar } from "@/components/ui/Avatar";

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
    <Card variant="glass" className="mb-3.5 p-[18px]">
      {question.imageId && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/images/${question.imageId}`}
          alt=""
          className="mb-3 max-h-48 w-full rounded-xl object-cover"
        />
      )}
      <p className="mb-3 text-[15px] font-semibold text-white">
        {question.text}
        {question.required && <span className="text-brand-orange"> *</span>}
      </p>

      {question.type === "RATING_STARS" && (
        <StarRating value={typeof value === "number" ? value : null} onChange={onChange} />
      )}

      {question.type === "YES_NO" && (
        <SegmentedControl
          options={[
            { label: "Sí", value: "yes" },
            { label: "No", value: "no" },
          ]}
          value={value === true ? "yes" : value === false ? "no" : null}
          onChange={(v) => onChange(v === "yes")}
        />
      )}

      {question.type === "NPS" && (
        <NPSScale value={typeof value === "number" ? value : null} onChange={onChange} />
      )}

      {question.type === "MULTIPLE_CHOICE" && hasOptionImages && (
        <div className="flex flex-wrap gap-4">
          {options.map((option) => (
            <button
              type="button"
              key={option.label}
              onClick={() => onChange(option.label)}
              aria-pressed={value === option.label}
              className="flex flex-col items-center gap-1.5"
            >
              <div className={value === option.label ? "rounded-full ring-2 ring-brand-orange" : "rounded-full"}>
                <Avatar imageId={option.imageId} label={option.label} size={56} />
              </div>
              <span className="text-xs font-semibold text-white">{option.label}</span>
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
              aria-pressed={value === option.label}
              className={`min-h-11 rounded-xl border-2 px-4 text-sm font-semibold ${
                value === option.label ? "border-brand-orange text-brand-orange" : "border-white/20 text-white/70"
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
          className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-white placeholder:text-white/30"
          rows={3}
        />
      )}

      {error && <p className="mt-2 text-sm text-orange-300">{error}</p>}
    </Card>
  );
}
