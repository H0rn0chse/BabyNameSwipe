# Baby Name Swipe Implementation Plan

> **For agentic workers:** Use executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Build a mobile-friendly, local-only name-swiping app with repeating liked-name rounds.

**Architecture:** Native browser modules separate pure collection/session logic, IndexedDB transactions, and UI orchestration. The existing Express server serves the existing docs directory. No additional dependencies are needed.

**Tech Stack:** JavaScript ES modules, HTML, CSS, IndexedDB, Express 5.

**Spec:** `d:\Aaron\Dev\BabyNameSwipe\docs\superpowers\specs\2026-09-23-baby-name-swipe-design.md`

## Global Constraints

- No automated tests, test suite, or test dependencies, per user request.
- Names, decisions, settings, and progress are local to IndexedDB.
- Upload JSON up to 8 MiB; preserve metadata and reject invalid data before replacement.
- Continue reviewing liked names indefinitely, including a single remaining name.
- Preserve existing unrelated workspace changes; no runtime dependencies.

## Task 1: Collection and persistence

**Files:** Create `d:\Aaron\Dev\BabyNameSwipe\docs\model.js` and `d:\Aaron\Dev\BabyNameSwipe\docs\storage.js`.

**Interfaces:** `parseNames(text)` returns `{names, duplicates}`. Records have numeric IDs, name, meaning, and origin. `createSession(names)` returns `{round, queue, cursor, liked, reviewed, notice}`. `decide(session, decision)` returns a new session. `makeExport(names, session, history, lastName)` returns JSON-ready data. `openStorage()` returns a DB connection; storage functions load data, replace collections, save a decision with session atomically, and save settings.

- [x] Implement JSON parsing with row-specific errors, trimmed strings, origin normalization, and case-insensitive name/origin deduplication.
- [x] Implement immutable session transitions. At queue exhaustion set `queue = [...liked]`, increment round, reset cursor, and retain a completion notice. Empty liked queues stop naturally.
- [x] Implement versioned export with latest decisions, unreviewed markers, and full history.
- [x] Implement three IndexedDB stores: names (key `id`), history (auto-increment key), and metadata (explicit keys). Resolve writes only on transaction completion. Persist an optimistic session revision to reject stale updates from another tab.
- [x] Check module syntax using `node --check` and inspect transaction failure paths.

## Task 2: Mobile-first interface

**Files:** Modify `d:\Aaron\Dev\BabyNameSwipe\docs\index.html`, `d:\Aaron\Dev\BabyNameSwipe\docs\styles.css`, and `d:\Aaron\Dev\BabyNameSwipe\docs\app.js`.

**Interfaces:** UI imports model and storage exports from Task 1. DOM uses stable IDs for navigation, card, progress, shortlist, settings, status, and confirmation dialog.

- [x] Add semantic navigation for Discover, Shortlist, and Settings; initial and no-liked-name empty states; swipe card; round notice; pass/like buttons; and paginated shortlist.
- [x] Style warm cream/coral cards, origin chips, responsive typography, touch-sized controls, fixed mobile bottom navigation, safe-area padding, focus states, and reduced motion. Use `touch-action: pan-y` on cards and allow long meanings to scroll vertically.
- [x] Load IndexedDB before enabling actions. Render untrusted names with `textContent`. Keep only one card and 20 shortlist names rendered at once.
- [x] Wire explicit buttons, horizontal pointer gestures, and keyboard arrows; ignore form/dialog keyboard events and block decisions during writes. Reset gesture transforms after cancellation.
- [x] Wire last-name form, JSON file validation, atomic replacement confirmation, confirmed restart, persistent notices, and result downloads using Blob URLs revoked after dispatch.
- [x] Show all storage/import errors visibly. Reload state after stale-tab conflicts. Retain last name on import and restart.

## Task 3: Documentation and smoke verification

**Files:** Create `d:\Aaron\Dev\BabyNameSwipe\README.md`; update this plan's checkboxes.

- [x] Document `npm install` / `npm start`, upload schema, repeating rounds, exports, and browser-storage limitations.
- [x] Run `node --check` for each JavaScript module and inspect changed files and whitespace.
- [x] Start or reuse the Express server and open the app in a browser at a phone-sized viewport. Smoke-check import, swiping into liked-name rounds, last-name persistence after reload, shortlist, and JSON download. Inspect console errors and horizontal overflow.
- [x] Record actual verification results without claiming comprehensive testing.

## Execution

Execute inline in this session because the user approved proceeding with implementation and no subagent tool is available. Review each task before continuing. No test artifacts will be created.
## Verification outcome

JavaScript syntax checks passed. Browser smoke verification covered JSON import, last-name save, like/pass buttons, pointer dragging, round transitions, reload persistence, single-name looping, shortlist, download initiation, empty state, and confirmed restart. No horizontal overflow at 320px, 390px, or 1280px widths. Browser console reported no errors or warnings. No automated test suite or dependencies were added. User explicitly requested implementation in the current folder on main.
