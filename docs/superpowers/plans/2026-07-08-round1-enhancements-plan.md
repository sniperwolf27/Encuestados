# Round 1 Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix collaborator data loss on reset, make collaborator selection optionally mandatory, add a QR code to the public survey selector, send email alerts on low ratings, prompt for a Google review on high ratings, add search to the results table, and add a "duplicate survey" admin action.

**Architecture:** Three small, mostly-independent schema/feature additions (`Survey.collaboratorRequired`, a singleton `Setting` model for global config, a `resend`-based email helper) layered onto the existing admin/public survey flow, following the same Server Action + Server Component patterns already established in this codebase. Two new pure/testable helpers (`hasLowRating`/`hasHighRating`) drive both the email-alert and Google-review-prompt features from a single detection pass inside `submitResponseAction`.

**Tech Stack:** Next.js 16 (App Router, Server Actions), Prisma 6 + PostgreSQL, `resend` (new dependency, email sending), Vitest.

---

### Task 1: Fix — reset survey preserves collaborators

**Files:**
- Modify: `src/app/admin/encuestas/[id]/actions.ts`

**Why:** `resetSurveyAction` currently deletes all collaborators and recreates them from the (usually empty) factory snapshot, wiping employee photos/names the admin added after creating the survey. Collaborators should behave like a persistent business asset, not resettable test data — only responses and questions reset.

- [ ] **Step 1: Remove collaborator deletion/recreation from resetSurveyAction**

In `src/app/admin/encuestas/[id]/actions.ts`, find `resetSurveyAction` (it's the last function in the file) and replace it with:

```typescript
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

This removes the `db.collaborator.deleteMany(...)` line from the `$transaction` array and the `collaborators: { create: ... }` block from the `db.survey.update` data — nothing else in the function changes. Leave the `FactorySnapshotCollaborator` type and the `collaborators?` field on `FactorySnapshot` exactly as they are (unused now by reset, but harmless, and other code still writes to them when creating/duplicating a survey).

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/encuestas/[id]/actions.ts
git commit -m "fix: reset survey no longer deletes collaborators"
```

---

### Task 2: Mandatory collaborator selection — data model, toggle action, editor UI

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `src/app/admin/encuestas/[id]/actions.ts`
- Modify: `src/app/admin/encuestas/[id]/page.tsx`

- [ ] **Step 1: Add the field and migrate**

In `prisma/schema.prisma`, add `collaboratorRequired Boolean @default(false)` to the `Survey` model, right after `isActive`:

```prisma
model Survey {
  id                   String     @id @default(cuid())
  slug                 String     @unique
  title                String
  description          String?
  emoji                String?
  isActive             Boolean    @default(true)
  collaboratorRequired Boolean    @default(false)
  order                Int        @default(0)
  factorySnapshot      Json?
  questions            Question[]
  responses            Response[]
  collaborators        Collaborator[]
  createdAt            DateTime   @default(now())
  updatedAt            DateTime   @updatedAt
}
```

Run: `npx prisma migrate dev --name add_collaborator_required`
Expected: Migration created and applied, Prisma Client regenerated.

- [ ] **Step 2: Add the toggle Server Action**

In `src/app/admin/encuestas/[id]/actions.ts`, add this right after the existing `toggleSurveyActiveAction` function (near the top of the file):

```typescript
export async function toggleCollaboratorRequiredAction(surveyId: string, collaboratorRequired: boolean) {
  await db.survey.update({ where: { id: surveyId }, data: { collaboratorRequired } });
  revalidatePath(`/admin/encuestas/${surveyId}`);
}
```

- [ ] **Step 3: Add the toggle UI to the survey editor page**

Replace the entire contents of `src/app/admin/encuestas/[id]/page.tsx`:

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
import { toggleSurveyActiveAction, toggleCollaboratorRequiredAction } from "./actions";

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

      <form
        action={async () => {
          "use server";
          await toggleCollaboratorRequiredAction(survey.id, !survey.collaboratorRequired);
        }}
        className="mb-3"
      >
        <button type="submit">
          <Badge tone={survey.collaboratorRequired ? "success" : "neutral"}>
            {survey.collaboratorRequired
              ? "Selección de colaborador obligatoria (click para hacerla opcional)"
              : "Selección de colaborador opcional (click para hacerla obligatoria)"}
          </Badge>
        </button>
      </form>
      <CollaboratorEditor surveyId={survey.id} collaborators={survey.collaborators} />
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
git add prisma/schema.prisma prisma/migrations src/app/admin/encuestas/[id]/actions.ts "src/app/admin/encuestas/[id]/page.tsx"
git commit -m "feat: add collaboratorRequired toggle to survey editor"
```

---

### Task 3: Enforce mandatory collaborator selection in the public flow

**Files:**
- Modify: `src/components/survey/CollaboratorStep.tsx`
- Modify: `src/components/survey/SurveyForm.tsx`
- Modify: `src/app/encuesta/[slug]/actions.ts`

- [ ] **Step 1: Add a `required` prop to CollaboratorStep**

Replace the entire contents of `src/components/survey/CollaboratorStep.tsx`:

```tsx
"use client";

import { Avatar } from "@/components/ui/Avatar";

export type CollaboratorOption = { id: string; name: string; imageId: string | null };

export function CollaboratorStep({
  collaborators,
  required,
  onSelect,
}: {
  collaborators: CollaboratorOption[];
  required: boolean;
  onSelect: (collaboratorId: string | null) => void;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-navy to-brand-navy-dark px-4 pt-6 pb-10">
      {!required && (
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="mb-6 flex min-h-11 items-center px-1 text-sm font-semibold text-white/60"
        >
          Omitir →
        </button>
      )}
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

- [ ] **Step 2: Pass `required` from SurveyForm**

In `src/components/survey/SurveyForm.tsx`, find the `if (!collaboratorStepDone) { ... }` block and change it to pass the new prop:

```tsx
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
```

This is the only change to this file — `survey` is already the Prisma `Survey` type (which now includes `collaboratorRequired` after Task 2's migration), so no import changes are needed.

- [ ] **Step 3: Add server-side enforcement**

In `src/app/encuesta/[slug]/actions.ts`, find this existing check in `submitResponseAction`:

```typescript
  if (collaboratorId && !survey.collaborators.some((c) => c.id === collaboratorId)) {
    return { success: false, errors: { _form: "Colaborador inválido" } };
  }
```

Add a new check directly after it (same file, same function):

```typescript
  if (collaboratorId && !survey.collaborators.some((c) => c.id === collaboratorId)) {
    return { success: false, errors: { _form: "Colaborador inválido" } };
  }

  if (survey.collaboratorRequired && !collaboratorId) {
    return { success: false, errors: { _form: "Debes seleccionar quién te atendió" } };
  }
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/components/survey/CollaboratorStep.tsx src/components/survey/SurveyForm.tsx "src/app/encuesta/[slug]/actions.ts"
git commit -m "feat: enforce mandatory collaborator selection client and server side"
```

---

### Task 4: QR code on the survey selector

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Add the QR code**

Replace the entire contents of `src/app/page.tsx`:

```tsx
import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";
import { ListRow } from "@/components/ui/ListRow";
import { getSurveyIcon } from "@/lib/survey-icon";
import { generateQrDataUrl } from "@/lib/qr";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const surveys = await db.survey.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
  });

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const qrDataUrl = await generateQrDataUrl(baseUrl);

  return (
    <main className="min-h-screen bg-gradient-to-b from-brand-navy to-brand-navy-dark px-5 py-8">
      <div className="mb-1 flex items-center gap-2">
        <Image
          src="/logo.jpg"
          alt="David Fotocolor"
          width={36}
          height={22}
          className="rounded-md object-cover"
          priority
        />
        <span className="text-[13px] font-medium tracking-wide text-white/60">DAVID FOTOCOLOR</span>
      </div>
      <h1 className="mb-1 text-[34px] font-extrabold leading-tight tracking-tight text-white">Encuestas</h1>
      <p className="mb-7 text-[15px] text-white/55">Elige qué encuesta quieres responder</p>

      <div className="overflow-hidden rounded-2xl bg-white/8 backdrop-blur-xl">
        {surveys.map((survey, i) => {
          const Icon = getSurveyIcon(survey.emoji);
          return (
            <Link
              key={survey.id}
              href={`/encuesta/${survey.slug}`}
              className={`block active:bg-white/5 ${i > 0 ? "border-t border-white/8" : ""}`}
            >
              <ListRow icon={<Icon size={20} className="text-white" />} title={survey.title} showChevron variant="dark" />
            </Link>
          );
        })}
      </div>

      <div className="mt-6 flex flex-col items-center gap-2 rounded-2xl bg-white/8 p-5 text-center backdrop-blur-xl">
        <p className="text-[13px] text-white/55">¿Prefieres tu celular? Escanea aquí</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qrDataUrl}
          alt="Código QR para abrir esta página en tu celular"
          width={120}
          height={120}
          className="rounded-lg"
        />
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: add QR code to the public survey selector"
```

---

### Task 5: Setting model

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add the model and migrate**

In `prisma/schema.prisma`, add a new `Setting` model (anywhere after `Survey`, e.g. right after the `Collaborator` model at the end of the file):

```prisma
model Setting {
  id               String   @id @default("singleton")
  alertEmail       String?
  googleReviewLink String?
  updatedAt        DateTime @updatedAt
}
```

This is a singleton row (`id` is always `"singleton"`) holding site-wide configuration, deliberately separate from `AdminUser` so it isn't tied to a specific login.

Run: `npx prisma migrate dev --name add_setting`
Expected: Migration created and applied, Prisma Client regenerated.

- [ ] **Step 2: Verify the client picks up the new model**

Run: `node -e "const {PrismaClient} = require('@prisma/client'); const db = new PrismaClient(); console.log(typeof db.setting.findUnique); db.$disconnect();"`
Expected: prints `function`

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: add Setting singleton model for site-wide config"
```

---

### Task 6: Rating-detection helpers (TDD)

**Files:**
- Create: `src/lib/surveys/rating-alerts.ts`
- Test: `tests/unit/rating-alerts.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
import { describe, it, expect } from "vitest";
import { hasLowRating, hasHighRating, type QuestionForRatingCheck } from "@/lib/surveys/rating-alerts";

const questions: QuestionForRatingCheck[] = [
  { id: "q1", type: "RATING_STARS" },
  { id: "q2", type: "NPS" },
  { id: "q3", type: "TEXT" },
];

describe("hasLowRating", () => {
  it("returns true when a RATING_STARS answer is 1 or 2", () => {
    expect(hasLowRating(questions, [{ questionId: "q1", value: 2 }])).toBe(true);
    expect(hasLowRating(questions, [{ questionId: "q1", value: 1 }])).toBe(true);
  });

  it("returns true when an NPS answer is 6 or below", () => {
    expect(hasLowRating(questions, [{ questionId: "q2", value: 6 }])).toBe(true);
    expect(hasLowRating(questions, [{ questionId: "q2", value: 0 }])).toBe(true);
  });

  it("returns false when ratings are fine", () => {
    expect(
      hasLowRating(questions, [
        { questionId: "q1", value: 4 },
        { questionId: "q2", value: 8 },
      ])
    ).toBe(false);
  });

  it("ignores non-rating question types", () => {
    expect(hasLowRating(questions, [{ questionId: "q3", value: "terrible" }])).toBe(false);
  });
});

describe("hasHighRating", () => {
  it("returns true only for a perfect RATING_STARS (5) or NPS (10)", () => {
    expect(hasHighRating(questions, [{ questionId: "q1", value: 5 }])).toBe(true);
    expect(hasHighRating(questions, [{ questionId: "q2", value: 10 }])).toBe(true);
    expect(hasHighRating(questions, [{ questionId: "q1", value: 4 }])).toBe(false);
    expect(hasHighRating(questions, [{ questionId: "q2", value: 9 }])).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/rating-alerts.test.ts`
Expected: FAIL (module doesn't exist yet)

- [ ] **Step 3: Write the implementation**

```typescript
export type QuestionForRatingCheck = {
  id: string;
  type: "RATING_STARS" | "MULTIPLE_CHOICE" | "TEXT" | "YES_NO" | "NPS";
};

export type AnswerForRatingCheck = { questionId: string; value: unknown };

function typeById(questions: QuestionForRatingCheck[]): Map<string, QuestionForRatingCheck["type"]> {
  return new Map(questions.map((q) => [q.id, q.type]));
}

export function hasLowRating(questions: QuestionForRatingCheck[], answers: AnswerForRatingCheck[]): boolean {
  const types = typeById(questions);
  return answers.some((a) => {
    const type = types.get(a.questionId);
    if (type === "RATING_STARS" && typeof a.value === "number") return a.value <= 2;
    if (type === "NPS" && typeof a.value === "number") return a.value <= 6;
    return false;
  });
}

export function hasHighRating(questions: QuestionForRatingCheck[], answers: AnswerForRatingCheck[]): boolean {
  const types = typeById(questions);
  return answers.some((a) => {
    const type = types.get(a.questionId);
    if (type === "RATING_STARS" && typeof a.value === "number") return a.value === 5;
    if (type === "NPS" && typeof a.value === "number") return a.value === 10;
    return false;
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/rating-alerts.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/surveys/rating-alerts.ts tests/unit/rating-alerts.test.ts
git commit -m "feat: add hasLowRating/hasHighRating helpers"
```

---

### Task 7: Settings UI in /admin/configuracion

**Files:**
- Modify: `src/app/admin/configuracion/actions.ts`
- Modify: `src/app/admin/configuracion/page.tsx`
- Create: `src/components/admin/ChangePasswordForm.tsx`
- Create: `src/components/admin/SettingsForm.tsx`

**Context:** `src/app/admin/configuracion/page.tsx` is currently a client component (`"use client"`) containing only the change-password form. To show the *current* alert email / Google review link values, the page needs to read from the database, which means it must become a Server Component. The existing password form logic is extracted unchanged into a new client component, and a new client component is added for the settings form — the page itself just fetches data and renders both.

- [ ] **Step 1: Add updateSettingsAction**

In `src/app/admin/configuracion/actions.ts`, add this at the end of the file (the file already imports `db`):

```typescript
export type UpdateSettingsState = { error: string | null; success: boolean };

export async function updateSettingsAction(
  _prevState: UpdateSettingsState,
  formData: FormData
): Promise<UpdateSettingsState> {
  const alertEmail = String(formData.get("alertEmail") ?? "").trim();
  const googleReviewLink = String(formData.get("googleReviewLink") ?? "").trim();

  await db.setting.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", alertEmail: alertEmail || null, googleReviewLink: googleReviewLink || null },
    update: { alertEmail: alertEmail || null, googleReviewLink: googleReviewLink || null },
  });

  return { error: null, success: true };
}
```

- [ ] **Step 2: Extract the password form into its own component**

Create `src/components/admin/ChangePasswordForm.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import { changePasswordAction, type ChangePasswordState } from "@/app/admin/configuracion/actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const initialState: ChangePasswordState = { error: null, success: false };

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changePasswordAction, initialState);

  return (
    <Card variant="solid" className="p-6">
      <form action={formAction}>
        <label htmlFor="current-password" className="mb-1 block text-sm font-semibold text-brand-navy">
          Contraseña actual
        </label>
        <input
          id="current-password"
          type="password"
          name="currentPassword"
          autoComplete="current-password"
          required
          className="mb-4 w-full rounded-xl border border-system-separator px-3 py-2.5"
        />
        <label htmlFor="new-password" className="mb-1 block text-sm font-semibold text-brand-navy">
          Nueva contraseña
        </label>
        <input
          id="new-password"
          type="password"
          name="newPassword"
          autoComplete="new-password"
          required
          minLength={8}
          className="mb-4 w-full rounded-xl border border-system-separator px-3 py-2.5"
        />
        {state.error && <p className="mb-4 text-sm text-red-600">{state.error}</p>}
        {state.success && <p className="mb-4 text-sm text-green-600">Contraseña actualizada</p>}
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando..." : "Cambiar contraseña"}
        </Button>
      </form>
    </Card>
  );
}
```

- [ ] **Step 3: Create the settings form**

Create `src/components/admin/SettingsForm.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import { updateSettingsAction, type UpdateSettingsState } from "@/app/admin/configuracion/actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const initialState: UpdateSettingsState = { error: null, success: false };

export function SettingsForm({
  alertEmail,
  googleReviewLink,
}: {
  alertEmail: string | null;
  googleReviewLink: string | null;
}) {
  const [state, formAction, pending] = useActionState(updateSettingsAction, initialState);

  return (
    <Card variant="solid" className="mb-6 p-6">
      <form action={formAction}>
        <label htmlFor="alert-email" className="mb-1 block text-sm font-semibold text-brand-navy">
          Correo para alertas de calificación baja
        </label>
        <input
          id="alert-email"
          type="email"
          name="alertEmail"
          defaultValue={alertEmail ?? ""}
          placeholder="tucorreo@ejemplo.com"
          className="mb-4 w-full rounded-xl border border-system-separator px-3 py-2.5"
        />
        <label htmlFor="google-review-link" className="mb-1 block text-sm font-semibold text-brand-navy">
          Link de reseña de Google
        </label>
        <input
          id="google-review-link"
          type="url"
          name="googleReviewLink"
          defaultValue={googleReviewLink ?? ""}
          placeholder="https://g.page/r/..."
          className="mb-4 w-full rounded-xl border border-system-separator px-3 py-2.5"
        />
        {state.success && <p className="mb-4 text-sm text-green-600">Configuración guardada</p>}
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando..." : "Guardar configuración"}
        </Button>
      </form>
    </Card>
  );
}
```

- [ ] **Step 4: Replace the page**

Replace the entire contents of `src/app/admin/configuracion/page.tsx`:

```tsx
import { db } from "@/lib/db";
import { ChangePasswordForm } from "@/components/admin/ChangePasswordForm";
import { SettingsForm } from "@/components/admin/SettingsForm";

export const dynamic = "force-dynamic";

export default async function ConfiguracionPage() {
  const setting = await db.setting.findUnique({ where: { id: "singleton" } });

  return (
    <div className="max-w-sm">
      <h1 className="mb-6 text-[26px] font-extrabold tracking-tight text-brand-navy">Configuración</h1>
      <SettingsForm alertEmail={setting?.alertEmail ?? null} googleReviewLink={setting?.googleReviewLink ?? null} />
      <ChangePasswordForm />
    </div>
  );
}
```

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: Build succeeds. `/admin/configuracion` should now be server-rendered (`ƒ`, not `○`) since it reads the database — confirm this in the build's route list.

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/configuracion/actions.ts src/app/admin/configuracion/page.tsx src/components/admin/ChangePasswordForm.tsx src/components/admin/SettingsForm.tsx
git commit -m "feat: add site-wide settings (alert email, Google review link) to configuracion page"
```

---

### Task 8: Email alerts + Google review link detection in submitResponseAction

**Files:**
- Modify: `package.json` (new dependency)
- Create: `src/lib/email.ts`
- Modify: `src/app/encuesta/[slug]/actions.ts`

- [ ] **Step 1: Install the email dependency**

Run: `npm install resend`
Expected: `resend` added to `package.json` dependencies, `package-lock.json` updated.

- [ ] **Step 2: Create the email helper**

Create `src/lib/email.ts`:

```typescript
import { Resend } from "resend";

export async function sendLowRatingAlert(params: {
  to: string;
  surveyTitle: string;
  respondentName: string | null;
  respondentPhone: string | null;
  createdAt: Date;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const resend = new Resend(apiKey);
  try {
    await resend.emails.send({
      from: "Encuestas David Fotocolor <onboarding@resend.dev>",
      to: params.to,
      subject: `Calificación baja en "${params.surveyTitle}"`,
      text: [
        "Se recibió una respuesta con calificación baja.",
        "",
        `Encuesta: ${params.surveyTitle}`,
        `Fecha: ${params.createdAt.toISOString()}`,
        `Nombre: ${params.respondentName ?? "No indicado"}`,
        `Teléfono: ${params.respondentPhone ?? "No indicado"}`,
        "",
        "Revisa los detalles completos en el panel de administración.",
      ].join("\n"),
    });
  } catch (err) {
    console.error("Failed to send low-rating alert email", err);
  }
}
```

Without a `RESEND_API_KEY` environment variable set, this function returns immediately and sends nothing — safe to deploy before the API key is configured.

- [ ] **Step 3: Wire detection + email + review link into submitResponseAction**

Replace the entire contents of `src/app/encuesta/[slug]/actions.ts`:

```typescript
"use server";

import { db } from "@/lib/db";
import { validateAnswers, type QuestionForValidation } from "@/lib/surveys/validate-answers";
import { hasLowRating, hasHighRating } from "@/lib/surveys/rating-alerts";
import { sendLowRatingAlert } from "@/lib/email";

export type SubmitResult = {
  success: boolean;
  errors?: Record<string, string>;
  googleReviewLink?: string | null;
};

export async function submitResponseAction(
  slug: string,
  answers: Record<string, unknown>,
  respondentName: string,
  respondentPhone: string,
  collaboratorId: string | null
): Promise<SubmitResult> {
  const survey = await db.survey.findUnique({
    where: { slug },
    include: { questions: true, collaborators: true },
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

  if (collaboratorId && !survey.collaborators.some((c) => c.id === collaboratorId)) {
    return { success: false, errors: { _form: "Colaborador inválido" } };
  }

  if (survey.collaboratorRequired && !collaboratorId) {
    return { success: false, errors: { _form: "Debes seleccionar quién te atendió" } };
  }

  const trimmedName = respondentName.trim() || null;
  const trimmedPhone = respondentPhone.trim() || null;

  const response = await db.response.create({
    data: {
      surveyId: survey.id,
      respondentName: trimmedName,
      respondentPhone: trimmedPhone,
      collaboratorId,
      answers: {
        create: survey.questions
          .filter((q) => answers[q.id] !== undefined)
          .map((q) => ({ questionId: q.id, value: answers[q.id] as object | string | number | boolean })),
      },
    },
  });

  const answersForRatingCheck = survey.questions
    .filter((q) => answers[q.id] !== undefined)
    .map((q) => ({ questionId: q.id, value: answers[q.id] }));

  const isLowRating = hasLowRating(survey.questions, answersForRatingCheck);
  const isHighRating = hasHighRating(survey.questions, answersForRatingCheck);

  let googleReviewLink: string | null = null;

  if (isLowRating || isHighRating) {
    const setting = await db.setting.findUnique({ where: { id: "singleton" } });

    if (isLowRating && setting?.alertEmail) {
      await sendLowRatingAlert({
        to: setting.alertEmail,
        surveyTitle: survey.title,
        respondentName: trimmedName,
        respondentPhone: trimmedPhone,
        createdAt: response.createdAt,
      });
    }

    if (isHighRating) {
      googleReviewLink = setting?.googleReviewLink ?? null;
    }
  }

  return { success: true, googleReviewLink };
}
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/lib/email.ts "src/app/encuesta/[slug]/actions.ts"
git commit -m "feat: send low-rating email alerts and detect high ratings for Google review prompt"
```

---

### Task 9: Google review button on the thank-you screen

**Files:**
- Modify: `src/components/survey/ThankYou.tsx`
- Modify: `src/components/survey/SurveyForm.tsx`

- [ ] **Step 1: Add the button to ThankYou**

Replace the entire contents of `src/components/survey/ThankYou.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";

const RESET_SECONDS = 6;

export function ThankYou({
  onReset,
  googleReviewLink,
}: {
  onReset: () => void;
  googleReviewLink: string | null;
}) {
  const [secondsLeft, setSecondsLeft] = useState(RESET_SECONDS);

  useEffect(() => {
    if (secondsLeft <= 0) {
      onReset();
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft, onReset]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-brand-navy to-brand-navy-dark px-4 text-center">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
        className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-brand-orange shadow-lg shadow-brand-orange/40"
      >
        <Check size={40} className="text-white" strokeWidth={3} />
      </motion.div>
      <h1 className="mb-2 text-[26px] font-extrabold text-white">¡Gracias por tu respuesta!</h1>
      <p className="mb-4 text-[15px] text-white/55">Volviendo al inicio en {secondsLeft}s...</p>
      {googleReviewLink && (
        <a
          href={googleReviewLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-bold text-white"
        >
          Déjanos tu reseña en Google
        </a>
      )}
    </div>
  );
}
```

Note: the review button is a plain `<a>` styled to look like a secondary button, not a `<Button>` component wrapped in an `<a>` — nesting a real `<button>` element inside an `<a>` is invalid HTML and was already fixed once elsewhere in this codebase (the CSV export link). Don't reintroduce that pattern here.

- [ ] **Step 2: Pass the link through from SurveyForm**

In `src/components/survey/SurveyForm.tsx`, make these two changes:

1. Add a new state variable, right after the existing `const [submitted, setSubmitted] = useState(false);` line:

```tsx
  const [submitted, setSubmitted] = useState(false);
  const [googleReviewLink, setGoogleReviewLink] = useState<string | null>(null);
```

2. In `handleSubmit`, capture the link from the result before setting `submitted`:

```tsx
    setErrors({});
    setGoogleReviewLink(result.googleReviewLink ?? null);
    setSubmitted(true);
```

(This replaces the existing two-line `setErrors({}); setSubmitted(true);` block — same location, one line added in between.)

3. Update the `submitted` early return to pass the link:

```tsx
  if (submitted) {
    return <ThankYou onReset={goToSelector} googleReviewLink={googleReviewLink} />;
  }
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/survey/ThankYou.tsx src/components/survey/SurveyForm.tsx
git commit -m "feat: show Google review button on thank-you screen after a high rating"
```

---

### Task 10: Results search/filter

**Files:**
- Modify: `src/app/admin/encuestas/[id]/resultados/page.tsx`

- [ ] **Step 1: Add search to the query and the filter form**

Replace the entire contents of `src/app/admin/encuestas/[id]/resultados/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { computeKpis } from "@/lib/surveys/kpis";
import { KpiCards } from "@/components/admin/KpiCards";
import { ResultsChart } from "@/components/admin/ResultsChart";
import { ResultsTable } from "@/components/admin/ResultsTable";
import { Button } from "@/components/ui/Button";

export default async function ResultsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; to?: string; search?: string }>;
}) {
  const { id } = await params;
  const { from, to, search } = await searchParams;

  const survey = await db.survey.findUnique({
    where: { id },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  if (!survey) notFound();

  const responses = await db.response.findMany({
    where: {
      surveyId: id,
      createdAt: {
        gte: from ? new Date(from) : undefined,
        lte: to ? new Date(`${to}T23:59:59`) : undefined,
      },
      ...(search
        ? {
            OR: [
              { respondentName: { contains: search, mode: "insensitive" as const } },
              { respondentPhone: { contains: search, mode: "insensitive" as const } },
              { collaborator: { name: { contains: search, mode: "insensitive" as const } } },
            ],
          }
        : {}),
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

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-[26px] font-extrabold tracking-tight text-brand-navy">Resultados: {survey.title}</h1>
        <a
          href={`/admin/encuestas/${survey.id}/resultados/export`}
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-system-separator bg-white px-4 py-2.5 text-sm font-bold text-brand-navy"
        >
          ⬇ Exportar CSV
        </a>
      </div>

      <form className="mb-6 flex flex-wrap items-end gap-3 rounded-2xl border border-system-separator bg-white p-4">
        <div>
          <label className="mb-1 block text-xs text-system-secondary">Buscar</label>
          <input
            type="text"
            name="search"
            defaultValue={search}
            placeholder="Nombre, teléfono o colaborador"
            className="rounded-lg border border-system-separator px-2 py-1 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-system-secondary">Desde</label>
          <input
            type="date"
            name="from"
            defaultValue={from}
            className="rounded-lg border border-system-separator px-2 py-1 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-system-secondary">Hasta</label>
          <input
            type="date"
            name="to"
            defaultValue={to}
            className="rounded-lg border border-system-separator px-2 py-1 text-sm"
          />
        </div>
        <Button type="submit" size="compact">
          Filtrar
        </Button>
      </form>

      <KpiCards
        averageRating={kpis.averageRating}
        nps={kpis.nps}
        yesPercentage={kpis.yesPercentage}
        totalResponses={responses.length}
      />
      <ResultsChart distribution={kpis.ratingDistribution} />
      <ResultsTable rows={tableRows} />
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add "src/app/admin/encuestas/[id]/resultados/page.tsx"
git commit -m "feat: add search filter to results table"
```

---

### Task 11: Duplicate survey

**Files:**
- Create: `src/lib/surveys/slug.ts`
- Test: `tests/unit/slug.test.ts`
- Modify: `src/app/admin/encuestas/nueva/actions.ts`
- Modify: `src/app/admin/encuestas/[id]/actions.ts`
- Modify: `src/app/admin/encuestas/[id]/page.tsx`

**Context:** `nueva/actions.ts` currently has a private inline `slugify` function. This task extracts it into a shared, tested module so the new "duplicate survey" action can reuse it instead of redefining it a third time (a third copy would compound the same kind of duplication already present between `resolveQuestionImageId`/`resolveCollaboratorImageId`).

- [ ] **Step 1: Write the failing test for the extracted slugify**

```typescript
import { describe, it, expect } from "vitest";
import { slugify } from "@/lib/surveys/slug";

describe("slugify", () => {
  it("lowercases and replaces spaces with hyphens", () => {
    expect(slugify("Fotografía Profesional")).toBe("fotografia-profesional");
  });

  it("strips accents", () => {
    expect(slugify("Edición")).toBe("edicion");
  });

  it("collapses non-alphanumeric runs into a single hyphen", () => {
    expect(slugify("Servicio al Cliente (copia)")).toBe("servicio-al-cliente-copia");
  });

  it("trims leading and trailing hyphens", () => {
    expect(slugify("  ¡Hola!  ")).toBe("hola");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/slug.test.ts`
Expected: FAIL (module doesn't exist yet)

- [ ] **Step 3: Create the module**

Create `src/lib/surveys/slug.ts`:

```typescript
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/slug.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Update nueva/actions.ts to use the shared module**

Replace the entire contents of `src/app/admin/encuestas/nueva/actions.ts`:

```typescript
"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { slugify } from "@/lib/surveys/slug";

export type CreateSurveyState = { error: string | null };

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
        collaborators: [],
      },
    },
  });

  redirect(`/admin/encuestas/${survey.id}`);
}
```

- [ ] **Step 6: Add duplicateSurveyAction**

In `src/app/admin/encuestas/[id]/actions.ts`, add `import { redirect } from "next/navigation";` and `import { slugify } from "@/lib/surveys/slug";` to the top of the file (alongside the existing imports), then add this new function at the end of the file (after `resetSurveyAction`):

```typescript
export async function duplicateSurveyAction(surveyId: string) {
  const survey = await db.survey.findUnique({
    where: { id: surveyId },
    include: {
      questions: { orderBy: { order: "asc" } },
      collaborators: { orderBy: { order: "asc" } },
    },
  });
  if (!survey) return;

  const newTitle = `${survey.title} (copia)`;
  const baseSlug = slugify(newTitle);
  let slug = baseSlug;
  let suffix = 2;
  while (await db.survey.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${suffix}`;
    suffix++;
  }

  const maxOrder = await db.survey.aggregate({ _max: { order: true } });

  const newSurvey = await db.survey.create({
    data: {
      title: newTitle,
      description: survey.description,
      emoji: survey.emoji,
      slug,
      order: (maxOrder._max.order ?? -1) + 1,
      collaboratorRequired: survey.collaboratorRequired,
      factorySnapshot: {
        title: newTitle,
        description: survey.description,
        emoji: survey.emoji,
        questions: survey.questions.map((q) => ({
          type: q.type,
          text: q.text,
          required: q.required,
          order: q.order,
          options: q.options,
        })),
        collaborators: survey.collaborators.map((c) => ({
          name: c.name,
          imageId: c.imageId,
          order: c.order,
        })),
      },
      questions: {
        create: survey.questions.map((q) => ({
          type: q.type,
          text: q.text,
          required: q.required,
          order: q.order,
          options: q.options ?? undefined,
          imageId: q.imageId,
        })),
      },
      collaborators: {
        create: survey.collaborators.map((c) => ({
          name: c.name,
          imageId: c.imageId,
          order: c.order,
        })),
      },
    },
  });

  redirect(`/admin/encuestas/${newSurvey.id}`);
}
```

- [ ] **Step 7: Add the "Duplicar" button to the survey editor page**

In `src/app/admin/encuestas/[id]/page.tsx`:

1. Add `Button` to the imports (it's not currently imported there):

```tsx
import { Button } from "@/components/ui/Button";
```

2. Add `duplicateSurveyAction` to the existing actions import line:

```tsx
import { toggleSurveyActiveAction, toggleCollaboratorRequiredAction, duplicateSurveyAction } from "./actions";
```

3. Find this block:

```tsx
      <div className="mb-6 flex items-center justify-between">
        <a href={`/admin/encuestas/${survey.id}/resultados`} className="text-sm font-semibold text-brand-orange">
          Ver resultados →
        </a>
        <ResetSurveyButton surveyId={survey.id} />
      </div>
```

Replace it with:

```tsx
      <div className="mb-6 flex items-center justify-between">
        <a href={`/admin/encuestas/${survey.id}/resultados`} className="text-sm font-semibold text-brand-orange">
          Ver resultados →
        </a>
        <div className="flex gap-2">
          <form action={duplicateSurveyAction.bind(null, survey.id)}>
            <Button type="submit" variant="secondary" size="compact">
              Duplicar
            </Button>
          </form>
          <ResetSurveyButton surveyId={survey.id} />
        </div>
      </div>
```

- [ ] **Step 8: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 9: Commit**

```bash
git add src/lib/surveys/slug.ts tests/unit/slug.test.ts src/app/admin/encuestas/nueva/actions.ts src/app/admin/encuestas/[id]/actions.ts "src/app/admin/encuestas/[id]/page.tsx"
git commit -m "feat: add duplicate survey action and button"
```

---

### Task 12: Full verification pass

**Files:** None (verification only).

- [ ] **Step 1: Run the full unit test suite**

Run: `npm test`
Expected: All tests pass, including the new `rating-alerts.test.ts` and `slug.test.ts`.

- [ ] **Step 2: Run a clean production build**

Run:
```bash
rm -rf .next
npm run build
```
Expected: Build succeeds with no type errors. Confirm `/admin/configuracion` is listed as dynamic (`ƒ`).

- [ ] **Step 3: Manual/scripted verification pass**

Using the same pragmatic approach as prior verification passes in this project (dev server + curl + direct Prisma script checks, no real browser available), confirm:

- Resetting a survey that has collaborators leaves the collaborators untouched (create a throwaway survey with a collaborator, add a response, reset, confirm the collaborator still exists and the response is gone).
- Setting `collaboratorRequired` to true on a survey with at least one collaborator: the public page's rendered HTML for that survey no longer contains the "Omitir" text, and calling `submitResponseAction` directly with `collaboratorId: null` returns `{ success: false }` with the "Debes seleccionar quién te atendió" message.
- `/` (survey selector) rendered HTML contains a `<img>` tag with a `data:image` QR source.
- `/admin/encuestas/<id>/resultados?search=<term>` returns only responses matching that name/phone/collaborator (test against a temporary response you create and clean up).
- Submitting a response with a 1-star rating (on a survey with a `RATING_STARS` question) calls the email path — since `RESEND_API_KEY` is not yet set, confirm via a log statement or direct inspection that `sendLowRatingAlert` early-returns cleanly (no crash, response still saves successfully) rather than trying to actually verify an email was delivered.
- Submitting a response with a 5-star rating, with `Setting.googleReviewLink` temporarily set to a test URL, causes `submitResponseAction`'s result to include that `googleReviewLink` — confirm via direct action call, not full UI (no browser available).
- `/admin/configuracion` rendered HTML (with a valid admin session cookie) shows both the settings form and the password form, and submitting the settings form via `updateSettingsAction` persists to the `Setting` table (verify via Prisma query).
- Duplicating a real survey (or a temporary one) produces a new `Survey` row with the same questions and collaborators, a `(copia)` title, a unique slug, and zero responses. Duplicating the *same* survey a second time produces a slug with a `-2` suffix instead of failing.
- Clean up any temporary survey/collaborator/response/setting data created during this pass so the database returns to its pre-verification state (except intentionally keeping any `Setting` row change reverted to whatever it was before, likely both fields null, unless the business owner has since configured real values — check current state first).

Note explicitly which items could only be checked via markup/script inspection rather than a real browser (visual QR scan test, actual email delivery, real click-through of the Google review button) — those need a human to verify once `RESEND_API_KEY` is configured and the site is live.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: verify round 1 enhancements" --allow-empty
```
