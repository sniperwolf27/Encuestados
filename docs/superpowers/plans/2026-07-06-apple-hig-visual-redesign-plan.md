# Apple HIG Visual Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the entire site (public kiosk flow + admin panel) with an Apple HIG-inspired visual language — system-font typography, a light/dark design-token system, a shared UI component library, `lucide-react` icons, and `framer-motion` animations — without changing any data model, Server Action, or business logic.

**Architecture:** A small `src/components/ui/` library (Card, Button, Badge, SegmentedControl, ListRow, Avatar, StarRating, NPSScale) is built first, then applied screen-by-screen: public flow (selector, survey form, thank-you) gets the dark "glass" theme; admin panel (sidebar, dashboard, editor, results, login, config) gets the light "grouped background" theme. A small `getSurveyIcon` helper maps known survey emoji to `lucide-react` icons with a sensible fallback.

**Tech Stack:** Next.js 16 (existing), Tailwind CSS v4 (existing, extended with new design tokens), new dependencies `framer-motion` and `lucide-react`.

---

## Task 1: Install new dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install framer-motion and lucide-react**

Run:
```bash
npm install framer-motion lucide-react
```

- [ ] **Step 2: Verify build still succeeds**

Run: `npm run build`
Expected: Build succeeds (no usage yet, just confirms the install didn't break anything).

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add framer-motion and lucide-react for HIG-style visuals"
```

---

## Task 2: Design tokens and system font

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`

**Why:** Removes the Geist web font in favor of the system font stack (renders real San Francisco on Apple devices, with zero licensing concerns), and adds the neutral "system gray" tokens used throughout the redesign.

- [ ] **Step 1: Update globals.css with new tokens and system font**

Replace the entire contents of `src/app/globals.css`:

```css
@import "tailwindcss";

:root {
  --background: #ffffff;
  --foreground: #171717;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  --color-brand-orange: #f26522;
  --color-brand-navy: #1b3a6b;
  --color-system-background: #f2f2f7;
  --color-system-separator: #ececee;
  --color-system-secondary: #8e8e93;
}

body {
  @apply bg-white text-brand-navy antialiased;
}
```

- [ ] **Step 2: Remove Geist font loading from the root layout**

Replace the entire contents of `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Encuestas David Fotocolor",
  description: "Encuestas de satisfacción David Fotocolor",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds. (Visual pages haven't changed shape yet, only fonts/tokens — a manual look isn't necessary until later tasks apply the tokens.)

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css src/app/layout.tsx
git commit -m "feat: switch to system-font stack and add HIG design tokens"
```

---

## Task 3: Survey icon mapping helper (TDD)

**Files:**
- Create: `src/lib/survey-icon.ts`
- Test: `tests/unit/survey-icon.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/survey-icon.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { Camera, Palette, Headphones, ClipboardList } from "lucide-react";
import { getSurveyIcon } from "@/lib/survey-icon";

describe("getSurveyIcon", () => {
  it("maps the camera emoji to the Camera icon", () => {
    expect(getSurveyIcon("📷")).toBe(Camera);
  });

  it("maps the palette emoji to the Palette icon", () => {
    expect(getSurveyIcon("🎨")).toBe(Palette);
  });

  it("maps the headphones emoji to the Headphones icon", () => {
    expect(getSurveyIcon("🎧")).toBe(Headphones);
  });

  it("falls back to ClipboardList for an unknown emoji", () => {
    expect(getSurveyIcon("🙂")).toBe(ClipboardList);
  });

  it("falls back to ClipboardList for null", () => {
    expect(getSurveyIcon(null)).toBe(ClipboardList);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/survey-icon.test.ts`
Expected: FAIL — cannot find module `@/lib/survey-icon`.

- [ ] **Step 3: Implement the module**

Create `src/lib/survey-icon.ts`:

```typescript
import { Camera, Palette, Headphones, ClipboardList, type LucideIcon } from "lucide-react";

const EMOJI_ICON_MAP: Record<string, LucideIcon> = {
  "📷": Camera,
  "🎨": Palette,
  "🎧": Headphones,
};

export function getSurveyIcon(emoji: string | null): LucideIcon {
  if (emoji && EMOJI_ICON_MAP[emoji]) return EMOJI_ICON_MAP[emoji];
  return ClipboardList;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/survey-icon.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/survey-icon.ts tests/unit/survey-icon.test.ts
git commit -m "feat: add emoji-to-lucide-icon mapping helper for surveys"
```

---

## Task 4: Card and Badge components

**Files:**
- Create: `src/components/ui/Card.tsx`
- Create: `src/components/ui/Badge.tsx`

- [ ] **Step 1: Write the Card component**

Create `src/components/ui/Card.tsx`:

```tsx
import type { ReactNode } from "react";

const VARIANT_CLASSES = {
  solid: "bg-white border border-system-separator shadow-sm",
  glass: "bg-white/8 backdrop-blur-xl",
};

export function Card({
  children,
  variant = "solid",
  className = "",
}: {
  children: ReactNode;
  variant?: keyof typeof VARIANT_CLASSES;
  className?: string;
}) {
  return <div className={`rounded-2xl ${VARIANT_CLASSES[variant]} ${className}`}>{children}</div>;
}
```

- [ ] **Step 2: Write the Badge component**

Create `src/components/ui/Badge.tsx`:

```tsx
import type { ReactNode } from "react";

export function Badge({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: "success" | "neutral";
  className?: string;
}) {
  const toneClasses = tone === "success" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${toneClasses} ${className}`}>{children}</span>
  );
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/Card.tsx src/components/ui/Badge.tsx
git commit -m "feat: add Card and Badge UI components"
```

---

## Task 5: Button component

**Files:**
- Create: `src/components/ui/Button.tsx`

- [ ] **Step 1: Write the component**

Create `src/components/ui/Button.tsx`:

```tsx
"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";

const VARIANT_CLASSES = {
  primary: "bg-brand-orange text-white",
  secondary: "border border-system-separator bg-white text-brand-navy",
  destructive: "border border-red-300 bg-white text-red-600",
};

const SIZE_CLASSES = {
  default: "min-h-11 px-4 py-2.5 text-sm",
  compact: "px-3 py-1.5 text-xs",
  large: "min-h-11 px-4 py-3.5 text-base",
};

export function Button({
  children,
  variant = "primary",
  size = "default",
  className = "",
  ...props
}: {
  children: ReactNode;
  variant?: keyof typeof VARIANT_CLASSES;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
} & HTMLMotionProps<"button">) {
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      className={`rounded-xl font-bold disabled:opacity-60 ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
}
```

**Sizing note for later tasks:** `size` never conflicts with `className` because each size variant owns the font-size/padding/min-height utilities exclusively — `className` should only ever add utilities the size variants don't touch (width, shadow, margin), never override `text-*`, `py-*`, or `min-h-*` directly, since Tailwind's generated CSS order doesn't guarantee a later class in the same string wins over an earlier one.

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/Button.tsx
git commit -m "feat: add Button UI component with tap animation"
```

---

## Task 6: ListRow, Avatar, SegmentedControl components

**Files:**
- Create: `src/components/ui/ListRow.tsx`
- Create: `src/components/ui/Avatar.tsx`
- Create: `src/components/ui/SegmentedControl.tsx`

- [ ] **Step 1: Write the ListRow component**

Create `src/components/ui/ListRow.tsx`:

```tsx
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

export function ListRow({
  icon,
  iconBg,
  title,
  subtitle,
  showChevron = false,
  variant = "light",
}: {
  icon?: ReactNode;
  iconBg?: string;
  title: string;
  subtitle?: string;
  showChevron?: boolean;
  variant?: "light" | "dark";
}) {
  const textColor = variant === "dark" ? "text-white" : "text-brand-navy";
  const subColor = variant === "dark" ? "text-white/50" : "text-system-secondary";
  const chevronColor = variant === "dark" ? "text-white/30" : "text-gray-300";

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      {icon && (
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{ background: iconBg ?? "#f26522" }}
        >
          {icon}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className={`text-[15px] font-semibold ${textColor}`}>{title}</div>
        {subtitle && <div className={`text-xs ${subColor}`}>{subtitle}</div>}
      </div>
      {showChevron && <ChevronRight size={18} className={chevronColor} />}
    </div>
  );
}
```

- [ ] **Step 2: Write the Avatar component**

Create `src/components/ui/Avatar.tsx`:

```tsx
import { User } from "lucide-react";

export function Avatar({
  imageId,
  label,
  size = 56,
}: {
  imageId?: string;
  label?: string;
  size?: number;
}) {
  if (imageId) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/api/images/${imageId}`}
        alt={label ?? ""}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="flex items-center justify-center rounded-full bg-white/15 text-white/70"
      style={{ width: size, height: size }}
    >
      <User size={Math.round(size * 0.45)} />
    </div>
  );
}
```

- [ ] **Step 3: Write the SegmentedControl component**

Create `src/components/ui/SegmentedControl.tsx`:

```tsx
"use client";

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[];
  value: T | null;
  onChange: (value: T) => void;
}) {
  return (
    <div className="inline-flex rounded-xl bg-black/15 p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`min-h-11 rounded-lg px-5 text-sm font-semibold transition-colors ${
            value === option.value ? "bg-brand-orange text-white" : "text-white/60"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/ListRow.tsx src/components/ui/Avatar.tsx src/components/ui/SegmentedControl.tsx
git commit -m "feat: add ListRow, Avatar, and SegmentedControl UI components"
```

---

## Task 7: StarRating and NPSScale components

**Files:**
- Create: `src/components/ui/StarRating.tsx`
- Create: `src/components/ui/NPSScale.tsx`

- [ ] **Step 1: Write the StarRating component**

Create `src/components/ui/StarRating.tsx`:

```tsx
"use client";

import { Star } from "lucide-react";

export function StarRating({ value, onChange }: { value: number | null; onChange: (value: number) => void }) {
  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          type="button"
          key={n}
          onClick={() => onChange(n)}
          aria-label={`${n} estrellas`}
          className="flex h-11 w-11 items-center justify-center"
        >
          <Star
            size={26}
            className={value !== null && value >= n ? "fill-brand-orange text-brand-orange" : "text-white/25"}
          />
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Write the NPSScale component**

Create `src/components/ui/NPSScale.tsx`:

```tsx
"use client";

export function NPSScale({ value, onChange }: { value: number | null; onChange: (value: number) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: 11 }, (_, n) => n).map((n) => (
        <button
          type="button"
          key={n}
          onClick={() => onChange(n)}
          className={`flex h-11 w-11 items-center justify-center rounded-xl border-2 font-bold ${
            value === n ? "border-brand-orange bg-brand-orange text-white" : "border-white/20 text-white/60"
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/StarRating.tsx src/components/ui/NPSScale.tsx
git commit -m "feat: add StarRating and NPSScale UI components"
```

---

## Task 8: Restyle the public survey selector

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Replace the entire file**

Replace the entire contents of `src/app/page.tsx`:

```tsx
import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";
import { ListRow } from "@/components/ui/ListRow";
import { getSurveyIcon } from "@/lib/survey-icon";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const surveys = await db.survey.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
  });

  return (
    <main className="min-h-screen bg-gradient-to-b from-brand-navy to-[#0d1d38] px-5 py-8">
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
git commit -m "feat: restyle public survey selector with HIG grouped list"
```

---

## Task 9: Restyle QuestionField for the public form

**Files:**
- Modify: `src/components/survey/QuestionField.tsx`

- [ ] **Step 1: Replace the entire file**

Replace the entire contents of `src/components/survey/QuestionField.tsx`:

```tsx
"use client";

import type { Question } from "@prisma/client";
import type { SurveyOption as Option } from "@/lib/surveys/options";
import { Card } from "@/components/ui/Card";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { StarRating } from "@/components/ui/StarRating";
import { NPSScale } from "@/components/ui/NPSScale";
import { Avatar } from "@/components/ui/Avatar";

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
    <Card variant="glass" className="mb-3.5 p-[18px]">
      {question.imageId && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/images/${question.imageId}`}
          alt=""
          className="mb-3 max-h-48 w-full rounded-xl object-cover"
        />
      )}
      <p className="mb-3 text-[15px] font-semibold text-white">
        {question.text}
        {question.required && <span className="text-brand-orange"> *</span>}
      </p>

      {question.type === "RATING_STARS" && (
        <StarRating value={typeof value === "number" ? value : null} onChange={onChange} />
      )}

      {question.type === "YES_NO" && (
        <SegmentedControl
          options={[
            { label: "Sí", value: "yes" },
            { label: "No", value: "no" },
          ]}
          value={value === true ? "yes" : value === false ? "no" : null}
          onChange={(v) => onChange(v === "yes")}
        />
      )}

      {question.type === "NPS" && (
        <NPSScale value={typeof value === "number" ? value : null} onChange={onChange} />
      )}

      {question.type === "MULTIPLE_CHOICE" && hasOptionImages && (
        <div className="flex flex-wrap gap-4">
          {options.map((option) => (
            <button
              type="button"
              key={option.label}
              onClick={() => onChange(option.label)}
              className="flex flex-col items-center gap-1.5"
            >
              <div className={value === option.label ? "rounded-full ring-2 ring-brand-orange" : "rounded-full"}>
                <Avatar imageId={option.imageId} label={option.label} size={56} />
              </div>
              <span className="text-xs font-semibold text-white">{option.label}</span>
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
              className={`min-h-11 rounded-xl border-2 px-4 text-sm font-semibold ${
                value === option.label ? "border-brand-orange text-brand-orange" : "border-white/20 text-white/70"
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
          className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-white placeholder:text-white/30"
          rows={3}
        />
      )}

      {error && <p className="mt-2 text-sm text-orange-300">{error}</p>}
    </Card>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/survey/QuestionField.tsx
git commit -m "feat: restyle QuestionField with glass cards and HIG controls"
```

---

## Task 10: Restyle SurveyForm and ThankYou

**Files:**
- Modify: `src/components/survey/SurveyForm.tsx`
- Modify: `src/components/survey/ThankYou.tsx`

- [ ] **Step 1: Replace SurveyForm.tsx**

Replace the entire contents of `src/components/survey/SurveyForm.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import type { Question, Survey } from "@prisma/client";
import { QuestionField } from "./QuestionField";
import { ThankYou } from "./ThankYou";
import { Button } from "@/components/ui/Button";
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
    <motion.main
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-gradient-to-b from-brand-navy to-[#0d1d38] px-4 pb-28 pt-6"
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
            value={respondentPhone}
            onChange={(e) => setRespondentPhone(e.target.value)}
            className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-white placeholder:text-white/30"
          />
        </div>

        {errors._form && <p className="mb-4 text-sm text-orange-300">{errors._form}</p>}

        <div className="fixed inset-x-0 bottom-0 bg-gradient-to-t from-[#0d1d38] via-[#0d1d38]/95 to-transparent p-4 pt-8">
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

- [ ] **Step 2: Replace ThankYou.tsx**

Replace the entire contents of `src/components/survey/ThankYou.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";

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
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-brand-navy to-[#0d1d38] px-4 text-center">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
        className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-brand-orange shadow-lg shadow-brand-orange/40"
      >
        <Check size={40} className="text-white" strokeWidth={3} />
      </motion.div>
      <h1 className="mb-2 text-[26px] font-extrabold text-white">¡Gracias por tu respuesta!</h1>
      <p className="text-[15px] text-white/55">Volviendo al inicio en {secondsLeft}s...</p>
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/survey/SurveyForm.tsx src/components/survey/ThankYou.tsx
git commit -m "feat: restyle survey form wrapper and thank-you screen with motion"
```

---

## Task 11: Restyle the admin sidebar

**Files:**
- Modify: `src/components/admin/Sidebar.tsx`

- [ ] **Step 1: Replace the entire file**

Replace the entire contents of `src/components/admin/Sidebar.tsx`:

```tsx
import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";
import { getSurveyIcon } from "@/lib/survey-icon";
import { Settings, LogOut, Plus, LayoutGrid } from "lucide-react";

export async function Sidebar() {
  const surveys = await db.survey.findMany({ orderBy: { order: "asc" } });

  return (
    <aside className="w-56 shrink-0 bg-[#1b1f2b] p-4 text-white">
      <div className="mb-7 flex items-center gap-2 px-1.5">
        <Image src="/logo.jpg" alt="David Fotocolor" width={30} height={19} className="rounded object-cover" />
        <span className="text-sm font-bold">David Fotocolor</span>
      </div>

      <p className="mb-2 px-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/35">General</p>
      <Link href="/admin" className="mb-4 flex items-center gap-2 rounded-lg bg-white/10 px-2.5 py-2 text-[13.5px]">
        <LayoutGrid size={16} /> Dashboard
      </Link>

      <p className="mb-2 px-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/35">Encuestas</p>
      <nav className="mb-4 space-y-0.5">
        {surveys.map((survey) => {
          const Icon = getSurveyIcon(survey.emoji);
          return (
            <Link
              key={survey.id}
              href={`/admin/encuestas/${survey.id}`}
              className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13.5px] text-white/85 hover:bg-white/10"
            >
              <Icon size={16} /> {survey.title}
            </Link>
          );
        })}
        <Link
          href="/admin/encuestas/nueva"
          className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] text-white/45 hover:bg-white/10"
        >
          <Plus size={16} /> Nueva encuesta
        </Link>
      </nav>

      <Link
        href="/admin/configuracion"
        className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] text-white/45 hover:bg-white/10"
      >
        <Settings size={16} /> Configuración
      </Link>
      <form action="/admin/logout" method="POST">
        <button className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] text-white/45 hover:bg-white/10">
          <LogOut size={16} /> Cerrar sesión
        </button>
      </form>
    </aside>
  );
}
```

- [ ] **Step 2: Update the admin layout background to the new token**

Edit `src/app/admin/layout.tsx`. Find the `<div className="flex-1 bg-gray-50 p-6">` line and change `bg-gray-50` to `bg-system-background`:

```tsx
import { Sidebar } from "@/components/admin/Sidebar";

export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 bg-system-background p-6">{children}</div>
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/Sidebar.tsx src/app/admin/layout.tsx
git commit -m "feat: restyle admin sidebar with grouped sections and lucide icons"
```

---

## Task 12: Restyle the admin dashboard

**Files:**
- Modify: `src/app/admin/page.tsx`

- [ ] **Step 1: Replace the entire file**

Replace the entire contents of `src/app/admin/page.tsx`:

```tsx
import Link from "next/link";
import { db } from "@/lib/db";
import { getSurveyIcon } from "@/lib/survey-icon";
import { Badge } from "@/components/ui/Badge";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const surveys = await db.survey.findMany({
    orderBy: { order: "asc" },
    include: { _count: { select: { responses: true } } },
  });

  return (
    <div>
      <h1 className="mb-1 text-[26px] font-extrabold tracking-tight text-brand-navy">Dashboard</h1>
      <p className="mb-6 text-[13.5px] text-system-secondary">Resumen de tus encuestas</p>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {surveys.map((survey) => {
          const Icon = getSurveyIcon(survey.emoji);
          return (
            <Link
              key={survey.id}
              href={`/admin/encuestas/${survey.id}`}
              className="rounded-2xl border border-system-separator bg-white p-[18px] shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mb-2.5 flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-brand-orange to-orange-400">
                  <Icon size={17} className="text-white" />
                </div>
                <Badge tone={survey.isActive ? "success" : "neutral"} className="ml-auto">
                  {survey.isActive ? "Activa" : "Inactiva"}
                </Badge>
              </div>
              <h2 className="text-[15.5px] font-bold text-brand-navy">{survey.title}</h2>
              <p className="text-[13px] text-system-secondary">{survey._count.responses} respuestas</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/page.tsx
git commit -m "feat: restyle admin dashboard with HIG cards and badges"
```

---

## Task 13: Restyle ShareLink and the survey editor page

**Files:**
- Modify: `src/components/admin/ShareLink.tsx`
- Modify: `src/app/admin/encuestas/[id]/page.tsx`

- [ ] **Step 1: Replace ShareLink.tsx**

Replace the entire contents of `src/components/admin/ShareLink.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export function ShareLink({ url, qrDataUrl }: { url: string; qrDataUrl: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <Card variant="solid" className="mb-6 flex items-center gap-4 p-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={qrDataUrl} alt="Código QR de la encuesta" width={96} height={96} className="rounded-lg" />
      <div>
        <p className="mb-1 text-sm text-system-secondary">Link público</p>
        <p className="mb-2 break-all font-mono text-sm text-brand-navy">{url}</p>
        <Button
          type="button"
          variant="secondary"
          size="compact"
          onClick={async () => {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          {copied ? "¡Copiado!" : "Copiar link"}
        </Button>
      </div>
    </Card>
  );
}
```

- [ ] **Step 2: Replace the survey editor page**

Replace the entire contents of `src/app/admin/encuestas/[id]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { QuestionEditor } from "@/components/admin/QuestionEditor";
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
git add src/components/admin/ShareLink.tsx "src/app/admin/encuestas/[id]/page.tsx"
git commit -m "feat: restyle share link card and survey editor header"
```

---

## Task 14: Restyle QuestionEditor, ImageUploadField, QuestionOptionsEditor

**Files:**
- Modify: `src/components/admin/QuestionEditor.tsx`
- Modify: `src/components/admin/ImageUploadField.tsx`
- Modify: `src/components/admin/QuestionOptionsEditor.tsx`

**Why:** Same drag-and-drop/CRUD logic as before — only class-level restyling to the new tokens and shared components.

- [ ] **Step 1: Replace ImageUploadField.tsx**

Replace the entire contents of `src/components/admin/ImageUploadField.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

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
      <p className="mb-1 text-xs font-semibold text-system-secondary">{label}</p>
      <input type="hidden" name={`${name}ExistingImageId`} value={existingImageId ?? ""} />
      <input type="hidden" name={`${name}RemoveImage`} value={removed ? "true" : "false"} />
      {previewUrl && !removed && (
        <div className="mb-2 flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="" className="h-16 w-16 rounded-lg object-cover" />
          <Button
            type="button"
            variant="secondary"
            size="compact"
            onClick={() => {
              setRemoved(true);
              setPreviewUrl(null);
            }}
          >
            Quitar imagen
          </Button>
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

- [ ] **Step 2: Replace QuestionOptionsEditor.tsx**

Replace the entire contents of `src/components/admin/QuestionOptionsEditor.tsx`:

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
    <div className="space-y-3 rounded-xl border border-system-separator p-3">
      <p className="text-xs font-semibold text-system-secondary">Opciones (solo opción múltiple)</p>
      {rows.map((row) => (
        <div key={row.key} className="rounded-lg border border-system-separator p-2">
          <input
            name="optionLabel"
            defaultValue={row.label}
            placeholder="Texto de la opción"
            className="mb-2 block w-full rounded-lg border border-system-separator px-2 py-1 text-sm"
          />
          <ImageUploadField name="option" label="Foto (opcional)" existingImageId={row.imageId} />
          <button
            type="button"
            onClick={() => setRows((prev) => prev.filter((r) => r.key !== row.key))}
            className="text-xs text-system-secondary hover:text-brand-orange"
          >
            Eliminar opción
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setRows((prev) => [...prev, { key: `row-${nextKey++}`, label: "" }])}
        className="rounded-lg border border-dashed border-system-separator px-3 py-1 text-xs font-semibold text-brand-navy"
      >
        + Agregar opción
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Replace QuestionEditor.tsx**

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
              <span {...attributes} {...listeners} className="mt-1 cursor-grab select-none text-gray-300">
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
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/QuestionEditor.tsx src/components/admin/ImageUploadField.tsx src/components/admin/QuestionOptionsEditor.tsx
git commit -m "feat: restyle question editor, image upload, and options editor"
```

---

## Task 15: Restyle SurveyInfoEditor and ResetSurveyButton

**Files:**
- Modify: `src/components/admin/SurveyInfoEditor.tsx`
- Modify: `src/components/admin/ResetSurveyButton.tsx`

- [ ] **Step 1: Replace SurveyInfoEditor.tsx**

Replace the entire contents of `src/components/admin/SurveyInfoEditor.tsx`:

```tsx
"use client";

import { useState } from "react";
import { updateSurveyInfoAction } from "@/app/admin/encuestas/[id]/actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

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
    <Card variant="solid" className="mb-4 space-y-2 p-4">
      <form
        action={async (formData) => {
          await updateSurveyInfoAction(formData);
          setEditing(false);
        }}
        className="space-y-2"
      >
        <input type="hidden" name="surveyId" value={surveyId} />
        <label className="block text-xs font-semibold text-system-secondary">Título</label>
        <input
          name="title"
          defaultValue={title}
          required
          className="block w-full rounded-lg border border-system-separator px-2 py-1 text-sm"
        />
        <label className="block text-xs font-semibold text-system-secondary">Descripción</label>
        <textarea
          name="description"
          defaultValue={description ?? ""}
          className="block w-full rounded-lg border border-system-separator px-2 py-1 text-sm"
        />
        <label className="block text-xs font-semibold text-system-secondary">Emoji</label>
        <input
          name="emoji"
          defaultValue={emoji ?? ""}
          className="block w-32 rounded-lg border border-system-separator px-2 py-1 text-sm"
        />
        <div className="flex gap-2">
          <Button type="submit">Guardar</Button>
          <Button type="button" variant="secondary" onClick={() => setEditing(false)}>
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  );
}
```

- [ ] **Step 2: Replace ResetSurveyButton.tsx**

Replace the entire contents of `src/components/admin/ResetSurveyButton.tsx`:

```tsx
"use client";

import { resetSurveyAction } from "@/app/admin/encuestas/[id]/actions";
import { Button } from "@/components/ui/Button";

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
      <Button type="submit" variant="destructive" size="compact">
        Resetear encuesta
      </Button>
    </form>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/SurveyInfoEditor.tsx src/components/admin/ResetSurveyButton.tsx
git commit -m "feat: restyle survey info editor and reset button"
```

---

## Task 16: Restyle results page and its components

**Files:**
- Modify: `src/app/admin/encuestas/[id]/resultados/page.tsx`
- Modify: `src/components/admin/KpiCards.tsx`
- Modify: `src/components/admin/ResultsChart.tsx`
- Modify: `src/components/admin/ResultsTable.tsx`

- [ ] **Step 1: Replace KpiCards.tsx**

Replace the entire contents of `src/components/admin/KpiCards.tsx`:

```tsx
import { Card } from "@/components/ui/Card";

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
    <div className="mb-6 grid grid-cols-2 gap-3.5 sm:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label} variant="solid" className="p-4">
          <p className="text-xs text-system-secondary">{card.label}</p>
          <p className="text-2xl font-extrabold text-brand-orange">{card.value}</p>
        </Card>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Replace ResultsChart.tsx**

Replace the entire contents of `src/components/admin/ResultsChart.tsx`:

```tsx
"use client";

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { Card } from "@/components/ui/Card";

export function ResultsChart({ distribution }: { distribution: Record<1 | 2 | 3 | 4 | 5, number> }) {
  const data = [1, 2, 3, 4, 5].map((n) => ({
    stars: `${n}⭐`,
    respuestas: distribution[n as 1 | 2 | 3 | 4 | 5],
  }));

  return (
    <Card variant="solid" className="mb-6 p-4">
      <p className="mb-3 text-sm font-semibold text-brand-navy">Distribución de calificaciones</p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <XAxis dataKey="stars" fontSize={12} />
          <YAxis allowDecimals={false} fontSize={12} />
          <Tooltip />
          <Bar dataKey="respuestas" fill="#F26522" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
```

- [ ] **Step 3: Replace ResultsTable.tsx**

Replace the entire contents of `src/components/admin/ResultsTable.tsx`:

```tsx
import { Card } from "@/components/ui/Card";

type Row = {
  id: string;
  createdAt: Date;
  respondentName: string | null;
  answers: { questionText: string; value: unknown }[];
};

export function ResultsTable({ rows }: { rows: Row[] }) {
  return (
    <Card variant="solid" className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-system-separator text-system-secondary">
            <th className="p-3">Fecha</th>
            <th className="p-3">Nombre</th>
            <th className="p-3">Respuestas</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-system-separator">
              <td className="p-3 whitespace-nowrap">{row.createdAt.toISOString().slice(0, 10)}</td>
              <td className="p-3">{row.respondentName ?? "—"}</td>
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
              <td colSpan={3} className="p-6 text-center text-system-secondary">
                Sin respuestas en este rango de fechas
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </Card>
  );
}
```

- [ ] **Step 4: Replace the results page**

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
        <h1 className="text-[26px] font-extrabold tracking-tight text-brand-navy">Resultados: {survey.title}</h1>
        <a href={`/admin/encuestas/${survey.id}/resultados/export`}>
          <Button type="button" variant="secondary">
            ⬇ Exportar CSV
          </Button>
        </a>
      </div>

      <form className="mb-6 flex items-end gap-3 rounded-2xl border border-system-separator bg-white p-4">
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

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add "src/app/admin/encuestas/[id]/resultados/page.tsx" src/components/admin/KpiCards.tsx src/components/admin/ResultsChart.tsx src/components/admin/ResultsTable.tsx
git commit -m "feat: restyle results page, KPI cards, chart, and table"
```

---

## Task 17: Restyle login, configuración, and nueva encuesta pages

**Files:**
- Modify: `src/app/(admin-public)/admin/login/page.tsx`
- Modify: `src/app/admin/configuracion/page.tsx`
- Modify: `src/app/admin/encuestas/nueva/page.tsx`

- [ ] **Step 1: Replace the login page**

Replace the entire contents of `src/app/(admin-public)/admin/login/page.tsx`:

```tsx
"use client";

import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { loginAction, type LoginState } from "./actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const initialState: LoginState = { error: null };

function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/admin";
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <Card variant="solid" className="w-full max-w-sm p-8">
      <form action={formAction}>
        <Image src="/logo.jpg" alt="David Fotocolor" width={140} height={88} className="mx-auto mb-4 rounded-lg" priority />
        <h1 className="mb-6 text-center text-2xl font-extrabold text-brand-navy">
          Encuestas <span className="text-brand-orange">David Fotocolor</span>
        </h1>
        <input type="hidden" name="next" value={next} />
        <label className="mb-1 block text-sm font-semibold text-brand-navy">Usuario</label>
        <input
          name="username"
          required
          className="mb-4 w-full rounded-xl border border-system-separator px-3 py-2.5"
        />
        <label className="mb-1 block text-sm font-semibold text-brand-navy">Contraseña</label>
        <input
          type="password"
          name="password"
          required
          className="mb-4 w-full rounded-xl border border-system-separator px-3 py-2.5"
        />
        {state.error && <p className="mb-4 text-sm text-red-600">{state.error}</p>}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Entrando..." : "Entrar"}
        </Button>
      </form>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-brand-navy to-[#0d1d38] px-4">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
```

- [ ] **Step 2: Replace the configuración page**

Replace the entire contents of `src/app/admin/configuracion/page.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import { changePasswordAction, type ChangePasswordState } from "./actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const initialState: ChangePasswordState = { error: null, success: false };

export default function ConfiguracionPage() {
  const [state, formAction, pending] = useActionState(changePasswordAction, initialState);

  return (
    <div className="max-w-sm">
      <h1 className="mb-6 text-[26px] font-extrabold tracking-tight text-brand-navy">Configuración</h1>
      <Card variant="solid" className="p-6">
        <form action={formAction}>
          <label className="mb-1 block text-sm font-semibold text-brand-navy">Contraseña actual</label>
          <input
            type="password"
            name="currentPassword"
            required
            className="mb-4 w-full rounded-xl border border-system-separator px-3 py-2.5"
          />
          <label className="mb-1 block text-sm font-semibold text-brand-navy">Nueva contraseña</label>
          <input
            type="password"
            name="newPassword"
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
    </div>
  );
}
```

- [ ] **Step 3: Replace the nueva encuesta page**

Replace the entire contents of `src/app/admin/encuestas/nueva/page.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import { createSurveyAction, type CreateSurveyState } from "./actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const initialState: CreateSurveyState = { error: null };

export default function NewSurveyPage() {
  const [state, formAction, pending] = useActionState(createSurveyAction, initialState);

  return (
    <div className="max-w-lg">
      <h1 className="mb-6 text-[26px] font-extrabold tracking-tight text-brand-navy">Nueva encuesta</h1>
      <Card variant="solid" className="p-6">
        <form action={formAction}>
          <label className="mb-1 block text-sm font-semibold text-brand-navy">Título</label>
          <input
            name="title"
            required
            className="mb-4 w-full rounded-xl border border-system-separator px-3 py-2.5"
          />
          <label className="mb-1 block text-sm font-semibold text-brand-navy">Descripción</label>
          <textarea
            name="description"
            className="mb-4 w-full rounded-xl border border-system-separator px-3 py-2.5"
          />
          <label className="mb-1 block text-sm font-semibold text-brand-navy">Emoji (opcional)</label>
          <input
            name="emoji"
            placeholder="📷"
            className="mb-4 w-full rounded-xl border border-system-separator px-3 py-2.5"
          />
          {state.error && <p className="mb-4 text-sm text-red-600">{state.error}</p>}
          <Button type="submit" disabled={pending}>
            {pending ? "Creando..." : "Crear encuesta"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(admin-public)/admin/login/page.tsx" src/app/admin/configuracion/page.tsx src/app/admin/encuestas/nueva/page.tsx
git commit -m "feat: restyle login, configuracion, and nueva encuesta pages"
```

---

## Task 18: Full verification pass

**Files:** None (verification only).

- [ ] **Step 1: Run the full unit test suite**

Run: `npm test`
Expected: All tests pass, including the new `survey-icon.test.ts`. No test in `src/lib/**` should have needed changes — this redesign only touches presentation.

- [ ] **Step 2: Run a clean production build**

Run:
```bash
rm -rf .next
npm run build
```
Expected: Build succeeds with no type errors.

- [ ] **Step 3: Manual visual/accessibility pass**

With the dev server running (`npm run dev`), walk through and confirm:

- [ ] `/` shows the dark grouped list with the logo, "Encuestas" title, and 3 rows with lucide icons (Camera/Palette/Headphones) and chevrons.
- [ ] `/encuesta/<slug>` shows each question as a glass card; Sí/No renders as a segmented control; ratings render as lucide stars; NPS renders as a 0-10 grid; a multiple-choice question with photo options renders avatar cards, one without renders text pills — all touch targets look comfortably tappable (visually ≥44px).
- [ ] Submitting successfully shows the animated check + countdown, then returns to `/` after ~6s.
- [ ] `/admin/login` shows the centered card on the dark gradient background.
- [ ] `/admin` shows the dark sidebar with grouped sections and the dashboard cards with gradient icons and badges.
- [ ] `/admin/encuestas/<id>` shows the restyled editor: image upload preview, dynamic option rows, drag handle icon, and the destructive-styled reset button.
- [ ] `/admin/encuestas/<id>/resultados` shows the restyled KPI cards, chart, and table.
- [ ] `/admin/configuracion` and `/admin/encuestas/nueva` show the centered card layout consistent with the rest of the admin.
- [ ] Tab through the public survey form and the admin editor with the keyboard — every interactive element (buttons, inputs, list rows) shows a visible focus outline (the browser default outline is acceptable; note in a follow-up if a custom focus ring is desired later).
- [ ] Zoom the browser to 150% on `/encuesta/<slug>` and confirm text stays legible and layout doesn't break (basic Dynamic-Type-style resilience check).

- [ ] **Step 4: Final commit and push**

```bash
git add -A
git commit -m "chore: verify Apple HIG visual redesign across public and admin flows" --allow-empty
git push
```
