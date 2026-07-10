# Base URL Fix and Required Contact Fields Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix QR codes pointing to `localhost` instead of the real Railway URL, and let each survey independently require the respondent's name and/or phone number.

**Architecture:** Rename `NEXT_PUBLIC_BASE_URL` to a plain (non-`NEXT_PUBLIC_`) `BASE_URL` env var, since it's only ever read server-side and Next.js inlines `NEXT_PUBLIC_*` vars at build time rather than reading them at runtime — the root cause of the bug. Add `nameRequired`/`phoneRequired` booleans to `Survey`, following the exact same toggle-action + client-hint + server-validation pattern already used for `collaboratorRequired`.

**Tech Stack:** Next.js 16 (App Router, Server Actions), Prisma 6 + PostgreSQL.

---

### Task 1: Fix QR/share-link base URL

**Files:**
- Modify: `.env.example`
- Modify: `.env` (local dev/this machine only, not committed)
- Modify: `README.md`
- Modify: `src/app/page.tsx`
- Modify: `src/app/admin/encuestas/[id]/page.tsx`

**Why:** `NEXT_PUBLIC_*` environment variables are inlined into the compiled output at **build time** by Next.js, not read at runtime — even when used only in server-only code, as is the case here (`process.env.NEXT_PUBLIC_BASE_URL` is read only inside `async` Server Components, never sent to the browser). If Railway's build step didn't have this variable set when it last built the app, the fallback `"http://localhost:3000"` got permanently baked into the deployed bundle, and setting the variable afterward in Railway's dashboard has no effect without a full rebuild. Since this value is never used in client-rendered code, there's no reason for the `NEXT_PUBLIC_` prefix — a plain env var is read fresh on every request at actual runtime.

- [ ] **Step 1: Rename in source code**

In `src/app/page.tsx`, change:
```tsx
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
```
to:
```tsx
  const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";
```

In `src/app/admin/encuestas/[id]/page.tsx`, make the identical change:
```tsx
  const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";
```

- [ ] **Step 2: Update .env.example**

In `.env.example`, change:
```
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
```
to:
```
BASE_URL="http://localhost:3000"
```

- [ ] **Step 3: Update local .env**

In `.env` (this file is gitignored, not committed — just keeping local dev consistent with the rename), change the same line the same way.

- [ ] **Step 4: Update README.md**

In `README.md`, find the line documenting the Railway env var (currently reads `` `NEXT_PUBLIC_BASE_URL` — la URL pública que Railway asigna al servicio (ej. `https://encuestas-davidfotocolor.up.railway.app`) ``) and change `NEXT_PUBLIC_BASE_URL` to `BASE_URL` in that line, keeping the rest of the sentence and example URL unchanged.

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add .env.example README.md src/app/page.tsx "src/app/admin/encuestas/[id]/page.tsx"
git commit -m "fix: rename NEXT_PUBLIC_BASE_URL to BASE_URL so it's read at runtime, not build time"
```

**Note for whoever deploys this (a manual step outside this codebase, cannot be automated from here):** In Railway's dashboard, for this service's environment variables, rename `NEXT_PUBLIC_BASE_URL` to `BASE_URL` (or add `BASE_URL` if it doesn't exist yet) with the value `https://encuestas-davidfotocolor.up.railway.app` (or whatever the actual assigned Railway domain is), then trigger a redeploy so the new build picks up the runtime variable correctly this time.

---

### Task 2: Per-survey required name/phone fields

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `src/app/admin/encuestas/[id]/actions.ts`
- Modify: `src/app/admin/encuestas/[id]/page.tsx`
- Modify: `src/app/encuesta/[slug]/actions.ts`
- Modify: `src/components/survey/SurveyForm.tsx`

- [ ] **Step 1: Add the fields and migrate**

In `prisma/schema.prisma`, add `nameRequired Boolean @default(false)` and `phoneRequired Boolean @default(false)` to the `Survey` model, right after `collaboratorRequired`:

```prisma
model Survey {
  id                   String     @id @default(cuid())
  slug                 String     @unique
  title                String
  description          String?
  emoji                String?
  isActive             Boolean    @default(true)
  collaboratorRequired Boolean    @default(false)
  nameRequired         Boolean    @default(false)
  phoneRequired        Boolean    @default(false)
  order                Int        @default(0)
  factorySnapshot      Json?
  questions            Question[]
  responses            Response[]
  collaborators        Collaborator[]
  createdAt            DateTime   @default(now())
  updatedAt            DateTime   @updatedAt
}
```

Run: `npx prisma migrate dev --name add_name_phone_required`
Expected: Migration created and applied, Prisma Client regenerated.

- [ ] **Step 2: Add toggle Server Actions**

In `src/app/admin/encuestas/[id]/actions.ts`, add these two functions right after the existing `toggleCollaboratorRequiredAction`:

```typescript
export async function toggleNameRequiredAction(surveyId: string, nameRequired: boolean) {
  await db.survey.update({ where: { id: surveyId }, data: { nameRequired } });
  revalidatePath(`/admin/encuestas/${surveyId}`);
}

export async function togglePhoneRequiredAction(surveyId: string, phoneRequired: boolean) {
  await db.survey.update({ where: { id: surveyId }, data: { phoneRequired } });
  revalidatePath(`/admin/encuestas/${surveyId}`);
}
```

- [ ] **Step 3: Add the toggle UI to the survey editor page**

In `src/app/admin/encuestas/[id]/page.tsx`:

1. Add `toggleNameRequiredAction, togglePhoneRequiredAction` to the existing actions import line:

```tsx
import {
  toggleSurveyActiveAction,
  toggleCollaboratorRequiredAction,
  toggleNameRequiredAction,
  togglePhoneRequiredAction,
  duplicateSurveyAction,
} from "./actions";
```

2. Find the existing `collaboratorRequired` toggle block:

```tsx
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
```

Replace it with the same block plus two more, all grouped together:

```tsx
      <div className="mb-3 flex flex-wrap gap-2">
        <form
          action={async () => {
            "use server";
            await toggleCollaboratorRequiredAction(survey.id, !survey.collaboratorRequired);
          }}
        >
          <button type="submit">
            <Badge tone={survey.collaboratorRequired ? "success" : "neutral"}>
              {survey.collaboratorRequired
                ? "Colaborador obligatorio"
                : "Colaborador opcional"}
            </Badge>
          </button>
        </form>
        <form
          action={async () => {
            "use server";
            await toggleNameRequiredAction(survey.id, !survey.nameRequired);
          }}
        >
          <button type="submit">
            <Badge tone={survey.nameRequired ? "success" : "neutral"}>
              {survey.nameRequired ? "Nombre obligatorio" : "Nombre opcional"}
            </Badge>
          </button>
        </form>
        <form
          action={async () => {
            "use server";
            await togglePhoneRequiredAction(survey.id, !survey.phoneRequired);
          }}
        >
          <button type="submit">
            <Badge tone={survey.phoneRequired ? "success" : "neutral"}>
              {survey.phoneRequired ? "Teléfono obligatorio" : "Teléfono opcional"}
            </Badge>
          </button>
        </form>
      </div>
```

Note: this shortens the collaborator badge's text (from "Selección de colaborador obligatoria (click para hacerla opcional)" to "Colaborador obligatorio") since three side-by-side badges with the old long-form click-instruction text would overflow on narrow screens — the click-to-toggle behavior is still self-evident from it being a button.

- [ ] **Step 4: Add server-side validation**

In `src/app/encuesta/[slug]/actions.ts`, find:

```typescript
  const trimmedName = respondentName.trim() || null;
  const trimmedPhone = respondentPhone.trim() || null;

  const response = await db.response.create({
```

Replace with:

```typescript
  const trimmedName = respondentName.trim() || null;
  const trimmedPhone = respondentPhone.trim() || null;

  if (survey.nameRequired && !trimmedName) {
    return { success: false, errors: { _form: "El nombre es obligatorio" } };
  }

  if (survey.phoneRequired && !trimmedPhone) {
    return { success: false, errors: { _form: "El teléfono es obligatorio" } };
  }

  const response = await db.response.create({
```

- [ ] **Step 5: Add client-side hints**

In `src/components/survey/SurveyForm.tsx`, find:

```tsx
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
```

Replace with:

```tsx
        <div className="mb-3.5 rounded-2xl bg-white/8 p-[18px] backdrop-blur-xl">
          <p className="mb-2 text-[15px] font-semibold text-white">
            Nombre {survey.nameRequired ? <span className="text-brand-orange">*</span> : "(opcional)"}
          </p>
          <input
            required={survey.nameRequired}
            value={respondentName}
            onChange={(e) => setRespondentName(e.target.value)}
            className="mb-4 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-white placeholder:text-white/30"
          />
          <p className="mb-2 text-[15px] font-semibold text-white">
            Teléfono {survey.phoneRequired ? <span className="text-brand-orange">*</span> : "(opcional)"}
          </p>
          <input
            type="tel"
            inputMode="numeric"
            autoComplete="off"
            required={survey.phoneRequired}
            value={respondentPhone}
            onChange={(e) => setRespondentPhone(e.target.value)}
            className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-white placeholder:text-white/30"
          />
        </div>
```

`survey` is already the Prisma `Survey` type passed into `SurveyForm`, which includes `nameRequired`/`phoneRequired` after Step 1's migration — no new props or imports needed. The native `required` HTML attribute gives an immediate browser-level block on submitting an empty required field (the form's `onSubmit` handler only runs after the browser's own required-field check passes), while the server-side check from Step 4 is the actual defense-in-depth enforcement.

- [ ] **Step 6: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/migrations src/app/admin/encuestas/[id]/actions.ts "src/app/admin/encuestas/[id]/page.tsx" "src/app/encuesta/[slug]/actions.ts" src/components/survey/SurveyForm.tsx
git commit -m "feat: add per-survey required name and phone toggles"
```

---

### Task 3: Full verification pass

**Files:** None (verification only).

- [ ] **Step 1: Run the full unit test suite**

Run: `npm test`
Expected: All existing tests still pass (this plan doesn't add new pure-function logic worth a new test file — both changes are either env-var wiring or straightforward required-field checks mirroring the already-tested `collaboratorRequired` pattern).

- [ ] **Step 2: Run a clean production build**

Run:
```bash
rm -rf .next
npm run build
```
Expected: Build succeeds with no type errors.

- [ ] **Step 3: Manual/scripted verification pass**

Using the same pragmatic approach as prior verification passes in this project (dev server + curl + direct Prisma script checks, no real browser available):

- Confirm `process.env.BASE_URL` (not `NEXT_PUBLIC_BASE_URL`) is what's read in both `src/app/page.tsx` and the survey editor page — grep the codebase to confirm zero remaining references to `NEXT_PUBLIC_BASE_URL` in `src/`.
- Set `nameRequired: true` on a throwaway test survey with zero responses, confirm the rendered HTML of that survey's public page contains a `required` attribute on the name `<input>`, and confirm calling `submitResponseAction` directly with an empty name returns `{success: false, errors: {_form: "El nombre es obligatorio"}}`.
- Same for `phoneRequired`.
- Confirm a survey with both flags `false` (the default) behaves exactly as before — submits successfully with empty name/phone.
- Confirm the three toggle badges (colaborador/nombre/teléfono) all render correctly in the survey editor page's HTML with a valid admin session cookie, and clicking each (calling the corresponding toggle action directly) flips the corresponding DB field.
- Clean up any temporary survey/response data created during this pass — check what already exists first, don't touch the 3 real surveys' data.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: verify base URL fix and required contact fields" --allow-empty
```
