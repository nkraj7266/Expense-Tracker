# Project Memory

Running log of decisions, what's built, and why — kept up to date across chat sessions
so a new session can pick up context without re-reading the whole transcript history.
For the original feature/architecture spec see [PLAN.md](PLAN.md); for the multi-user
auth design see [AUTH_PLAN.md](AUTH_PLAN.md). This file is the status/decisions log;
those two are the specs.

Last updated: 2026-09-14.

---

## 1. What's built so far

Phases 1–4 of [PLAN.md](PLAN.md) §8 are done (skeleton, LLM parsing, voice input,
analytics). [AUTH_PLAN.md](AUTH_PLAN.md) phases A–E (multi-user auth) are now
**built** — see §1a below. V2/V3 items (budgets, recurring detection, export,
chat-over-expenses, receipt OCR) are still not built.

### 1a. Multi-user auth ([AUTH_PLAN.md](AUTH_PLAN.md) phases A–E — done)

- **Backend**: `backend/auth/security.py` (Argon2id hashing, JWT access/refresh
  encode-decode, cookie helpers), `backend/auth/dependencies.py`
  (`get_current_user`), `backend/routers/auth.py` (`/auth/signup|login|logout|
  refresh|me`), `backend/models_auth.py`, `backend/rate_limit.py` (slowapi,
  5/min signup, 10/min login). Every `/expenses`, `/analytics` route and the
  categories write path now require `Depends(get_current_user)`; `user_id`
  comes from the verified access-token cookie, never the client.
  `settings.default_user_id` / `DEFAULT_USER_ID` removed entirely.
- **Refresh tokens**: stored hashed (sha256) in a new `refresh_tokens`
  collection with `revoked_at`/`replaced_by`. Rotation on every `/auth/refresh`
  call; if an already-rotated (revoked) token is presented again, the whole
  token chain for that user is revoked (theft-detection heuristic from
  AUTH_PLAN.md §9 Phase C) — verified working via direct testing.
- **Frontend**: `pages/Login.jsx`/`Signup.jsx`, `context/AuthContext.jsx`
  (calls `GET /auth/me` on mount to restore session from cookie), `App.jsx`'s
  `RequireAuth` + `AppShell` layout-route pattern (redirects to `/login`,
  preserves the original destination via router state), `api/auth.js`,
  `api/client.js` now sends `credentials: 'include'` and transparently retries
  once through `/auth/refresh` on a 401 before giving up.
- **Migration**: `backend/scripts/backfill_legacy_user.py` reassigns expenses
  from the old hardcoded `user_id: "nitin"` (6 documents still exist under
  that literal as of this writing) to a real account. **Not yet run** — it
  requires the real account to be signed up first (a real chosen password),
  which wasn't done as part of this session since only the account owner
  should set that password. Next session: sign up via the UI, then run the
  script per the README's "Accounts & auth" section.
- **Decisions made without re-confirming with the user** (matches
  AUTH_PLAN.md §11's suggested defaults, but flagging since they were open
  questions): self-serve `/auth/signup` stayed open (not invite-only/gated),
  and email verification was skipped for MVP. Revisit if this ever goes
  beyond a small household of users.
- **Real bugs hit and fixed during implementation** (worth knowing if similar
  symptoms show up again):
  1. `Domain=localhost` on cookies is rejected/mismatched by several
     cookie-jar implementations (Python's `http.cookiejar`, used by `httpx`)
     — fixed by omitting the `Domain` attribute entirely when
     `COOKIE_DOMAIN` is `"localhost"` (host-only cookie), only setting it for
     a real deployed domain. See `auth/security.py`'s `_cookie_domain()`.
  2. Comparing a Mongo-stored (naive, BSON strips tzinfo) `expires_at` against
     a timezone-aware `datetime.now(timezone.utc)` raised `TypeError: can't
     compare offset-naive and offset-aware datetimes` in `/auth/refresh`.
     Fixed by using naive `datetime.utcnow()` for everything that touches
     Mongo in `routers/auth.py`, matching the rest of the codebase's existing
     convention (`expenses.py` already did this). JWT `iat`/`exp` encoding in
     `security.py` stays timezone-aware since that never touches Mongo.
- Verified via direct backend testing (FastAPI `TestClient`, signup → refresh
  → rotation → reuse-detection → logout → 401-after-logout) and a full
  Playwright browser E2E run (signup → add expense via LLM parse → dashboard/
  history → logout → login → session persists across reload). All test
  accounts created during testing were deleted from the real Atlas DB
  afterward.

### Backend (`backend/`)
- `config.py`, `database.py` — Mongo connection (Motor), indexes, seeded fixed
  category list (12 categories with `icon`/`color`, used by the frontend too).
- `models.py` — `Category`/`PaymentMethod`/`Source` enums, `ExpenseCreate/Update/Out`,
  `ParsedExpense`, `CategoryOut/Create`.
- `llm.py` — Gemini structured-output parsing (`response_schema`), retry-once on
  invalid JSON, resolves relative dates ("yesterday") server-side using the request's
  current date, never trusts the model's own idea of "today".
- `routers/expenses.py` — `/expenses/parse` (LLM draft, not persisted) + full CRUD.
- `routers/categories.py`, `routers/analytics.py` (`/summary`, `/trend`).
- Still single-user: every query filters by `settings.default_user_id` (hardcoded
  `"nitin"` in `.env`'s `DEFAULT_USER_ID`, see [AUTH_PLAN.md](AUTH_PLAN.md) for the
  replacement plan).
- venv set up at `backend/venv`; `backend/.env` has real Mongo Atlas + Gemini
  credentials (never committed — see `.gitignore`).

### Frontend (`frontend/src/`)
- Replaced the default Vite template entirely.
- `CaptureBar` (text + mic) → `ConfirmExpenseModal` (edit-before-save, per
  PLAN.md §9's "never auto-save an LLM's raw output") → saves, then
  `ExpensesRefreshContext` bumps a refresh counter so every page's list/dashboard
  re-fetches.
- `ExpenseList`/`ExpenseCard` (grouped by day, inline edit, delete via `ConfirmDialog`).
- Pages: `Home` (today), `History` (filterable), `Dashboard` (daily/weekly/monthly
  summary + category pie + 30-day trend via Recharts).
- Shared `Modal` component (portal, overlay click, Escape key) — `ConfirmDialog` and
  `ConfirmExpenseModal` both built on it. No native `window.confirm`/`alert` anywhere.
- `CategoryIcon` — small hand-drawn SVG glyph per category (fork/knife, cart, car,
  etc.), colored from the category's seeded `color`, used in `ExpenseCard`.
- `npm run build` and `npm run lint` both verified clean (3 pre-existing oxlint style
  warnings, no errors) as of last check.

---

## 2. Key decisions made

- **MongoDB: Atlas**, not local — `backend/.env`'s `MONGODB_URI` points at a
  `cluster0.mu99zwx.mongodb.net` Atlas cluster the user set up themselves.
- **Gemini model: `gemini-3.5-flash-lite`**, not `gemini-2.5-flash-lite` as
  PLAN.md originally specified — `2.5-flash-lite` was deprecated for new API keys
  (404 from Google, error message pointed at `3.5-flash-lite` as the replacement).
  Updated in `backend/config.py` default, `.env`, `.env.example`, and README.
- **Voice input: Web Speech API**, browser-side, per PLAN.md — no Whisper/server-side
  STT built.
- **Categories: fixed enum, global/shared** — not per-user, not freely creatable by
  the LLM (PLAN.md §9). Confirmed again in AUTH_PLAN.md §5 as staying global even
  after multi-user lands.
- **Modals: one shared `Modal` primitive**, no native browser dialogs — user
  explicitly asked for this after seeing a native `confirm()` on delete.
- **Auth (built, see §1a)**: httpOnly cookies for tokens (not `localStorage`),
  short-lived JWT access token + rotating/revocable refresh token, Argon2id
  password hashing. Full rationale in [AUTH_PLAN.md](AUTH_PLAN.md) §3, §10.
  Of AUTH_PLAN.md §11's open questions: cookies (not localStorage) confirmed by
  building it that way; self-serve signup and no email verification were
  chosen as pragmatic MVP defaults without re-confirming — revisit if this
  goes beyond a small household of users.

---

## 3. Bugs found and fixed

1. **`[object Object]` shown in the UI on validation errors.**
   `frontend/src/api/client.js` passed FastAPI's 422 `detail` (an array of
   `{loc, msg, type}` objects) straight into `new Error(...)`, which stringifies an
   array of objects that way. Fixed with a `formatErrorDetail()` helper that turns it
   into a readable `field: message` string.

2. **Editing an expense's date always failed** with `"Input should be None"` for the
   `date` field. Root cause was a genuine Python/Pydantic gotcha, not app logic: in
   `backend/models.py`, `ExpenseUpdate` had `date: Optional[date] = None`. In a class
   body, an annotated assignment binds the *value* to the name before evaluating the
   *annotation* — so with a field literally named `date`, annotated with the type
   `date`, and given a default, the annotation evaluation saw the just-assigned `None`
   instead of the `datetime.date` class, collapsing the field's type to `NoneType`.
   Only this one field hit it (the only `date`-typed field in the file with an
   explicit default). Fixed by `import datetime as dt` and using `dt.date`/
   `dt.datetime` everywhere in `models.py` instead of bare names.

3. **Voice input would silently stop mid-sentence.** `useSpeechToText.js` had
   `recognition.continuous = false`, which makes Chrome's engine auto-stop at the
   first detected pause in speech (not just at the end of the sentence), and there
   was no reconnect logic in `onend`. Fixed by setting `continuous = true`, tracking
   an intentional-stop ref so the hook can tell "the browser gave up" apart from
   "the user tapped stop," auto-restarting in the former case, and carrying over
   already-recognized text across an internal restart so it isn't lost.

---

## 4. Environment / how to run

See [README.md](README.md) for full setup steps. Short version:
- `backend/`: venv already created; `backend/.env` already has real Mongo Atlas +
  Gemini credentials. `uvicorn main:app --reload --port 8000`.
- `frontend/`: `npm install` already run; `npm run dev` → `http://localhost:5173`.
- Real secrets live only in `backend/.env` / `frontend/.env` (gitignored) — never in
  `.env.example`.

---

## 5. Next up (not started)

- Run the one-time migration: sign up the real account (`nitin@example.com`),
  then `python scripts/backfill_legacy_user.py --email nitin@example.com` to
  reassign the 6 legacy expenses off the hardcoded `"nitin"` user_id. See §1a.
- AUTH_PLAN.md §9 Phase D hardening extras not yet done: security response
  headers (HSTS, `X-Content-Type-Options`), auth event logging. Rate limiting
  and Argon2id/JWT/refresh-rotation core are done.
- AUTH_PLAN.md §9 Phase F stretch (V2): email verification, password reset,
  TOTP 2FA, "remember me" — deferred, needs an email-sending provider.
- V2 features from PLAN.md §2 (budgets, recurring detection, export, NL Q&A over
  expenses) — no design work done yet, would need their own planning pass first.
