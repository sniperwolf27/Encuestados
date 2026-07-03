# Sitio de Encuestas SHOGUN — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy a Next.js survey site for SHOGUN with a public kiosk-friendly survey flow (3 initial surveys: Fotografía, Edición, Servicio al Cliente) and an admin panel to manage surveys/questions and view results, running on Railway with PostgreSQL.

**Architecture:** Single Next.js (App Router, TypeScript) application. Server Actions handle all mutations (survey/question CRUD, response submission, auth). Prisma is the only data-access layer, talking to a Railway PostgreSQL instance. Session-based auth for a single admin user, enforced by Next.js middleware. Business logic that doesn't depend on React (password hashing, session tokens, answer validation, KPI math, CSV generation) is written as plain TypeScript modules under `src/lib/`, developed test-first with Vitest. Pages and components are built directly and verified by running the dev server, since testing React Server Components/Actions end-to-end adds more overhead than value at this scale — the QA checklist in Task 24 covers that ground manually.

**Tech Stack:** Next.js 15 (App Router) + TypeScript, Tailwind CSS, Prisma + PostgreSQL, `bcryptjs` (password hashing), `jose` (JWT session tokens, Edge-compatible for middleware), `zod` (validation schemas), `qrcode` (QR generation), `recharts` (charts), `@dnd-kit/core` + `@dnd-kit/sortable` (drag-and-drop question reorder), Vitest (unit tests).

---

## Task 1: Scaffold the Next.js project

**Files:**
- Create: entire Next.js project skeleton in project root (`package.json`, `tsconfig.json`, `next.config.ts`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `tailwind.config.ts`, `postcss.config.mjs`, `.eslintrc.json`)

- [ ] **Step 1: Run create-next-app in the existing project directory**

The directory already contains `.git`, `.gitignore`, and `docs/` — `create-next-app` allows non-empty directories as long as they only contain those.

Run:
```bash
npx --yes create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

If prompted about Turbopack for `next dev`, choose **No** (keep default webpack dev server for stability).

- [ ] **Step 2: Verify the dev server boots**

Run: `npm run dev -- --port 3100 &` then `curl -s http://localhost:3100 | head -20`, then stop the dev server.
Expected: HTML output containing `<!DOCTYPE html>` and no error page.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js app with TypeScript and Tailwind"
```

---

## Task 2: Install remaining dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install runtime dependencies**

```bash
npm install prisma @prisma/client bcryptjs jose zod qrcode recharts @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

- [ ] **Step 2: Install dev dependencies**

```bash
npm install -D vitest @vitejs/plugin-react vite-tsconfig-paths @types/bcryptjs @types/qrcode
```

- [ ] **Step 3: Add test script to package.json**

Edit `package.json` `scripts` section to add:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Create vitest.config.ts**

Create `vitest.config.ts`:
```typescript
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: install Prisma, auth, validation, QR, chart, and test dependencies"
```

---

## Task 3: Brand styling — Tailwind theme and base layout

**Files:**
- Modify: `tailwind.config.ts`
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Add SHOGUN brand colors to Tailwind config**

Edit `tailwind.config.ts` to add the `theme.extend.colors` block:
```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        shogun: {
          red: "#E03A21",
          black: "#111111",
        },
      },
    },
  },
  plugins: [],
};
export default config;
```

- [ ] **Step 2: Set base typography and background in globals.css**

Ensure `src/app/globals.css` starts with the Tailwind directives (already added by create-next-app) and append:
```css
body {
  @apply bg-white text-shogun-black antialiased;
}
```

- [ ] **Step 3: Update root layout with SHOGUN title/metadata**

Edit `src/app/layout.tsx`:
```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Encuestas SHOGUN",
  description: "Encuestas de satisfacción SHOGUN",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 4: Verify build succeeds**

Run: `npm run build`
Expected: Build completes with no type or lint errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: apply SHOGUN brand colors and base layout"
```

---

## Task 4: Prisma schema and initial migration

**Files:**
- Create: `prisma/schema.prisma`
- Create: `.env.example`
- Create: `.env` (local only, gitignored)

- [ ] **Step 1: Write the Prisma schema**

Create `prisma/schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model AdminUser {
  id           String   @id @default(cuid())
  username     String   @unique
  passwordHash String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

enum QuestionType {
  RATING_STARS
  MULTIPLE_CHOICE
  TEXT
  YES_NO
  NPS
}

model Survey {
  id          String     @id @default(cuid())
  slug        String     @unique
  title       String
  description String?
  isActive    Boolean    @default(true)
  order       Int        @default(0)
  questions   Question[]
  responses   Response[]
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
}

model Question {
  id        String       @id @default(cuid())
  surveyId  String
  survey    Survey       @relation(fields: [surveyId], references: [id], onDelete: Cascade)
  type      QuestionType
  text      String
  required  Boolean      @default(true)
  order     Int          @default(0)
  options   Json?
  answers   Answer[]
  createdAt DateTime     @default(now())
  updatedAt DateTime     @updatedAt
}

model Response {
  id              String   @id @default(cuid())
  surveyId        String
  survey          Survey   @relation(fields: [surveyId], references: [id], onDelete: Cascade)
  respondentName  String?
  respondentPhone String?
  answers         Answer[]
  createdAt       DateTime @default(now())
}

model Answer {
  id         String   @id @default(cuid())
  responseId String
  response   Response @relation(fields: [responseId], references: [id], onDelete: Cascade)
  questionId String
  question   Question @relation(fields: [questionId], references: [id], onDelete: Cascade)
  value      Json
}
```

- [ ] **Step 2: Create env templates**

Create `.env.example`:
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/encuestas_shogun"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="changeme123"
SESSION_SECRET="replace-with-a-long-random-string"
```

Create `.env` (copy of the above with real local values — this file is gitignored already).

- [ ] **Step 3: Run the initial migration against a local Postgres**

Run (requires a local Postgres reachable at the `.env` `DATABASE_URL`, e.g. via `docker run --name encuestas-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=encuestas_shogun -p 5432:5432 -d postgres:16`):
```bash
npx prisma migrate dev --name init
```
Expected: Migration files created under `prisma/migrations/`, and command reports "Your database is now in sync with your schema."

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations .env.example
git commit -m "feat: add Prisma schema for surveys, questions, responses, answers"
```

---

## Task 5: Prisma client singleton

**Files:**
- Create: `src/lib/db.ts`

- [ ] **Step 1: Write the singleton**

Create `src/lib/db.ts`:
```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/db.ts
git commit -m "feat: add Prisma client singleton"
```

---

## Task 6: Password hashing utility (TDD)

**Files:**
- Create: `src/lib/auth/password.ts`
- Test: `tests/unit/password.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/password.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

describe("password", () => {
  it("hashes a password and verifies it correctly", async () => {
    const hash = await hashPassword("correct-horse-battery-staple");
    expect(hash).not.toBe("correct-horse-battery-staple");
    await expect(verifyPassword("correct-horse-battery-staple", hash)).resolves.toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("correct-horse-battery-staple");
    await expect(verifyPassword("wrong-password", hash)).resolves.toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/password.test.ts`
Expected: FAIL — cannot find module `@/lib/auth/password`.

- [ ] **Step 3: Implement the module**

Create `src/lib/auth/password.ts`:
```typescript
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/password.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/password.ts tests/unit/password.test.ts
git commit -m "feat: add password hashing utility"
```

---

## Task 7: Session token utility (TDD)

**Files:**
- Create: `src/lib/auth/session.ts`
- Test: `tests/unit/session.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/session.test.ts`:
```typescript
import { describe, it, expect, beforeAll } from "vitest";
import { createSessionToken, verifySessionToken } from "@/lib/auth/session";

beforeAll(() => {
  process.env.SESSION_SECRET = "test-secret-at-least-32-characters-long";
});

describe("session token", () => {
  it("creates a token that verifies back to the same username", async () => {
    const token = await createSessionToken("admin");
    const payload = await verifySessionToken(token);
    expect(payload?.username).toBe("admin");
  });

  it("returns null for a tampered token", async () => {
    const token = await createSessionToken("admin");
    const tampered = token.slice(0, -2) + "xx";
    const payload = await verifySessionToken(tampered);
    expect(payload).toBeNull();
  });

  it("returns null for garbage input", async () => {
    const payload = await verifySessionToken("not-a-real-token");
    expect(payload).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/session.test.ts`
Expected: FAIL — cannot find module `@/lib/auth/session`.

- [ ] **Step 3: Implement the module**

Create `src/lib/auth/session.ts`:
```typescript
import { SignJWT, jwtVerify } from "jose";

const COOKIE_NAME = "shogun_admin_session";
const EXPIRATION = "7d";

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET environment variable is not set");
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(username: string): Promise<string> {
  return new SignJWT({ username })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(EXPIRATION)
    .sign(getSecretKey());
}

export async function verifySessionToken(
  token: string
): Promise<{ username: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (typeof payload.username !== "string") return null;
    return { username: payload.username };
  } catch {
    return null;
  }
}

export { COOKIE_NAME };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/session.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/session.ts tests/unit/session.test.ts
git commit -m "feat: add JWT-based session token utility"
```

---

## Task 8: Seed script — bootstrap admin and initial surveys

**Files:**
- Create: `prisma/seed.ts`
- Modify: `package.json`

- [ ] **Step 1: Write the seed script**

Create `prisma/seed.ts`:
```typescript
import { PrismaClient, QuestionType } from "@prisma/client";
import bcrypt from "bcryptjs";

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

async function seedSurvey(
  slug: string,
  title: string,
  description: string,
  order: number,
  questions: SeedQuestion[]
) {
  const existing = await db.survey.findUnique({ where: { slug } });
  if (existing) return;

  await db.survey.create({
    data: {
      slug,
      title,
      description,
      order,
      questions: {
        create: questions.map((q, i) => ({
          type: q.type,
          text: q.text,
          required: q.required,
          order: i,
          options: q.options ?? undefined,
        })),
      },
    },
  });
  console.log(`Created survey "${title}"`);
}

async function main() {
  await seedAdmin();

  await seedSurvey("fotografia", "Fotografía", "Cuéntanos sobre tu sesión de fotos", 0, [
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

  await seedSurvey("edicion", "Edición", "Cuéntanos sobre la edición de tus fotos", 1, [
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

- [ ] **Step 2: Register the seed command in package.json**

Add to `package.json` (top level, not under `scripts`):
```json
"prisma": {
  "seed": "npx tsx prisma/seed.ts"
}
```

Install `tsx` as a dev dependency:
```bash
npm install -D tsx
```

- [ ] **Step 3: Run the seed and verify data**

Run: `npx prisma db seed`
Expected: Console logs "Created initial admin user \"admin\"" and three "Created survey" lines.

Run: `npx prisma studio` briefly (or `npx prisma db execute --stdin <<< "select slug from \"Survey\";"`) to confirm 3 surveys exist, then stop it.

- [ ] **Step 4: Commit**

```bash
git add prisma/seed.ts package.json package-lock.json
git commit -m "feat: add seed script for admin bootstrap and initial surveys"
```

---

## Task 9: Answer validation utility (TDD)

**Files:**
- Create: `src/lib/surveys/validate-answers.ts`
- Test: `tests/unit/validate-answers.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/validate-answers.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { validateAnswers, type QuestionForValidation } from "@/lib/surveys/validate-answers";

const questions: QuestionForValidation[] = [
  { id: "q1", type: "RATING_STARS", required: true, options: null },
  { id: "q2", type: "YES_NO", required: true, options: null },
  { id: "q3", type: "MULTIPLE_CHOICE", required: true, options: ["A", "B"] },
  { id: "q4", type: "NPS", required: true, options: null },
  { id: "q5", type: "TEXT", required: false, options: null },
];

describe("validateAnswers", () => {
  it("passes when all required answers are valid", () => {
    const result = validateAnswers(questions, {
      q1: 4,
      q2: true,
      q3: "A",
      q4: 8,
      q5: "",
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it("fails when a required question is missing", () => {
    const result = validateAnswers(questions, { q1: 4, q2: true, q3: "A", q4: 8 });
    expect(result.valid).toBe(false);
    expect(result.errors.q5).toBeUndefined();
  });

  it("fails when a rating is out of range", () => {
    const result = validateAnswers(questions, { q1: 7, q2: true, q3: "A", q4: 8 });
    expect(result.valid).toBe(false);
    expect(result.errors.q1).toBeDefined();
  });

  it("fails when NPS is out of range", () => {
    const result = validateAnswers(questions, { q1: 4, q2: true, q3: "A", q4: 11 });
    expect(result.valid).toBe(false);
    expect(result.errors.q4).toBeDefined();
  });

  it("fails when multiple choice value is not one of the options", () => {
    const result = validateAnswers(questions, { q1: 4, q2: true, q3: "Z", q4: 8 });
    expect(result.valid).toBe(false);
    expect(result.errors.q3).toBeDefined();
  });

  it("allows an optional text question to be omitted entirely", () => {
    const result = validateAnswers(questions, { q1: 4, q2: true, q3: "A", q4: 8 });
    expect(result.valid).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/validate-answers.test.ts`
Expected: FAIL — cannot find module `@/lib/surveys/validate-answers`.

- [ ] **Step 3: Implement the module**

Create `src/lib/surveys/validate-answers.ts`:
```typescript
export type QuestionForValidation = {
  id: string;
  type: "RATING_STARS" | "MULTIPLE_CHOICE" | "TEXT" | "YES_NO" | "NPS";
  required: boolean;
  options: string[] | null;
};

export type ValidationResult = {
  valid: boolean;
  errors: Record<string, string>;
};

export function validateAnswers(
  questions: QuestionForValidation[],
  answers: Record<string, unknown>
): ValidationResult {
  const errors: Record<string, string> = {};

  for (const question of questions) {
    const value = answers[question.id];
    const isEmpty =
      value === undefined || value === null || (typeof value === "string" && value.trim() === "");

    if (isEmpty) {
      if (question.required) {
        errors[question.id] = "Esta pregunta es obligatoria";
      }
      continue;
    }

    switch (question.type) {
      case "RATING_STARS": {
        if (typeof value !== "number" || value < 1 || value > 5) {
          errors[question.id] = "Debe ser un número entre 1 y 5";
        }
        break;
      }
      case "NPS": {
        if (typeof value !== "number" || value < 0 || value > 10) {
          errors[question.id] = "Debe ser un número entre 0 y 10";
        }
        break;
      }
      case "YES_NO": {
        if (typeof value !== "boolean") {
          errors[question.id] = "Debe ser sí o no";
        }
        break;
      }
      case "MULTIPLE_CHOICE": {
        if (typeof value !== "string" || !(question.options ?? []).includes(value)) {
          errors[question.id] = "Selecciona una opción válida";
        }
        break;
      }
      case "TEXT": {
        if (typeof value !== "string") {
          errors[question.id] = "Debe ser texto";
        }
        break;
      }
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/validate-answers.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/surveys/validate-answers.ts tests/unit/validate-answers.test.ts
git commit -m "feat: add survey answer validation utility"
```

---

## Task 10: KPI calculation utility (TDD)

**Files:**
- Create: `src/lib/surveys/kpis.ts`
- Test: `tests/unit/kpis.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/kpis.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { computeKpis, type AnswerForKpis, type QuestionForKpis } from "@/lib/surveys/kpis";

const questions: QuestionForKpis[] = [
  { id: "q1", type: "RATING_STARS", text: "Calidad" },
  { id: "q2", type: "YES_NO", text: "¿Puntual?" },
  { id: "q3", type: "NPS", text: "Recomendación" },
];

describe("computeKpis", () => {
  it("computes overall average rating across RATING_STARS answers", () => {
    const answers: AnswerForKpis[] = [
      { questionId: "q1", value: 4 },
      { questionId: "q1", value: 2 },
    ];
    const result = computeKpis(questions, answers);
    expect(result.averageRating).toBe(3);
  });

  it("computes yes percentage for YES_NO questions", () => {
    const answers: AnswerForKpis[] = [
      { questionId: "q2", value: true },
      { questionId: "q2", value: true },
      { questionId: "q2", value: false },
    ];
    const result = computeKpis(questions, answers);
    expect(result.yesPercentage).toBeCloseTo(66.67, 1);
  });

  it("computes NPS as promoters minus detractors percentage", () => {
    // 4 responses: 9 (promoter), 10 (promoter), 6 (detractor), 7 (passive)
    const answers: AnswerForKpis[] = [
      { questionId: "q3", value: 9 },
      { questionId: "q3", value: 10 },
      { questionId: "q3", value: 6 },
      { questionId: "q3", value: 7 },
    ];
    const result = computeKpis(questions, answers);
    // promoters 2/4 = 50%, detractors 1/4 = 25% -> NPS = 25
    expect(result.nps).toBe(25);
  });

  it("returns nulls when there is no data for a metric", () => {
    const result = computeKpis(questions, []);
    expect(result.averageRating).toBeNull();
    expect(result.yesPercentage).toBeNull();
    expect(result.nps).toBeNull();
  });

  it("builds a rating distribution for chart display", () => {
    const answers: AnswerForKpis[] = [
      { questionId: "q1", value: 5 },
      { questionId: "q1", value: 5 },
      { questionId: "q1", value: 3 },
    ];
    const result = computeKpis(questions, answers);
    expect(result.ratingDistribution).toEqual({ 1: 0, 2: 0, 3: 1, 4: 0, 5: 2 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/kpis.test.ts`
Expected: FAIL — cannot find module `@/lib/surveys/kpis`.

- [ ] **Step 3: Implement the module**

Create `src/lib/surveys/kpis.ts`:
```typescript
export type QuestionForKpis = {
  id: string;
  type: "RATING_STARS" | "MULTIPLE_CHOICE" | "TEXT" | "YES_NO" | "NPS";
  text: string;
};

export type AnswerForKpis = {
  questionId: string;
  value: unknown;
};

export type KpiResult = {
  averageRating: number | null;
  yesPercentage: number | null;
  nps: number | null;
  ratingDistribution: Record<1 | 2 | 3 | 4 | 5, number>;
};

export function computeKpis(questions: QuestionForKpis[], answers: AnswerForKpis[]): KpiResult {
  const questionTypeById = new Map(questions.map((q) => [q.id, q.type]));

  const ratingValues: number[] = [];
  const yesNoValues: boolean[] = [];
  const npsValues: number[] = [];

  for (const answer of answers) {
    const type = questionTypeById.get(answer.questionId);
    if (type === "RATING_STARS" && typeof answer.value === "number") {
      ratingValues.push(answer.value);
    } else if (type === "YES_NO" && typeof answer.value === "boolean") {
      yesNoValues.push(answer.value);
    } else if (type === "NPS" && typeof answer.value === "number") {
      npsValues.push(answer.value);
    }
  }

  const averageRating =
    ratingValues.length === 0
      ? null
      : ratingValues.reduce((sum, v) => sum + v, 0) / ratingValues.length;

  const yesPercentage =
    yesNoValues.length === 0
      ? null
      : (yesNoValues.filter(Boolean).length / yesNoValues.length) * 100;

  let nps: number | null = null;
  if (npsValues.length > 0) {
    const promoters = npsValues.filter((v) => v >= 9).length;
    const detractors = npsValues.filter((v) => v <= 6).length;
    nps = Math.round(((promoters - detractors) / npsValues.length) * 100);
  }

  const ratingDistribution: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const value of ratingValues) {
    if (value >= 1 && value <= 5) {
      ratingDistribution[value as 1 | 2 | 3 | 4 | 5] += 1;
    }
  }

  return { averageRating, yesPercentage, nps, ratingDistribution };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/kpis.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/surveys/kpis.ts tests/unit/kpis.test.ts
git commit -m "feat: add KPI calculation utility for average rating, yes%, and NPS"
```

---

## Task 11: CSV export utility (TDD)

**Files:**
- Create: `src/lib/surveys/csv.ts`
- Test: `tests/unit/csv.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/csv.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { responsesToCsv, type ResponseForCsv, type QuestionForCsv } from "@/lib/surveys/csv";

const questions: QuestionForCsv[] = [
  { id: "q1", text: "¿Cómo calificarías la calidad?" },
  { id: "q2", text: "Comentarios" },
];

describe("responsesToCsv", () => {
  it("produces a header row with fixed columns plus one per question", () => {
    const csv = responsesToCsv(questions, []);
    const [header] = csv.split("\n");
    expect(header).toBe(
      'Fecha,Nombre,Telefono,"¿Cómo calificarías la calidad?","Comentarios"'
    );
  });

  it("produces one row per response with matching answer values", () => {
    const responses: ResponseForCsv[] = [
      {
        createdAt: new Date("2026-07-02T15:00:00Z"),
        respondentName: "Ana R.",
        respondentPhone: null,
        answers: [
          { questionId: "q1", value: 5 },
          { questionId: "q2", value: "Excelente atención" },
        ],
      },
    ];
    const csv = responsesToCsv(questions, responses);
    const rows = csv.split("\n");
    expect(rows[1]).toBe('2026-07-02,"Ana R.",,"5","Excelente atención"');
  });

  it("escapes commas and quotes inside values", () => {
    const responses: ResponseForCsv[] = [
      {
        createdAt: new Date("2026-07-02T15:00:00Z"),
        respondentName: null,
        respondentPhone: null,
        answers: [
          { questionId: "q1", value: 4 },
          { questionId: "q2", value: 'Buen trabajo, "muy" profesional' },
        ],
      },
    ];
    const csv = responsesToCsv(questions, responses);
    const rows = csv.split("\n");
    expect(rows[1]).toBe('2026-07-02,,,"4","Buen trabajo, ""muy"" profesional"');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/csv.test.ts`
Expected: FAIL — cannot find module `@/lib/surveys/csv`.

- [ ] **Step 3: Implement the module**

Create `src/lib/surveys/csv.ts`:
```typescript
export type QuestionForCsv = { id: string; text: string };

export type ResponseForCsv = {
  createdAt: Date;
  respondentName: string | null;
  respondentPhone: string | null;
  answers: { questionId: string; value: unknown }[];
};

function escapeCsvField(raw: string): string {
  return `"${raw.replace(/"/g, '""')}"`;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function responsesToCsv(questions: QuestionForCsv[], responses: ResponseForCsv[]): string {
  const header = ["Fecha", "Nombre", "Telefono", ...questions.map((q) => escapeCsvField(q.text))].join(
    ","
  );

  const rows = responses.map((response) => {
    const answerByQuestionId = new Map(response.answers.map((a) => [a.questionId, a.value]));
    const answerCells = questions.map((q) => {
      const value = answerByQuestionId.get(q.id);
      if (value === undefined || value === null) return "";
      return escapeCsvField(String(value));
    });

    return [
      formatDate(response.createdAt),
      response.respondentName ? escapeCsvField(response.respondentName) : "",
      response.respondentPhone ? escapeCsvField(response.respondentPhone) : "",
      ...answerCells,
    ].join(",");
  });

  return [header, ...rows].join("\n");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/csv.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/surveys/csv.ts tests/unit/csv.test.ts
git commit -m "feat: add CSV export utility for survey responses"
```

---

## Task 12: Middleware for admin route protection

**Files:**
- Create: `src/middleware.ts`

- [ ] **Step 1: Write the middleware**

Create `src/middleware.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/auth/session";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/middleware.ts
git commit -m "feat: protect /admin routes with session middleware"
```

---

## Task 13: Login page and logout action

**Files:**
- Create: `src/app/admin/login/page.tsx`
- Create: `src/app/admin/login/actions.ts`
- Create: `src/app/admin/logout/route.ts`

- [ ] **Step 1: Write the login server action**

Create `src/app/admin/login/actions.ts`:
```typescript
"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { createSessionToken, COOKIE_NAME } from "@/lib/auth/session";

export type LoginState = { error: string | null };

export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/admin");

  const admin = await db.adminUser.findUnique({ where: { username } });
  if (!admin) {
    return { error: "Usuario o contraseña incorrectos" };
  }

  const valid = await verifyPassword(password, admin.passwordHash);
  if (!valid) {
    return { error: "Usuario o contraseña incorrectos" };
  }

  const token = await createSessionToken(admin.username);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  redirect(next.startsWith("/admin") ? next : "/admin");
}
```

- [ ] **Step 2: Write the login page**

Create `src/app/admin/login/page.tsx`:
```tsx
"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = { error: null };

export default function LoginPage() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/admin";
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <main className="flex min-h-screen items-center justify-center bg-shogun-black px-4">
      <form
        action={formAction}
        className="w-full max-w-sm rounded-xl bg-white p-8 shadow-lg"
      >
        <h1 className="mb-6 text-2xl font-extrabold text-shogun-black">
          Encuestas <span className="text-shogun-red">SHOGUN</span>
        </h1>
        <input type="hidden" name="next" value={next} />
        <label className="mb-1 block text-sm font-semibold text-shogun-black">Usuario</label>
        <input
          name="username"
          required
          className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2"
        />
        <label className="mb-1 block text-sm font-semibold text-shogun-black">Contraseña</label>
        <input
          type="password"
          name="password"
          required
          className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2"
        />
        {state.error && <p className="mb-4 text-sm text-shogun-red">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-shogun-red py-2 font-bold text-white disabled:opacity-60"
        >
          {pending ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </main>
  );
}
```

- [ ] **Step 3: Write the logout route**

Create `src/app/admin/logout/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/admin/login", request.url));
  response.cookies.delete(COOKIE_NAME);
  return response;
}
```

- [ ] **Step 4: Verify manually**

Run: `npm run dev -- --port 3100 &`, then open `http://localhost:3100/admin` (should redirect to `/admin/login`), log in with the seeded admin credentials, confirm redirect to `/admin`. Stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/login src/app/admin/logout
git commit -m "feat: add admin login page and logout route"
```

---

## Task 14: Admin layout with sidebar and dashboard page

**Files:**
- Create: `src/app/admin/layout.tsx`
- Create: `src/app/admin/page.tsx`
- Create: `src/components/admin/Sidebar.tsx`

- [ ] **Step 1: Write the Sidebar component**

Create `src/components/admin/Sidebar.tsx`:
```tsx
import Link from "next/link";
import { db } from "@/lib/db";

export async function Sidebar() {
  const surveys = await db.survey.findMany({ orderBy: { order: "asc" } });

  return (
    <aside className="w-48 shrink-0 bg-shogun-black p-4 text-white">
      <div className="mb-8 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-shogun-red font-black">
          S
        </div>
        <span className="font-bold">Encuestas</span>
      </div>
      <nav className="space-y-1 text-sm">
        <Link href="/admin" className="block rounded px-2 py-1 hover:bg-white/10">
          Dashboard
        </Link>
        {surveys.map((survey) => (
          <Link
            key={survey.id}
            href={`/admin/encuestas/${survey.id}`}
            className="block rounded px-2 py-1 hover:bg-white/10"
          >
            {survey.title}
          </Link>
        ))}
        <Link
          href="/admin/encuestas/nueva"
          className="mt-2 block rounded px-2 py-1 text-white/70 hover:bg-white/10"
        >
          + Nueva encuesta
        </Link>
        <Link
          href="/admin/configuracion"
          className="mt-4 block rounded px-2 py-1 text-white/60 hover:bg-white/10"
        >
          Configuración
        </Link>
        <form action="/admin/logout" method="POST">
          <button className="mt-1 block w-full rounded px-2 py-1 text-left text-white/60 hover:bg-white/10">
            Cerrar sesión
          </button>
        </form>
      </nav>
    </aside>
  );
}
```

- [ ] **Step 2: Write the admin layout**

Create `src/app/admin/layout.tsx`:
```tsx
import { Sidebar } from "@/components/admin/Sidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 bg-gray-50 p-6">{children}</div>
    </div>
  );
}
```

Note: `/admin/login` is nested outside this layout by virtue of the middleware allowing it unauthenticated, but it still inherits `src/app/admin/layout.tsx` in the App Router tree. To avoid rendering the sidebar on the login page, move login/logout out from under the shared layout by using a route group: rename `src/app/admin` segment structure so `login` and `logout` live under `src/app/(admin-public)/admin/login` and `.../admin/logout`, while protected pages live under `src/app/(admin-protected)/admin/...` sharing the layout. Apply this now:

```bash
mkdir -p "src/app/(admin-public)/admin"
git mv src/app/admin/login "src/app/(admin-public)/admin/login"
git mv src/app/admin/logout "src/app/(admin-public)/admin/logout"
```

The layout, dashboard, and all future protected admin pages stay directly under `src/app/admin/`.

- [ ] **Step 3: Write the dashboard page**

Create `src/app/admin/page.tsx`:
```tsx
import Link from "next/link";
import { db } from "@/lib/db";

export default async function AdminDashboardPage() {
  const surveys = await db.survey.findMany({
    orderBy: { order: "asc" },
    include: { _count: { select: { responses: true } } },
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold text-shogun-black">Dashboard</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {surveys.map((survey) => (
          <Link
            key={survey.id}
            href={`/admin/encuestas/${survey.id}`}
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md"
          >
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-bold text-shogun-black">{survey.title}</h2>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  survey.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                }`}
              >
                {survey.isActive ? "Activa" : "Inactiva"}
              </span>
            </div>
            <p className="text-sm text-gray-500">{survey._count.responses} respuestas</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify manually**

Run: `npm run dev -- --port 3100 &`, log in, confirm `/admin` shows the 3 seeded surveys as cards and `/admin/login` renders without the sidebar. Stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add admin layout, sidebar navigation, and dashboard"
```

---

## Task 15: Create survey page and action

**Files:**
- Create: `src/app/admin/encuestas/nueva/page.tsx`
- Create: `src/app/admin/encuestas/nueva/actions.ts`

- [ ] **Step 1: Write the create-survey action**

Create `src/app/admin/encuestas/nueva/actions.ts`:
```typescript
"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";

export type CreateSurveyState = { error: string | null };

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function createSurveyAction(
  _prevState: CreateSurveyState,
  formData: FormData
): Promise<CreateSurveyState> {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

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
      slug,
      order: (maxOrder._max.order ?? -1) + 1,
    },
  });

  redirect(`/admin/encuestas/${survey.id}`);
}
```

- [ ] **Step 2: Write the create-survey page**

Create `src/app/admin/encuestas/nueva/page.tsx`:
```tsx
"use client";

import { useActionState } from "react";
import { createSurveyAction, type CreateSurveyState } from "./actions";

const initialState: CreateSurveyState = { error: null };

export default function NewSurveyPage() {
  const [state, formAction, pending] = useActionState(createSurveyAction, initialState);

  return (
    <div className="max-w-lg">
      <h1 className="mb-6 text-2xl font-extrabold text-shogun-black">Nueva encuesta</h1>
      <form action={formAction} className="rounded-xl bg-white p-6 shadow-sm">
        <label className="mb-1 block text-sm font-semibold text-shogun-black">Título</label>
        <input
          name="title"
          required
          className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2"
        />
        <label className="mb-1 block text-sm font-semibold text-shogun-black">Descripción</label>
        <textarea
          name="description"
          className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2"
        />
        {state.error && <p className="mb-4 text-sm text-shogun-red">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-shogun-red px-4 py-2 font-bold text-white disabled:opacity-60"
        >
          {pending ? "Creando..." : "Crear encuesta"}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Verify manually**

Run the dev server, log in, go to `/admin/encuestas/nueva`, create a test survey called "Prueba", confirm redirect to its (empty) editor page URL (page not built yet — a 404 there is expected until Task 16). Delete the test survey via `npx prisma studio` afterwards to keep seed data clean.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/encuestas/nueva
git commit -m "feat: add create-survey page and action"
```

---

## Task 16: Survey editor — question list, create, edit, delete

**Files:**
- Create: `src/app/admin/encuestas/[id]/page.tsx`
- Create: `src/app/admin/encuestas/[id]/actions.ts`
- Create: `src/components/admin/QuestionEditor.tsx`

- [ ] **Step 1: Write question CRUD + survey toggle actions**

Create `src/app/admin/encuestas/[id]/actions.ts`:
```typescript
"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { QuestionType } from "@prisma/client";

export async function toggleSurveyActiveAction(surveyId: string, isActive: boolean) {
  await db.survey.update({ where: { id: surveyId }, data: { isActive } });
  revalidatePath(`/admin/encuestas/${surveyId}`);
}

export async function addQuestionAction(formData: FormData) {
  const surveyId = String(formData.get("surveyId"));
  const type = String(formData.get("type")) as QuestionType;
  const text = String(formData.get("text") ?? "").trim();
  const required = formData.get("required") === "on";
  const optionsRaw = String(formData.get("options") ?? "").trim();

  if (!text) return;

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
      order: (maxOrder._max.order ?? -1) + 1,
      options:
        type === "MULTIPLE_CHOICE" && optionsRaw
          ? optionsRaw.split(",").map((o) => o.trim()).filter(Boolean)
          : undefined,
    },
  });

  revalidatePath(`/admin/encuestas/${surveyId}`);
}

export async function updateQuestionAction(formData: FormData) {
  const id = String(formData.get("id"));
  const surveyId = String(formData.get("surveyId"));
  const text = String(formData.get("text") ?? "").trim();
  const required = formData.get("required") === "on";
  const optionsRaw = String(formData.get("options") ?? "").trim();
  const type = String(formData.get("type")) as QuestionType;

  if (!text) return;

  await db.question.update({
    where: { id },
    data: {
      text,
      required,
      type,
      options:
        type === "MULTIPLE_CHOICE" && optionsRaw
          ? optionsRaw.split(",").map((o) => o.trim()).filter(Boolean)
          : null,
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
```

- [ ] **Step 2: Write the QuestionEditor client component (without drag-and-drop for now)**

Create `src/components/admin/QuestionEditor.tsx`:
```tsx
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
```

- [ ] **Step 3: Write the survey editor page**

Create `src/app/admin/encuestas/[id]/page.tsx`:
```tsx
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { QuestionEditor } from "@/components/admin/QuestionEditor";
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

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-shogun-black">{survey.title}</h1>
          <p className="text-sm text-gray-500">/encuesta/{survey.slug}</p>
        </div>
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

      <a
        href={`/admin/encuestas/${survey.id}/resultados`}
        className="mb-6 inline-block text-sm font-semibold text-shogun-red"
      >
        Ver resultados →
      </a>

      <QuestionEditor surveyId={survey.id} questions={survey.questions} />
    </div>
  );
}
```

- [ ] **Step 4: Verify manually**

Run the dev server, open the editor page for "Fotografía", confirm the 5 seeded questions render, add a test question, edit it, delete it, and toggle active/inactive.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/encuestas/\[id\] src/components/admin/QuestionEditor.tsx
git commit -m "feat: add survey editor with question create/edit/delete and active toggle"
```

---

## Task 17: Drag-and-drop question reordering

**Files:**
- Modify: `src/components/admin/QuestionEditor.tsx`

- [ ] **Step 1: Replace the entire file with a drag-and-drop-enabled version**

Replace the **entire contents** of `src/components/admin/QuestionEditor.tsx` with the code below (this supersedes the Task 16 version — imports, the main component, the label map, and the new `SortableQuestionRow` sub-component all live in this one file):

```tsx
"use client";

import { useState } from "react";
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
```

The rest of the file (component body, label map, and sortable row sub-component):

```tsx
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
              <p className="font-semibold text-shogun-black">{question.text}</p>
              <p className="text-xs text-gray-500">
                {QUESTION_TYPE_LABELS[question.type]} · {question.required ? "Obligatoria" : "Opcional"}
              </p>
            </div>
          </div>
          <div className="flex gap-2 text-sm">
            <button onClick={onEdit} className="text-shogun-red">
              Editar
            </button>
            <form action={deleteQuestionAction.bind(null, question.id, surveyId)}>
              <button className="text-gray-400 hover:text-shogun-red">Eliminar</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify manually**

Run the dev server, open a survey editor, drag a question to a new position, refresh the page, and confirm the new order persisted.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/QuestionEditor.tsx
git commit -m "feat: add drag-and-drop question reordering"
```

---

## Task 18: QR code and shareable link in the survey editor

**Files:**
- Create: `src/lib/qr.ts`
- Create: `src/components/admin/ShareLink.tsx`
- Modify: `src/app/admin/encuestas/[id]/page.tsx`

- [ ] **Step 1: Write the QR generation helper**

Create `src/lib/qr.ts`:
```typescript
import QRCode from "qrcode";

export async function generateQrDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, { margin: 1, width: 240 });
}
```

- [ ] **Step 2: Write the ShareLink component**

Create `src/components/admin/ShareLink.tsx`:
```tsx
"use client";

import { useState } from "react";

export function ShareLink({ url, qrDataUrl }: { url: string; qrDataUrl: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="mb-6 flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={qrDataUrl} alt="Código QR de la encuesta" width={96} height={96} />
      <div>
        <p className="mb-1 text-sm text-gray-500">Link público</p>
        <p className="mb-2 break-all font-mono text-sm text-shogun-black">{url}</p>
        <button
          onClick={async () => {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="rounded bg-shogun-black px-3 py-1 text-xs font-bold text-white"
        >
          {copied ? "¡Copiado!" : "Copiar link"}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Wire it into the survey editor page**

Edit `src/app/admin/encuestas/[id]/page.tsx`: add the import and render the component. Add near the top:
```tsx
import { generateQrDataUrl } from "@/lib/qr";
import { ShareLink } from "@/components/admin/ShareLink";
```

Inside `SurveyEditorPage`, after fetching `survey` and before the `return`, add:
```tsx
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const publicUrl = `${baseUrl}/encuesta/${survey.slug}`;
  const qrDataUrl = await generateQrDataUrl(publicUrl);
```

Then insert `<ShareLink url={publicUrl} qrDataUrl={qrDataUrl} />` right after the header `<div>` block (the one containing the title and active toggle) and before the "Ver resultados" link.

Add `NEXT_PUBLIC_BASE_URL="http://localhost:3000"` to `.env` and `.env.example`.

- [ ] **Step 4: Verify manually**

Run the dev server, open a survey editor, confirm the QR image renders and "Copiar link" copies the URL.

- [ ] **Step 5: Commit**

```bash
git add src/lib/qr.ts src/components/admin/ShareLink.tsx src/app/admin/encuestas/\[id\]/page.tsx .env.example
git commit -m "feat: show QR code and copyable public link in survey editor"
```

---

## Task 19: Public survey selector page

**Files:**
- Create: `src/app/page.tsx`

- [ ] **Step 1: Write the public landing/selector page**

Replace `src/app/page.tsx`:
```tsx
import Link from "next/link";
import { db } from "@/lib/db";

export default async function HomePage() {
  const surveys = await db.survey.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
  });

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-shogun-black px-4 py-16">
      <h1 className="mb-2 text-3xl font-extrabold text-white">
        SHOGUN <span className="text-shogun-red">Encuestas</span>
      </h1>
      <p className="mb-10 text-white/70">Selecciona la encuesta que quieres responder</p>
      <div className="grid w-full max-w-md gap-4">
        {surveys.map((survey) => (
          <Link
            key={survey.id}
            href={`/encuesta/${survey.slug}`}
            className="rounded-2xl bg-white p-6 text-center text-xl font-bold text-shogun-black shadow-lg active:scale-95"
          >
            {survey.title}
          </Link>
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Verify manually**

Run the dev server, open `http://localhost:3100/`, confirm the 3 active surveys render as large tappable cards (link targets not built yet — clicking is expected to 404 until Task 20).

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: add public survey area selector page"
```

---

## Task 20: Public survey form, submission, and kiosk auto-reset

**Files:**
- Create: `src/app/encuesta/[slug]/page.tsx`
- Create: `src/app/encuesta/[slug]/actions.ts`
- Create: `src/components/survey/SurveyForm.tsx`
- Create: `src/components/survey/QuestionField.tsx`
- Create: `src/components/survey/ThankYou.tsx`

- [ ] **Step 1: Write the submit server action**

Create `src/app/encuesta/[slug]/actions.ts`:
```typescript
"use server";

import { db } from "@/lib/db";
import { validateAnswers, type QuestionForValidation } from "@/lib/surveys/validate-answers";

export type SubmitResult = { success: boolean; errors?: Record<string, string> };

export async function submitResponseAction(
  slug: string,
  answers: Record<string, unknown>,
  respondentName: string,
  respondentPhone: string
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
    options: Array.isArray(q.options) ? (q.options as string[]) : null,
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

- [ ] **Step 2: Write the QuestionField component**

Create `src/components/survey/QuestionField.tsx`:
```tsx
"use client";

import type { Question } from "@prisma/client";

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
  return (
    <div className="mb-6">
      <p className="mb-2 font-semibold text-shogun-black">
        {question.text}
        {question.required && <span className="text-shogun-red"> *</span>}
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
              value === true ? "border-shogun-red text-shogun-red" : "border-gray-200 text-gray-400"
            }`}
          >
            Sí
          </button>
          <button
            type="button"
            onClick={() => onChange(false)}
            className={`rounded-lg border-2 px-6 py-3 font-bold ${
              value === false ? "border-shogun-red text-shogun-red" : "border-gray-200 text-gray-400"
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
                value === n ? "border-shogun-red bg-shogun-red text-white" : "border-gray-200 text-gray-500"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      )}

      {question.type === "MULTIPLE_CHOICE" && (
        <div className="flex flex-wrap gap-2">
          {(Array.isArray(question.options) ? (question.options as string[]) : []).map((option) => (
            <button
              type="button"
              key={option}
              onClick={() => onChange(option)}
              className={`rounded-lg border-2 px-4 py-2 font-semibold ${
                value === option ? "border-shogun-red text-shogun-red" : "border-gray-200 text-gray-500"
              }`}
            >
              {option}
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

      {error && <p className="mt-1 text-sm text-shogun-red">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 3: Write the ThankYou component with kiosk auto-reset**

Create `src/components/survey/ThankYou.tsx`:
```tsx
"use client";

import { useEffect, useState } from "react";

const RESET_SECONDS = 6;

export function ThankYou({ onReset }: { onReset: () => void }) {
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-shogun-black px-4 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-shogun-red text-4xl font-black text-white">
        S
      </div>
      <h1 className="mb-2 text-2xl font-extrabold text-white">¡Gracias por tu respuesta!</h1>
      <p className="text-white/60">Volviendo al inicio en {secondsLeft}s...</p>
    </div>
  );
}
```

- [ ] **Step 4: Write the SurveyForm client component**

Create `src/components/survey/SurveyForm.tsx`:
```tsx
"use client";

import { useState } from "react";
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

  function resetForm() {
    setAnswers({});
    setRespondentName("");
    setRespondentPhone("");
    setErrors({});
    setSubmitted(false);
  }

  if (submitted) {
    return <ThankYou onReset={resetForm} />;
  }

  return (
    <main className="mx-auto min-h-screen max-w-lg bg-white px-4 py-10">
      <h1 className="mb-1 text-2xl font-extrabold text-shogun-black">{survey.title}</h1>
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
          <p className="mb-2 font-semibold text-shogun-black">Nombre (opcional)</p>
          <input
            value={respondentName}
            onChange={(e) => setRespondentName(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </div>
        <div className="mb-6">
          <p className="mb-2 font-semibold text-shogun-black">Teléfono (opcional)</p>
          <input
            value={respondentPhone}
            onChange={(e) => setRespondentPhone(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </div>

        {errors._form && <p className="mb-4 text-sm text-shogun-red">{errors._form}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-shogun-red py-3 text-lg font-bold text-white disabled:opacity-60"
        >
          {submitting ? "Enviando..." : "Enviar"}
        </button>
      </form>
    </main>
  );
}
```

- [ ] **Step 5: Write the public survey page**

Create `src/app/encuesta/[slug]/page.tsx`:
```tsx
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { SurveyForm } from "@/components/survey/SurveyForm";

export default async function PublicSurveyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const survey = await db.survey.findUnique({
    where: { slug },
    include: { questions: { orderBy: { order: "asc" } } },
  });

  if (!survey || !survey.isActive) notFound();

  return <SurveyForm survey={survey} questions={survey.questions} />;
}
```

- [ ] **Step 6: Verify manually**

Run the dev server, go to `/`, open the "Fotografía" survey, fill it out (leave a required question blank first to confirm validation errors appear), submit successfully, confirm the thank-you screen appears and auto-resets to a blank form after 6 seconds. Check the response landed in the database via `npx prisma studio`.

- [ ] **Step 7: Commit**

```bash
git add src/app/encuesta src/components/survey
git commit -m "feat: add public survey form with validation, submission, and kiosk auto-reset"
```

---

## Task 21: CSV export route

**Files:**
- Create: `src/app/admin/encuestas/[id]/resultados/export/route.ts`

- [ ] **Step 1: Write the export route handler**

Create `src/app/admin/encuestas/[id]/resultados/export/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { responsesToCsv } from "@/lib/surveys/csv";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const survey = await db.survey.findUnique({
    where: { id },
    include: {
      questions: { orderBy: { order: "asc" } },
      responses: { include: { answers: true }, orderBy: { createdAt: "desc" } },
    },
  });

  if (!survey) {
    return NextResponse.json({ error: "Encuesta no encontrada" }, { status: 404 });
  }

  const csv = responsesToCsv(
    survey.questions.map((q) => ({ id: q.id, text: q.text })),
    survey.responses.map((r) => ({
      createdAt: r.createdAt,
      respondentName: r.respondentName,
      respondentPhone: r.respondentPhone,
      answers: r.answers.map((a) => ({ questionId: a.questionId, value: a.value })),
    }))
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${survey.slug}-respuestas.csv"`,
    },
  });
}
```

- [ ] **Step 2: Verify manually**

With at least one response present (from Task 20's manual test), open `/admin/encuestas/<id>/resultados/export` directly in the browser while logged in and confirm a CSV file downloads with a matching header and data row.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/encuestas/\[id\]/resultados
git commit -m "feat: add CSV export route for survey responses"
```

---

## Task 22: Results page — KPIs, chart, and filterable table

**Files:**
- Create: `src/app/admin/encuestas/[id]/resultados/page.tsx`
- Create: `src/components/admin/KpiCards.tsx`
- Create: `src/components/admin/ResultsChart.tsx`
- Create: `src/components/admin/ResultsTable.tsx`

- [ ] **Step 1: Write the KpiCards component**

Create `src/components/admin/KpiCards.tsx`:
```tsx
export function KpiCards({
  averageRating,
  nps,
  yesPercentage,
  totalResponses,
}: {
  averageRating: number | null;
  nps: number | null;
  yesPercentage: number | null;
  totalResponses: number;
}) {
  const cards = [
    { label: "Total respuestas", value: totalResponses.toString() },
    { label: "Promedio general", value: averageRating !== null ? `${averageRating.toFixed(1)} / 5` : "—" },
    { label: "NPS", value: nps !== null ? (nps > 0 ? `+${nps}` : `${nps}`) : "—" },
    { label: "% Sí", value: yesPercentage !== null ? `${Math.round(yesPercentage)}%` : "—" },
  ];

  return (
    <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">{card.label}</p>
          <p className="text-2xl font-extrabold text-shogun-red">{card.value}</p>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Write the ResultsChart component**

Create `src/components/admin/ResultsChart.tsx`:
```tsx
"use client";

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

export function ResultsChart({ distribution }: { distribution: Record<1 | 2 | 3 | 4 | 5, number> }) {
  const data = [1, 2, 3, 4, 5].map((n) => ({
    stars: `${n}⭐`,
    respuestas: distribution[n as 1 | 2 | 3 | 4 | 5],
  }));

  return (
    <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
      <p className="mb-3 text-sm font-semibold text-shogun-black">Distribución de calificaciones</p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <XAxis dataKey="stars" fontSize={12} />
          <YAxis allowDecimals={false} fontSize={12} />
          <Tooltip />
          <Bar dataKey="respuestas" fill="#E03A21" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 3: Write the ResultsTable component**

Create `src/components/admin/ResultsTable.tsx`:
```tsx
type Row = {
  id: string;
  createdAt: Date;
  respondentName: string | null;
  answers: { questionText: string; value: unknown }[];
};

export function ResultsTable({ rows }: { rows: Row[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-gray-500">
            <th className="p-3">Fecha</th>
            <th className="p-3">Nombre</th>
            <th className="p-3">Respuestas</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-gray-50">
              <td className="p-3 whitespace-nowrap">{row.createdAt.toISOString().slice(0, 10)}</td>
              <td className="p-3">{row.respondentName ?? "—"}</td>
              <td className="p-3">
                <ul className="space-y-0.5">
                  {row.answers.map((a, i) => (
                    <li key={i}>
                      <span className="text-gray-400">{a.questionText}:</span> {String(a.value)}
                    </li>
                  ))}
                </ul>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={3} className="p-6 text-center text-gray-400">
                Sin respuestas en este rango de fechas
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 4: Write the results page with date-range filtering via search params**

Create `src/app/admin/encuestas/[id]/resultados/page.tsx`:
```tsx
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { computeKpis } from "@/lib/surveys/kpis";
import { KpiCards } from "@/components/admin/KpiCards";
import { ResultsChart } from "@/components/admin/ResultsChart";
import { ResultsTable } from "@/components/admin/ResultsTable";

export default async function ResultsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { id } = await params;
  const { from, to } = await searchParams;

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
    },
    include: { answers: true },
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
    answers: r.answers.map((a) => ({
      questionText: questionTextById.get(a.questionId) ?? "?",
      value: a.value,
    })),
  }));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-shogun-black">Resultados: {survey.title}</h1>
        <a
          href={`/admin/encuestas/${survey.id}/resultados/export`}
          className="rounded-lg bg-shogun-black px-4 py-2 text-sm font-bold text-white"
        >
          ⬇ Exportar CSV
        </a>
      </div>

      <form className="mb-6 flex items-end gap-3 rounded-xl border border-gray-200 bg-white p-4">
        <div>
          <label className="mb-1 block text-xs text-gray-500">Desde</label>
          <input type="date" name="from" defaultValue={from} className="rounded border px-2 py-1 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">Hasta</label>
          <input type="date" name="to" defaultValue={to} className="rounded border px-2 py-1 text-sm" />
        </div>
        <button className="rounded bg-shogun-red px-3 py-1.5 text-sm font-bold text-white">Filtrar</button>
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

- [ ] **Step 5: Verify manually**

Submit 2-3 more test responses to "Fotografía" via the public form (varying the rating/NPS/yes-no answers), then open `/admin/encuestas/<id>/resultados` and confirm the KPI cards, chart, and table reflect them. Apply a date filter and confirm the table narrows accordingly.

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/encuestas/\[id\]/resultados/page.tsx src/components/admin/KpiCards.tsx src/components/admin/ResultsChart.tsx src/components/admin/ResultsTable.tsx
git commit -m "feat: add results page with KPIs, chart, and date-filterable response table"
```

---

## Task 23: Change admin password

**Files:**
- Create: `src/app/admin/configuracion/page.tsx`
- Create: `src/app/admin/configuracion/actions.ts`

- [ ] **Step 1: Write the change-password action**

Create `src/app/admin/configuracion/actions.ts`:
```typescript
"use server";

import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { verifyPassword, hashPassword } from "@/lib/auth/password";
import { verifySessionToken, COOKIE_NAME } from "@/lib/auth/session";

export type ChangePasswordState = { error: string | null; success: boolean };

export async function changePasswordAction(
  _prevState: ChangePasswordState,
  formData: FormData
): Promise<ChangePasswordState> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) {
    return { error: "Sesión expirada, vuelve a iniciar sesión", success: false };
  }

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");

  if (newPassword.length < 8) {
    return { error: "La nueva contraseña debe tener al menos 8 caracteres", success: false };
  }

  const admin = await db.adminUser.findUnique({ where: { username: session.username } });
  if (!admin) {
    return { error: "Usuario no encontrado", success: false };
  }

  const valid = await verifyPassword(currentPassword, admin.passwordHash);
  if (!valid) {
    return { error: "La contraseña actual no es correcta", success: false };
  }

  const passwordHash = await hashPassword(newPassword);
  await db.adminUser.update({ where: { id: admin.id }, data: { passwordHash } });

  return { error: null, success: true };
}
```

- [ ] **Step 2: Write the settings page**

Create `src/app/admin/configuracion/page.tsx`:
```tsx
"use client";

import { useActionState } from "react";
import { changePasswordAction, type ChangePasswordState } from "./actions";

const initialState: ChangePasswordState = { error: null, success: false };

export default function ConfiguracionPage() {
  const [state, formAction, pending] = useActionState(changePasswordAction, initialState);

  return (
    <div className="max-w-sm">
      <h1 className="mb-6 text-2xl font-extrabold text-shogun-black">Configuración</h1>
      <form action={formAction} className="rounded-xl bg-white p-6 shadow-sm">
        <label className="mb-1 block text-sm font-semibold text-shogun-black">Contraseña actual</label>
        <input
          type="password"
          name="currentPassword"
          required
          className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2"
        />
        <label className="mb-1 block text-sm font-semibold text-shogun-black">Nueva contraseña</label>
        <input
          type="password"
          name="newPassword"
          required
          minLength={8}
          className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2"
        />
        {state.error && <p className="mb-4 text-sm text-shogun-red">{state.error}</p>}
        {state.success && <p className="mb-4 text-sm text-green-600">Contraseña actualizada</p>}
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-shogun-red px-4 py-2 font-bold text-white disabled:opacity-60"
        >
          {pending ? "Guardando..." : "Cambiar contraseña"}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Verify manually**

Log in, go to `/admin/configuracion`, change the password, log out, confirm the old password no longer works and the new one does.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/configuracion
git commit -m "feat: add admin change-password page"
```

---

## Task 24: Railway deployment configuration and README

**Files:**
- Modify: `package.json`
- Create: `README.md`

- [ ] **Step 1: Set the production start command to run migrations first**

Edit `package.json` `scripts` section so `start` becomes:
```json
"start": "prisma migrate deploy && next start"
```

Keep `build` as `next build` (Prisma client generation happens automatically via the `postinstall` hook added in the next step).

- [ ] **Step 2: Ensure Prisma Client regenerates on every install (Railway runs `npm install` fresh on each deploy)**

Add to `package.json` `scripts`:
```json
"postinstall": "prisma generate"
```

- [ ] **Step 3: Write the README with Railway deployment steps**

Create `README.md`:
```markdown
# Encuestas SHOGUN

Sitio de encuestas de satisfacción para SHOGUN (Fotografía, Edición, Servicio al Cliente).

## Desarrollo local

1. `npm install`
2. Copia `.env.example` a `.env` y ajusta los valores.
3. Levanta un PostgreSQL local (por ejemplo con Docker):
   ```bash
   docker run --name encuestas-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=encuestas_shogun -p 5432:5432 -d postgres:16
   ```
4. `npx prisma migrate dev`
5. `npx prisma db seed`
6. `npm run dev`

## Despliegue en Railway

1. Crea un nuevo proyecto en Railway y conéctalo a este repositorio (New Project → Deploy from GitHub repo).
2. Agrega el plugin de PostgreSQL: New → Database → PostgreSQL. Railway crea automáticamente la variable `DATABASE_URL` y la comparte con el servicio web si están en el mismo proyecto (referencia la variable en el servicio web como `${{Postgres.DATABASE_URL}}` si no se auto-vincula).
3. En el servicio web, configura las variables de entorno:
   - `ADMIN_USERNAME` — usuario inicial del admin
   - `ADMIN_PASSWORD` — contraseña inicial del admin (cámbiala después desde `/admin/configuracion`)
   - `SESSION_SECRET` — cadena aleatoria larga (por ejemplo, generada con `openssl rand -base64 32`)
   - `NEXT_PUBLIC_BASE_URL` — la URL pública que Railway asigna al servicio (ej. `https://encuestas-shogun.up.railway.app`)
4. Railway detecta Next.js automáticamente y usa `npm run build` / `npm run start`. El comando `start` corre `prisma migrate deploy` antes de levantar el servidor, así que las migraciones se aplican en cada deploy.
5. Después del primer deploy, corre el seed una vez desde la consola de Railway (Shell del servicio): `npx prisma db seed`. Esto crea el admin inicial y las 3 encuestas base.
6. Verifica: abre la URL pública, confirma que aparecen las 3 encuestas, y entra a `/admin/login` con las credenciales configuradas.

## Estructura del proyecto

- `src/app/` — páginas públicas (`/`, `/encuesta/[slug]`) y panel admin (`/admin/**`)
- `src/lib/` — lógica de negocio sin dependencias de React (auth, validación, KPIs, CSV, QR)
- `src/components/` — componentes de UI para el formulario público y el panel admin
- `prisma/` — esquema, migraciones y seed
- `tests/unit/` — pruebas de los módulos en `src/lib/`
```

- [ ] **Step 4: Verify the production build and start locally**

Run: `npm run build`
Expected: Build succeeds with no errors.

Run: `npm run start -- --port 3100 &`, `curl -s http://localhost:3100 | head -20`, then stop it.
Expected: HTML output, no runtime errors in the console.

- [ ] **Step 5: Commit**

```bash
git add package.json README.md
git commit -m "chore: configure Railway start command and add deployment README"
```

---

## Task 25: Full manual QA pass

**Files:** None (verification only).

- [ ] **Step 1: Run the full unit test suite**

Run: `npm test`
Expected: All tests pass (password, session, validate-answers, kpis, csv).

- [ ] **Step 2: Kiosk flow checklist**

With `npm run dev` running, walk through and confirm each item:
- [ ] `/` shows the 3 active surveys as large, tappable cards.
- [ ] Opening a survey shows all questions on one scrollable page.
- [ ] Submitting with a required question blank shows an inline error and does not clear other answers.
- [ ] Submitting a complete response shows the thank-you screen.
- [ ] The thank-you screen auto-resets to a blank form after ~6 seconds without any click.
- [ ] The same flow works on a narrow mobile viewport (simulate via browser dev tools) to confirm the WhatsApp-shared link works well on phones.

- [ ] **Step 3: Admin flow checklist**

- [ ] `/admin` redirects to `/admin/login` when logged out.
- [ ] Logging in with correct credentials redirects to `/admin`.
- [ ] Logging in with wrong credentials shows an error and does not log in.
- [ ] Creating a new survey works and redirects to its editor.
- [ ] Adding, editing, deleting, and reordering (drag) questions all persist after a page refresh.
- [ ] Toggling a survey inactive makes its public `/encuesta/[slug]` page 404, and it disappears from `/`.
- [ ] The QR code and copy-link button work on the survey editor page.
- [ ] The results page KPIs, chart, and table match the responses submitted during Task 20/22 testing.
- [ ] The date filter on the results page narrows the table correctly.
- [ ] Exporting CSV downloads a file whose rows match the table.
- [ ] Changing the password in `/admin/configuracion` works, and logging out/in with the new password succeeds.

- [ ] **Step 4: Record results and fix any failures found**

For any failed checklist item, open a fresh subagent-driven task (or fix inline if trivial) referencing the specific file from the task above that owns that behavior, then re-run the affected checklist items.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: complete manual QA pass for kiosk and admin flows" --allow-empty
```
