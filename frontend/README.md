# Aegis ClaimAssist — Frontend (Next.js 16 + React 19 + Tailwind v4)

Enterprise auto-insurance claims adjudication portal for policyholders, field adjusters, and claims managers. Built on the Next.js App Router, backed by the FastAPI backend, and designed for regulated insurance workflows.

---

## Key Features

- **Three Dedicated Portals**:
  - **Client Portal** (`/`, `/client/submit`, `/client/ongoing`, `/history`): Incident reporting wizard with multi-point damage selection and evidence upload, real-time adjudication status tracking, and policyholder audit log.
  - **Agent Portal** (`/agent`, `/agent/ongoing`, `/agent/customers`): Queue management, claim verification, status transitions (`Submitted` → `Under Review` → `Agent-Verified` / `Action Required`), and customer policy ledger.
  - **Manager Portal** (`/manager`, `/manager/verified`, `/manager/revaluation`): Governance dashboard, final claim determination (`Approve` / `Reject`), statutory appeal revaluation (`Disputed` / `Revaluation`), and fraud review routing.
- **Enterprise Security & Auth**:
  - In-memory access token storage (never exposed in `localStorage` or `sessionStorage`).
  - Transparent silent token refresh on 401 via `httpOnly`, `SameSite=Strict` cookie.
  - Client-side route guards enforcing role permissions with automatic redirections.
- **ML Decision-Support Integration**:
  - Real-time XGBoost fraud-risk scoring via `/ml/predict`.
  - Feature impact analysis with SHAP direction indicators (+/-).
  - Sparse claim handling with explicit imputed features tracking.
  - Graceful "Model Offline" fallback maintaining operational continuity.
- **Audited Claim Workflow**:
  - Canonical status transitions adhering to backend state machine.
  - Comprehensive history ledger with search, filtering, and CSV export.

---

## Prerequisites & Architecture Note

> [!IMPORTANT]
> **Same-Site Localhost Requirement:**
> The frontend **must** run on `http://localhost:3000` and communicate with the backend at `http://localhost:8000`.
> Always use `localhost`, **never `127.0.0.1`**. This ensures the browser treats requests as same-site, allowing the `SameSite=Strict` `refresh_token` httpOnly cookie to be sent automatically with `credentials: "include"`.

---

## Setup & Running

### 1. Environment Configuration

Create or verify `.env.local` in `frontend/`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
```

### 2. Start the Backend Server

Ensure MySQL 8 is running and the database is seeded:

```bash
cd Backend
# Activate your python virtualenv if configured
uvicorn app.main:app --reload --host localhost --port 8000
```

Verify backend health at: [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health)

### 3. Start the Frontend Server

```bash
cd frontend
npm install
npm run dev
```

The application will be accessible at: [http://localhost:3000](http://localhost:3000)

### 4. Production Build

To verify production compilation:

```bash
cd frontend
npm run build
npm run start
```

---

## Accounts

There is no sample data. Accounts are created like this:

| Role | How the account is created |
|------|----------------------------|
| Manager | One permanent account, ensured by `python -m app.seed`. Email from `MANAGER_EMAIL` (default `manager@aegis.com`), password from `SEED_MANAGER_PASSWORD` in `Backend/.env`. |
| Agent | Created by the manager on **Agent Management** (`/manager/agents`), who can also grant/revoke access and assign claims. |
| Client | Self-registers on `/signup`, adding their vehicle (Two Wheeler / Four Wheeler / Cargo Truck → brand → model, or *Other*). |

Amounts are shown in Indian Rupees (₹, Indian digit grouping) and times in IST.

---

## End-to-End Workflow

1. **Submit Incident (Client)**:
   - Sign up as a client on `/signup` (adding your vehicle), or log in.
   - Navigate to **Claim Submission** (`/client/submit`).
   - Complete the 4-step wizard: Vehicle & Policy → Incident Details (IST) → Damage & Evidence (₹ estimate, photos) → Review & Submit.
   - Claim is created with status `Submitted` and assigned a tracking reference (e.g. `CLM-XXXXXX`).

2. **Adjudication & Verification (Agent)**:
   - Log in as an agent created by the manager on Agent Management.
   - Open **Ongoing Claims** (`/agent/ongoing`).
   - Begin review on the submitted claim (`Submitted` transitions to `Under Review`).
   - Inspect vehicle damage, inspect AI Risk Assessment (`/ml/predict`), and click **Verify Claim** (`Under Review` transitions to `Agent-Verified`).

3. **Approval & Settlement (Manager)**:
   - Log in as the manager.
   - Navigate to **Agent-Verified Claims** (`/manager/verified`).
   - Review agent notes and risk tier, then approve settlement with an audit note.
   - Status transitions to `Approved`.

4. **Appeals & Revaluation**:
   - If a claim is rejected, the policyholder can appeal the decision in **Claim History** (`/history`), transitioning the claim to `Disputed`.
   - The appeal appears immediately in the Manager's **Revaluation Management** queue (`/manager/revaluation`) for review.

---

## Project Structure

```
frontend/
├── app/
│   ├── agent/                 # Agent portal (dashboard, ongoing queue, customers)
│   ├── client/                # Client portal (submission wizard, ongoing tracking)
│   ├── manager/               # Manager portal (governance, verified approval, revaluation)
│   ├── components/            # Reusable enterprise UI (Header, Sidebar, RouteGuard, MLRiskAssessment)
│   ├── context/               # ClaimsContext (API-backed auth, session state, claims cache)
│   ├── history/               # Unified searchable claim ledger with CSV export & appeal modal
│   ├── login/                 # Email/password login (no demo shortcuts)
│   ├── signup/                # Client registration form
│   ├── services/              # api.ts (in-memory token client, auto-refresh) & types.ts
│   ├── globals.css            # Enterprise color tokens, typography, and base utility styles
│   └── page.tsx               # Client dashboard overview
├── scripts/
│   └── build-css.mjs          # Tailwind v4 pre-compilation script
├── public/                    # Static assets
└── package.json               # Next.js 16, React 19, Tailwind v4
```
