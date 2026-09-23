# Baby Name Swipe design

## Scope and stack

Build the existing vanilla JavaScript, HTML, and CSS scaffold into a mobile-first baby-name swiping app. Keep the existing Express static server and add no runtime dependencies. Names and results stay in the browser; no account or remote API is required.

## Import and data

Users manually upload a JSON array matching `docs/example.json`: each record has a nonempty `name`, a `meaning` string, and an `origin` array of strings. Missing or empty meaning or origin is accepted and displayed as unavailable; malformed field types or an empty top-level names array are rejected with useful errors. Accept origin strings as a convenience, converting them into arrays. Support files up to 8 MiB without rendering the entire dataset into the DOM. Trim fields and deduplicate equivalent name/origin records. Display an import summary.

An upload replaces the active collection and its results only after explicit confirmation when an existing collection exists. Validation occurs before replacement and the replacement is atomic. The last name is retained. Provide a downloadable example file.

Use native IndexedDB stores for name records, decision history, and session/settings metadata. Persist each swipe and its progress together in one transaction. A session tracks the current round, ordered candidate IDs, cursor, currently liked IDs, and the latest round-completion notice. Restore the exact position on reload. Save the optional last name to IndexedDB. Surface storage failures rather than silently falling back to memory.

## Swipe flow and repeating liked-name loops

The first round visits every imported name once in a shuffled order. New imports and restarts use a Fisher–Yates shuffle of all name IDs; each later round freshly shuffles the remaining liked IDs. Save the shuffled queue with session progress rather than reshuffling on reload. Already-saved rounds keep their order and progress unchanged. Randomization does not guarantee a different permutation each round. Right means like; left means pass. Provide pointer-based dragging for touch/mouse, large explicit buttons, and left/right keyboard controls when not editing a field or using a dialog. Prevent overlapping decisions during persistence.

After the first round, visibly announce that all names have been reviewed and immediately prepare the next round using liked names only. Keep the completion notice visible until dismissed or superseded. Subsequent rounds repeat with the remaining liked names: a like retains the name and a pass removes it from later rounds. Each round uses a snapshot so a name is reviewed once per round. There is no finalist or winner state: even one liked name continues looping. An empty shortlist stops the loop and offers a confirmed restart with all uploaded names. Restart clears decisions but retains names and last name.

Show the current round, position/progress, reviewed count, and current liked count. Display a clear initial empty state before import and an empty-shortlist state when all names have been passed.

Provide a one-step Undo last decision button, including in the empty-shortlist state. Atomically store the pre-decision session and decision history ID in IndexedDB with each new swipe. Undo restores the exact previous queue, cursor, likes, reviewed count, round, and notice and deletes the reverted decision from history. It survives reloads and works across round boundaries without reshuffling the restored queue. Only the latest decision made after this feature is available for undo; undo consumes the saved snapshot. Importing and restarting clear it. Protect undo writes with the same revision check as swipes.

## UI

Use a warm, clean mobile-first visual design. The primary view contains a compact header, progress, one prominent swipe card, and thumb-friendly pass/like buttons. Each card displays the first name, optional last name, origin chips, and meaning. Long names wrap and long meanings remain scrollable without interfering with horizontal swipes. Respect reduced-motion preferences, maintain visible focus styles, and use semantic controls and live status announcements.

Reduce header and Discover heading spacing, and hide decorative copy while reviewing. Routine swipe announcements remain accessible without inserting a visible banner above the card; errors remain visible and round-completion notices retain their dedicated display. Keep existing vertical scrolling on the card and meaning area unchanged rather than locking gestures to horizontal movement.

Provide a shortlist/results view, an import/settings view, and straightforward navigation. Paginate the shortlist to keep large collections responsive. Settings allow editing the last name, uploading names, downloading the example, and restarting. All views work at small phone widths and on desktop without horizontal overflow.

## Downloads

Offer a JSON results download containing an export format version, export timestamp, last name, round/progress metadata, current liked names and their metadata, every imported name's latest decision, and complete timestamped decision history. Unreviewed names are explicitly represented. Generate the download locally with a Blob and release object URLs afterwards.

## Architecture and validation

Separate pure import/session/export logic from IndexedDB access and UI event/rendering code. Per user request, do not create automated tests, a test suite, or test dependencies. Verification is limited to reviewing edited files, JavaScript syntax checks, and a basic browser smoke check against the existing Express server to confirm the app loads and its core flow works. Inspect browser errors before reporting completion; do not claim comprehensive test coverage.

## Limitations

Meaning and origin are supplied by uploaded data, not generated or fetched. Data is specific to this browser and origin and can be removed by clearing browser storage; downloads are the portable backup. No synchronization, account system, result re-import, or CSV support is included.