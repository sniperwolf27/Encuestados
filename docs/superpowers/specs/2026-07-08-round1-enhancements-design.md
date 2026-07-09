# Round 1 Enhancements — Design

## Goal

Seven improvements to the survey site, agreed on with the business owner after the mobile/collaborators release:

1. Fix: resetting a survey must NOT delete its collaborators (employee photos/names should persist).
2. A per-survey toggle to make collaborator selection mandatory (no "Omitir" when on).
3. A QR code on the public survey-selector screen so a customer can switch from the kiosk to their own phone.
4. Automatic email alerts when a response includes a low rating.
5. Search/filter in the admin results table (by name, phone, or collaborator).
6. A "duplicate survey" button in the admin editor.
7. A configurable Google review link, shown on the thank-you screen after a high rating.

## Non-Goals (explicitly deferred to a later round)

Per-collaborator performance reports, a ratings-over-time trend chart, multiple admin user accounts with permissions, an installable PWA kiosk mode, downloadable PDF monthly reports, and an audit log of admin changes. These were discussed and intentionally left out of this round due to their larger scope.

## 1. Reset no longer touches collaborators

`resetSurveyAction` (`src/app/admin/encuestas/[id]/actions.ts`) currently does `db.collaborator.deleteMany` and recreates from `factorySnapshot.collaborators` alongside questions. That's removed: collaborators are no longer deleted or recreated by a reset — only responses and questions are affected, exactly as before collaborators existed. The `collaborators` field stays in `FactorySnapshot` type/data for now (harmless, unused by reset) rather than doing a data migration to strip it out — simplest safe change.

## 2. Mandatory collaborator selection

`Survey` gains `collaboratorRequired Boolean @default(false)`. A toggle in the survey editor (next to the "Colaboradores" section) lets the admin turn this on/off via a small Server Action, mirroring the existing `toggleSurveyActiveAction` pattern.

Public flow: `CollaboratorStep` gains a `required: boolean` prop — when `true`, the "Omitir" button is not rendered at all. `SurveyForm` passes `survey.collaboratorRequired` through. Server-side, `submitResponseAction` re-validates: if `survey.collaboratorRequired` and `collaboratorId` is null, it returns a validation error instead of saving — this mirrors the existing collaborator-ownership check added in the previous round, so both checks live together.

## 3. QR code on the survey selector

The public selector page (`src/app/page.tsx`) generates a QR (reusing the existing `generateQrDataUrl` helper from `src/lib/qr.ts`, already used in the admin's `ShareLink`) pointing at the site's own base URL, and renders it in a small card at the bottom of the dark grouped list with a caption ("¿Prefieres tu celular? Escanea aquí").

## 4. Low-rating email alerts

**New dependency:** `resend` (npm package) for sending email, using a `RESEND_API_KEY` environment variable the business owner will add to Railway. Without a verified sending domain on their Resend account, Resend only delivers to the email address associated with that Resend account — acceptable here since the alert email they configure will be that same address.

**New data:** a singleton `Setting` model (`id` fixed to `"singleton"`, `alertEmail String?`, `googleReviewLink String?`, `updatedAt`) — deliberately separate from `AdminUser` so it isn't tied to a specific login (a later round may add multiple admin accounts; site-wide settings shouldn't live on a single user row).

**Admin UI:** `/admin/configuracion` gains two new fields — "Correo para alertas" and "Link de reseña de Google" — editable via a new Server Action, alongside the existing change-password form.

**Trigger logic:** after `submitResponseAction` successfully creates a `Response`, check the submitted answers: if any `RATING_STARS` answer is `<= 2`, or any `NPS` answer is `<= 6`, and a `Setting.alertEmail` is configured, send an email via Resend summarizing the survey name, date, respondent name/phone (if given), and the low answer(s). This send is fire-and-forget: wrapped in try/catch, failures are logged but never block or fail the response submission itself (the customer's submission always succeeds regardless of email delivery).

## 5. Results search/filter

The existing date-range `<form>` on the results page (`src/app/admin/encuestas/[id]/resultados/page.tsx`) gains a `search` text input alongside `from`/`to`. Server-side, the `db.response.findMany` query adds an `OR` clause matching `respondentName`/`respondentPhone` (case-insensitive `contains`) and, for the collaborator, a `collaborator: { name: { contains: search, mode: "insensitive" } }` clause — all only applied when `search` is non-empty.

## 6. Duplicate survey

A "Duplicar" button next to the existing "Resetear encuesta" button in the survey editor. A new Server Action reads the survey (with questions and collaborators), creates a new `Survey` with:
- `title`: `"{original} (copia)"`. **Slug handling differs from the manual "nueva encuesta" form**: that form just rejects the submission on a slug collision (the admin can pick a different title and retry), but "Duplicar" is a single click with no user input, so it must always succeed. It slugifies `"{original} (copia)"`, and if that slug is already taken (e.g., duplicating the same survey a second time), appends `-2`, `-3`, etc., checking `db.survey.findUnique` in a loop until it finds a free slug.
- `description`/`emoji`/`collaboratorRequired` copied as-is
- `isActive: true`
- `questions`: copied (same `type`/`text`/`required`/`order`/`options`/`imageId` — images are referenced by id, not re-uploaded, since `Image` rows are immutable and content-addressed by id already)
- `collaborators`: copied (same `name`/`imageId`/`order`)
- a fresh `factorySnapshot` capturing this initial state (so the copy has its own correct reset target)
- no responses copied

After creation, the admin is redirected to the new survey's editor page.

## 7. Google review link on high ratings

Reuses the `Setting.googleReviewLink` field from point 4. After a successful response submission, the same low/high-rating check (in the same code path) also checks: does any `RATING_STARS` answer equal exactly `5`, or any `NPS` answer equal exactly `10`? If so, `submitResponseAction`'s success result includes a flag/link, which `SurveyForm` passes to `ThankYou`. `ThankYou` conditionally renders a "Déjanos tu reseña en Google" button linking to `Setting.googleReviewLink` — only shown when both the high-rating condition is met AND the link is configured (non-null). If the link isn't configured yet, nothing changes on the thank-you screen (current behavior).

## Testing

Unit tests for the new pure logic: the low/high-rating detection helper(s) (e.g. `hasLowRating(answers)` / `hasHighRating(answers)` in `src/lib/surveys/`), and the slug-collision-suffix logic reused for survey duplication (extracted from `createSurveyAction`'s existing inline `slugify`, if not already a separate testable unit — check current code first). Manual/scripted verification pass (same pragmatic approach as prior rounds) covering: reset preserves collaborators, mandatory-collaborator flow blocks skip both client and server side, QR renders on `/`, a low-rating submission triggers an email send attempt (mocked/logged, since a real Resend API key may not be available during automated verification), search filters results correctly, duplicate produces a working independent copy, and the Google review button appears only under the right conditions.
