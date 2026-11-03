# Aegis ClaimAssist — Backend (FastAPI + MySQL)

Secure, role-based auto-insurance claims-processing API for the Aegis ClaimAssist
Next.js frontend. Three roles (client / agent / manager), JWT auth with rotating
refresh tokens, an audited claim workflow, secure local document storage, and two
decision-support ML models (XGBoost fraud-risk + MobileNetV2 damage classifier).

## Tech stack

FastAPI · SQLAlchemy 2 · Alembic · Pydantic v2 · MySQL 8 (PyMySQL) ·
Argon2id (argon2-cffi) · python-jose (JWT) · slowapi · xgboost · scikit-learn ·
tensorflow/keras · shap · pytest.

## Prerequisites

- Python 3.11+ (developed on 3.13)
- A running local MySQL 8 server with a `root` login
- The ML model files already present in `Backend/model/`:
  `xgboost_fraud_model.json`, `preprocessing_pipeline.joblib`, `model_metadata.json`,
  `vehicle_damage_classifier.keras`

## Setup

```bash
cd Backend
python -m venv .venv && . .venv/Scripts/activate   # optional; system Python works too
pip install -r requirements.txt

cp .env.example .env            # then set DB_PASSWORD and a strong JWT_SECRET
```

Create the database (once), run migrations, and create the manager account:

```bash
# create the schema's database if it doesn't exist:
python -c "import pymysql,os; from app.core.config import get_settings as g; s=g(); \
c=pymysql.connect(host=s.db_host,port=s.db_port,user=s.db_user,password=s.db_password); \
c.cursor().execute('CREATE DATABASE IF NOT EXISTS %s CHARACTER SET utf8mb4' % s.db_name); c.commit()"

alembic upgrade head            # create all tables
python -m app.seed              # ensure the permanent manager account (no sample data)
```

Run the API:

```bash
uvicorn app.main:app --reload   # http://127.0.0.1:8000
```

- Swagger UI: http://127.0.0.1:8000/docs
- Health check: http://127.0.0.1:8000/api/v1/health

## Accounts

There is no sample data. Accounts are created like this:

| Role | How the account is created |
|------|----------------------------|
| Manager | One permanent account, ensured by `python -m app.seed`. Email from `MANAGER_EMAIL` (default `manager@aegis.com`), password from `SEED_MANAGER_PASSWORD` in `Backend/.env`. |
| Agent | Created by the manager on **Agent Management** (`/manager/agents`), who can also grant/revoke access and assign claims. |
| Client | Self-registers on `/signup`, adding their vehicle (Two Wheeler / Four Wheeler / Cargo Truck → brand → model, or *Other*). |

Amounts are shown in Indian Rupees (₹, Indian digit grouping) and times in IST.

## Tests

```bash
pytest
```

Tests run against an auto-created, initially-empty `claims_database_test` schema and
roll back after every test, so they never touch your real `claims_database`.

## API overview (`/api/v1`)

- **auth**: `POST /auth/register` (client only), `POST /auth/login`, `POST /auth/refresh`,
  `POST /auth/logout`, `GET /auth/me`
- **users**: `GET/PUT /users/me`, `GET /users` (manager), `GET /users/{id}`,
  `POST /users/staff` (manager creates agent/manager)
- **policies**: `GET /policies`, `GET /policies/{policy_number}`
- **claims**: `POST /claims` (client), `GET /claims` (role-scoped), `GET /claims/{id}`,
  `PUT /claims/{id}` (audited status change), `GET /claims/{id}/history`
- **agent**: `GET /agent/dashboard`, `GET /agent/assigned-claims`,
  `POST /agent/claims/{id}/verify`, `POST /agent/claims/{id}/request-information`
- **manager**: `GET /manager/dashboard`, `GET /manager/pending-claims`,
  `POST /manager/claims/{id}/approve|reject|revaluation`
- **dashboard**: `GET /dashboard/summary` (role-aware)
- **documents**: `POST /documents/upload`, `GET /documents/{id}`, `DELETE /documents/{id}`
- **ml**: `POST /ml/predict`, `GET /ml/predictions/{id}`

## Security notes

- Passwords hashed with Argon2id; access tokens are short-lived JWTs returned in the
  response body; refresh tokens are stored as httpOnly, `SameSite=Strict` cookies and
  rotated on every refresh. RBAC and claim ownership/assignment are enforced server-side.
- Uploads are validated by extension **and** sniffed MIME type, size-capped at 25 MB,
  stored under server-generated random names, and downloads are access-checked.
- `.env` holds all secrets and is git-ignored. Never commit it.

## Claim workflow

`Submitted → Under Review → (Action Required ⇄ Under Review) → Agent-Verified →
(Approved | Rejected | Revaluation)`, with `Fraud Review` as an agent/manager side state
and `Disputed` reachable by a client appealing a rejection. Illegal transitions return 409;
every transition is recorded in `claim_status_history` and `audit_logs`.

## ML decision support (advisory only)

- **XGBoost fraud-risk** is the primary model. A submitted claim supplies a subset of the
  model's 30 features; the shipped preprocessing pipeline imputes the rest (median/mode),
  and the response lists exactly which features were imputed. A high score **never** auto-
  rejects a claim — it only flags for human review.
- **MobileNetV2 damage classifier**: the shipped `vehicle_damage_classifier.keras` file
  cannot be deserialized under keras 3.x / tf 2.x in this environment (its saved Functional
  config is empty). The service therefore reports `model_status: "OFFLINE"` for image
  classification and continues to serve fraud-risk scoring normally. Re-saving the model in
  a compatible environment would re-enable the image path with no API change.

## Notifications

This system has **no** notification feature by design — no table, model, service, route,
or records. The frontend keeps a purely visual bell icon only.
