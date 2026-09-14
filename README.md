# Expense Tracker

Voice/text-driven personal expense tracker. See [PLAN.md](PLAN.md) for the full
architecture, data model, and build phases.

**Stack:** React + JavaScript (Vite, vanilla CSS) · FastAPI · MongoDB · Google Gemini API (`gemini-3.5-flash-lite`)

```
ExpenseTracker/
  frontend/     React + Vite app
  backend/      FastAPI app
  PLAN.md       Architecture & build plan
```

---

## Prerequisites

- Node.js 18+ and npm
- Python 3.11+
- A MongoDB connection (local `mongod`, or a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster)
- A [Google Gemini API key](https://aistudio.google.com/apikey)

---

## Setup

### 1. Frontend

```bash
cd frontend
npm install
cp .env.example .env
```

Edit `frontend/.env` and set:

```
VITE_API_BASE_URL=http://localhost:8000
```

Run the dev server:

```bash
npm run dev
```

Frontend will be available at `http://localhost:5173`.

### 2. Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
cp .env.example .env
```

Edit `backend/.env` and fill in your real values:

```
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster-url>/?retryWrites=true&w=majority
MONGODB_DB_NAME=expense_tracker
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-3.5-flash-lite
CORS_ORIGINS=http://localhost:5173
PORT=8000
JWT_SECRET_KEY=change-me-to-a-long-random-string
JWT_ACCESS_TOKEN_EXPIRES_MINUTES=15
JWT_REFRESH_TOKEN_EXPIRES_DAYS=30
COOKIE_SECURE=false
COOKIE_DOMAIN=localhost
```

Run the API:

```bash
uvicorn main:app --reload --port 8000
```

Backend will be available at `http://localhost:8000`.

---

## Accounts & auth

The app is multi-user (see [AUTH_PLAN.md](AUTH_PLAN.md)): sign up at `/signup` in the
frontend, or `POST /auth/signup {"email", "password"}`. Sessions use short-lived,
`httpOnly` cookies (never `localStorage`), with a rotating, revocable refresh token.

If you're migrating an existing database that still has expenses under the old
hardcoded `user_id: "nitin"`, sign up the real account first, then run:

```bash
cd backend
python scripts/backfill_legacy_user.py --email you@example.com
```

---

## Notes

- Never commit `.env` files — only `.env.example` (placeholders) is tracked in git.
- `MONGODB_URI` can point at a local MongoDB instance (`mongodb://localhost:27017`) or an Atlas cluster.
- See [PLAN.md](PLAN.md) §8 for the phased build order (skeleton → LLM parsing → voice input → analytics → budgets).
