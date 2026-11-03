# Claims Management System — Design Document

**Date:** 2026-11-03
**Status:** Approved-for-planning (decisions locked below)

This document is the single source of truth for building a FastAPI + MySQL backend
and wiring it to the existing Next.js frontend. It records intent, the decisions
already made, and what is left to the builder. The original 18-section project brief
is the authoritative requirements list; this document resolves its ambiguities
against the *actual* contents of the repository.

---

## 1. Intent & Why

Turn an existing **mock-only** claims-processing UI into a real full-stack
application: a secure, role-based FastAPI/MySQL backend serving the existing
three-portal Next.js frontend (client / agent / manager), with the project's two
real ML models (XGBoost fraud-risk, MobileNetV2 vehicle-damage) integrated as
**decision support** — never automated denial. The notification system is removed;
only the visual bell icon stays.

Success = every item in brief §17 "Final Acceptance" is true and demonstrable.

## 2. Current-State Facts (verified by inspection)

- **Frontend:** Next.js 16.4.3 / React 19 / Tailwind v4 in `frontend/`. Newer Next.js
  than training data — consult `node_modules/next/dist/docs/` before writing Next code
  (per `frontend/AGENTS.md`).
- **All data is mock.** `app/context/ClaimsContext.tsx` holds state in `localStorage`,
  seeded from `app/lib/mockData.ts` (50 `ClaimRecord`s). "Login" pattern-matches the
  email string to a role; signup lets anyone self-select agent/manager.
- **`app/services/api.ts` exists but is imported by nothing.** It is dead scaffolding
  whose endpoints partly disagree with the brief. It will be rewritten to the real
  contract, not treated as a constraint.
- **`app/components/MLRiskAssessment.tsx`** renders fake SHAP bars computed in-browser.
- **ML models are real**, in `Backend/model/`:
  - `xgboost_fraud_model.json` + `preprocessing_pipeline.joblib` + `model_metadata.json`
    (30 input features; review threshold 0.3208; test ROC-AUC 0.756). Classic
    auto-insurance-fraud feature schema.
  - `vehicle_damage_classifier.keras` (MobileNetV2; **no label-metadata file** — the
    network's output shape/classes must be inspected at build time before wiring).
- **Toolchain present:** Python 3.13, xgboost 3.1.3, sklearn 1.6.1, tensorflow installed;
  **MySQL80 service RUNNING**. `mysql` CLI not on PATH (use SQLAlchemy/connector, not shell).
- **Status strings in use:** `Submitted`, `Under Review`, `Action Required`, `Info Needed`,
  `Agent-Verified`, `Fraud Review`, `Approved`, `Rejected`, `Disputed`, `Revaluation`.
- **ML component is rendered** in agent dashboard, agent/ongoing, history, manager/verified.

## 3. Locked Decisions

| # | Decision | Choice |
|---|----------|--------|
| D1 | XGBoost feature vector for sparse submitted claims | **Derive + impute.** Map available form fields, derive computed features (`claim_to_premium_ratio`, `state_mismatch`, `incident_month`, `incident_dayofweek`, `days_bind_to_incident`), impute the remainder from the preprocessing pipeline's training medians/modes. Response records `imputed_features[]` and lowers reported confidence accordingly. ML runs on every claim; honesty about imputation is mandatory. |
| D2 | Canonical claim status | **Keep existing UI names**, formalized into a backend enum + legal-transition map (see §6). No gratuitous relabeling of the frontend. |
| D3 | Agent/Manager account creation | **Seed script** creates demo staff (agent Samantha `ADJ-04`, manager Catherine Ross). **Manager-only `POST /users/staff`** endpoint mints further agents/managers. Public `POST /auth/register` is **client-only** (role forced server-side). |
| D4 | Token storage | **Access token in JS memory** (short TTL, ~15 min); **refresh token in httpOnly, SameSite=Strict cookie**; `POST /auth/refresh` rotates it; CSRF double-submit token on refresh/logout. No tokens in `localStorage`. |
| D5 | Notifications | Remove page `app/client/notifications/`, the sidebar "Notifications" nav entry, `notificationsApi`, fake header dropdown content, and mock notification data. **Keep the header bell icon** as a static, non-interactive visual element (no count, no dropdown, no API). No notifications table/service/records anywhere. |
| D6 | Image model | Run `vehicle_damage_classifier.keras` on uploaded **claim images** at upload time; store class + confidence in `ml_predictions`. Exact classes TBD by inspecting the `.keras` output layer — treated as a builder task, not an invented contract. |
| D7 | Policies/customers | Minimal real `policies` table seeded and linked to client users (coverage, deductible, premium — needed by the ML ratio and the submission UI). No speculative policy-admin UI beyond what the frontend already shows. |

## 4. Goals / Non-Goals / Anti-Goals

**Goals:** working FastAPI backend; MySQL via SQLAlchemy + Alembic; one JWT auth system
with RBAC enforced server-side; claim workflow with audited transitions; secure local
file upload/download; both ML models integrated as decision support; mock data removed
from production paths; professional UI polish via `frontend-design`; passing pytest suite;
security review; README.

**Non-Goals:** email/SMS delivery; payment disbursement; retraining or improving the ML
models; multi-tenant orgs; real VIN/policy external lookups; production deployment/infra.

**Anti-Goals (failure even if it "works"):** ML auto-rejecting claims; any role check
trusting frontend-supplied role/user-id/ownership; secrets committed or shipped to the
browser; a surviving notification system; inventing model outputs or claim business logic;
rebuilding the frontend framework or design system from scratch.

## 5. Architecture

Backend under `backend/` exactly as brief §3 lays out (routes → schemas → services →
models → database/core/dependencies). API versioned at `/api/v1`. Uvicorn + Swagger `/docs`.
Frontend keeps Next.js App Router; `services/api.ts` becomes the single real client;
`ClaimsContext` is refactored to call the API instead of localStorage/mock.

## 6. Claim Workflow (D2)

Statuses: `Submitted → Under Review → (Action Required ⇄ Under Review) → Agent-Verified
→ (Approved | Rejected | Disputed→Revaluation→(Approved|Rejected))`. `Fraud Review` is an
agent/manager-reachable side state from `Under Review`/`Agent-Verified`.

Transition authority (server-enforced, with ownership/assignment checks):
- **Client:** create (→Submitted); respond to Action Required (upload docs; →Under Review);
  file appeal on Rejected (→Disputed).
- **Agent:** Under Review → Agent-Verified | Action Required | Fraud Review (own assigned claims only).
- **Manager:** Agent-Verified → Approved | Rejected | Under Review(return); Disputed/Revaluation → Approved | Rejected.

Every transition writes `claim_status_history` (claim, from, to, actor, reason, timestamp)
and an `audit_logs` row. Illegal transitions → 409.

## 7. Data Model (MySQL, brief §4 minus notifications)

`users`(id, name, email unique, password_hash argon2id, role enum[client|agent|manager],
is_active, created_at), `policies`(policy_number, holder user_id, coverage, deductible,
annual_premium, state, status), `claims`(id, policy_id, client_id, assigned_agent_id,
incident/vehicle/amount fields mirroring `ClaimRecord`, status, created/updated),
`claim_documents`(id, claim_id, uploader_id, stored_filename, original_name, mime, size,
kind[image|document], sha256), `claim_status_history`, `audit_logs`,
`ml_predictions`(id, claim_id, model[xgboost|mobilenet], model_version, score/label,
confidence, explanation_json, imputed_features_json, created_at), `refresh_tokens`
(id, user_id, token_hash, expires_at, revoked). **No notifications table.**

## 8. Security (brief §5, §15)

Argon2id (argon2-cffi); JWT access (memory) + rotating refresh (httpOnly cookie, D4);
login rate limiting; RBAC dependency guards; ownership/assignment verified in services;
upload validation (extension + MIME sniff + size cap + random stored name + path-traversal
guard + per-claim access check on download); parameterized SQLAlchemy only; strict CORS to
the Next.js origin; `.env` never committed (`.gitignore`); safe error messages; dependency
check. A `security-review` pass precedes completion.

## 9. ML Integration (brief §8, D1/D6)

`ml_service.py` loads models lazily, degrades gracefully when a model/file is missing
(`model_status: OFFLINE`, never a crash). XGBoost → probability, tier, review-threshold flag,
SHAP contributions (if `shap` available; else top feature weights, labeled as such),
`imputed_features`. MobileNet → class + confidence on claim images. Predictions persisted;
`POST /ml/predict` and `GET /ml/predictions/{id}` expose them. Statutory "advisory only"
disclaimer preserved in UI. Models are **never** combined into one verdict.

## 10. Frontend Integration & Design (brief §12–14)

Rewrite `services/api.ts` to the real `/api/v1` contract; refactor `ClaimsContext` to
API-backed state with refresh-after-mutation; remove mock from production paths (keep only
for isolated tests). Real auth (client register, all-role login, logout, silent refresh,
route guards for UX with server as source of truth, role-based redirects). Wire the ML
component to real predictions with loading/empty/error/offline states. Apply
`frontend-design` skill for enterprise polish — improve, don't replace; no new design system.

## 11. Testing & Acceptance (brief §11, §17)

pytest covers auth, RBAC, claim CRUD + transitions, ownership enforcement, upload/download
security, ML service with models present/absent, and absence of any notification surface.
Backend is proven working (Swagger, MySQL connect, migrations, all seed logins, JWT, RBAC,
claim lifecycle, secure files, ML) **before** frontend integration. Full-stack smoke test
and README close out.

## 12. Execution Order

Follow brief §16 phases 1–14 in order; backend fully verified before any frontend redesign.
After each phase: list files changed, what was implemented, tests run + results, remaining
issues, go/no-go for next phase.

## 13. Left to the Builder

- Inspect `vehicle_damage_classifier.keras` output layer to fix D6 class labels.
- Confirm `preprocessing_pipeline.joblib` exposes the medians/modes needed for D1 imputation
  (else compute from metadata / a shipped stats file).
- Map each `ClaimRecord` field to a `claims` column and to XGBoost features; document the map.
- Choose rate-limit + CSRF libraries compatible with FastAPI.
- Read the new-Next.js docs before writing frontend code.
