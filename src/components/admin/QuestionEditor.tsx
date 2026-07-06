"use client";

import { useEffect, useState } from "react";
import type { Question, QuestionType } from "@prisma/client";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import {
  addQuestionAction,
  updateQuestionAction,
  deleteQuestionAction,
  reorderQuestionsAction,
} from "@/app/admin/encuestas/[id]/actions";
import { ImageUploadField } from "./ImageUploadField";
import { QuestionOptionsEditor, type OptionRow } from "./QuestionOptionsEditor";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

function optionRowsFromQuestion(question: Question): OptionRow[] {
  if (!Array.isArray(question.options)) return [];
  return (question.options as { label: string; imageId?: string }[]).map((o, i) => ({
    key: `existing-${i}`,
    label: o.label,
    imageId: o.imageId,
  }));
}

export function QuestionEditor({
  surveyId,
  questions: initialQuestions,
}: {
  surveyId: string;
  questions: Question[];
}) {
  const [questions, setQuestions] = useState(initialQuestions);
  const [editingId, setEditingId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    setQuestions(initialQuestions);
  }, [initialQuestions]);

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = questions.findIndex((q) => q.id === active.id);
    const newIndex = questions.findIndex((q) => q.id === over.id);
    const reordered = arrayMove(questions, oldIndex, newIndex);
    setQuestions(reordered);
    await reorderQuestionsAction(surveyId, reordered.map((q) => q.id));
  }

  return (
    <div className="space-y-3">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={questions.map((q) => q.id)} strategy={verticalListSortingStrategy}>
          {questions.map((question) => (
            <SortableQuestionRow
              key={question.id}
              question={question}
              surveyId={surveyId}
              isEditing={editingId === question.id}
              onEdit={() => setEditingId(question.id)}
              onCancelEdit={() => setEditingId(null)}
            />
          ))}
        </SortableContext>
      </DndContext>

      <Card variant="solid" className="space-y-2 border-dashed p-4">
        <form action={addQuestionAction} className="space-y-2">
          <input type="hidden" name="surveyId" value={surveyId} />
          <p className="text-sm font-semibold text-brand-navy">Agregar pregunta</p>
          <select name="type" className="rounded-lg border border-system-separator px-2 py-1 text-sm">
            {Object.entries(QUESTION_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <input
            name="text"
            placeholder="Texto de la pregunta"
            required
            className="block w-full rounded-lg border border-system-separator px-2 py-1 text-sm"
          />
          <ImageUploadField name="question" label="Imagen general de la pregunta (opcional)" />
          <QuestionOptionsEditor initialOptions={[]} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="required" defaultChecked />
            Obligatoria
          </label>
          <Button type="submit">Agregar</Button>
        </form>
      </Card>
    </div>
  );
}

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  RATING_STARS: "Calificación (estrellas 1-5)",
  MULTIPLE_CHOICE: "Opción múltiple",
  TEXT: "Texto libre",
  YES_NO: "Sí / No",
  NPS: "NPS (0-10)",
};

function SortableQuestionRow({
  question,
  surveyId,
  isEditing,
  onEdit,
  onCancelEdit,
}: {
  question: Question;
  surveyId: string;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: question.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style}>
      <Card variant="solid" className="p-4">
        {isEditing ? (
          <form
            action={async (formData) => {
              await updateQuestionAction(formData);
              onCancelEdit();
            }}
            className="space-y-2"
          >
            <input type="hidden" name="id" value={question.id} />
            <input type="hidden" name="surveyId" value={surveyId} />
            <select
              name="type"
              defaultValue={question.type}
              className="rounded-lg border border-system-separator px-2 py-1 text-sm"
            >
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
              className="block w-full rounded-lg border border-system-separator px-2 py-1 text-sm"
            />
            <ImageUploadField
              name="question"
              label="Imagen general de la pregunta (opcional)"
              existingImageId={question.imageId}
            />
            <QuestionOptionsEditor initialOptions={optionRowsFromQuestion(question)} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="required" defaultChecked={question.required} />
              Obligatoria
            </label>
            <div className="flex gap-2">
              <Button type="submit">Guardar</Button>
              <Button type="button" variant="secondary" onClick={onCancelEdit}>
                Cancelar
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-2">
              <span
                {...attributes}
                {...listeners}
                aria-label="Reordenar pregunta"
                className="mt-1 cursor-grab select-none text-gray-300"
              >
                <GripVertical size={18} />
              </span>
              <div>
                <p className="font-semibold text-brand-navy">{question.text}</p>
                <p className="text-xs text-system-secondary">
                  {QUESTION_TYPE_LABELS[question.type]} · {question.required ? "Obligatoria" : "Opcional"}
                </p>
              </div>
            </div>
            <div className="flex gap-2 text-sm">
              <button onClick={onEdit} className="text-brand-orange">
                Editar
              </button>
              <form action={deleteQuestionAction.bind(null, question.id, surveyId)}>
                <button className="text-system-secondary hover:text-brand-orange">Eliminar</button>
              </form>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
