# Imágenes en Preguntas y Emoji por Encuesta Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add image attachments to questions (general question image + per-option photos for multiple-choice), a free-text emoji per survey shown in the selector/sidebar, an inline editor for survey title/description/emoji, and a "reset survey" button that wipes responses and restores title/description/emoji/questions from a snapshot captured at creation time.

**Architecture:** Images are stored as bytes directly in Postgres (new `Image` model) and served through a plain route handler (`GET /api/images/[id]`) that any `<img src>` can point to — no external storage service. `Question.options` (JSON) changes shape from `string[]` to `{ label, imageId? }[]`. A `Survey.factorySnapshot` (JSON) captured at creation time powers the reset feature. A pre-existing bug (the question editor's local state doesn't resync when the server sends fresh props) is fixed first, since the reset feature depends on the list re-rendering correctly without a manual page reload.

**Tech Stack:** Same as the existing app (Next.js 16 App Router, Prisma 6 + PostgreSQL, Vitest). No new dependencies — file uploads use Next.js Server Actions' native `FormData`/`File` support.

---

## Task 1: Fix QuestionEditor stale-state bug (prerequisite for reset feature)

**Files:**
- Modify: `src/components/admin/QuestionEditor.tsx`

**Why now:** `QuestionEditor` seeds `useState(initialQuestions)` once and never re-syncs when the server sends a new `questions` prop after a revalidation (add/edit/delete/reorder/reset). Today this is masked by "refresh the page to see it" — but the new reset button needs the list to update immediately without a manual reload.

- [ ] **Step 1: Add a `useEffect` that re-syncs local state from props**

Edit `src/components/admin/QuestionEditor.tsx`. Add `useEffect` to the import from `"react"`:

```tsx
import { useEffect, useState } from "react";
```

Add this effect right after the `useState` declarations inside `QuestionEditor`:

```tsx
  const [questions, setQuestions] = useState(initialQuestions);
  const [editingId, setEditingId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    setQuestions(initialQuestions);
  }, [initialQuestions]);
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/QuestionEditor.tsx
git commit -m "fix: resync question list state when server sends fresh props

Previously the question editor only read initialQuestions once via
useState, so adding/deleting/resetting questions required a manual
page reload to see the change reflected."
```

---

## Task 2: Prisma schema changes

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add the Image model and new fields**

Edit `prisma/schema.prisma`. Add a new `Image` model (anywhere, e.g. right after `AdminUser`):

```prisma
model Image {
  id        String   @id @default(cuid())
  data      Bytes
  mimeType  String
  createdAt DateTime @default(now())
}
```

Update the `Survey` model to add `emoji` and `factorySnapshot`:

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
  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt
}
```

Update the `Question` model to add `imageId` (a plain nullable column, not a Prisma relation — consistent with the soft-reference approach already used for image ids inside the `options` JSON; there is no cleanup/cascade logic for orphaned images in this feature):

```prisma
model Question {
  id        String       @id @default(cuid())
  surveyId  String
  survey    Survey       @relation(fields: [surveyId], references: [id], onDelete: Cascade)
  type      QuestionType
  text      String
  required  Boolean      @default(true)
  order     Int          @default(0)
  options   Json?
  imageId   String?
  answers   Answer[]
  createdAt DateTime     @default(now())
  updatedAt DateTime     @updatedAt
}
```

- [ ] **Step 2: Run the migration**

Run: `npx prisma migrate dev --name add_images_emoji_snapshot`
Expected: "Your database is now in sync with your schema." A new folder appears under `prisma/migrations/`.

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: add Image model, Survey.emoji/factorySnapshot, Question.imageId"
```

---

## Task 3: Image validation utility (TDD)

**Files:**
- Create: `src/lib/images.ts`
- Test: `tests/unit/images.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/images.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { isValidImageFile, resolveImageId, MAX_IMAGE_BYTES } from "@/lib/images";

function makeFile(type: string, size: number): File {
  return new File([new Uint8Array(size)], "test", { type });
}

describe("isValidImageFile", () => {
  it("accepts a jpeg under the size limit", () => {
    expect(isValidImageFile(makeFile("image/jpeg", 1024))).toBe(true);
  });

  it("rejects disallowed mime types", () => {
    expect(isValidImageFile(makeFile("application/pdf", 1024))).toBe(false);
  });

  it("rejects files over the size limit", () => {
    expect(isValidImageFile(makeFile("image/png", MAX_IMAGE_BYTES + 1))).toBe(false);
  });

  it("rejects empty files", () => {
    expect(isValidImageFile(makeFile("image/png", 0))).toBe(false);
  });
});

describe("resolveImageId", () => {
  it("prefers a newly uploaded image over everything else", () => {
    const result = resolveImageId({ existingImageId: "old", removeImage: false, newImageId: "new" });
    expect(result).toBe("new");
  });

  it("returns undefined when the remove flag is set and there is no new image", () => {
    const result = resolveImageId({ existingImageId: "old", removeImage: true, newImageId: null });
    expect(result).toBeUndefined();
  });

  it("keeps the existing image when nothing changed", () => {
    const result = resolveImageId({ existingImageId: "old", removeImage: false, newImageId: null });
    expect(result).toBe("old");
  });

  it("returns undefined when there was never an image", () => {
    const result = resolveImageId({ existingImageId: null, removeImage: false, newImageId: null });
    expect(result).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/images.test.ts`
Expected: FAIL — cannot find module `@/lib/images`.

- [ ] **Step 3: Implement the module**

Create `src/lib/images.ts`:

```typescript
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function isValidImageFile(file: File): boolean {
  return ALLOWED_IMAGE_TYPES.includes(file.type) && file.size > 0 && file.size <= MAX_IMAGE_BYTES;
}

export function resolveImageId(params: {
  existingImageId: string | null;
  removeImage: boolean;
  newImageId: string | null;
}): string | undefined {
  if (params.newImageId) return params.newImageId;
  if (params.removeImage) return undefined;
  return params.existingImageId ?? undefined;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/images.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/images.ts tests/unit/images.test.ts
git commit -m "feat: add image validation and image-id resolution utilities"
```

---

## Task 4: Survey option helpers (TDD)

**Files:**
- Create: `src/lib/surveys/options.ts`
- Test: `tests/unit/options.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/options.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { buildOptionsFromRows } from "@/lib/surveys/options";

describe("buildOptionsFromRows", () => {
  it("pairs labels with their resolved image ids", () => {
    const result = buildOptionsFromRows(["Ana", "Luis"], ["img1", null]);
    expect(result).toEqual([{ label: "Ana", imageId: "img1" }, { label: "Luis", imageId: undefined }]);
  });

  it("trims labels and drops blank ones", () => {
    const result = buildOptionsFromRows(["  Ana  ", "   ", "Luis"], [null, null, null]);
    expect(result).toEqual([{ label: "Ana", imageId: undefined }, { label: "Luis", imageId: undefined }]);
  });

  it("returns an empty array when there are no rows", () => {
    expect(buildOptionsFromRows([], [])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/options.test.ts`
Expected: FAIL — cannot find module `@/lib/surveys/options`.

- [ ] **Step 3: Implement the module**

Create `src/lib/surveys/options.ts`:

```typescript
export type SurveyOption = { label: string; imageId?: string };

export function buildOptionsFromRows(
  labels: string[],
  imageIds: (string | null)[]
): SurveyOption[] {
  return labels
    .map((label, i) => ({ label: label.trim(), imageId: imageIds[i] ?? undefined }))
    .filter((option) => option.label.length > 0);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/options.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/surveys/options.ts tests/unit/options.test.ts
git commit -m "feat: add buildOptionsFromRows helper for multiple-choice options"
```

---

## Task 5: Image-serving route

**Files:**
- Create: `src/app/api/images/[id]/route.ts`

- [ ] **Step 1: Write the route handler**

Create `src/app/api/images/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const image = await db.image.findUnique({ where: { id } });

  if (!image) {
    return NextResponse.json({ error: "Imagen no encontrada" }, { status: 404 });
  }

  return new NextResponse(image.data, {
    headers: {
      "Content-Type": image.mimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/images
git commit -m "feat: add image-serving route at /api/images/[id]"
```

---

## Task 6: Update seed script for emoji and factory snapshot

**Files:**
- Modify: `prisma/seed.ts`

- [ ] **Step 1: Rewrite the seed script**

Replace the entire contents of `prisma/seed.ts`:

```typescript
import { PrismaClient, QuestionType } from "@prisma/client";
import bcrypt from "bcryptjs";
import type { SurveyOption } from "../src/lib/surveys/options";

const db = new PrismaClient();

async function seedAdmin() {
  const existing = await db.adminUser.findFirst();
  if (existing) return;

  const username = process.env.ADMIN_USERNAME ?? "admin";
  const password = process.env.ADMIN_PASSWORD ?? "changeme123";
  const passwordHash = await bcrypt.hash(password, 10);

  await db.adminUser.create({ data: { username, passwordHash } });
  console.log(`Created initial admin user "${username}"`);
}

type SeedQuestion = {
  type: QuestionType;
  text: string;
  required: boolean;
  options?: string[];
};

function toStoredOptions(options?: string[]): SurveyOption[] | undefined {
  return options ? options.map((label) => ({ label })) : undefined;
}

async function seedSurvey(
  slug: string,
  title: string,
  description: string,
  emoji: string,
  order: number,
  questions: SeedQuestion[]
) {
  const existing = await db.survey.findUnique({ where: { slug } });
  if (existing) return;

  const factorySnapshot = {
    title,
    description,
    emoji,
    questions: questions.map((q, i) => ({
      type: q.type,
      text: q.text,
      required: q.required,
      order: i,
      options: toStoredOptions(q.options) ?? null,
    })),
  };

  await db.survey.create({
    data: {
      slug,
      title,
      description,
      emoji,
      order,
      factorySnapshot,
      questions: {
        create: questions.map((q, i) => ({
          type: q.type,
          text: q.text,
          required: q.required,
          order: i,
          options: toStoredOptions(q.options),
        })),
      },
    },
  });
  console.log(`Created survey "${title}"`);
}

async function main() {
  await seedAdmin();

  await seedSurvey("fotografia", "Fotografía", "Cuéntanos sobre tu sesión de fotos", "📷", 0, [
    { type: "RATING_STARS", text: "¿Cómo calificarías la calidad de las fotos?", required: true },
    { type: "YES_NO", text: "¿El fotógrafo llegó puntual?", required: true },
    { type: "NPS", text: "¿Qué tan probable es que nos recomiendes?", required: true },
    {
      type: "MULTIPLE_CHOICE",
      text: "¿Qué tipo de sesión tomaste?",
      required: true,
      options: ["Retrato", "Producto", "Evento", "Otro"],
    },
    { type: "TEXT", text: "Comentarios adicionales", required: false },
  ]);

  await seedSurvey("edicion", "Edición", "Cuéntanos sobre la edición de tus fotos", "🎨", 1, [
    { type: "RATING_STARS", text: "¿Cómo calificarías la calidad de la edición final?", required: true },
    { type: "YES_NO", text: "¿El resultado cumplió con lo que esperabas?", required: true },
    { type: "RATING_STARS", text: "¿El tiempo de entrega fue el adecuado?", required: true },
    { type: "NPS", text: "¿Qué tan probable es que nos recomiendes?", required: true },
    { type: "TEXT", text: "Comentarios adicionales", required: false },
  ]);

  await seedSurvey(
    "servicio-al-cliente",
    "Servicio al Cliente",
    "Cuéntanos sobre la atención que recibiste",
    "🎧",
    2,
    [
      { type: "RATING_STARS", text: "¿Cómo calificarías la atención recibida?", required: true },
      { type: "YES_NO", text: "¿Tu problema/solicitud fue resuelto?", required: true },
      { type: "RATING_STARS", text: "¿El personal fue amable y claro?", required: true },
      { type: "NPS", text: "¿Qué tan probable es que nos recomiendes?", required: true },
      { type: "TEXT", text: "Comentarios adicionales", required: false },
    ]
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add prisma/seed.ts
git commit -m "feat: seed script sets emoji and factorySnapshot for initial surveys"
```

---

## Task 7: Backfill script for the already-deployed surveys

**Files:**
- Create: `scripts/backfill-image-schema.ts`

**Why:** The 3 surveys already live in the Railway database were created before `factorySnapshot` and the new `options` shape existed. This script is idempotent (safe to run more than once) and must run once against the shared dev database now, and once against production after deploying the schema migration.

- [ ] **Step 1: Write the script**

Create `scripts/backfill-image-schema.ts`:

```typescript
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

type OldOption = string;
type NewOption = { label: string; imageId?: string };

function isOldShape(options: unknown): options is OldOption[] {
  return Array.isArray(options) && options.every((o) => typeof o === "string");
}

async function migrateOptionsShape() {
  const questions = await db.question.findMany({ where: { type: "MULTIPLE_CHOICE" } });
  for (const question of questions) {
    if (isOldShape(question.options)) {
      const converted: NewOption[] = (question.options as OldOption[]).map((label) => ({ label }));
      await db.question.update({ where: { id: question.id }, data: { options: converted } });
      console.log(`Converted options for question ${question.id}`);
    }
  }
}

async function backfillFactorySnapshots() {
  const surveys = await db.survey.findMany({
    where: { factorySnapshot: { equals: Prisma.JsonNull } },
    include: { questions: { orderBy: { order: "asc" } } },
  });

  for (const survey of surveys) {
    const snapshot = {
      title: survey.title,
      description: survey.description,
      emoji: survey.emoji,
      questions: survey.questions.map((q) => ({
        type: q.type,
        text: q.text,
        required: q.required,
        order: q.order,
        options: q.options ?? null,
      })),
    };
    await db.survey.update({ where: { id: survey.id }, data: { factorySnapshot: snapshot } });
    console.log(`Backfilled factorySnapshot for survey "${survey.title}"`);
  }
}

import { Prisma } from "@prisma/client";

async function main() {
  await migrateOptionsShape();
  await backfillFactorySnapshots();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
```

- [ ] **Step 2: Run it against the (shared Railway) database and verify**

Run: `npx tsx scripts/backfill-image-schema.ts`
Expected: Logs one "Converted options" line (Fotografía's multiple-choice question) and three "Backfilled factorySnapshot" lines (one per existing survey). Running it a second time immediately after should log nothing (idempotent).

- [ ] **Step 3: Commit**

```bash
git add scripts/backfill-image-schema.ts
git commit -m "chore: add idempotent backfill script for options shape and factorySnapshot"
```

---

## Task 8: Emoji field on survey creation

**Files:**
- Modify: `src/app/admin/encuestas/nueva/actions.ts`
- Modify: `src/app/admin/encuestas/nueva/page.tsx`

- [ ] **Step 1: Update the create-survey action**

Edit `src/app/admin/encuestas/nueva/actions.ts`. Replace the body of `createSurveyAction`:

```typescript
export async function createSurveyAction(
  _prevState: CreateSurveyState,
  formData: FormData
): Promise<CreateSurveyState> {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const emoji = String(formData.get("emoji") ?? "").trim();

  if (!title) {
    return { error: "El título es obligatorio" };
  }

  const slug = slugify(title);
  const existing = await db.survey.findUnique({ where: { slug } });
  if (existing) {
    return { error: "Ya existe una encuesta con un título muy similar (slug duplicado)" };
  }

  const maxOrder = await db.survey.aggregate({ _max: { order: true } });
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
      },
    },
  });

  redirect(`/admin/encuestas/${survey.id}`);
}
```

- [ ] **Step 2: Add the emoji input to the form**

Edit `src/app/admin/encuestas/nueva/page.tsx`. Insert this block right after the "Descripción" field and before the error/button:

```tsx
        <label className="mb-1 block text-sm font-semibold text-brand-navy">Emoji (opcional)</label>
        <input
          name="emoji"
          placeholder="📷"
          className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2"
        />
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/encuestas/nueva
git commit -m "feat: add emoji field and factorySnapshot to survey creation"
```

---

## Task 9: ImageUploadField component

**Files:**
- Create: `src/components/admin/ImageUploadField.tsx`

- [ ] **Step 1: Write the component**

Create `src/components/admin/ImageUploadField.tsx`:

```tsx
"use client";

import { useState } from "react";

export function ImageUploadField({
  name,
  label,
  existingImageId,
}: {
  name: string;
  label: string;
  existingImageId?: string | null;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    existingImageId ? `/api/images/${existingImageId}` : null
  );
  const [removed, setRemoved] = useState(false);

  return (
    <div className="mb-2">
      <p className="mb-1 text-xs font-semibold text-gray-500">{label}</p>
      <input type="hidden" name={`${name}ExistingImageId`} value={existingImageId ?? ""} />
      <input type="hidden" name={`${name}RemoveImage`} value={removed ? "true" : "false"} />
      {previewUrl && !removed && (
        <div className="mb-2 flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="" className="h-16 w-16 rounded object-cover" />
          <button
            type="button"
            onClick={() => {
              setRemoved(true);
              setPreviewUrl(null);
            }}
            className="text-xs text-brand-orange"
          >
            Quitar imagen
          </button>
        </div>
      )}
      <input
        type="file"
        name={`${name}Image`}
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            setRemoved(false);
            setPreviewUrl(URL.createObjectURL(file));
          }
        }}
        className="block w-full text-xs"
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/ImageUploadField.tsx
git commit -m "feat: add reusable image upload field with preview and remove"
```

---

## Task 10: QuestionOptionsEditor component

**Files:**
- Create: `src/components/admin/QuestionOptionsEditor.tsx`

- [ ] **Step 1: Write the component**

Create `src/components/admin/QuestionOptionsEditor.tsx`:

```tsx
"use client";

import { useState } from "react";
import { ImageUploadField } from "./ImageUploadField";

export type OptionRow = { key: string; label: string; imageId?: string };

export function QuestionOptionsEditor({ initialOptions }: { initialOptions: OptionRow[] }) {
  const [rows, setRows] = useState<OptionRow[]>(
    initialOptions.length > 0 ? initialOptions : [{ key: "row-0", label: "" }]
  );
  let nextKey = rows.length;

  return (
    <div className="space-y-3 rounded border border-gray-200 p-3">
      <p className="text-xs font-semibold text-gray-500">Opciones (solo opción múltiple)</p>
      {rows.map((row) => (
        <div key={row.key} className="rounded border border-gray-100 p-2">
          <input
            name="optionLabel"
            defaultValue={row.label}
            placeholder="Texto de la opción"
            className="mb-2 block w-full rounded border px-2 py-1 text-sm"
          />
          <ImageUploadField name="option" label="Foto (opcional)" existingImageId={row.imageId} />
          <button
            type="button"
            onClick={() => setRows((prev) => prev.filter((r) => r.key !== row.key))}
            className="text-xs text-gray-400 hover:text-brand-orange"
          >
            Eliminar opción
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setRows((prev) => [...prev, { key: `row-${nextKey++}`, label: "" }])}
        className="rounded border border-dashed px-3 py-1 text-xs font-semibold text-brand-navy"
      >
        + Agregar opción
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/QuestionOptionsEditor.tsx
git commit -m "feat: add dynamic option-list editor with per-option photos"
```

---

## Task 11: Rewrite question CRUD actions for images and structured options

**Files:**
- Modify: `src/app/admin/encuestas/[id]/actions.ts`

- [ ] **Step 1: Replace the entire file**

Replace the entire contents of `src/app/admin/encuestas/[id]/actions.ts`:

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { Prisma, QuestionType } from "@prisma/client";
import { isValidImageFile, resolveImageId } from "@/lib/images";
import { buildOptionsFromRows } from "@/lib/surveys/options";

export async function toggleSurveyActiveAction(surveyId: string, isActive: boolean) {
  await db.survey.update({ where: { id: surveyId }, data: { isActive } });
  revalidatePath(`/admin/encuestas/${surveyId}`);
}

async function createImage(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const image = await db.image.create({ data: { data: buffer, mimeType: file.type } });
  return image.id;
}

async function resolveQuestionImageId(
  formData: FormData,
  existingImageId: string | null
): Promise<string | null> {
  const file = formData.get("questionImage");
  const removeImage = String(formData.get("questionRemoveImage") ?? "") === "true";
  const newImageId = file instanceof File && isValidImageFile(file) ? await createImage(file) : null;
  return (
    resolveImageId({ existingImageId, removeImage, newImageId }) ?? null
  );
}

async function resolveOptionsFromFormData(formData: FormData) {
  const labels = formData.getAll("optionLabel").map((v) => String(v));
  const files = formData.getAll("optionImage");
  const existingIds = formData.getAll("optionExistingImageId").map((v) => String(v));
  const removeFlags = formData.getAll("optionRemoveImage").map((v) => String(v) === "true");

  const resolvedImageIds: (string | null)[] = [];
  for (let i = 0; i < labels.length; i++) {
    const file = files[i];
    const newImageId = file instanceof File && isValidImageFile(file) ? await createImage(file) : null;
    const resolved = resolveImageId({
      existingImageId: existingIds[i] || null,
      removeImage: removeFlags[i] ?? false,
      newImageId,
    });
    resolvedImageIds.push(resolved ?? null);
  }

  return buildOptionsFromRows(labels, resolvedImageIds);
}

export async function addQuestionAction(formData: FormData) {
  const surveyId = String(formData.get("surveyId"));
  const type = String(formData.get("type")) as QuestionType;
  const text = String(formData.get("text") ?? "").trim();
  const required = formData.get("required") === "on";

  if (!text) return;

  const imageId = await resolveQuestionImageId(formData, null);
  const options = type === "MULTIPLE_CHOICE" ? await resolveOptionsFromFormData(formData) : [];

  const maxOrder = await db.question.aggregate({
    where: { surveyId },
    _max: { order: true },
  });

  await db.question.create({
    data: {
      surveyId,
      type,
      text,
      required,
      imageId,
      order: (maxOrder._max.order ?? -1) + 1,
      options: type === "MULTIPLE_CHOICE" && options.length > 0 ? options : undefined,
    },
  });

  revalidatePath(`/admin/encuestas/${surveyId}`);
}

export async function updateQuestionAction(formData: FormData) {
  const id = String(formData.get("id"));
  const surveyId = String(formData.get("surveyId"));
  const text = String(formData.get("text") ?? "").trim();
  const required = formData.get("required") === "on";
  const type = String(formData.get("type")) as QuestionType;
  const existingQuestionImageId = String(formData.get("questionExistingImageId") ?? "") || null;

  if (!text) return;

  const imageId = await resolveQuestionImageId(formData, existingQuestionImageId);
  const options = type === "MULTIPLE_CHOICE" ? await resolveOptionsFromFormData(formData) : [];

  await db.question.update({
    where: { id },
    data: {
      text,
      required,
      type,
      imageId,
      options: type === "MULTIPLE_CHOICE" && options.length > 0 ? options : Prisma.JsonNull,
    },
  });

  revalidatePath(`/admin/encuestas/${surveyId}`);
}

export async function deleteQuestionAction(id: string, surveyId: string) {
  await db.question.delete({ where: { id } });
  revalidatePath(`/admin/encuestas/${surveyId}`);
}

export async function reorderQuestionsAction(surveyId: string, orderedIds: string[]) {
  await db.$transaction(
    orderedIds.map((id, index) =>
      db.question.update({ where: { id }, data: { order: index } })
    )
  );
  revalidatePath(`/admin/encuestas/${surveyId}`);
}

export async function updateSurveyInfoAction(formData: FormData) {
  const surveyId = String(formData.get("surveyId"));
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const emoji = String(formData.get("emoji") ?? "").trim();

  if (!title) return;

  await db.survey.update({
    where: { id: surveyId },
    data: { title, description: description || null, emoji: emoji || null },
  });

  revalidatePath(`/admin/encuestas/${surveyId}`);
}

type FactorySnapshotQuestion = {
  type: QuestionType;
  text: string;
  required: boolean;
  order: number;
  options: Prisma.JsonValue | null;
};

type FactorySnapshot = {
  title: string;
  description: string | null;
  emoji: string | null;
  questions: FactorySnapshotQuestion[];
};

export async function resetSurveyAction(surveyId: string) {
  const survey = await db.survey.findUnique({ where: { id: surveyId } });
  if (!survey || !survey.factorySnapshot) return;

  const snapshot = survey.factorySnapshot as unknown as FactorySnapshot;

  await db.$transaction([
    db.response.deleteMany({ where: { surveyId } }),
    db.question.deleteMany({ where: { surveyId } }),
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
      },
    }),
  ]);

  revalidatePath(`/admin/encuestas/${surveyId}`);
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add "src/app/admin/encuestas/[id]/actions.ts"
git commit -m "feat: handle question images, structured options, survey info edit, and reset"
```

---

## Task 12: Wire images and options editor into QuestionEditor

**Files:**
- Modify: `src/components/admin/QuestionEditor.tsx`

- [ ] **Step 1: Replace the entire file**

Replace the entire contents of `src/components/admin/QuestionEditor.tsx`:

```tsx
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
import {
  addQuestionAction,
  updateQuestionAction,
  deleteQuestionAction,
  reorderQuestionsAction,
} from "@/app/admin/encuestas/[id]/actions";
import { ImageUploadField } from "./ImageUploadField";
import { QuestionOptionsEditor, type OptionRow } from "./QuestionOptionsEditor";

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

      <form action={addQuestionAction} className="space-y-2 rounded-lg border border-dashed border-gray-300 p-4">
        <input type="hidden" name="surveyId" value={surveyId} />
        <p className="text-sm font-semibold text-brand-navy">Agregar pregunta</p>
        <select name="type" className="rounded border px-2 py-1 text-sm">
          {Object.entries(QUESTION_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <input name="text" placeholder="Texto de la pregunta" required className="block w-full rounded border px-2 py-1 text-sm" />
        <ImageUploadField name="question" label="Imagen general de la pregunta (opcional)" />
        <QuestionOptionsEditor initialOptions={[]} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="required" defaultChecked />
          Obligatoria
        </label>
        <button className="rounded bg-brand-navy px-3 py-1 text-sm font-bold text-white">
          Agregar
        </button>
      </form>
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
    <div ref={setNodeRef} style={style} className="rounded-lg border border-gray-200 bg-white p-4">
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
            <button className="rounded bg-brand-orange px-3 py-1 text-sm font-bold text-white">
              Guardar
            </button>
            <button type="button" onClick={onCancelEdit} className="rounded border px-3 py-1 text-sm">
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-2">
            <span
              {...attributes}
              {...listeners}
              className="mt-1 cursor-grab select-none text-gray-300"
              aria-label="Reordenar"
            >
              ⠿
            </span>
            <div>
              <p className="font-semibold text-brand-navy">{question.text}</p>
              <p className="text-xs text-gray-500">
                {QUESTION_TYPE_LABELS[question.type]} · {question.required ? "Obligatoria" : "Opcional"}
              </p>
            </div>
          </div>
          <div className="flex gap-2 text-sm">
            <button onClick={onEdit} className="text-brand-orange">
              Editar
            </button>
            <form action={deleteQuestionAction.bind(null, question.id, surveyId)}>
              <button className="text-gray-400 hover:text-brand-orange">Eliminar</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/QuestionEditor.tsx
git commit -m "feat: wire image upload and structured options editor into QuestionEditor"
```

---

## Task 13: Survey info editor and reset button

**Files:**
- Create: `src/components/admin/SurveyInfoEditor.tsx`
- Create: `src/components/admin/ResetSurveyButton.tsx`
- Modify: `src/app/admin/encuestas/[id]/page.tsx`

- [ ] **Step 1: Write the SurveyInfoEditor component**

Create `src/components/admin/SurveyInfoEditor.tsx`:

```tsx
"use client";

import { useState } from "react";
import { updateSurveyInfoAction } from "@/app/admin/encuestas/[id]/actions";

export function SurveyInfoEditor({
  surveyId,
  title,
  description,
  emoji,
}: {
  surveyId: string;
  title: string;
  description: string | null;
  emoji: string | null;
}) {
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <button onClick={() => setEditing(true)} className="text-sm font-semibold text-brand-orange">
        Editar
      </button>
    );
  }

  return (
    <form
      action={async (formData) => {
        await updateSurveyInfoAction(formData);
        setEditing(false);
      }}
      className="mb-4 space-y-2 rounded-lg border border-gray-200 bg-white p-4"
    >
      <input type="hidden" name="surveyId" value={surveyId} />
      <label className="block text-xs font-semibold text-gray-500">Título</label>
      <input name="title" defaultValue={title} required className="block w-full rounded border px-2 py-1 text-sm" />
      <label className="block text-xs font-semibold text-gray-500">Descripción</label>
      <textarea
        name="description"
        defaultValue={description ?? ""}
        className="block w-full rounded border px-2 py-1 text-sm"
      />
      <label className="block text-xs font-semibold text-gray-500">Emoji</label>
      <input name="emoji" defaultValue={emoji ?? ""} className="block w-32 rounded border px-2 py-1 text-sm" />
      <div className="flex gap-2">
        <button className="rounded bg-brand-orange px-3 py-1 text-sm font-bold text-white">Guardar</button>
        <button type="button" onClick={() => setEditing(false)} className="rounded border px-3 py-1 text-sm">
          Cancelar
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Write the ResetSurveyButton component**

Create `src/components/admin/ResetSurveyButton.tsx`:

```tsx
"use client";

import { resetSurveyAction } from "@/app/admin/encuestas/[id]/actions";

export function ResetSurveyButton({ surveyId }: { surveyId: string }) {
  return (
    <form
      action={resetSurveyAction.bind(null, surveyId)}
      onSubmit={(e) => {
        const confirmed = window.confirm(
          "Esto borrará todas las respuestas y volverá el título, descripción y preguntas a como estaban al crear la encuesta. ¿Continuar?"
        );
        if (!confirmed) e.preventDefault();
      }}
    >
      <button className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50">
        Resetear encuesta
      </button>
    </form>
  );
}
```

- [ ] **Step 3: Wire both into the survey editor page**

Replace the entire contents of `src/app/admin/encuestas/[id]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { QuestionEditor } from "@/components/admin/QuestionEditor";
import { generateQrDataUrl } from "@/lib/qr";
import { ShareLink } from "@/components/admin/ShareLink";
import { SurveyInfoEditor } from "@/components/admin/SurveyInfoEditor";
import { ResetSurveyButton } from "@/components/admin/ResetSurveyButton";
import { toggleSurveyActiveAction } from "./actions";

export default async function SurveyEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const survey = await db.survey.findUnique({
    where: { id },
    include: { questions: { orderBy: { order: "asc" } } },
  });

  if (!survey) notFound();

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const publicUrl = `${baseUrl}/encuesta/${survey.slug}`;
  const qrDataUrl = await generateQrDataUrl(publicUrl);

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-brand-navy">
            {survey.emoji && <span className="mr-2">{survey.emoji}</span>}
            {survey.title}
          </h1>
          <p className="text-sm text-gray-500">/encuesta/{survey.slug}</p>
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
            <button
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                survey.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
              }`}
            >
              {survey.isActive ? "Activa (click para desactivar)" : "Inactiva (click para activar)"}
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

      <QuestionEditor surveyId={survey.id} questions={survey.questions} />
    </div>
  );
}
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/SurveyInfoEditor.tsx src/components/admin/ResetSurveyButton.tsx "src/app/admin/encuestas/[id]/page.tsx"
git commit -m "feat: add survey info editor and reset-to-factory button"
```

---

## Task 14: Public form renders question images and photo options

**Files:**
- Modify: `src/components/survey/QuestionField.tsx`

- [ ] **Step 1: Replace the entire file**

Replace the entire contents of `src/components/survey/QuestionField.tsx`:

```tsx
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
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/survey/QuestionField.tsx
git commit -m "feat: render question images and photo-card options in public form"
```

---

## Task 15: Update answer validation call site for structured options

**Files:**
- Modify: `src/app/encuesta/[slug]/actions.ts`

- [ ] **Step 1: Map options to plain labels before validating**

Edit `src/app/encuesta/[slug]/actions.ts`. Replace the `questionsForValidation` mapping:

```typescript
  const questionsForValidation: QuestionForValidation[] = survey.questions.map((q) => ({
    id: q.id,
    type: q.type,
    required: q.required,
    options: Array.isArray(q.options)
      ? (q.options as { label: string; imageId?: string }[]).map((o) => o.label)
      : null,
  }));
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Run the full unit test suite**

Run: `npm test`
Expected: All tests pass (this task doesn't change `validate-answers.ts` itself, only what's passed into it, so its existing tests are unaffected).

- [ ] **Step 4: Commit**

```bash
git add "src/app/encuesta/[slug]/actions.ts"
git commit -m "fix: extract option labels before validating multiple-choice answers"
```

---

## Task 16: Show emoji in public selector and admin sidebar

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/components/admin/Sidebar.tsx`

- [ ] **Step 1: Update the public selector**

Edit `src/app/page.tsx`. Replace the `Link` block inside the `.map`:

```tsx
        {surveys.map((survey) => (
          <Link
            key={survey.id}
            href={`/encuesta/${survey.slug}`}
            className="rounded-2xl bg-white p-6 text-center text-xl font-bold text-brand-navy shadow-lg active:scale-95"
          >
            {survey.emoji && <span className="mr-2">{survey.emoji}</span>}
            {survey.title}
          </Link>
        ))}
```

- [ ] **Step 2: Update the admin sidebar**

Edit `src/components/admin/Sidebar.tsx`. Replace the survey `Link` block inside the `.map`:

```tsx
        {surveys.map((survey) => (
          <Link
            key={survey.id}
            href={`/admin/encuestas/${survey.id}`}
            className="block rounded px-2 py-1 hover:bg-white/10"
          >
            {survey.emoji && <span className="mr-1">{survey.emoji}</span>}
            {survey.title}
          </Link>
        ))}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx src/components/admin/Sidebar.tsx
git commit -m "feat: show survey emoji in public selector and admin sidebar"
```

---

## Task 17: Full verification pass

**Files:** None (verification only).

- [ ] **Step 1: Run the full unit test suite**

Run: `npm test`
Expected: All tests pass, including the new `images.test.ts` and `options.test.ts` files.

- [ ] **Step 2: Run a production build**

Run: `npm run build`
Expected: Build succeeds with no type errors.

- [ ] **Step 3: Data-level verification of the new features**

With the dev server running against the Railway database (`npm run dev`), verify via direct Prisma calls or authenticated requests (same approach used earlier in this project — generate a session token with `createSessionToken`, use it as a cookie):

- Uploading a general question image results in a new `Image` row and the question's `imageId` pointing to it; `GET /api/images/<id>` returns the bytes with the right `Content-Type`.
- Creating a `MULTIPLE_CHOICE` question with two option rows (one with a photo, one without) results in `options` shaped as `[{label, imageId}, {label}]`.
- The public survey page for a question with option photos renders `<img>` tags for the options that have one, and the 👤 placeholder for the one that doesn't.
- Editing a survey's title/description/emoji via `updateSurveyInfoAction` changes those fields without touching `slug` or existing responses.
- Calling `resetSurveyAction` on a survey with test responses: all `Response`/`Answer` rows for that survey are gone, `title`/`description`/`emoji` match the `factorySnapshot`, and the question set matches the snapshot's questions (new ids, same text/type/order/options).
- The public selector (`/`) and admin sidebar show the 📷/🎨/🎧 emojis for the three seeded surveys after running the backfill script.

- [ ] **Step 4: Restore clean seeded state**

Delete any test `Image`, `Question`, or `Response` rows created during manual verification so the database matches the seeded baseline (3 surveys, 5 questions each, 0 responses) — same discipline as the original build.

- [ ] **Step 5: Final commit and push**

```bash
git add -A
git commit -m "chore: verify question images, survey emoji, edit, and reset features" --allow-empty
git push
```
