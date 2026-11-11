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
  `Fraud Review` as a side state. Every transition is validated server-side, recorded in
  `claim_status_history`, and written to `audit_logs`; illegal transitions return `409`.
- **Secure documents** — uploads validated by extension **and** sniffed MIME type, size-capped,
  stored under random server-generated names, and downloads are access-checked per claim.
- **ML decision support (advisory only)** —
  - **XGBoost fraud-risk** (primary): returns a 0–100 score, risk tier, SHAP feature
    contributions, and an honest list of features the pipeline had to impute. A high score
    **never** auto-rejects a claim.
  - **MobileNetV2 damage classifier**: classifies a vehicle photo as `damaged` / `whole`
    (requires Keras 3.13; see [why it wasn't running](#why-the-mobilenetv2-model-was-not-running-and-how-it-was-fixed)).
    Degrades to `OFFLINE` if unavailable; the fraud model is unaffected.
- **No notification system** by design — no table, model, service, route, or records. The
  frontend keeps a purely visual bell icon only.

---

## Tech stack

**Backend:** Python 3.13 · FastAPI · SQLAlchemy 2 · Alembic · Pydantic v2 · MySQL 8 (PyMySQL) ·
argon2-cffi · python-jose · slowapi · xgboost · scikit-learn · tensorflow/keras 3.13 · shap · pytest.

**Frontend:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4.

---

## Repository layout

```
claim processing/
├── Backend/            FastAPI app, models, services, Alembic migrations, ML, tests
│   ├── app/            api/ · core/ · database/ · models/ · schemas/ · services/ · dependencies/
│   └── model/          shipped ML artifacts (xgboost, preprocessing pipeline, keras)
├── frontend/           Next.js portal (client / agent / manager)
│   ├── app/            pages, components, context, services/api.ts
│   └── README.md       frontend setup & architecture
└── docs/superpowers/   design spec and implementation plans
```

---

## Quick start

### Prerequisites

- **Python 3.11+** (developed on 3.13) and **Node 18+**
- A running local **MySQL 8** server with a `root` login
- The ML model files already present in `Backend/model/`:
  `xgboost_fraud_model.json`, `preprocessing_pipeline.joblib`, `model_metadata.json`,
  `vehicle_damage_classifier.keras`

Use `localhost` (not `127.0.0.1`) for both services so the `SameSite=Strict` refresh cookie is
sent.

### 1. Backend
```bash
cd Backend
python -m venv .venv && . .venv/Scripts/activate   # optional; system Python works too
pip install -r requirements.txt
cp .env.example .env          # set DB_PASSWORD to your MySQL root password + a strong JWT_SECRET
# create the database (one time):
python -c "import pymysql; from app.core.config import get_settings as g; s=g(); c=pymysql.connect(host=s.db_host,port=s.db_port,user=s.db_user,password=s.db_password); c.cursor().execute('CREATE DATABASE IF NOT EXISTS claims_database CHARACTER SET utf8mb4'); c.commit()"
python -m alembic upgrade head   # create all tables
python -m app.seed               # ensure the permanent manager account (no sample data)
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

---

## ML decision support (advisory only)

ML output never changes a claim's status; it only informs the human adjuster.

- **XGBoost fraud-risk** is the primary model. A submitted claim supplies a subset of the
  model's 30 features; the shipped preprocessing pipeline imputes the rest (median/mode),
  and the response lists exactly which features were imputed. A high score **never**
  auto-rejects a claim — it only flags for human review.
- **MobileNetV2 damage classifier** (`Backend/model/vehicle_damage_classifier.keras`):
  classifies a vehicle photo as `damaged` / `whole` and returns `label`, `confidence` and
  `damage_probability`. If the model or image can't be used it returns
  `model_status: "OFFLINE"`, and fraud-risk scoring keeps working regardless.

### Why the MobileNetV2 model was not running (and how it was fixed)

The model was trained with transfer learning: pretrained MobileNetV2 (ImageNet), 224×224
input with flip/rotation/zoom augmentation, frozen base, then
GlobalAveragePooling → Dropout → Dense(1, sigmoid), Adam + binary cross-entropy + early
stopping, saved as `.keras`. The model file itself was fine. Two bugs in the backend
stopped it from working:

**1. Keras version mismatch: the model could not be loaded.**

The `.keras` file was saved with **Keras 3.13.2** (see `metadata.json` inside the archive).
Keras 3.13 writes an extra `quantization_config` field into every `Dense` layer. The
backend had **Keras 3.12.0**, which doesn't know that field, so `load_model` failed with:

```
TypeError: Unrecognized keyword arguments passed to Dense: {'quantization_config': None}
```

The service caught the exception silently and reported `OFFLINE`. (Earlier notes blamed an
"empty Functional config". That was a misreading of the nested error message. The real
cause is the last line of the traceback.)

*Fix:* install the same Keras version the model was saved with.
`Backend/requirements.txt` now pins `keras>=3.13.2,<3.14`:

```bash
pip install "keras==3.13.2"
```

Load failures are now logged (`logger.exception`) instead of hidden.

**2. Images were normalised twice: predictions were meaningless.**

The saved model already contains MobileNetV2's preprocessing step (`x / 127.5 - 1`, stored
as `TrueDivide` and `Subtract` layers). The service also divided pixels by 255 *before*
calling the model, so every image arrived squashed into roughly `[-1.0, -0.99]` and the
model saw almost the same input for every photo.

*Fix:* pass **raw 0–255 pixels** to the model. Do not rescale before `predict`.

**Other improvements:** the model is loaded once and cached instead of reloaded per
request, and tests check that it loads, gets raw pixels, and degrades to `OFFLINE` on a
missing model or unreadable image.

**Check yourself:**

```bash
cd Backend
python -c "import keras; m = keras.models.load_model('model/vehicle_damage_classifier.keras', compile=False); print(keras.__version__, m.input_shape, m.output_shape)"
# expected: 3.13.2 (None, 224, 224, 3) (None, 1)
pytest tests/test_ml.py
```

**Open item: label direction.** `image_dataset_from_directory` numbers class folders
alphabetically, and the sigmoid outputs the probability of class 1. With folders
`00-damage` / `01-whole` (or `damaged` / `whole`), the output means **"whole"**, not
"damaged". Set `_SIGMOID_POSITIVE_LABEL` in `Backend/app/services/ml_service.py` to match
your training folders. It currently assumes `"damaged"`, which hasn't been checked against
the training data yet.

**If you retrain:** save with the same Keras version the backend runs (or update the pin to
match), and keep the preprocessing inside the model so the service can keep sending raw
pixels.

---

## Tests

```bash
cd Backend && pytest        # auth, RBAC, claim workflow, vehicles, uploads, ML, security
```
The suite runs against an auto-created, empty `claims_database_test` schema and rolls back
after each test, so it never touches your real `claims_database`.

---

## Security notes

- Secrets live only in git-ignored `.env` / `.env.local`; never commit them. `.env.example`
  documents the required variables.
- Passwords are hashed with Argon2id. Access tokens are short-lived JWTs kept in memory on the
  client (never `localStorage`); refresh tokens are httpOnly, `SameSite=Strict` cookies,
  rotated on every refresh.
- Authorization, claim ownership/assignment, and status-transition rules are enforced by the
  backend; frontend route guards are for UX only.
- Uploads are validated by extension **and** sniffed MIME type, size-capped at 25 MB, stored
  under server-generated random names, and downloads are access-checked.

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
- **Image classifier returns `model_status: "OFFLINE"`** — usually a Keras version mismatch.
  The model was saved with Keras 3.13.2; Keras ≤ 3.12 fails with
  `Unrecognized keyword arguments passed to Dense: {'quantization_config': None}`. Fix:
  `pip install "keras==3.13.2"`. Also don't divide pixels by 255 before `predict`: the model
  already applies MobileNetV2's `x/127.5 - 1` internally. See
  [the full explanation](#why-the-mobilenetv2-model-was-not-running-and-how-it-was-fixed).
