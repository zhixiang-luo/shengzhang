# Feedback and Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an anonymous, privacy-safe in-app feedback flow with a persistent private inbox and daily operational summary.

**Architecture:** The mobile app submits a strict contract to a new Fastify endpoint. The API hashes the installation ID, enforces idempotency through a per-feedback file name, and stores one private JSON document per submission. A CLI reads the private inbox for summary and inspection.

**Tech Stack:** Expo 58, React Native 0.88, Expo Router, Zod 4, Fastify 5, Node.js 22, Vitest.

**Spec:** `docs/34-feedback-and-support.md`

## Global Constraints

- No login, WeChat, membership, or payment dependency.
- No screenshots, files, audio, transcripts, transaction amounts, categories, or notes.
- Contact is optional and at most 200 characters.
- Message is required and trimmed to 10–1000 characters.
- Store only a salted hash of installation ID.
- Feedback body and contact never enter application logs or analytics events.
- Production `FEEDBACK_DATA_DIR=/opt/shengzhang/shared/reports/.feedback`.
- Use existing design tokens and 44×44pt minimum touch targets.

---

### Task 1: Shared contract and API validation

**Files:**
- Modify: `packages/contracts/src/index.ts`
- Create: `services/api/src/routes/feedback.test.ts`
- Create: `services/api/src/routes/feedback.ts`

**Interfaces:**
- Produces: `feedbackTypeSchema`
- Produces: `feedbackSubmissionSchema`
- Produces: `feedbackSubmissionResponseSchema`
- Produces: `feedbackRoutes(app, options)`

- [x] Write route tests for accepted payload, unknown fields, short message, and invalid type.
- [x] Run `pnpm --filter @shengzhang/api test -- feedback.test.ts`; expect missing module failure.
- [x] Add Zod contracts and minimal route returning `202`.
- [x] Re-run the targeted test; expect pass.

### Task 2: Private file store and idempotency

**Files:**
- Create: `services/api/src/feedback/feedback-store.ts`
- Create: `services/api/src/feedback/feedback-store.test.ts`

**Interfaces:**
- Produces: `FeedbackStore.record(input): Promise<StoredFeedback>`
- Produces: `readFeedback(directory, date?): Promise<StoredFeedback[]>`
- Produces: `pruneFeedback(directory, beforeDate): Promise<number>`

- [x] Write tests proving raw installation IDs are absent, repeat client IDs return the first record, and date filtering works.
- [x] Run the store test; expect missing module failure.
- [x] Implement salted hashing and exclusive JSON-file creation.
- [x] Re-run; expect pass.

### Task 3: Rate limiting and application integration

**Files:**
- Modify: `services/api/src/config.ts`
- Modify: `services/api/src/app.ts`
- Modify: `.env.example`
- Modify: `services/api/src/routes/feedback.test.ts`

**Interfaces:**
- Consumes: `FeedbackStore`
- Produces: `POST /v1/feedback`

- [x] Add failing tests for the sixth request in ten minutes and a 16 KiB body limit.
- [x] Run the route test; expect limit failures.
- [x] Add the store route, per-IP/global limiter, and environment defaults.
- [x] Run the route and app tests; expect pass.

### Task 4: Private feedback operations commands

**Files:**
- Create: `services/api/scripts/feedback-report.ts`
- Modify: `services/api/package.json`
- Modify: `deploy/daily-ops-report.sh`

**Interfaces:**
- Produces: `feedback:report -- --date=YYYY-MM-DD --format=summary`
- Produces: `feedback:report -- --date=YYYY-MM-DD --format=jsonl`

- [x] Add tests for the summary formatter.
- [x] Run the formatter test; expect missing module failure.
- [x] Implement summary/jsonl output and include summary in the daily report.
- [x] Run the formatter test; expect pass.

### Task 5: Mobile form model and API client

**Files:**
- Create: `apps/mobile/src/features/feedback/feedbackForm.ts`
- Create: `apps/mobile/src/features/feedback/feedbackForm.test.ts`
- Create: `apps/mobile/src/services/feedback.ts`

**Interfaces:**
- Produces: `validateFeedbackInput(input): FeedbackValidationResult`
- Produces: `submitFeedback(input): Promise<FeedbackSubmissionResponse>`

- [x] Write tests for required type, 9/10 character boundary, 1000 character limit, optional contact, and diagnostics-off payload.
- [x] Run the mobile feedback test; expect missing module failure.
- [x] Implement pure validation and the API client.
- [x] Re-run; expect pass.

### Task 6: Settings entry, feedback screen, and routing

**Files:**
- Modify: `apps/mobile/src/app/_layout.tsx`
- Modify: `apps/mobile/src/app/settings.tsx`
- Create: `apps/mobile/src/app/feedback.tsx`

**Interfaces:**
- Consumes: `validateFeedbackInput`
- Consumes: `submitFeedback`

- [x] Add the settings row and register `/feedback` with `slide_from_right`.
- [x] Implement type chips, description, optional contact, diagnostics switch, busy/success/error states, and keyboard avoidance.
- [x] Confirm the submit button is disabled while sending and inputs remain after error.
- [x] Run mobile typecheck and tests.

### Task 7: Analytics, documentation, and end-to-end verification

**Files:**
- Modify: `apps/mobile/src/services/analytics.ts`
- Modify: `services/api/src/analytics/event-store.ts`
- Modify: `services/api/src/routes/analytics.ts`
- Modify: `docs/02-information-architecture.md`
- Modify: `docs/07-data-privacy.md`
- Modify: `docs/11-api-contract.md`
- Modify: `docs/18-ui-handoff.md`
- Modify: `docs/README.md`
- Modify: `docs/HANDOFF.md`

**Interfaces:**
- Produces analytics events: `feedback_opened`, `feedback_submitted`, `feedback_failed`

- [x] Add tests proving analytics properties contain no message or contact.
- [x] Implement event names and safe properties.
- [x] Update all source-of-truth documents.
- [x] Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, API build, Android export, and `git diff --check`.
- [x] Deploy API, configure `/opt/shengzhang/shared/reports/.feedback`, publish OTA, and verify public submission plus private inbox.

## Verification Checklist

- [x] `pnpm typecheck`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm --filter @shengzhang/api build`
- [x] Android export succeeds
- [x] Public API rejects invalid input and accepts a valid anonymous feedback
- [x] Public API repeated `clientFeedbackId` produces one stored record
- [x] Daily summary shows counts only
- [x] Existing App time-parsing fix remains deployed and healthy

## Completion Evidence

- Repository gate: domain 34 + mobile 61 + API 59 = 154 tests passed.
- Build gate: API TypeScript build, Android Expo export, and iOS Expo export passed.
- API release: `/opt/shengzhang/releases/20261107-215526`; `/health` returned HTTP 200.
- Public contract: valid submit `202`, invalid payload `400`, oversize body `413`; duplicate ID returned the same reference and stored once.
- Privacy check: raw installation ID absent, salted hash present, file mode `0600`, directory mode `0700`, body absent from API logs.
- Operations: daily report includes count/type summary only; 180-day retention pruning runs daily at 00:35 Asia/Shanghai.
- OTA: group `64610999-a11e-4684-8147-3d62561286d7`, runtime `0.2.1`, Android and iOS.
