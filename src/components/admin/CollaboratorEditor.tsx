"use client";

import { useEffect, useState } from "react";
import type { Collaborator } from "@prisma/client";
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
  addCollaboratorAction,
  updateCollaboratorAction,
  deleteCollaboratorAction,
  reorderCollaboratorsAction,
} from "@/app/admin/encuestas/[id]/actions";
import { ImageUploadField } from "./ImageUploadField";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export function CollaboratorEditor({
  surveyId,
  collaborators: initialCollaborators,
}: {
  surveyId: string;
  collaborators: Collaborator[];
}) {
  const [collaborators, setCollaborators] = useState(initialCollaborators);
  const [editingId, setEditingId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    setCollaborators(initialCollaborators);
  }, [initialCollaborators]);

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = collaborators.findIndex((c) => c.id === active.id);
    const newIndex = collaborators.findIndex((c) => c.id === over.id);
    const reordered = arrayMove(collaborators, oldIndex, newIndex);
    setCollaborators(reordered);
    await reorderCollaboratorsAction(surveyId, reordered.map((c) => c.id));
  }

  return (
    <div className="mb-6 space-y-3">
      <p className="text-sm font-semibold text-brand-navy">Colaboradores</p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={collaborators.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {collaborators.map((collaborator) => (
            <SortableCollaboratorRow
              key={collaborator.id}
              collaborator={collaborator}
              surveyId={surveyId}
              isEditing={editingId === collaborator.id}
              onEdit={() => setEditingId(collaborator.id)}
              onCancelEdit={() => setEditingId(null)}
            />
          ))}
        </SortableContext>
      </DndContext>

      <Card variant="solid" className="space-y-2 border-dashed p-4">
        <form action={addCollaboratorAction} className="space-y-2">
          <input type="hidden" name="surveyId" value={surveyId} />
          <p className="text-sm font-semibold text-brand-navy">Agregar colaborador</p>
          <input
            name="name"
            placeholder="Nombre del colaborador"
            required
            className="block w-full rounded-lg border border-system-separator px-2 py-1 text-sm"
          />
          <ImageUploadField name="collaborator" label="Foto (opcional)" />
          <Button type="submit">Agregar</Button>
        </form>
      </Card>
    </div>
  );
}

function SortableCollaboratorRow({
  collaborator,
  surveyId,
  isEditing,
  onEdit,
  onCancelEdit,
}: {
  collaborator: Collaborator;
  surveyId: string;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: collaborator.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style}>
      <Card variant="solid" className="p-4">
        {isEditing ? (
          <form
            action={async (formData) => {
              await updateCollaboratorAction(formData);
              onCancelEdit();
            }}
            className="space-y-2"
          >
            <input type="hidden" name="id" value={collaborator.id} />
            <input type="hidden" name="surveyId" value={surveyId} />
            <input
              name="name"
              defaultValue={collaborator.name}
              required
              className="block w-full rounded-lg border border-system-separator px-2 py-1 text-sm"
            />
            <ImageUploadField
              name="collaborator"
              label="Foto (opcional)"
              existingImageId={collaborator.imageId}
            />
            <div className="flex gap-2">
              <Button type="submit">Guardar</Button>
              <Button type="button" variant="secondary" onClick={onCancelEdit}>
                Cancelar
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <span
                {...attributes}
                {...listeners}
                aria-label="Reordenar colaborador"
                className="cursor-grab select-none text-gray-300"
              >
                <GripVertical size={18} />
              </span>
              <Avatar
                imageId={collaborator.imageId ?? undefined}
                label={collaborator.name}
                size={40}
                variant="light"
              />
              <p className="font-semibold text-brand-navy">{collaborator.name}</p>
            </div>
            <div className="flex gap-2 text-sm">
              <button onClick={onEdit} className="text-brand-orange">
                Editar
              </button>
              <form action={deleteCollaboratorAction.bind(null, collaborator.id, surveyId)}>
                <button className="text-system-secondary hover:text-brand-orange">Eliminar</button>
              </form>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
