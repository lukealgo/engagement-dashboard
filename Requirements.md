# Algo Evolved Workers Dashboard — Product & Technical Requirements

**Owner:** Luke
**Hosting target:** Single‑page app (SPA) + small backend on DigitalOcean
**Primary data sources:** Monthly CSV upload **and** Slack `admin.analytics.getFile` API (automated)

---

## 1) Purpose & Scope

Build a lightweight analytics product that turns monthly Slack analytics exports (and automated Slack API pulls) into an interactive, single‑page dashboard. The dashboard should explain:

* **What happened** (status & trends)
* **Why it happened** (drivers & mixes)
* **What to do next** (signals & deltas)
* **What will happen** (momentum/coverage signals)

**Out of scope (v1):** user‑level drilldown, per‑channel deep‑dive, push notifications, auth beyond basic app secret on the backend.

---

## 2) Users & Use Cases

* **Ops/Community manager:** upload/auto‑pull the latest month, check DAU/WAU/MAU, posters, public vs private vs shared, and act on drops.
* **Leadership:** month‑over‑month comparison at a glance (KPI strip + deltas + funnel).
* **Analyst:** export aggregated CSV for deeper analysis.

---

## 3) High‑Level Architecture

**Frontend (SPA):**

* Static **single file** `index.html` served from any static host/CDN.
* Tech: TailwindCSS (CDN), Day.js (+utc, isoWeek), Chart.js, Papa Parse, Dexie (IndexedDB).
* Features: multi‑file CSV upload, in‑browser aggregation, date/granularity controls, dataset toggles, exports, dark mode.

**Backend (API on DigitalOcean):**

* Minimal Node/JS service (Express or serverless framework) with two endpoints:

  * `POST /api/slack-analytics/fetch` — pulls Slack analytics for a date range, aggregates to dashboard schema, returns JSON (and optionally writes monthly CSV snapshots).
  * `GET /api/slack-analytics/latest?window=<days>` — returns most recent N days aggregated.
* Holds **Slack user token** (env var) with `admin.analytics:read`. No tokens in the browser.
* Optional cron (systemd/Cron/DO App Platform) to fetch daily at 06:00 UTC.

**Storage (optional):** object storage for raw gzip NDJSON archives and monthly snapshots.

**Security:**

* Backend protected with Basic Auth header or shared secret (env), IP allow‑list optional.
* Do not expose Slack token; rotate quarterly.

---

## 4) Data Sources & Caveats

### 4.1 CSV Upload (manual)

* Exact columns as provided by Slack’s export (see schema below). Consider these the **source of truth** for 4‑way message/view mix: **Public / Private / Shared / DMs**.

### 4.2 Slack API (automated)

* **Endpoint:** `admin.analytics.getFile` (Enterprise/Business+). Returns **gzipped NDJSON** per day and per **type**: `member`, `public_channel`.
* **Token:** org‑installed **user token** with `admin.analytics:read`.
* **Coverage limitations:**

  * `type=member` gives per‑user daily metrics: good for **DAU/WAU/MAU** approximations, **posters**, **messages posted**, **DM counts** (by subtracting channel messages from total messages).
  * `type=public_channel` gives public channel message counts; lets us measure **public** accurately.
  * **Private vs Shared split** is **not** fully observable via this method alone. Where the CSV isn’t uploaded, the UI should either:

    * present **Public / Other channels / DMs**, or
    * infer **Shared** as a subset of Public only when clearly flagged. (Recommended: use **Public / Other / DM** label when API‑only, show full 4‑way when CSV present.)

---

## 5) Unified Data Model (Normalized Row)

Each row in the SPA represents **one day** (or an aggregated bucket for weekly/monthly views). Keys accept either raw counts or rates in **0..1**; percentages in **0..100** are normalized to **0..1**.

```ts
// DashboardRow (per day)
{
  date: Date,                 // UTC midnight
  // Activity & posters
  dau?: number, wau?: number, mau?: number,
  daily_posters?: number, weekly_posters?: number, monthly_posters?: number,

  // Message volume by location (counts)
  msg_public?: number, msg_private?: number, msg_shared?: number, msg_dm?: number,
  messages_posted?: number,

  // Mix percentages (0..1)
  pct_msg_public?: number, pct_msg_private?: number, pct_msg_shared?: number, pct_msg_dm?: number,
  pct_view_public?: number, pct_view_private?: number, pct_view_shared?: number, pct_view_dm?: number,

  // Membership (stocks)
  total_members?: number, claimed_members?: number, public_channels_single?: number,

  // Derived rates (0..1)
  post_rate?: number,        // daily_posters / dau
  publicness?: number,       // msg_public / (public + private + shared + dm)
  claim_rate?: number        // claimed_members / total_members
}
```

**Aggregation rules:**

* **Counts** (e.g., `messages_posted`, `msg_*`, `daily_posters`): **sum** across the period bucket.
* **Stock values** (`total_members`, `claimed_members`, `public_channels_single`): take **last observed** within bucket.
* **Rates & percentages** (`post_rate`, `publicness`, `pct_*`, `claim_rate`): compute **daily**, then **average** within the bucket.
* **WAU/MAU**: if not supplied, compute as rolling distinct‑active approximations. (For v1, acceptable proxy: sum of `dau>0` flags in window; if member‑level actives are available, compute properly.)

---

## 6) Backend Contract

### 6.1 `POST /api/slack-analytics/fetch`

**Request**

```json
{ "start": "YYYY-MM-DD", "end": "YYYY-MM-DD", "include": ["member","public_channel"] }
```

**Response**

```json
{ "rows": DashboardRow[] }
```

**Behavior**

* For each day, fetch and parse NDJSON, compute `DashboardRow` using the rules above.
* Normalize percents to 0..1; ensure integers for counts.
* May persist raw files and emit a **monthly snapshot CSV** (optional).

### 6.2 `GET /api/slack-analytics/latest?window=28`

**Response**

```json
{ "rows": DashboardRow[] }
```

**Behavior**

* Returns the latest N days already aggregated.

**Security**

* Require `Authorization: Bearer <APP_SECRET>` or Basic Auth.
* Rate‑limit; log errors; redact tokens in logs.

---

## 7) Frontend Behavior (incl. API integration)

* **Upload CSV(s):** existing flow; each file becomes a **dataset** labeled by filename.
* **Fetch from Slack:** add a card with Start/End date + **Fetch** button.

  * Calls backend `POST /api/slack-analytics/fetch`, then converts JSON rows to the normalized format and adds them as a new dataset (e.g., `Slack API 2025‑07‑01—2025‑07‑28`).
  * If both CSV and API datasets are present, charts render overlays.
* **Mix labeling:**

  * If dataset has all four `pct_msg_*` present → label stacks **Public / Private / Shared / DMs**.
  * If dataset is API‑only and lacks `pct_msg_shared` → label stacks **Public / Other / DMs** (where `Other = 1 − Public − DMs`).
* **Views mix:**

  * If `pct_view_shared` is missing → infer as `max(0, 1 − public − private − dm)`; otherwise show as provided.

---

## 8) Charts (spec & interactions)

### 8.1 KPI Strip (top row)

* **DAU**, **WAU**, **MAU**: latest value in range (for selected dataset).
* **Post rate** = Posters / DAU; **Claim rate**; **Publicness**.
* Delta vs **previous same‑length window** (absolute + %). Color: green ↑, red ↓.

### 8.2 Engagement Over Time (line)

* Series: DAU, WAU, MAU (+ optional Posters toggle).
* Interactions: legend toggle, hover tooltip, responsive.

### 8.3 Messaging Mix (stacked bar)

* Modes: **Percent (100% stacked)** or **Absolute counts**.
* Stacks: **Public / Private / Shared / DMs** when available; otherwise **Public / Other / DMs**.

### 8.4 Views Mix (stacked bar, % only)

* Stacks: **Public / Private / Shared / DMs** where present; infer Shared as remainder if missing.

### 8.5 Membership & Channels (line)

* Series: `total_members`, `claimed_members`, `public_channels_single`.

### 8.6 Engagement Funnel (horizontal bars)

* Steps: **Post rate** → **Publicness** → **Views coverage** (Public + Shared).
* Tooltip: show step definition and current %.

### 8.7 Volume vs Engagement (scatter)

* X: `messages_posted`, Y: `dau`. Tooltip: date + dataset.

### 8.8 Comparison Table

* For selected dataset: current vs previous same‑length window for: DAU, WAU, MAU, Posters (daily), Messages posted, Publicness, Claim rate, Post rate.

**Global controls:** date range (manual + quick 7/14/28 + full), granularity (daily/weekly/monthly), dataset toggles, dark mode.

---

## 9) UI/UX Requirements

* Keyboard accessible controls; ARIA labels on toggles/selects.
* Light/dark toggle; responsive grid; informative empty states.
* Error banners for: invalid CSV headers, API fetch failures, and auth failures.

---

## 10) Performance & Limits

* Target <100ms re-render for typical monthly data (≤ 31 rows × ≤ 4 datasets).
* Debounce heavy operations on control changes.
* Avoid persisting full raw rows in IndexedDB (v1); store metadata only.

---

## 11) Testing & Acceptance Criteria

1. **CSV ingest**: Upload 2 CSVs → all charts render; 4‑way mix visible; comparison table updates with range changes.
2. **API ingest**: Fetch last 28 days via backend → new dataset appears; charts render; where Shared is unknown, mix uses Public/Other/DM.
3. **Granularity**: Daily/Weekly/Monthly buckets behave per rules; percentages averaged, counts summed.
4. **Funnel**: values change with date range; tooltips explain each step.
5. **Exports**: PNG (engagement chart) and aggregated CSV (includes `msg_shared`).
6. **Security**: No Slack tokens in network responses or local storage; backend requires secret; logs redacted.
7. **No console errors**; works from `file://` for CSV‑only mode.

---

## 12) Configuration & Env

* **Backend env variables**

  * `SLACK_USER_TOKEN` (admin.analytics\:read)
  * `APP_SECRET` (shared secret for SPA → backend calls)
  * `LOG_LEVEL`, `STORAGE_BUCKET` (optional)
* **Cron** (optional)

  * Daily at 06:00 UTC: fetch yesterday for `member` and `public_channel`, refresh monthly snapshot.

---

## 13) Open Questions / Future Extensions

* Join membership stocks (`total_members`, `claimed_members`) via SCIM/Admin Users API to keep stocks fresh via API.
* Add per‑channel deep dives and cohort curves.
* Persist raw rows in IndexedDB for full offline reopen.
* Add anomaly detection and “insight notes” (automated suggestions).

---

## 14) Deliverables Checklist for Build

* [ ] SPA `index.html` implementing all charts/controls per spec.
* [ ] Backend endpoints `/api/slack-analytics/fetch` and `/api/slack-analytics/latest` with auth.
* [ ] Readme with setup/run instructions (DO droplet, Node, env vars, simple reverse proxy).
* [ ] UAT with two synthetic CSVs and one API window; screenshots of each chart populated.
