# Little Name — Baby Name Swipe

A mobile-first baby-name swiping app built with vanilla JavaScript and native IndexedDB. No accounts, cloud storage, or external name service.

## Run locally

From `d:\Aaron\Dev\BabyNameSwipe`:

```sh
npm install
npm start
```

Open **http://localhost:3000**. The existing Express server serves the static app from `d:\Aaron\Dev\BabyNameSwipe\docs`. That directory can also be hosted on a static web host; the app does not need a backend API. Serve over HTTP/HTTPS rather than opening HTML directly from the filesystem.

## Upload names

Open **Settings → Choose a names file** and upload a JSON array (up to 8 MiB):

```json
[
  {
    "name": "Clara",
    "meaning": "Bright, clear",
    "origin": ["Latin"]
  },
  {
    "name": "Felix",
    "meaning": "Happy, fortunate",
    "origin": ["Latin"]
  }
]
```

`name` is required. `meaning` and `origin` are optional. Origin also accepts a single string. Duplicate name/origin combinations are skipped, keeping the first record. Meaning and origin are displayed from your file, not fetched or generated. A downloadable example is available in Settings.

Uploading a new collection asks for confirmation before replacing current names and review history. It retains your last name.

## Review and save

- Swipe right or press the heart to like; swipe left or press × to pass. Desktop users can use arrow keys outside form controls.
- Set an optional last name in Settings to see how the full name reads.
- New imports and restarts shuffle all names for the first round, showing every imported name exactly once.
- Once all names have been reviewed, a notice appears and the app continues with liked names only.
- Every later round freshly shuffles the remaining liked names, showing each once per round. Random order can occasionally match a previous round by chance.
- Liked names repeat in rounds indefinitely, even when only one remains. Passing on a name removes it from future rounds.
- If none remain, restart with the original collection or upload another list.
- Names, settings, decision history, and round progress are saved to IndexedDB. Reloading resumes the current review.
- An already-saved round keeps its current order and progress; randomization applies when a new round starts, not on reload.
- Shortlist shows currently liked names, 20 per page.
- Download results from Shortlist or Settings. The JSON includes your last name, current shortlist, round progress, every name's latest decision (including unreviewed names), and timestamped decision history.
- Restarting clears likes and history, but retains the names and last name.

## Storage limitations

Data belongs to the browser, profile, and site address where you used the app. It does not synchronize across devices. Clearing browser data, private browsing, or browser storage eviction can remove it. Download results to retain a portable reference; restoring result exports is not supported. If storage fails, the app displays an error rather than claiming your decision was saved. Concurrent progress changes in another tab trigger a reload of saved state rather than overwriting it.

No automated tests or test dependencies are included, as requested. Basic syntax checks and a browser smoke check are used for implementation verification.