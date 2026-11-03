# Aegis ClaimAssist — Claims Management System

A full-stack auto-insurance claims platform: a **FastAPI + MySQL** backend and an existing
**Next.js** frontend, with role-based access for **clients, agents, and managers**, an audited
claim workflow, secure document handling, and two ML models used strictly as decision support.

> Built as two coordinated phases — a tested backend first, then the frontend wired to it.
> Design and plans live under [`docs/superpowers/`](docs/superpowers).

---

## Features

- **Three roles, one auth system** — client (self-registers), agent, manager (provisioned).
  JWT access tokens + rotating refresh tokens (httpOnly cookie), Argon2id password hashing,
  login rate limiting, and server-enforced RBAC + claim ownership.
- **Claim workflow** — `Submitted → Under Review → (Action Required ⇄ Under Review) →
  Agent-Verified → (Approved | Rejected | Revaluation)`, with `Disputed` for client appeals and
  `Fraud Review` as a side state. Every transition is validated server-side, recorded in claim
  history, and written to an audit log; illegal transitions return `409`.
- **Secure documents** — uploads validated by extension **and** sniffed MIME type, size-capped,
  stored under random server-generated names, and downloads are access-checked per claim.
- **ML decision support (advisory only)** —
  - **XGBoost fraud-risk** (primary): returns a 0–100 score, risk tier, SHAP feature
    contributions, and an honest list of features the pipeline had to impute. A high score
    **never** auto-rejects a claim.
  - **MobileNetV2 damage classifier**: degrades to `OFFLINE` in this TF/Keras version (the
    shipped `.keras` file can't be deserialized); the fraud model is unaffected.
- **No notification system** by design — the frontend keeps a purely visual bell icon only.

---

## Tech stack

**Backend:** Python 3.13 · FastAPI · SQLAlchemy 2 · Alembic · Pydantic v2 · MySQL 8 (PyMySQL) ·
argon2-cffi · python-jose · slowapi · xgboost · scikit-learn · tensorflow/keras · shap · pytest.

**Frontend:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4.

---

## Repository layout

```
claim processing/
├── Backend/            FastAPI app, models, services, Alembic migrations, ML, tests
│   ├── app/            api/ · core/ · database/ · models/ · schemas/ · services/ · dependencies/
│   ├── model/          shipped ML artifacts (xgboost, preprocessing pipeline, keras)
│   └── README.md       backend setup & API reference
├── frontend/           Next.js portal (client / agent / manager)
│   ├── app/            pages, components, context, services/api.ts
│   └── README.md       frontend setup & architecture
└── docs/superpowers/   design spec and implementation plans
```

---

## Quick start

Requires a local **MySQL 8** server and **Node 18+**. Use `localhost` (not `127.0.0.1`) for
both services so the `SameSite=Strict` refresh cookie is sent.

### 1. Backend
```bash
cd Backend
pip install -r requirements.txt
cp .env.example .env          # set DB_PASSWORD to your MySQL root password + a JWT_SECRET
# create the database (one time):
python -c "import pymysql; from app.core.config import get_settings as g; s=g(); c=pymysql.connect(host=s.db_host,port=s.db_port,user=s.db_user,password=s.db_password); c.cursor().execute('CREATE DATABASE IF NOT EXISTS claims_database CHARACTER SET utf8mb4'); c.commit()"
python -m alembic upgrade head
python -m app.seed
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```
Swagger: http://localhost:8000/docs · Health: http://localhost:8000/api/v1/health

### 2. Frontend
```bash
cd frontend
npm install
npm run dev                   # http://localhost:3000
```

### 3. Accounts
There is no sample data. Accounts are created like this:

| Role | How the account is created |
|------|----------------------------|
| Manager | One permanent account, ensured by `python -m app.seed`. Email from `MANAGER_EMAIL` (default `manager@aegis.com`), password from `SEED_MANAGER_PASSWORD` in `Backend/.env`. |
| Agent | Created by the manager on **Agent Management** (`/manager/agents`), who can also grant/revoke access and assign claims. |
| Client | Self-registers on `/signup`, adding their vehicle (Two Wheeler / Four Wheeler / Cargo Truck → brand → model, or *Other*). |

Amounts are shown in Indian Rupees (₹, Indian digit grouping) and times in IST.

---

## Tests

```bash
cd Backend && pytest        # auth, RBAC, claim workflow, vehicles, uploads, ML, security
```
The suite runs against an auto-created, empty `claims_database_test` schema and rolls back
after each test, so it never touches your real database.

---

## Security notes

- Secrets live only in git-ignored `.env` / `.env.local`; never commit them. `.env.example`
  documents the required variables.
- Authorization, claim ownership, and status-transition rules are enforced by the backend;
  frontend route guards are for UX only.
- Access tokens are kept in memory on the client (never `localStorage`); the refresh token is an
  httpOnly cookie.

---

## Troubleshooting

- **`WinError 10048` / "address already in use"** on port 8000 — a previous server is still
  running. Free it:
  ```powershell
  Get-NetTCPConnection -LocalPort 8000 -State Listen | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
  ```
- **Backend can't connect to MySQL** — confirm the MySQL service is running and that
  `DB_PASSWORD` in `Backend/.env` matches your MySQL `root` password.
- **Login/session doesn't persist** — make sure you're using `localhost` (not `127.0.0.1`) for
  both the frontend and the API base URL.
