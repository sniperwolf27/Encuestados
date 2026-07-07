# Mobile Responsiveness, Phone Field Polish, and Collaborator Selection — Design

## Goal

Three related improvements to the survey site:

1. Make the entire admin panel (and a quick audit of the public flow) fully usable on mobile phones, not just desktop.
2. Polish the phone-number field in the public survey form for mobile input.
3. Add a per-survey "collaborator" concept (a staff member being evaluated, with photo + name) with a dedicated selection screen shown before the survey questions, and full CRUD management from the admin panel.

## Non-Goals

- Auto-capturing a respondent's WhatsApp phone number is **not possible**: a browser cannot read the phone number of whoever clicks a link from within WhatsApp. This spec does not attempt it. The manual phone field remains, just polished for mobile.
- Remembering the last-used phone number on a device is explicitly excluded — the field must always start empty, since the same kiosk device is used by many different clients.
- The existing `MULTIPLE_CHOICE` question type with per-option photos (used previously for an ad hoc "¿Quién te atendió?" question) is not removed or migrated. It remains fully functional as a generic question type. Survey owners can manually delete that question from a survey's editor if it's now redundant with the new Collaborator screen — this spec does not do that migration automatically.

## 1. Mobile Responsiveness — Admin Panel

### Sidebar → collapsible drawer

`src/app/admin/layout.tsx` currently renders a fixed `flex` row: `<Sidebar />` (fixed `w-56`) next to a content `div`. On a phone-width viewport this squeezes all admin content into a sliver next to a still-visible sidebar.

New behavior:
- Below the `md` breakpoint (768px), the sidebar is hidden by default and a hamburger menu button appears fixed in the top-left of the content area.
- Tapping the hamburger slides the sidebar in as an overlay (fixed position, above the content, with a semi-transparent backdrop behind it). Tapping the backdrop or any nav link inside the sidebar closes it.
- At `md` and above, the sidebar behaves exactly as it does today (always visible, no hamburger, no overlay).
- This requires converting the sidebar shell into a small client component (a wrapper that holds the open/closed state) while keeping the `Sidebar` server component (which queries the DB for the survey list) as a child — the toggle button and overlay are new, the existing `Sidebar` content/links are unchanged.

### Results table → stacked cards on mobile

`ResultsTable` currently renders one `<table>`. New behavior:
- At `md` and above: same table as today, unchanged.
- Below `md`: the table is replaced by a vertical list of cards, one per response, each showing the date, name, and the list of question/answer pairs stacked vertically (same data, different layout). Both markups are conditionally rendered via Tailwind `hidden md:block` / `md:hidden` on server-rendered markup (no client JS needed — just two parallel renders gated by CSS breakpoints).

### General audit and fixes

- `QuestionEditor`'s add/edit question forms, `QuestionOptionsEditor`'s option rows, and the new `CollaboratorEditor` (see section 3) get spacing/width adjustments so nothing overflows or gets clipped at a 375px-wide viewport (iPhone SE reference).
- `KpiCards` and the dashboard's survey card grid already use responsive Tailwind breakpoints (`grid-cols-2 sm:grid-cols-4`, `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`) — verified as fine, no changes needed.
- The results page's date-filter form (`from`/`to` inputs + "Filtrar" button) gets a `flex-wrap` so it stacks on narrow screens instead of overflowing.
- Login, configuración, and nueva-encuesta pages (`max-w-sm`/`max-w-lg` centered cards) are already narrow-friendly — verified as fine.
- Public survey flow (kiosk-style dark glass cards, already narrow-first) — verified as fine, only the collaborator screen (new, section 3) and phone input (section 2) need attention.

## 2. Phone Field Mobile Polish

In `src/components/survey/SurveyForm.tsx`, the phone `<input>` gets:
```tsx
<input
  type="tel"
  inputMode="numeric"
  autoComplete="off"
  value={respondentPhone}
  onChange={(e) => setRespondentPhone(e.target.value)}
  ...
/>
```
- `type="tel"` + `inputMode="numeric"` triggers the numeric keypad on mobile browsers.
- `autoComplete="off"` explicitly prevents the browser from suggesting/autofilling a previously-entered number on that device (per the "no remember" decision) — the field always starts blank on page load, which is already true today since there's no persistence; this just prevents browser-level autofill suggestions from undermining that.
- No `localStorage` or persistence is added.

## 3. Collaborator Selection

### Data model

New Prisma model:

```prisma
model Collaborator {
  id        String   @id @default(cuid())
  surveyId  String
  survey    Survey   @relation(fields: [surveyId], references: [id], onDelete: Cascade)
  name      String
  imageId   String?
  order     Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

`Survey` gains a `collaborators Collaborator[]` relation. `Response` gains an optional field:

```prisma
model Response {
  ...
  collaboratorId String?
  collaborator   Collaborator? @relation(fields: [collaboratorId], references: [id], onDelete: SetNull)
}
```

`onDelete: SetNull` so that deleting a collaborator later doesn't destroy historical response data — it just clears the reference.

The survey's `factorySnapshot` (used by the existing "reset survey" feature) is extended to also capture the collaborator list (name + imageId + order) at survey-creation time, and the reset action restores collaborators (deletes current ones, recreates from the snapshot) the same way it already does for questions.

### Admin: Collaborator management

New section "Colaboradores" in the survey editor page (`src/app/admin/encuestas/[id]/page.tsx`), placed above the existing `QuestionEditor` section (mirroring the public flow's order: collaborator screen before questions). New component `CollaboratorEditor` (structurally parallel to `QuestionEditor`): a drag-reorderable list of collaborator cards (photo thumbnail + name + edit/delete), plus an "add collaborator" form (name + photo upload, reusing the existing `ImageUploadField` component). New Server Actions in the survey's `actions.ts`: `addCollaboratorAction`, `updateCollaboratorAction`, `deleteCollaboratorAction`, `reorderCollaboratorsAction` — mirroring the existing question actions' patterns (FormData-based, `surveyId` scoping, revalidation).

### Public flow: Collaborator selection screen

`src/app/encuesta/[slug]/page.tsx` additionally fetches `survey.collaborators` (ordered) and passes them to `SurveyForm`.

`SurveyForm` gains a step before the questions:
- If `collaborators.length === 0`: behaves exactly as today, no new screen.
- If `collaborators.length > 0`: shows a full-screen step first — a grid of large tappable cards, each showing the collaborator's photo (circular, reusing the `Avatar` component from the component library) and name below it — plus a visible "Omitir" (skip) text link at the top of the screen, above the grid. Tapping a collaborator or "Omitir" advances to the existing questions step. The chosen `collaboratorId` (or `null` if skipped) is held in local state and sent along with the rest of the response on submit.
- `submitResponseAction` gains a `collaboratorId: string | null` parameter, stored on the created `Response` row.

### Results

`ResultsTable` (and its mobile card equivalent from section 1) additionally shows which collaborator was selected per response, when present, as one more piece of row/card data (e.g., "Atendido por: <name>" or omitted entirely if `null`).

## Testing

- Unit test for any new pure logic (e.g., a helper that determines whether the collaborator step should show).
- Manual verification pass (same pragmatic curl/DB-script approach used for the HIG redesign's Task 18, given no real browser is available in this environment) covering: sidebar drawer toggle markup renders correctly at mobile breakpoint classes, results table strips to cards below `md`, collaborator CRUD round-trips through the admin, the collaborator screen appears/skips correctly based on whether a survey has any collaborators, and a submitted response correctly stores the chosen `collaboratorId`.
