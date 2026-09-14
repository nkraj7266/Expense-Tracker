# Voice/Text Expense Tracker — Architecture & Build Plan

## 1. Goal

A personal expense tracker where you log spending by **typing or speaking a natural
sentence** ("Paid 450 for groceries at DMart today", "Uber to office 180 rupees"),
an LLM parses it into structured data, and the app stores/aggregates it for
daily/weekly/monthly analysis and evaluation (budgets, trends, category breakdowns).

Single-user (you) to start — architecture should not block adding auth/multi-user later.

---

## 2. Core Features

### MVP
- **Quick capture**: text input box + mic button (voice) on the home screen, always one tap away.
- **Voice → text**: browser speech-to-text (Web Speech API) or server-side (Whisper) if you want it to work reliably across devices/accents.
- **Text → structured expense**: LLM call extracts `amount, currency, category, merchant, date, payment_method, notes, tags`.
- **Confirm/edit screen**: show parsed result before saving — LLM will sometimes misparse amount/category, you need a fast correction step, not silent trust.
- **Expense list**: chronological feed, grouped by day, editable/deletable.
- **Dashboards**: daily total, monthly total, category-wise pie/bar, spend-over-time line chart.
- **Search/filter**: by date range, category, merchant, amount range.

### V2
- Budgets per category with alerts ("You've spent 90% of your Food budget this month").
- Recurring expense detection (rent, subscriptions).
- Multi-currency support.
- Export (CSV/PDF) for a month.
- "Ask a question" chat over your expenses ("How much did I spend on eating out last month vs this month?") — LLM + query layer over MongoDB.
- Receipt photo → OCR → LLM structuring (parallel input modality to voice/text).

### V3 / stretch
- Bank/SMS statement import + reconciliation.
- Mobile app (React Native) reusing the same API.
- Multi-user/household sharing.

---

## 3. High-Level Architecture

```mermaid
flowchart LR
    subgraph Client["React Frontend"]
        UI[Capture UI\ntext + mic]
        Dash[Dashboard/Analytics]
        List[Expense List/Edit]
    end

    subgraph API["FastAPI Backend"]
        Ingest["/expenses/parse\n(NLP endpoint)"]
        CRUD["/expenses\nCRUD"]
        Analytics["/analytics\naggregation endpoints"]
        Auth["/auth (later)"]
    end

    subgraph External
        STT[Speech-to-Text\n(Web Speech API or Whisper)]
        LLM[LLM Provider\n(Gemini API - 2.5 Flash-Lite)]
    end

    DB[(MongoDB)]

    UI -- voice --> STT --> UI
    UI -- raw text --> Ingest
    Ingest -- prompt --> LLM
    LLM -- structured JSON --> Ingest
    Ingest -- validated doc --> DB
    CRUD <--> DB
    Analytics -- aggregation pipeline --> DB
    List --> CRUD
    Dash --> Analytics
```

**Flow for a single entry:**
1. User speaks or types: *"Spent 320 on lunch with team at Barbeque Nation, paid by credit card"*.
2. Frontend gets raw text (speech-to-text runs client-side, or audio is sent to backend for transcription).
3. Frontend calls `POST /expenses/parse` with raw text.
4. Backend sends the text to the LLM with a strict JSON-schema prompt.
5. Backend validates the LLM's JSON output (Pydantic model) — reject/repair if malformed.
6. Backend returns the structured draft to the frontend (not yet saved).
7. User reviews/edits in a confirm modal → `POST /expenses` saves the final doc to MongoDB.
8. Analytics endpoints later aggregate over these documents.

Keeping step 6/7 separate from save is the key design choice: **never auto-save an
LLM's raw output** — always show a cheap confirm step, since amount/category errors
are the most consequential kind of mistake in an expense tracker.

---

## 4. Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | React + JavaScript, Vite | Recharts or Chart.js for graphs |
| Styling | Vanilla CSS (plain `.css` files, no framework) | can revisit (Tailwind/CSS modules) later if it gets unwieldy |
| Voice input | Web Speech API (browser) first; Whisper API as fallback/better-accuracy option | Avoids server audio handling in MVP |
| Backend | Python FastAPI | async, Pydantic validation built in |
| LLM | Google Gemini API (`gemini-2.5-flash-lite`) | structured output via `response_schema` / JSON mode; fast + cheap, well-suited to this single-shot extraction task |
| Database | MongoDB (Atlas or local) | flexible schema suits free-text `notes`/`tags`, easy aggregation pipelines for analytics |
| Auth (later) | JWT via FastAPI, or a magic-link flow | not needed for single-user MVP; stub it in from day 1 as a `user_id` field so migration is trivial |
| Hosting | Backend: Render/Fly.io/local Docker; Frontend: Vercel/Netlify; DB: MongoDB Atlas free tier | pick based on your budget/comfort |

---

## 5. Data Model (MongoDB)

### `expenses` collection
```jsonc
{
  "_id": ObjectId,
  "user_id": "nitin",              // hardcoded/single value until multi-user auth exists
  "raw_input": "Spent 320 on lunch with team at Barbeque Nation, paid by credit card",
  "amount": 320.0,
  "currency": "INR",
  "category": "Food & Dining",
  "subcategory": "Restaurant",
  "merchant": "Barbeque Nation",
  "payment_method": "Credit Card",
  "date": ISODate("2026-09-13"),
  "tags": ["team lunch"],
  "notes": null,
  "source": "voice",               // "voice" | "text" | "receipt" (future)
  "llm_model": "gemini-2.5-flash-lite",
  "llm_confidence": 0.92,          // optional, if you ask the model to self-rate
  "created_at": ISODate(...),
  "updated_at": ISODate(...)
}
```

### `categories` collection (seeded, user-editable)
```jsonc
{ "_id": ObjectId, "name": "Food & Dining", "icon": "utensils", "color": "#F59E0B" }
```

### `budgets` collection (V2)
```jsonc
{ "_id": ObjectId, "user_id": "nitin", "category": "Food & Dining", "month": "2026-09", "limit": 8000 }
```

### Indexes
- `expenses`: compound index on `(user_id, date)` for range queries; index on `category`; text index on `merchant`/`notes` for search.

---

## 6. Backend API (FastAPI)

| Endpoint | Method | Purpose |
|---|---|---|
| `/expenses/parse` | POST | Takes `{ text: string }`, calls LLM, returns structured draft (not persisted) |
| `/expenses` | POST | Persist a confirmed/edited expense |
| `/expenses` | GET | List with filters: `?from=&to=&category=&q=` |
| `/expenses/{id}` | GET/PATCH/DELETE | Single expense CRUD |
| `/analytics/summary` | GET | `?period=daily\|weekly\|monthly&date=` → totals, category breakdown |
| `/analytics/trend` | GET | `?from=&to=&group_by=day\|week\|month` → time series for charts |
| `/categories` | GET/POST | Manage categories |
| `/transcribe` | POST | (optional) audio blob → text, if not doing STT client-side |

### LLM Extraction Prompt Design
- Use the Gemini API's structured output mode (`generation_config.response_schema` / `response_mime_type: application/json`) so the model is constrained to emit a fixed JSON shape, not free-form prose.
- Required fields: `amount`, `category` (from a fixed enum you seed, plus "Other"), `date` (default to today if not mentioned), `merchant`, `payment_method`, `notes`.
- Always resolve relative dates ("yesterday", "last Friday") server-side using the request timestamp, not left to the model to guess "today".
- Validate the LLM response against a Pydantic model; if it fails, retry once with an error message appended, then fall back to a manual-entry form.
- 2.5 Flash-Lite is optimized for low latency/cost on exactly this kind of short single-shot extraction task, but it's a smaller model — keep the prompt tight and explicit (fixed category enum, explicit field types, one worked example) rather than relying on it to infer intent from a loose instruction.

---

## 7. Frontend Structure (React)

```
src/
  components/
    CaptureBar/        # text input + mic button, shared on every page
      CaptureBar.jsx
      CaptureBar.css
    ConfirmExpenseModal/
    ExpenseList/
    ExpenseCard/
    Charts/
      CategoryBreakdown.jsx
      SpendTrend.jsx
      MonthlySummaryCard.jsx
  pages/
    Home.jsx            # capture + today's expenses
    Dashboard.jsx        # analytics
    History.jsx          # full searchable list
  hooks/
    useSpeechToText.js
    useExpenses.js        # data fetching
  api/
    client.js             # fetch wrapper
    expenses.js
    analytics.js
  styles/
    variables.css         # shared colors/spacing as CSS custom properties
    global.css
```

- Plain JavaScript (`.jsx`), no TypeScript for now — can migrate later if the codebase grows enough to want type safety.
- Styling is plain CSS per component (colocated `Component.css` imported into `Component.jsx`), plus a small shared `styles/variables.css` for colors/spacing so things stay consistent without a framework.
- **CaptureBar** is the centerpiece — persistent, minimal friction, works from any page.
- Speech-to-text: `window.SpeechRecognition` for MVP (free, no server round-trip); swap to Whisper later if accuracy on your accent/environment is a problem.

---

## 8. Build Phases

**Phase 1 — Skeleton**
- FastAPI project with MongoDB connection (Motor async driver), basic `/expenses` CRUD, no LLM yet.
- React app scaffold with a form (no voice yet) to add an expense manually, list view.

**Phase 2 — LLM parsing**
- Add `/expenses/parse`, Gemini API integration (`gemini-2.5-flash-lite`), Pydantic validation, confirm-before-save UI flow.
- Text input fully working end-to-end: type → parse → confirm → save.

**Phase 3 — Voice input**
- Add mic button using Web Speech API, feeds into the same `/expenses/parse` flow.

**Phase 4 — Analytics**
- Aggregation pipeline endpoints, dashboard charts (daily/weekly/monthly, category breakdown, trend line).

**Phase 5 — Polish/V2**
- Budgets, recurring detection, export, natural-language Q&A over expenses.

---

## 9. Key Design Decisions Worth Locking In Early

- **Always show a confirm/edit step after LLM parsing** — never silently trust extracted amounts/categories.
- **Store `raw_input` alongside structured fields** — lets you re-parse later with a better prompt/model without losing the original data.
- **Fixed category enum + "Other"** rather than free-form categories from the LLM — keeps analytics/aggregation clean; let user add new categories explicitly through the UI, not implicitly through parsing.
- **Resolve dates/times server-side**, not by the LLM guessing "today" — pass current date into the prompt context or post-process relative dates.
- **Design `user_id` into every document from day one**, even single-user — makes multi-user support additive later instead of a migration.

---

## 10. Repo Layout & Environment Config

```
ExpenseTracker/
  PLAN.md
  README.md
  .gitignore
  frontend/            # React + Vite (JavaScript, vanilla CSS)
    .env.example        # VITE_API_BASE_URL
  backend/             # FastAPI
    requirements.txt
    .env.example         # MONGODB_URI, GEMINI_API_KEY, etc.
```

- Real secrets go in `frontend/.env` and `backend/.env` (both gitignored) — never in `.env.example`, which only holds placeholder values as a template.
- See `README.md` for setup steps.

---

## 11. Open Questions to Decide Before Building

- Local MongoDB vs Atlas (free tier is fine for personal use, and gives you access from phone/laptop both).
- Whisper (server-side, costs per call, more accurate) vs Web Speech API (free, browser-only, quality varies) for voice.
- Gemini 2.5 Flash-Lite has a generous free tier and low latency, good fit for this MVP; if parsing accuracy on messy/ambiguous inputs (mixed languages, sloppy phrasing) turns out weak, the fallback is `gemini-2.5-flash` (same API/schema, just swap the model string) rather than changing providers.
