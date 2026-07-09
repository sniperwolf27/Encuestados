"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import type { Question, Survey } from "@prisma/client";
import { QuestionField } from "./QuestionField";
import { ThankYou } from "./ThankYou";
import { CollaboratorStep, type CollaboratorOption } from "./CollaboratorStep";
import { Button } from "@/components/ui/Button";
import { submitResponseAction } from "@/app/encuesta/[slug]/actions";
import { shouldShowCollaboratorStep } from "@/lib/surveys/collaborator-step";

export function SurveyForm({
  survey,
  questions,
  collaborators,
}: {
  survey: Survey;
  questions: Question[];
  collaborators: CollaboratorOption[];
}) {
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [respondentName, setRespondentName] = useState("");
  const [respondentPhone, setRespondentPhone] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [collaboratorId, setCollaboratorId] = useState<string | null>(null);
  const [collaboratorStepDone, setCollaboratorStepDone] = useState(
    !shouldShowCollaboratorStep(collaborators.length)
  );
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const result = await submitResponseAction(
      survey.slug,
      answers,
      respondentName,
      respondentPhone,
      collaboratorId
    );
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

  if (!collaboratorStepDone) {
    return (
      <CollaboratorStep
        collaborators={collaborators}
        required={survey.collaboratorRequired}
        onSelect={(id) => {
          setCollaboratorId(id);
          setCollaboratorStepDone(true);
        }}
      />
    );
  }

  return (
    <motion.main
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-gradient-to-b from-brand-navy to-brand-navy-dark px-4 pb-28 pt-6"
    >
      <h1 className="mb-1 text-[28px] font-extrabold tracking-tight text-white">{survey.title}</h1>
      {survey.description && <p className="mb-5 text-[14px] text-white/55">{survey.description}</p>}

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

        <div className="mb-3.5 rounded-2xl bg-white/8 p-[18px] backdrop-blur-xl">
          <p className="mb-2 text-[15px] font-semibold text-white">Nombre (opcional)</p>
          <input
            value={respondentName}
            onChange={(e) => setRespondentName(e.target.value)}
            className="mb-4 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-white placeholder:text-white/30"
          />
          <p className="mb-2 text-[15px] font-semibold text-white">Teléfono (opcional)</p>
          <input
            type="tel"
            inputMode="numeric"
            autoComplete="off"
            value={respondentPhone}
            onChange={(e) => setRespondentPhone(e.target.value)}
            className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-white placeholder:text-white/30"
          />
        </div>

        {errors._form && <p className="mb-4 text-sm text-orange-300">{errors._form}</p>}

        <div className="fixed inset-x-0 bottom-0 bg-gradient-to-t from-brand-navy-dark via-brand-navy-dark/95 to-transparent p-4 pt-8">
          <Button
            type="submit"
            disabled={submitting}
            size="large"
            className="w-full shadow-lg shadow-brand-orange/30"
          >
            {submitting ? "Enviando..." : "Enviar respuesta"}
          </Button>
        </div>
      </form>
    </motion.main>
  );
}
