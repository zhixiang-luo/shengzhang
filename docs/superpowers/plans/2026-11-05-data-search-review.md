# 声账 0.1.7–0.2.0 Implementation Plan

> **For agentic workers:** Execute this plan milestone by milestone. Do not start the next milestone until the current milestone has passing typecheck, lint, tests, Android export, and iOS export.

## Execution status

| Milestone | Automated gates | Dual-platform export | Real-device acceptance |
| --- | --- | --- | --- |
| `0.1.7` Data Safe | 通过 | 通过 | 待验 |
| `0.1.8` Ledger Search | 通过 | 通过 | 待验 |
| `0.2.0` Monthly Review | 通过，130 项测试 | 通过 | 待验 |

`0.2.0` 新增 `react-native-view-shot` 原生依赖，系统分享和 PNG 生成无法只靠 OTA 进入旧安装包，必须用新原生构建验收。

**Goal:** Complete 声账's local data-safety loop, ledger search, and local-first monthly review before account, cloud backup, membership, or growth work resumes.

**Architecture:** Keep domain rules and serializable data transforms in `packages/domain` or focused mobile feature modules. Keep SQLite reads and transactional writes in mobile repositories. Keep OS file picker/share integration in `apps/mobile/src/services`, so the core backup, CSV, search, and review behavior remains unit-testable.

**Tech Stack:** Expo 58, React Native 0.88, TypeScript 6, SQLite + Drizzle, Zod, Vitest, Expo Document Picker, Expo Sharing, React Native View Shot.

**Spec:**

- `docs/01-prd.md`
- `docs/07-data-privacy.md`
- `docs/14-implementation-roadmap.md`
- `docs/21-post-mvp-strategy.md`
- `docs/22-voice-trust-and-monthly-review.md`

## Global Constraints

- `amountMinor` is always a positive safe integer and represents cents.
- Local SQLite remains the source of truth.
- Backup restore is overwrite-only in the first release; no merge, synchronization, login, or cloud dependency.
- A restore either fully succeeds or leaves the existing ledger unchanged.
- Backup JSON contains no API keys, secrets, analytics installation IDs, raw recordings, or model credentials.
- CSV is a viewing/export format only and may never be imported as a restore format.
- CSV cells beginning with `=`, `+`, `-`, `@`, tab, or carriage return are neutralized against spreadsheet formula injection.
- Search must work without network or login.
- Monthly review uses only deterministic local facts; no model-generated facts or commentary.
- Share cards are user-triggered and hide amount, note, and merchant text by default.
- All user-facing copy is simplified Chinese and uses concrete recovery instructions.
- Update `docs/HANDOFF.md`, `README.md`, the PRD, data/privacy docs, roadmap, acceptance criteria, and relevant technical docs after every milestone.

---

## Milestone 0.1.7: Data Safe

### Task 1: Versioned backup document and CSV transform

**Files:**
- Create: `packages/domain/src/data-portability.ts`
- Create: `packages/domain/src/data-portability.test.ts`
- Modify: `packages/domain/src/index.ts`

**Interfaces:**
- `buildBackupDocument(input): BackupDocumentV1`
- `parseBackupDocument(value: unknown): BackupDocumentV1`
- `buildTransactionsCsv(rows): string`
- `escapeCsvCell(value): string`

**Acceptance:**
- Backup format has `format`, `schemaVersion`, `exportedAt`, `appVersion`, `counts`, `checksum`, and `data`.
- Parsing rejects malformed JSON values, unsupported versions, count mismatches, missing tables, invalid transaction types, and bad amounts.
- CSV starts with a UTF-8 BOM and contains Chinese headers.
- Formula-like notes are neutralized without losing their visible text.

### Task 2: Transactional local snapshot, restore, clear, and export metadata

**Files:**
- Create: `apps/mobile/src/db/dataSafetyRepository.ts`
- Modify: `apps/mobile/src/db/transactionRepository.ts`
- Modify: `apps/mobile/src/db/categoryRepository.ts`
- Test: `apps/mobile/src/features/dataSafety/dataSafetyTransitions.test.ts`

**Interfaces:**
- `readLocalSnapshot(db): LocalDataSnapshot`
- `restoreLocalSnapshot(db, snapshot): void`
- `clearLocalLedger(db): void`
- `readLastExportAt(db): string | null`
- `markExportCompleted(db, exportedAt): void`

**Acceptance:**
- Restore deletes and reinserts all portable tables inside one SQLite transaction.
- Invalid category references and invalid voice-batch references are rejected before mutation.
- Clear removes transactions, voice batches, custom categories, and settings, then restores preset categories.
- A thrown write leaves the previous ledger intact.

### Task 3: OS file integration and Data Safety screen

**Files:**
- Create: `apps/mobile/src/services/dataSafetyFiles.ts`
- Create: `apps/mobile/src/features/dataSafety/dataSafetyMessages.ts`
- Create: `apps/mobile/src/features/dataSafety/dataSafetyMessages.test.ts`
- Create: `apps/mobile/src/app/data-safety.tsx`
- Modify: `apps/mobile/src/app/settings.tsx`
- Modify: `apps/mobile/src/app/_layout.tsx`
- Modify: `apps/mobile/package.json`
- Modify: `apps/mobile/app.json`

**Acceptance:**
- User can export JSON, export CSV, import JSON, and clear local data.
- Import preview displays exported time, app version, transaction count, and category count.
- Non-empty-ledger restore and clear require explicit confirmation.
- Restore failures keep the current ledger and show a human-readable error.
- Settings exposes `数据安全` and shows transaction/category counts and last export time.
- Back has consistent navigation styling.

### Task 4: 0.1.7 validation and docs

**Acceptance:**
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- Android and iOS Expo exports
- Documentation synchronized for backup format, overwrite semantics, CSV safety, clear behavior, and current limitations.

---

## Milestone 0.1.8: Ledger Search

### Task 1: Search filter contract and matching rules

**Files:**
- Create: `apps/mobile/src/features/search/ledgerSearch.ts`
- Create: `apps/mobile/src/features/search/ledgerSearch.test.ts`

**Interfaces:**
- `normalizeLedgerSearchFilters(input): LedgerSearchFilters`
- `matchesLedgerSearch(entry, filters, categoryById): boolean`
- `countActiveSearchFilters(filters): number`

**Acceptance:**
- Empty query returns all entries.
- Keyword searches note, category name, and subcategory name.
- Type, category, date range, and amount range compose with AND semantics.
- Amount range input accepts yuan strings and converts safely to cents.
- Invalid amount/date ranges are rejected with clear Chinese messages.

### Task 2: Search result access and screen

**Files:**
- Create: `apps/mobile/src/app/search.tsx`
- Modify: `apps/mobile/src/db/transactionRepository.ts`
- Modify: `apps/mobile/src/app/index.tsx`
- Modify: `apps/mobile/src/components/Icon.tsx`
- Modify: `apps/mobile/src/app/_layout.tsx`

**Interfaces:**
- `listAllTransactions(db): TransactionRow[]`
- Search screen navigates to `/entry?id=<transactionId>`.

**Acceptance:**
- Ledger header has a 44×44 search entry.
- Search shows recent deterministic results immediately.
- User can filter by keyword, income/expense, top-level category, start date, end date, minimum amount, and maximum amount.
- Result count and empty state are visible.
- Search does not depend on network.

### Task 3: 0.1.8 validation and docs

**Acceptance:**
- Full typecheck, lint, tests, and dual-platform export pass.
- PRD, user flows, information architecture, analytics, roadmap, README, HANDOFF, and acceptance criteria describe search behavior and metrics.

---

## Milestone 0.2.0: Monthly Review

### Task 1: Deterministic review aggregation

**Files:**
- Create: `packages/domain/src/monthly-review.ts`
- Create: `packages/domain/src/monthly-review.test.ts`
- Modify: `packages/domain/src/index.ts`

**Interfaces:**
- `buildMonthlyReview(input): MonthlyReview`
- `buildPrivacySafeShareSummary(review): ShareSummary`

**Acceptance:**
- Review totals match `summarizeAmounts`.
- Includes top category and share, previous-month comparison, daily average, highest day, transaction count, voice transaction count, and a factual sentence.
- Zero-data month returns an empty review.
- Share summary excludes amount, note, merchant, and exact transaction times.

### Task 2: Review page and entry point

**Files:**
- Create: `apps/mobile/src/app/review.tsx`
- Modify: `apps/mobile/src/features/ledger/useLedgerMonth.ts`
- Modify: `apps/mobile/src/app/stats.tsx`
- Modify: `apps/mobile/src/app/_layout.tsx`
- Modify: `apps/mobile/src/services/analytics.ts`

**Acceptance:**
- Stats page links to `/review?month=YYYY-MM`.
- Review page shows the month, factual narrative, key metrics, and category shape.
- Empty month has a clear next action.
- Analytics records `monthly_review_opened` and `monthly_review_previewed` without amounts, notes, or category names.

### Task 3: Privacy-safe share card

**Files:**
- Create: `apps/mobile/src/components/ShareReviewCard.tsx`
- Create: `apps/mobile/src/features/review/shareCard.ts`
- Create: `apps/mobile/src/features/review/shareCard.test.ts`
- Modify: `apps/mobile/src/app/review.tsx`
- Modify: `apps/mobile/package.json`

**Acceptance:**
- Share is opened only after an in-app preview.
- Default card exposes category-share ranges, trend direction, voice count, and brand CTA only.
- Default card never exposes exact amount, note, merchant, or exact dates.
- PNG export and system share work on iOS and Android.
- Analytics records preview, share, and cancel independently.

### Task 4: 0.2.0 validation and docs

**Acceptance:**
- Full typecheck, lint, tests, and dual-platform export pass.
- README, HANDOFF, PRD, strategy, voice/monthly-review spec, UI handoff, analytics, information architecture, acceptance criteria, and roadmap reflect implemented 0.1.7–0.2.0 behavior.
- Final report distinguishes verified automated/build evidence from pending real-device acceptance.
