# TimeSheet Automation — How This Project Works

A plain-language guide to the whole project: what it does, how the pieces fit
together, and the files/config you must understand before changing anything.

---

## 1. What Is This Project?

**TimeSheet Automation** is a **chat bot that lives inside Microsoft Teams** (and
Microsoft 365 Agents Playground for testing). It lets employees track their work
hours by simply typing short status messages in a chat.

Instead of filling out a timesheet at the end of the day, a team member just
chats naturally with the bot:

```
connected @ 9:00 AM      ← starts the work day
lunch                    ← goes to lunch (tracked silently)
back @ 1:00 PM           ← returns from lunch
disconnected @ 5:30 PM   ← ends the day → bot replies with net hours
```

The bot remembers every status update, works out how long the person actually
worked (subtracting breaks), and can produce spreadsheet-style reports on
demand. It is built on top of a Microsoft sample template ("Basic Bot") and then
extended with all the timesheet logic.

---

## 2. The Big Picture (Architecture)

Think of the project as a pipeline with five stages:

```
Teams chat message
        │
        ▼
┌──────────────────────────────────────────────┐
│ 1. Web server  (index.js)                     │  ← receives the chat message over HTTP
│        │                                      │
│        ▼                                      │
│ 2. Teams App / Bot adapter (app.js)           │  ← authenticates, strips @mentions, hands text to handler
│        │                                      │
│        ▼                                      │
│ 3. TimesheetHandler (src/timesheet-handler.js)│  ← the "brain": decides what to do
│        │                                      │
│        ├──► 3a. Parser (src/parser.js)         │  ← understands the words ("connected", "@ 9 AM", notes)
│        ├──► 3b. State machine                 │  ← enforces the rules ("you can't go on lunch if you're not connected")
│        ├──► 3c. Storage (src/storage.js)       │  ← remembers every entry in memory
│        └──► 3d. TimeCalculator (src/timeCalculator.js) │  ← does the maths: worked vs break minutes
│        │                                      │
│        ▼                                      │
│ 4. Reply sent back into the Teams chat        │
└──────────────────────────────────────────────┘
        │
        ▼
5. Reports (summary / tally commands) → tab-separated table pasted into chat
```

There are actually **two bot host implementations** in the repo (see §6), but
the core timesheet logic lives in one place so both can share it.

---

## 3. Purpose of Each Major Component

### `index.js` (root) — The starter / entry point
A tiny file. It just loads `app.js` and calls `app.start()`. This is what runs
when you do `npm start` or `npm run dev`. **Nothing timesheet-related happens
here** — it only boots the server.

### `app.js` — The live bot (Teams Apps SDK)
This is the bot that is actually wired up to Microsoft Teams in production. It:
- Creates a Teams `App` with the right authentication (client id/secret, or
  Azure Managed Identity for cloud deployments).
- Listens for incoming chat messages.
- Strips out the @mentions (so `@TimeSheetBot connected` becomes `connected`).
- Pulls out the conversation id, message id, user id, and user name.
- Hands all of that to **`TimesheetHandler.processMessage()`** and, if a reply
  comes back, sends it into the chat.
- Sends a welcome message when someone new joins the conversation.

### `config.js` — Authentication settings
A small bridge that reads Microsoft app credentials (`CLIENT_ID`,
`CLIENT_SECRET`, `TENANT_ID`, `BOT_TYPE`) from environment variables and exposes
them in one tidy object. `app.js` uses this to decide how to authenticate.

### `src/timesheet-handler.js` — The brain (framework-agnostic)
The most important file for the timesheet feature. It is deliberately written
**without** any Teams-specific code, so the same logic can run under either bot
framework. Responsibilities:
- **Recognises commands:** `help`, `summary <user> <from> [to]`, `tally <from> [to]`.
- **Parses status messages** using the Parser.
- **Runs a state machine** per user, per conversation, per day. A user is always
  in one of three states: `idle`, `working`, or `on_break`. The state machine
  stops nonsense like going on lunch before starting work.
- **Saves each entry** to Storage.
- **Replies only when needed:** status updates are tracked *silently* (no
  reply, to keep the chat quiet); the bot only talks back when you send
  `disconnected` (to show your net hours) or use a reporting command.
- **Builds reports:** `summary` (one user) and `tally` (everyone) output a
  tab-separated (TSV) table. For ranges of 7 days or less it shows daily
  breakdowns; for longer ranges it groups by week.

### `src/parser.js` — Understands natural-language messages
Turns a raw chat string into a structured object: `{ status, timestamp, notes }`.
- **Status keywords:** recognises synonyms, e.g. `connected`/`connect`/`start`/
  `in`/`online` all mean "start work"; `lunch`/`lunchbreak`; `break`/`brb`;
  `back`/`return`; `disconnected`/`off`/`done`.
- **Timestamps:** uses the `chrono-node` library plus its own regexes to read
  things like `@ 9:30 AM`, `at 2 PM`, `break 2pm`. **AM/PM is required** — if
  you write a bare time like `@ 9:30` it flags it as *ambiguous* so the bot can
  ask the user to clarify instead of guessing wrong.
- **Notes:** anything left over (after removing the status word and time) is
  kept as free-text notes.
- Also produces the `help` text and the "did you mean…?" suggestions.

### `src/storage.js` — Memory (no database yet)
An in-memory store shaped as:
`conversationId → messageId → entry`.

Each entry holds `{ messageId, userId, userName, date, timestamp, status, notes }`.
Key features:
- Keying by `messageId` lets the bot update an entry when a user **edits** a
  previous chat message (so history can be corrected).
- Helper methods fetch entries by user and by date range, and group entries by
  date or by user+date for reports.

> ⚠️ **Important limitation:** storage is **in memory only**. If the bot
> restarts, all timesheet data is lost. This is the single biggest thing to know
> before changing the project — see §8.

### `src/timeCalculator.js` — The maths engine
Given a day's entries, it computes:
- **Work minutes** (time actually working),
- **Break minutes** (lunch/break time),
- **Total minutes** (work + break).

It correctly handles:
- Multiple separate work sessions in one day (e.g. someone clocks in, out, then
  in again). It pairs each `connected` with its matching `disconnected` using a
  stack, so overlapping sessions don't get mixed up.
- Open-ended entries (e.g. went on break but never came back) are handled
  gracefully.
- All date formatting uses **local** date components (not UTC), which matters
  for early-morning entries that would otherwise fall on the wrong day.

### `src/index.js` and `src/bot.js` — The *other* bot host (Bot Framework SDK)
An alternative, older-style implementation using the `botbuilder` /
`restify` stack:
- `src/index.js` sets up an HTTP server (restify) listening on port 3978, a
  `CloudAdapter`, and routes `/api/messages` to the bot.
- `src/bot.js` defines `TimesheetBot` (extends `ActivityHandler`) and contains a
  **near-duplicate** of the logic in `timesheet-handler.js`.

This path exists for the Bot Framework Emulator and the classic hosting model.
The cleaner, shared logic now lives in `timesheet-handler.js`; `src/bot.js`
still has its own copy and is effectively legacy/parallel.

### `test/` and `src/*.spec.js` — Automated tests
Jest test suites for `parser`, `storage`, `timeCalculator`, and
`timesheet-handler`. Run with `npm test`. There is also
`scripts/test-scenarios.js` for manual end-to-end scenario checks.

---

## 4. How a Message Flows Through (Worked Example)

1. User types **`connected @ 9:30 AM`** in a Teams channel where the bot is
   present.
2. Teams sends that to the bot's web server. `app.js` receives it, strips the
   @mention, and calls `handler.processMessage({ text: "connected @ 9:30 AM",
   conversationId, messageId, userId, userName })`.
3. `TimesheetHandler` sees it's not `help`/`summary`/`tally`, so it asks the
   **Parser** to interpret it → `{ status: 'connected', timestamp: <9:30 AM
   today>, notes: '' }`.
4. It looks up the user's state for today (`idle`) and checks the transition
   `idle → working` is allowed. ✅
5. It updates the state to `working` and stores the entry in **Storage**.
6. Because the status is `connected` (not `disconnected`), it returns `null` —
   **no reply is sent**. The chat stays quiet.
7. Hours later the user sends **`disconnected @ 5:30 PM`**. Same flow, but now
   the handler gathers *all* of today's entries for that user, passes them to
   **TimeCalculator**, and replies:

   ```
   **Jane Doe - 2026-07-08**
   Net Work Time: 7h 30m (Break: 30m)
   ```

---

## 5. The State Machine (Rules of the Game)

Each user, in each conversation, on each day, is in one state:

| State     | Meaning                                  |
|-----------|------------------------------------------|
| `idle`    | Not working. Day hasn't started or ended.|
| `working` | Currently on the clock.                  |
| `on_break`| On break/lunch, not being paid to work.  |

Allowed transitions enforced by `validateStateTransition`:

- `connected` → from `idle` only. (Can't start twice; can't start while on break.)
- `break` / `lunch` → from `working` only.
- `back` → from `on_break` only.
- `disconnected` → from `working` or `on_break` (resets to `idle`).

State automatically resets to `idle` when the calendar date changes, so
yesterday's session never bleeds into today.

---

## 6. Two Bot Hosts — Which One Runs?

| Entry point      | Framework            | Used for                       |
|------------------|----------------------|--------------------------------|
| `index.js` + `app.js` | `@microsoft/teams.apps` (newer) | **Production / Playground** — what `npm start` and `npm run dev` run. |
| `src/index.js` + `src/bot.js` | `botbuilder` + `restify` (classic) | Bot Framework Emulator / classic Azure hosting. |

The **timesheet logic is shared** via `TimesheetHandler`, but `src/bot.js`
keeps its own copy of that logic. When you change timesheet behaviour, update
`src/timesheet-handler.js` (the canonical version) and decide whether `bot.js`
needs the same change.

---

## 7. Important Files, Configs & Dependencies

### Files you must understand before changing things

| Path | Why it matters |
|------|----------------|
| `index.js` | Real entry point — boots `app.js`. |
| `app.js` | Production bot wiring + auth. |
| `config.js` | Reads auth env vars. |
| `src/timesheet-handler.js` | **Core timesheet logic.** Change behaviour here. |
| `src/parser.js` | Change which words/times the bot understands here. |
| `src/storage.js` | Change *how/where* data is saved here (e.g. add a real database). |
| `src/timeCalculator.js` | Change the hour/break maths here. |
| `src/bot.js` + `src/index.js` | Legacy parallel bot host. |
| `appPackage/manifest.json` | The Teams app manifest (name, icons, bot id, scopes). |
| `m365agents.yml` / `m365agents.local.yml` / `m365agents.playground.yml` | Microsoft 365 Agents Toolkit pipelines (provision, deploy, publish) for local and cloud. |
| `infra/azure.bicep` + `infra/azure.parameters.json` | Azure infrastructure-as-code (App Service + bot registration) created during provisioning. |
| `env/.env.*` | Per-environment settings (dev, local, playground). |
| `.localConfigs` / `.localConfigs.playground` | Local-only env vars loaded by `env-cmd` (contains `CLIENT_ID`, `CLIENT_SECRET`, `TENANT_ID`, `BOT_TYPE`). **Treat as secrets — never commit.** |
| `web.config` + `.webappignore` | Azure App Service hosting config + deploy ignore list. |

### Environment variables you need to know

| Variable | Purpose |
|----------|---------|
| `CLIENT_ID` | The bot's Microsoft App / bot id. |
| `CLIENT_SECRET` | The bot's secret (local/multi-tenant). |
| `TENANT_ID` | Azure AD tenant. |
| `BOT_TYPE` | `MultiTenant` for local/dev; `UserAssignedMsi` for Azure Managed Identity. |
| `PORT` / `port` | HTTP port (defaults to 3978). |
| `BOT_ID`, `TEAMS_APP_ID`, `BOT_DOMAIN`, `BOT_AZURE_APP_SERVICE_RESOURCE_ID` | Generated by the Agents Toolkit during Azure provisioning. |

### Key dependencies (from `package.json`)

| Package | What it's for |
|---------|---------------|
| `@microsoft/teams.apps` | The newer Teams App SDK used by `app.js`. |
| `@microsoft/teams.common` | Provides `LocalStorage` used internally by the App. |
| `@microsoft/teams.api` | Provides `stripMentionsText` to clean chat input. |
| `botbuilder` | The classic Bot Framework SDK used by `src/bot.js`. |
| `restify` | HTTP server for the classic bot host. |
| `chrono-node` | Natural-language date/time parsing in the Parser. |
| `@azure/identity` | Azure Managed Identity auth for cloud deployments. |
| `dotenv` | Loads `.env` files. |
| `@laufire/utils` | Small utility helpers (available if needed). |
| `jest` (+ `jest-expect-message`, `@babel/preset-env`) | Test framework + Babel for tests. |
| `env-cmd` | Loads local config files for dev scripts. |
| `nodemon` | Auto-restarts the bot during development. |

### Scripts (from `package.json`)

| Command | What it does |
|---------|--------------|
| `npm start` | Runs `node ./index.js` (production-style). |
| `npm run dev` | Runs with nodemon + debugger on port 9239. |
| `npm run dev:teamsfx` | Runs `dev` with `.localConfigs` env loaded. |
| `npm run dev:teamsfx:playground` | Runs `dev` with `.localConfigs.playground` env loaded. |
| `npm run dev:teamsfx:launch-playground` | Launches the Agents Playground web UI. |
| `npm test` | Runs the Jest test suite. |

---

## 8. Things to Know Before You Change the Project

1. **Storage is in memory only.** Every restart wipes all timesheet data. If you
   need persistence (a database, a file, blob storage, etc.), `src/storage.js`
   is the place to add it — keep the same method names so the handler doesn't
   change.
2. **Two copies of the brain.** `src/timesheet-handler.js` is the clean, shared
   version; `src/bot.js` has an older duplicate. Decide whether you're keeping
   both in sync or retiring the classic host.
3. **AM/PM is mandatory for timestamps.** The parser intentionally rejects
   ambiguous times. If you want to allow 24-hour or bare numbers, change
   `src/parser.js` carefully — it relies on a specific ordering of chrono →
   ambiguous check → explicit AM/PM regex.
4. **Dates use local time, not UTC.** `formatDate` in both `storage.js` and
   `timeCalculator.js` deliberately uses local date components. Don't "simplify"
   it to `toISOString()` or early-morning entries will land on the wrong day.
5. **Reports switch format at the 7-day boundary** (daily vs weekly). This logic
   lives in `timesheet-handler.js`'s `generateUserSummaryTSV` /
   `generateTallyTSV`.
6. **Secrets live in `.localConfigs*` and `env/.env.*` files.** They're in
   `.gitignore` for a reason. Don't paste real `CLIENT_SECRET` values into
   committed files or chat.
7. **Auth has two modes** controlled by `BOT_TYPE`: `MultiTenant` (secret-based,
   local/dev) and `UserAssignedMsi` (Managed Identity, Azure). `app.js`
   branches on this — handle both when changing auth.
8. **The bot is intentionally quiet.** Only `disconnected` and the report
   commands produce replies. Don't add replies to `connected`/`break`/`back`
   unless you want to change the design.
9. **Tests exist for a reason.** `npm test` covers the parser, calculator,
   storage, and handler. Run it after any change to the core logic.
10. **Editing a past message updates its entry** (keyed by `messageId`). This is
    how users "fix history" without restarting their day. Preserve this
    behaviour if you refactor storage.

---

## 9. Further Reading (existing docs in the repo)

- `README.md` — Original Microsoft template overview.
- `QUICKSTART.md` — Quick start steps.
- `BEGINNER-SETUP-GUIDE.md` — Detailed beginner setup walkthrough.
- `DEPLOYMENT.md` — How to deploy to Azure.
- `REQUIREMENTS.md` — The product requirements/spec.
- `Timesheet Automation — Spec Checklist.md` — Spec completion checklist.

---

*Generated as a project orientation guide. Start at `app.js` for production
behaviour, then jump into `src/timesheet-handler.js` for the actual timesheet
smarts.*
