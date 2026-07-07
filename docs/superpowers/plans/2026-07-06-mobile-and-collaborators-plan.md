# Mobile Responsiveness, Phone Field Polish, and Collaborator Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the admin panel fully responsive on mobile, polish the phone-number field for mobile input, and add a per-survey "collaborator" (staff member) concept with a photo+name selection screen shown before the survey questions, fully manageable from the admin panel.

**Architecture:** A new `Collaborator` Prisma model (per-survey, with photo + name + order) feeds a new admin CRUD component (`CollaboratorEditor`, mirroring the existing `QuestionEditor`'s drag-reorder pattern) and a new public-flow step component (`CollaboratorStep`) inserted into `SurveyForm` before the questions. The admin shell gets a mobile drawer for its sidebar, and the results table gets a stacked-card layout below the `md` breakpoint. No existing question/answer data model changes.

**Tech Stack:** Next.js 16 (App Router, Server Actions), Prisma 6 + PostgreSQL, `@dnd-kit` (drag-and-drop, already in use), Tailwind CSS v4, Vitest.

---

### Task 1: Database — Collaborator model

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add the `Collaborator` model and relations**

In `prisma/schema.prisma`, add `collaborators Collaborator[]` to the `Survey` model (right after the existing `responses Response[]` line):

```prisma
model Survey {
  id              String     @id @default(cuid())
  slug            String     @unique
  title           String
  description     String?
  emoji           String?
  isActive        Boolean    @default(true)
  order           Int        @default(0)
  factorySnapshot Json?
  questions       Question[]
  responses       Response[]
  collaborators   Collaborator[]
  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt
}
```

Add `collaboratorId`/`collaborator` fields to the `Response` model (right after `respondentPhone`):

```prisma
model Response {
  id              String        @id @default(cuid())
  surveyId        String
  survey          Survey        @relation(fields: [surveyId], references: [id], onDelete: Cascade)
  respondentName  String?
  respondentPhone String?
  collaboratorId  String?
  collaborator    Collaborator? @relation(fields: [collaboratorId], references: [id], onDelete: SetNull)
  answers         Answer[]
  createdAt       DateTime      @default(now())
}
```

Add a new `Collaborator` model at the end of the file (after `Response`, before `Answer`, or anywhere after `Survey` — Prisma doesn't care about declaration order):

```prisma
model Collaborator {
  id        String     @id @default(cuid())
  surveyId  String
  survey    Survey     @relation(fields: [surveyId], references: [id], onDelete: Cascade)
  name      String
  imageId   String?
  order     Int        @default(0)
  responses Response[]
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
}
```

- [ ] **Step 2: Run the migration**

Run: `npx prisma migrate dev --name add_collaborators`
Expected: Prisma creates a new migration folder under `prisma/migrations/`, applies it to the dev database, and regenerates `@prisma/client`. Output should end with something like `Your database is now in sync with your schema.`

- [ ] **Step 3: Verify the client picks up the new model**

Run: `node -e "const {PrismaClient} = require('@prisma/client'); const db = new PrismaClient(); console.log(typeof db.collaborator.findMany); db.$disconnect();"`
Expected: prints `function`

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: add Collaborator model and Response.collaboratorId"
```

---

### Task 2: Collaborator-step helper (TDD)

**Files:**
- Create: `src/lib/surveys/collaborator-step.ts`
- Test: `tests/unit/collaborator-step.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from "vitest";
import { shouldShowCollaboratorStep } from "@/lib/surveys/collaborator-step";

describe("shouldShowCollaboratorStep", () => {
  it("returns false when there are no collaborators", () => {
    expect(shouldShowCollaboratorStep(0)).toBe(false);
  });

  it("returns true when there is at least one collaborator", () => {
    expect(shouldShowCollaboratorStep(1)).toBe(true);
    expect(shouldShowCollaboratorStep(5)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/collaborator-step.test.ts`
Expected: FAIL with "Failed to resolve import" or "shouldShowCollaboratorStep is not a function" (the module doesn't exist yet)

- [ ] **Step 3: Write minimal implementation**

```typescript
export function shouldShowCollaboratorStep(collaboratorCount: number): boolean {
  return collaboratorCount > 0;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/collaborator-step.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/surveys/collaborator-step.ts tests/unit/collaborator-step.test.ts
git commit -m "feat: add shouldShowCollaboratorStep helper"
```

---

### Task 3: Avatar component — light/dark fallback variant

**Files:**
- Modify: `src/components/ui/Avatar.tsx`

**Why:** `Avatar`'s no-photo fallback currently uses `bg-white/15 text-white/70`, designed for the dark glass public survey theme. Task 5 reuses `Avatar` inside the light-themed admin panel, where those colors would render nearly invisible on a white card. Add a `variant` prop so both contexts get a fallback that's actually visible.

- [ ] **Step 1: Replace the file**

Replace the entire contents of `src/components/ui/Avatar.tsx`:

```tsx
import { User } from "lucide-react";

const FALLBACK_CLASSES = {
  dark: "bg-white/15 text-white/70",
  light: "bg-system-background text-system-secondary",
};

export function Avatar({
  imageId,
  label,
  size = 56,
  variant = "dark",
}: {
  imageId?: string;
  label?: string;
  size?: number;
  variant?: "dark" | "light";
}) {
  if (imageId) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/api/images/${imageId}`}
        alt={label ?? "Foto de perfil"}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className={`flex items-center justify-center rounded-full ${FALLBACK_CLASSES[variant]}`}
      style={{ width: size, height: size }}
      aria-label="Foto de perfil"
    >
      <User size={Math.round(size * 0.45)} />
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds (existing callers in `QuestionField.tsx` don't pass `variant`, so they keep the default `"dark"` behavior unchanged).

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/Avatar.tsx
git commit -m "feat: add light/dark fallback variant to Avatar"
```

---

### Task 4: Admin Server Actions — collaborator CRUD + factory snapshot

**Files:**
- Modify: `src/app/admin/encuestas/[id]/actions.ts`
- Modify: `src/app/admin/encuestas/nueva/actions.ts`

**Context:** `src/app/admin/encuestas/[id]/actions.ts` already has `createImage`, `isValidImageFile`, `resolveImageId` helpers used by the question actions — reuse them for collaborator photos. The file also defines `FactorySnapshot`/`resetSurveyAction`, which must be extended to include collaborators so the existing "reset survey" admin feature also restores them.

- [ ] **Step 1: Add collaborator image resolver and CRUD actions**

In `src/app/admin/encuestas/[id]/actions.ts`, add this right after the existing `resolveOptionsFromFormData` function (before `addQuestionAction`):

```typescript
async function resolveCollaboratorImageId(
  formData: FormData,
  existingImageId: string | null
): Promise<string | null> {
  const file = formData.get("collaboratorImage");
  const removeImage = String(formData.get("collaboratorRemoveImage") ?? "") === "true";
  const newImageId = file instanceof File && isValidImageFile(file) ? await createImage(file) : null;
  return resolveImageId({ existingImageId, removeImage, newImageId }) ?? null;
}

export async function addCollaboratorAction(formData: FormData) {
  const surveyId = String(formData.get("surveyId"));
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const imageId = await resolveCollaboratorImageId(formData, null);

  const maxOrder = await db.collaborator.aggregate({
    where: { surveyId },
    _max: { order: true },
  });

  await db.collaborator.create({
    data: {
      surveyId,
      name,
      imageId,
      order: (maxOrder._max.order ?? -1) + 1,
    },
  });

  revalidatePath(`/admin/encuestas/${surveyId}`);
}

export async function updateCollaboratorAction(formData: FormData) {
  const id = String(formData.get("id"));
  const surveyId = String(formData.get("surveyId"));
  const name = String(formData.get("name") ?? "").trim();
  const existingImageId = String(formData.get("collaboratorExistingImageId") ?? "") || null;

  if (!name) return;

  const imageId = await resolveCollaboratorImageId(formData, existingImageId);

  await db.collaborator.update({
    where: { id },
    data: { name, imageId },
  });

  revalidatePath(`/admin/encuestas/${surveyId}`);
}

export async function deleteCollaboratorAction(id: string, surveyId: string) {
  await db.collaborator.delete({ where: { id } });
  revalidatePath(`/admin/encuestas/${surveyId}`);
}

export async function reorderCollaboratorsAction(surveyId: string, orderedIds: string[]) {
  await db.$transaction(
    orderedIds.map((id, index) => db.collaborator.update({ where: { id }, data: { order: index } }))
  );
  revalidatePath(`/admin/encuestas/${surveyId}`);
}
```

- [ ] **Step 2: Extend the factory snapshot type and reset action**

In the same file, replace the existing `FactorySnapshot` type and `resetSurveyAction`:

```typescript
type FactorySnapshotQuestion = {
  type: QuestionType;
  text: string;
  required: boolean;
  order: number;
  options: Prisma.JsonValue | null;
};

type FactorySnapshotCollaborator = {
  name: string;
  imageId: string | null;
  order: number;
};

type FactorySnapshot = {
  title: string;
  description: string | null;
  emoji: string | null;
  questions: FactorySnapshotQuestion[];
  collaborators?: FactorySnapshotCollaborator[];
};

export async function resetSurveyAction(surveyId: string) {
  const survey = await db.survey.findUnique({ where: { id: surveyId } });
  if (!survey || !survey.factorySnapshot) return;

  const snapshot = survey.factorySnapshot as unknown as FactorySnapshot;

  await db.$transaction([
    db.response.deleteMany({ where: { surveyId } }),
    db.question.deleteMany({ where: { surveyId } }),
    db.collaborator.deleteMany({ where: { surveyId } }),
    db.survey.update({
      where: { id: surveyId },
      data: {
        title: snapshot.title,
        description: snapshot.description,
        emoji: snapshot.emoji,
        questions: {
          create: snapshot.questions.map((q) => ({
            type: q.type,
            text: q.text,
            required: q.required,
            order: q.order,
            options: q.options ?? undefined,
          })),
        },
        collaborators: {
          // snapshot.collaborators is optional: surveys created before this feature existed
          // won't have it in their stored factorySnapshot JSON
          create: (snapshot.collaborators ?? []).map((c) => ({
            name: c.name,
            imageId: c.imageId ?? undefined,
            order: c.order,
          })),
        },
      },
    }),
  ]);

  revalidatePath(`/admin/encuestas/${surveyId}`);
}
```

- [ ] **Step 3: Include collaborators in the factory snapshot at survey creation**

In `src/app/admin/encuestas/nueva/actions.ts`, update the `factorySnapshot` object inside `createSurveyAction`:

```typescript
  const survey = await db.survey.create({
    data: {
      title,
      description: description || null,
      emoji: emoji || null,
      slug,
      order: (maxOrder._max.order ?? -1) + 1,
      factorySnapshot: {
        title,
        description: description || null,
        emoji: emoji || null,
        questions: [],
        collaborators: [],
      },
    },
  });
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: Build succeeds, no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/encuestas/[id]/actions.ts src/app/admin/encuestas/nueva/actions.ts
git commit -m "feat: add collaborator CRUD actions and extend factory snapshot"
```

---

### Task 5: CollaboratorEditor admin component

**Files:**
- Create: `src/components/admin/CollaboratorEditor.tsx`
- Modify: `src/app/admin/encuestas/[id]/page.tsx`

**Context:** Mirrors the existing `QuestionEditor.tsx`'s drag-reorderable list pattern (`@dnd-kit`, `PointerSensor`, `useSortable`) but simpler — collaborators only have a name and a photo, no type/options.

- [ ] **Step 1: Create the component**

```tsx
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
```

- [ ] **Step 2: Wire it into the survey editor page**

In `src/app/admin/encuestas/[id]/page.tsx`, add the import and include `collaborators` in the query, then render `CollaboratorEditor` above `QuestionEditor`:

```tsx
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { QuestionEditor } from "@/components/admin/QuestionEditor";
import { CollaboratorEditor } from "@/components/admin/CollaboratorEditor";
import { generateQrDataUrl } from "@/lib/qr";
import { ShareLink } from "@/components/admin/ShareLink";
import { SurveyInfoEditor } from "@/components/admin/SurveyInfoEditor";
import { ResetSurveyButton } from "@/components/admin/ResetSurveyButton";
import { Badge } from "@/components/ui/Badge";
import { toggleSurveyActiveAction } from "./actions";

export default async function SurveyEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const survey = await db.survey.findUnique({
    where: { id },
    include: {
      questions: { orderBy: { order: "asc" } },
      collaborators: { orderBy: { order: "asc" } },
    },
  });

  if (!survey) notFound();

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const publicUrl = `${baseUrl}/encuesta/${survey.slug}`;
  const qrDataUrl = await generateQrDataUrl(publicUrl);

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight text-brand-navy">
            {survey.emoji && <span className="mr-2">{survey.emoji}</span>}
            {survey.title}
          </h1>
          <p className="text-[13px] text-system-secondary">/encuesta/{survey.slug}</p>
        </div>
        <div className="flex items-center gap-3">
          <SurveyInfoEditor
            surveyId={survey.id}
            title={survey.title}
            description={survey.description}
            emoji={survey.emoji}
          />
          <form
            action={async () => {
              "use server";
              await toggleSurveyActiveAction(survey.id, !survey.isActive);
            }}
          >
            <button type="submit">
              <Badge tone={survey.isActive ? "success" : "neutral"}>
                {survey.isActive ? "Activa (click para desactivar)" : "Inactiva (click para activar)"}
              </Badge>
            </button>
          </form>
        </div>
      </div>

      <ShareLink url={publicUrl} qrDataUrl={qrDataUrl} />

      <div className="mb-6 flex items-center justify-between">
        <a href={`/admin/encuestas/${survey.id}/resultados`} className="text-sm font-semibold text-brand-orange">
          Ver resultados →
        </a>
        <ResetSurveyButton surveyId={survey.id} />
      </div>

      <CollaboratorEditor surveyId={survey.id} collaborators={survey.collaborators} />
      <QuestionEditor surveyId={survey.id} questions={survey.questions} />
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/CollaboratorEditor.tsx "src/app/admin/encuestas/[id]/page.tsx"
git commit -m "feat: add collaborator editor to survey admin page"
```

---

### Task 6: CollaboratorStep public component

**Files:**
- Create: `src/components/survey/CollaboratorStep.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { Avatar } from "@/components/ui/Avatar";

export type CollaboratorOption = { id: string; name: string; imageId: string | null };

export function CollaboratorStep({
  collaborators,
  onSelect,
}: {
  collaborators: CollaboratorOption[];
  onSelect: (collaboratorId: string | null) => void;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-navy to-brand-navy-dark px-4 pt-6 pb-10">
      <button
        type="button"
        onClick={() => onSelect(null)}
        className="mb-6 text-sm font-semibold text-white/60"
      >
        Omitir →
      </button>
      <h1 className="mb-6 text-[22px] font-extrabold text-white">¿Quién te atendió?</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {collaborators.map((collaborator) => (
          <button
            type="button"
            key={collaborator.id}
            onClick={() => onSelect(collaborator.id)}
            className="flex flex-col items-center gap-2 rounded-2xl bg-white/8 p-4 backdrop-blur-xl"
          >
            <Avatar imageId={collaborator.imageId ?? undefined} label={collaborator.name} size={72} />
            <span className="text-sm font-semibold text-white">{collaborator.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds (this component isn't wired into any page yet — that's Task 7 — so this step just confirms it compiles standalone).

- [ ] **Step 3: Commit**

```bash
git add src/components/survey/CollaboratorStep.tsx
git commit -m "feat: add CollaboratorStep public selection screen component"
```

---

### Task 7: Wire collaborator step into public survey flow + phone field mobile polish

**Files:**
- Modify: `src/app/encuesta/[slug]/page.tsx`
- Modify: `src/app/encuesta/[slug]/actions.ts`
- Modify: `src/components/survey/SurveyForm.tsx`

**Context:** `submitResponseAction`'s current signature is `(slug, answers, respondentName, respondentPhone)` — this task adds a 5th `collaboratorId: string | null` parameter. `SurveyForm` currently renders questions directly; this task adds a collaborator-selection step before them, shown only when the survey has at least one collaborator (via `shouldShowCollaboratorStep` from Task 2).

- [ ] **Step 1: Fetch collaborators and pass them to SurveyForm**

Replace the entire contents of `src/app/encuesta/[slug]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { SurveyForm } from "@/components/survey/SurveyForm";

export const dynamic = "force-dynamic";

export default async function PublicSurveyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const survey = await db.survey.findUnique({
    where: { slug },
    include: {
      questions: { orderBy: { order: "asc" } },
      collaborators: { orderBy: { order: "asc" } },
    },
  });

  if (!survey || !survey.isActive) notFound();

  return (
    <SurveyForm
      survey={survey}
      questions={survey.questions}
      collaborators={survey.collaborators.map((c) => ({
        id: c.id,
        name: c.name,
        imageId: c.imageId,
      }))}
    />
  );
}
```

- [ ] **Step 2: Extend submitResponseAction with a collaboratorId parameter**

Replace the entire contents of `src/app/encuesta/[slug]/actions.ts`:

```typescript
"use server";

import { db } from "@/lib/db";
import { validateAnswers, type QuestionForValidation } from "@/lib/surveys/validate-answers";

export type SubmitResult = { success: boolean; errors?: Record<string, string> };

export async function submitResponseAction(
  slug: string,
  answers: Record<string, unknown>,
  respondentName: string,
  respondentPhone: string,
  collaboratorId: string | null
): Promise<SubmitResult> {
  const survey = await db.survey.findUnique({
    where: { slug },
    include: { questions: true },
  });

  if (!survey || !survey.isActive) {
    return { success: false, errors: { _form: "Esta encuesta ya no está disponible" } };
  }

  const questionsForValidation: QuestionForValidation[] = survey.questions.map((q) => ({
    id: q.id,
    type: q.type,
    required: q.required,
    options: Array.isArray(q.options)
      ? (q.options as { label: string; imageId?: string }[]).map((o) => o.label)
      : null,
  }));

  const validation = validateAnswers(questionsForValidation, answers);
  if (!validation.valid) {
    return { success: false, errors: validation.errors };
  }

  await db.response.create({
    data: {
      surveyId: survey.id,
      respondentName: respondentName.trim() || null,
      respondentPhone: respondentPhone.trim() || null,
      collaboratorId,
      answers: {
        create: survey.questions
          .filter((q) => answers[q.id] !== undefined)
          .map((q) => ({ questionId: q.id, value: answers[q.id] as object | string | number | boolean })),
      },
    },
  });

  return { success: true };
}
```

- [ ] **Step 3: Add the collaborator step and phone field polish to SurveyForm**

Replace the entire contents of `src/components/survey/SurveyForm.tsx`:

```tsx
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
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add "src/app/encuesta/[slug]/page.tsx" "src/app/encuesta/[slug]/actions.ts" src/components/survey/SurveyForm.tsx
git commit -m "feat: add collaborator selection step and polish phone input for mobile"
```

---

### Task 8: Results — collaborator column + mobile stacked cards

**Files:**
- Modify: `src/app/admin/encuestas/[id]/resultados/page.tsx`
- Modify: `src/components/admin/ResultsTable.tsx`

- [ ] **Step 1: Include collaborator in the results query**

In `src/app/admin/encuestas/[id]/resultados/page.tsx`, update the `responses` query and `tableRows` mapping:

```tsx
  const responses = await db.response.findMany({
    where: {
      surveyId: id,
      createdAt: {
        gte: from ? new Date(from) : undefined,
        lte: to ? new Date(`${to}T23:59:59`) : undefined,
      },
    },
    include: { answers: true, collaborator: true },
    orderBy: { createdAt: "desc" },
  });

  const allAnswers = responses.flatMap((r) => r.answers.map((a) => ({ questionId: a.questionId, value: a.value })));
  const kpis = computeKpis(
    survey.questions.map((q) => ({ id: q.id, type: q.type, text: q.text })),
    allAnswers
  );

  const questionTextById = new Map(survey.questions.map((q) => [q.id, q.text]));
  const tableRows = responses.map((r) => ({
    id: r.id,
    createdAt: r.createdAt,
    respondentName: r.respondentName,
    collaboratorName: r.collaborator?.name ?? null,
    answers: r.answers.map((a) => ({
      questionText: questionTextById.get(a.questionId) ?? "?",
      value: a.value,
    })),
  }));
```

Also add `flex-wrap` to the date-filter form so it stacks on narrow screens instead of overflowing:

```tsx
      <form className="mb-6 flex flex-wrap items-end gap-3 rounded-2xl border border-system-separator bg-white p-4">
```

- [ ] **Step 2: Replace ResultsTable with a collaborator column and mobile card view**

Replace the entire contents of `src/components/admin/ResultsTable.tsx`:

```tsx
import { Card } from "@/components/ui/Card";

type Row = {
  id: string;
  createdAt: Date;
  respondentName: string | null;
  collaboratorName: string | null;
  answers: { questionText: string; value: unknown }[];
};

export function ResultsTable({ rows }: { rows: Row[] }) {
  return (
    <Card variant="solid" className="overflow-hidden">
      <table className="hidden w-full text-left text-sm md:table">
        <thead>
          <tr className="border-b border-system-separator text-system-secondary">
            <th className="p-3">Fecha</th>
            <th className="p-3">Nombre</th>
            <th className="p-3">Colaborador</th>
            <th className="p-3">Respuestas</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-system-separator">
              <td className="p-3 whitespace-nowrap">{row.createdAt.toISOString().slice(0, 10)}</td>
              <td className="p-3">{row.respondentName ?? "—"}</td>
              <td className="p-3">{row.collaboratorName ?? "—"}</td>
              <td className="p-3">
                <ul className="space-y-0.5">
                  {row.answers.map((a, i) => (
                    <li key={i}>
                      <span className="text-system-secondary">{a.questionText}:</span> {String(a.value)}
                    </li>
                  ))}
                </ul>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={4} className="p-6 text-center text-system-secondary">
                Sin respuestas en este rango de fechas
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="divide-y divide-system-separator md:hidden">
        {rows.map((row) => (
          <div key={row.id} className="space-y-1.5 p-4">
            <p className="text-xs text-system-secondary">{row.createdAt.toISOString().slice(0, 10)}</p>
            <p className="font-semibold text-brand-navy">{row.respondentName ?? "Anónimo"}</p>
            {row.collaboratorName && (
              <p className="text-xs text-system-secondary">Atendido por: {row.collaboratorName}</p>
            )}
            <ul className="space-y-0.5 text-sm">
              {row.answers.map((a, i) => (
                <li key={i}>
                  <span className="text-system-secondary">{a.questionText}:</span> {String(a.value)}
                </li>
              ))}
            </ul>
          </div>
        ))}
        {rows.length === 0 && (
          <p className="p-6 text-center text-sm text-system-secondary">Sin respuestas en este rango de fechas</p>
        )}
      </div>
    </Card>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add "src/app/admin/encuestas/[id]/resultados/page.tsx" src/components/admin/ResultsTable.tsx
git commit -m "feat: show collaborator in results and stack table as cards on mobile"
```

---

### Task 9: Admin mobile — sidebar drawer

**Files:**
- Create: `src/components/admin/MobileSidebarToggle.tsx`
- Modify: `src/app/admin/layout.tsx`
- Modify: `src/components/admin/Sidebar.tsx`

**Context:** `src/app/admin/layout.tsx` currently renders `<Sidebar />` (a Server Component, fixed `w-56`) directly next to the page content in a `flex` row — on a phone-width viewport this squeezes content into a sliver. `MobileSidebarToggle` is a Client Component that wraps `Sidebar` (passed as `children`, which works fine since Server Components can be passed as children into Client Components): below `md` it hides the sidebar behind a hamburger button and shows it as a slide-in overlay with a backdrop; at `md` and above it behaves exactly as before (no hamburger, sidebar always visible).

- [ ] **Step 1: Create the toggle wrapper**

```tsx
"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

export function MobileSidebarToggle({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir menú"
        className="fixed left-4 top-4 z-30 flex h-11 w-11 items-center justify-center rounded-xl bg-[#1b1f2b] text-white shadow-lg md:hidden"
      >
        <Menu size={20} />
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
        />
      )}

      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-y-0 left-0 z-50 transition-transform duration-200 md:static md:z-auto md:translate-x-0 md:transition-none ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(false);
          }}
          aria-label="Cerrar menú"
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 md:hidden"
        >
          <X size={18} />
        </button>
        {children}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Wire it into the admin layout**

Replace the entire contents of `src/app/admin/layout.tsx`:

```tsx
import { Sidebar } from "@/components/admin/Sidebar";
import { MobileSidebarToggle } from "@/components/admin/MobileSidebarToggle";

export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <MobileSidebarToggle>
        <Sidebar />
      </MobileSidebarToggle>
      <div className="flex-1 bg-system-background p-4 pt-20 md:p-6 md:pt-6">{children}</div>
    </div>
  );
}
```

- [ ] **Step 3: Make the sidebar fill the drawer height**

In `src/components/admin/Sidebar.tsx`, change the `<aside>` className to fill the full height of its drawer wrapper and scroll internally if content overflows:

```tsx
    <aside aria-label="Navegación de administración" className="h-full w-56 shrink-0 overflow-y-auto bg-[#1b1f2b] p-4 text-white">
```

(This replaces the existing `className="w-56 shrink-0 bg-[#1b1f2b] p-4 text-white"` — only `h-full` and `overflow-y-auto` are added, nothing else changes.)

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/MobileSidebarToggle.tsx src/app/admin/layout.tsx src/components/admin/Sidebar.tsx
git commit -m "feat: add mobile drawer for admin sidebar"
```

---

### Task 10: Full verification pass

**Files:** None (verification only).

- [ ] **Step 1: Run the full unit test suite**

Run: `npm test`
Expected: All tests pass, including the new `collaborator-step.test.ts`.

- [ ] **Step 2: Run a clean production build**

Run:
```bash
rm -rf .next
npm run build
```
Expected: Build succeeds with no type errors.

- [ ] **Step 3: Manual/scripted verification pass**

Using the same pragmatic approach as prior verification passes in this project (no real browser available — dev server + curl + direct Prisma script checks), confirm:

- A survey with zero collaborators still shows the questions screen immediately (no collaborator step, no regression for existing surveys).
- Adding a collaborator (name + photo) via the admin round-trips correctly: appears in the survey editor's "Colaboradores" list, and the public survey page for that survey's slug now shows the collaborator selection screen with the photo/name before the questions.
- Submitting a response after selecting a collaborator stores the correct `collaboratorId` on the created `Response` row (verify via a direct Prisma query).
- Submitting a response after tapping "Omitir" stores `collaboratorId: null`.
- The results page for that survey shows the collaborator's name in both the desktop table's "Colaborador" column and the mobile card view's "Atendido por:" line.
- Resetting the survey (via the existing "Resetear encuesta" button) removes the added collaborator and restores whatever collaborator list was in the factory snapshot (empty, if the survey was created before this feature or created without collaborators).
- The admin sidebar's mobile drawer markup is present: `MobileSidebarToggle`'s hamburger button (`md:hidden`), the backdrop (`md:hidden`), and the drawer's `md:static md:translate-x-0` classes all appear in the rendered HTML of any `/admin/*` page.
- The phone input has `type="tel"` in the rendered HTML of `/encuesta/<slug>`.
- Clean up any temporary test data created during this pass (survey/collaborator/response/image) so the database returns to its pre-verification state — check what already exists first, and do not touch or delete any pre-existing real data.

Note explicitly which items could only be checked via markup/DB inspection rather than actual visual/touch interaction (e.g., the drawer's slide animation, actual touch-drag reordering of collaborators, real responsive layout at a physical 375px viewport) — those need a human with a real device or browser dev tools.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: verify mobile responsiveness, phone polish, and collaborator selection" --allow-empty
```
