"use client";

import { useState } from "react";
import type { Question, QuestionType } from "@prisma/client";
import {
  addQuestionAction,
  updateQuestionAction,
  deleteQuestionAction,
} from "@/app/admin/encuestas/[id]/actions";

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  RATING_STARS: "Calificación (estrellas 1-5)",
  MULTIPLE_CHOICE: "Opción múltiple",
  TEXT: "Texto libre",
  YES_NO: "Sí / No",
  NPS: "NPS (0-10)",
};

export function QuestionEditor({
  surveyId,
  questions,
}: {
  surveyId: string;
  questions: Question[];
}) {
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {questions.map((question) => (
        <div key={question.id} className="rounded-lg border border-gray-200 bg-white p-4">
          {editingId === question.id ? (
            <form
              action={async (formData) => {
                await updateQuestionAction(formData);
                setEditingId(null);
              }}
              className="space-y-2"
            >
              <input type="hidden" name="id" value={question.id} />
              <input type="hidden" name="surveyId" value={surveyId} />
              <select name="type" defaultValue={question.type} className="rounded border px-2 py-1 text-sm">
                {Object.entries(QUESTION_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <input
                name="text"
                defaultValue={question.text}
                required
                className="block w-full rounded border px-2 py-1 text-sm"
              />
              <input
                name="options"
                defaultValue={
                  Array.isArray(question.options) ? (question.options as string[]).join(", ") : ""
                }
                placeholder="Opciones separadas por coma (solo opción múltiple)"
                className="block w-full rounded border px-2 py-1 text-sm"
              />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="required" defaultChecked={question.required} />
                Obligatoria
              </label>
              <div className="flex gap-2">
                <button className="rounded bg-shogun-red px-3 py-1 text-sm font-bold text-white">
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="rounded border px-3 py-1 text-sm"
                >
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-shogun-black">{question.text}</p>
                <p className="text-xs text-gray-500">
                  {QUESTION_TYPE_LABELS[question.type]} · {question.required ? "Obligatoria" : "Opcional"}
                </p>
              </div>
              <div className="flex gap-2 text-sm">
                <button onClick={() => setEditingId(question.id)} className="text-shogun-red">
                  Editar
                </button>
                <form action={deleteQuestionAction.bind(null, question.id, surveyId)}>
                  <button className="text-gray-400 hover:text-shogun-red">Eliminar</button>
                </form>
              </div>
            </div>
          )}
        </div>
      ))}

      <form action={addQuestionAction} className="space-y-2 rounded-lg border border-dashed border-gray-300 p-4">
        <input type="hidden" name="surveyId" value={surveyId} />
        <p className="text-sm font-semibold text-shogun-black">Agregar pregunta</p>
        <select name="type" className="rounded border px-2 py-1 text-sm">
          {Object.entries(QUESTION_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <input name="text" placeholder="Texto de la pregunta" required className="block w-full rounded border px-2 py-1 text-sm" />
        <input
          name="options"
          placeholder="Opciones separadas por coma (solo opción múltiple)"
          className="block w-full rounded border px-2 py-1 text-sm"
        />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="required" defaultChecked />
          Obligatoria
        </label>
        <button className="rounded bg-shogun-black px-3 py-1 text-sm font-bold text-white">
          Agregar
        </button>
      </form>
    </div>
  );
}
