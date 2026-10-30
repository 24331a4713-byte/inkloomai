# Inkloom AI — Brand Governance & Content Quality Assurance

**Inkloom AI** is an enterprise-grade brand governance and content compliance platform. It evaluates marketing copy, clinical claims, and visual creative assets against approved brand guidelines, legal requirements, and regulatory policies before public release.

Built with a deterministic rule engine, a dedicated **Claim Registry**, client-side visual inspection (dimensions, aspect ratio, and color quantization), and optional semantic AI auditing via the Google Gemini API.

---

## 🌟 Key Capabilities & Features

### 1. Deterministic & Semantic Rule Auditing
- **Strict Brand Isolation**: Rules and guidelines are strictly quarantined by brand ID, ensuring zero policy leakage across multiple brands.
- **Evidence-Grounded Findings**: Every compliance finding cites the exact source guideline document, section, and excerpt.
- **Deterministic Evaluation**: Guaranteed reproducibility across executions with zero prompt drift for critical terminology, disclaimers, and prohibited claims.
- **Transparent Compliance Scoring**: Normalized 0–100% score calculation that explains exact point deductions and formulas.

### 2. Dedicated Claim Registry & Substantiation (Round 3)
- **Centralized Scientific & Legal Library**: Register and govern substantiated clinical, efficacy, safety, and ingredient claims.
- **Expiration Tracking**: Automatic expiration checks flag outdated claims whose clinical study or testing certificates have lapsed.
- **Status Lifecycle**: Clear tracking of `Approved`, `Pending Review`, `Expired`, and `Rejected` claims.
- **Draft Checking**: Automatic scanning of draft copy against registered claims, highlighting substantiated statements and flagging unsupported assertions.
- **Interactive Sandbox**: In-browser test tool allowing copywriters to verify phrases directly against the brand claim registry.

### 3. Visual Creative Inspector (Round 3)
- **Client-Side Image Extraction**: Real-time dimension and aspect ratio extraction (`16:9`, `1:1`, `4:3`, custom ratios) using HTML5 Image elements.
- **Dominant Color Quantization**: HTML5 Canvas pixel sampling extracts real hex color swatches and edge background colors.
- **Automated Brand Identity Check**: Detects prohibited background colors (e.g., pitch-black `#000000`) and aspect ratio mismatches against the brand's approved visual palette.
- **Zero Mock Data**: Hardcoded mock metadata removed; all evaluations run on user-uploaded creative assets.

### 4. Executive Analytics & Brand Health
- **Compliance Score Trajectory**: SVG area and line chart tracing audit improvements across draft versions.
- **Violation Breakdown**: Real-time category and severity distributions (Critical, Major, Minor).
- **Brand Health Index**: Composite score dynamically derived from real audit history, clean pass rates, and active rule coverage.

### 5. Governance Workflow & Human Sign-off
- **Audit-to-Draft Version Matching**: Prevents approving stale audits if draft content was modified after the audit ran.
- **Critical Violation Gates**: Formally blocks campaign approval and release until all critical violations are resolved.
- **Revision History**: Comprehensive rollback and draft version tracking with diff summaries.

---

## 🛠 Technologies Used

- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide Icons, HTML5 Canvas API
- **Build Tool**: Vite 8 with `@vitejs/plugin-react` and `@tailwindcss/vite`
- **Backend**: Node.js, Express, TypeScript (executed via `tsx` or Node)
- **AI Integration**: `@google/genai` (Google Gemini 2.5 API SDK)
- **Persistence**: File-backed JSON database (`data/inkloom-db.json`) with in-memory fallback for serverless hosting

---

## 📋 Environment Variables

Create a `.env` file in the project root:

```env
# Application Server Port
PORT=3000

# Optional: Google Gemini API Key for Semantic AI Analysis
# If omitted or denied, the platform automatically runs in deterministic mode
# with all 18 invariant compliance checks fully functional.
GEMINI_API_KEY=your_gemini_api_key_here

# Runtime environment (development / production)
NODE_ENV=development
```

---

## 🚀 Installation & Local Setup

### Prerequisites
- Node.js 18.x or 20.x
- npm 9.x or 10.x

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-org/inkloom-ai.git
cd inkloom-ai
npm install
```

### 2. Run Locally in Development Mode
Starts the Express API server and mounts Vite's development middlewares on port 3000:
```bash
npm run dev
```
Open your browser at `http://localhost:3000`.

---

## 🏗 Building & Production Deployment

### 1. Production Build
Compiles TypeScript and bundles client assets with Vite into `dist/`:
```bash
npm run build
```

### 2. Run in Production
Starts the Node.js Express server serving the compiled frontend from `dist/`:
```bash
npm start
```

---

## ☁️ Deployment & Persistence Architecture

### Storage Mechanism
Inkloom AI currently uses a file-backed JSON database located at `data/inkloom-db.json`. In persistent hosting environments (such as Docker, Railway, Render, Fly.io, AWS EC2, or Google Cloud Run with persistent volumes), all brands, campaigns, audits, claims, and approvals persist across server restarts and browser refreshes.

### Serverless Hosting Note (e.g. Vercel)
On serverless platforms like Vercel, the local filesystem is ephemeral and read-only (`EROFS`). Inkloom AI includes an automatic graceful fallback that avoids crashes by operating in memory during serverless execution. For persistent serverless deployments on Vercel:
1. Connect an external database (such as PostgreSQL via Cloud SQL, Supabase, Neon, or Firebase Firestore).
2. The storage abstraction in `src/server/storage.ts` provides clean hooks (`db.getBrands`, `db.saveAudit`, `db.getClaimsByBrand`) that map directly to external relational or document schemas.

---

## 🔌 API Overview

### Brands
- `GET /api/brands` — List all governing brands
- `GET /api/brands/:id` — Get brand details, visual palette, and approval policy
- `POST /api/brands` — Create a new brand with visual identity settings
- `PUT /api/brands/:id` — Update brand configuration
- `DELETE /api/brands/:id` — Cascade delete brand and associated artifacts
- `POST /api/brands/reset-demo` — Reset illustrative demo data (Solaria Dermacare)

### Claim Registry (Round 3)
- `GET /api/claims?brandId=:id` — List registered claims for a brand
- `GET /api/claims/:id` — Retrieve a single claim dossier
- `POST /api/claims` — Register a substantiated marketing claim (requires claimText, sourceEvidence, expiryDate)
- `PUT /api/claims/:id` — Update claim details, reviewer info, or expiration date
- `DELETE /api/claims/:id` — Remove a claim from the registry
- `POST /api/claims/check` — Check a draft snippet against active, expired, and unapproved claims

### Guidelines & Rules
- `GET /api/guidelines?brandId=:id` — List uploaded guideline documents
- `POST /api/guidelines/upload` — Upload guidelines and extract candidate rules
- `POST /api/guidelines/confirm-rules` — Confirm extracted rules into the library
- `GET /api/rules?brandId=:id` — Retrieve active brand rules

### Campaigns & Audits
- `GET /api/campaigns?brandId=:id` — List campaigns
- `GET /api/campaigns/:id` — Get campaign with revision history
- `POST /api/campaigns` — Create a new campaign
- `PUT /api/campaigns/:id` — Save draft copy (creates revision snapshot)
- `POST /api/audits/run` — Run deterministic, claim, semantic, and visual compliance audit (includes deduplication and empty draft validation)
- `GET /api/audits?campaignId=:id` — Retrieve audit history
- `POST /api/audits/:id/finding-status` — Update resolution status (accept, dismiss with justification)
- `POST /api/campaigns/:id/approve` — Record formal sign-off (blocked if critical violations exist or draft is stale)

### Diagnostics & System
- `GET /api/health` — Service health and Gemini API key status
- `GET /api/system/storage-info` — Storage persistence diagnostics and hosting status
- `GET /api/regression-tests` — Execute the automated 18-test regression invariant suite

---

## 🧪 Testing

### Automated Regression Suite (18 Invariant Tests)
Inkloom AI includes an automated suite verifying core governance guarantees:

```bash
# Execute test suite via API
curl http://localhost:3000/api/regression-tests
```

Or open the **Settings & Tests** tab in the UI to run the tests visually.

#### Invariant Tests Summary:
- **TEST A**: Ordinary Terminology Context (no false positives for standard usage of "claims")
- **TEST B**: Prohibited Sunscreen Promise Detection (flags "100% protection from every harmful UV ray")
- **TEST C**: Brand Policy Isolation (Brand B never inherits Brand A's rules)
- **TEST D**: Mandatory Disclaimer Requirement (detects missing required packaging disclaimers)
- **TEST E**: Target Replacement Suggestion (suggests verified alternatives)
- **TEST F**: Case-Sensitive Brand Naming (flags lowercase "solaria")
- **TEST G**: Semantic Tone / Efficacy Governance (identifies medical claims without FDA citations)
- **TEST H**: Multi-Rule Deduplication (consolidates overlapping rule triggers)
- **TEST I**: Approval Gating on Critical Violations (blocks sign-off while critical violations exist)
- **TEST J**: Stale Audit Detection (invalidates audit when draft content is revised)
- **TEST K**: Visual Prohibited Background & Aspect Ratio (flags unauthorized background colors)
- **TEST L**: Score Determinism & Reproducibility (consistent score across identical runs)
- **TEST M**: Claim Registry Expired Claim Detection (flags expired claims with critical severity)
- **TEST N**: Claim Registry Pending/Unapproved Claim Flagging (flags unapproved claims)
- **TEST O**: Claim Registry Approved Claim Substantiation (validates active claims)
- **TEST P**: Input Validation Empty Draft Handling (guards against blank submissions)
- **TEST Q**: Reliability Submission Debounce (prevents rapid double-click race conditions)
- **TEST R**: Visual Inspector Palette & Aspect Ratio Enforcement (real image analysis checks)
