"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Question, Survey } from "@prisma/client";
import { QuestionField } from "./QuestionField";
import { ThankYou } from "./ThankYou";
import { submitResponseAction } from "@/app/encuesta/[slug]/actions";

export function SurveyForm({
  survey,
  questions,
}: {
  survey: Survey;
  questions: Question[];
}) {
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [respondentName, setRespondentName] = useState("");
  const [respondentPhone, setRespondentPhone] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const result = await submitResponseAction(survey.slug, answers, respondentName, respondentPhone);
    setSubmitting(false);

    if (!result.success) {
      setErrors(result.errors ?? {});
      return;
    }

    setErrors({});
    setSubmitted(true);
  }

  function goToSelector() {
    router.push("/");
  }

  if (submitted) {
    return <ThankYou onReset={goToSelector} />;
  }

  return (
    <main className="mx-auto min-h-screen max-w-lg bg-white px-4 py-10">
      <h1 className="mb-1 text-2xl font-extrabold text-brand-navy">{survey.title}</h1>
      {survey.description && <p className="mb-6 text-gray-500">{survey.description}</p>}

      <form onSubmit={handleSubmit}>
        {questions.map((question) => (
          <QuestionField
            key={question.id}
            question={question}
            value={answers[question.id]}
            error={errors[question.id]}
            onChange={(value) => setAnswers((prev) => ({ ...prev, [question.id]: value }))}
          />
        ))}

        <div className="mb-6">
          <p className="mb-2 font-semibold text-brand-navy">Nombre (opcional)</p>
          <input
            value={respondentName}
            onChange={(e) => setRespondentName(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </div>
        <div className="mb-6">
          <p className="mb-2 font-semibold text-brand-navy">Teléfono (opcional)</p>
          <input
            value={respondentPhone}
            onChange={(e) => setRespondentPhone(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </div>

        {errors._form && <p className="mb-4 text-sm text-brand-orange">{errors._form}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-brand-orange py-3 text-lg font-bold text-white disabled:opacity-60"
        >
          {submitting ? "Enviando..." : "Enviar"}
        </button>
      </form>
    </main>
  );
}
