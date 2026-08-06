# Enterprise Reconciliation Platform (Recon Frontend)

A state-of-the-art Accounts Receivable (AR) and Multi-Module Enterprise Financial Reconciliation web application built with **React**, **TypeScript**, **Vite**, and **Tailwind CSS**.

Designed for enterprise finance operations, accounting teams, and audit teams to automate multi-stream cash matching, resolve complex payment exceptions, manage cascading rule sets, and maintain an immutable compliance audit log.

---

## 🚀 Key Features & Architectural Modules

### 1. Accounts Receivable (AR) Reconciliation Studio
- **Cascading 19-Rule Matching Engine**: Rule-based waterfall evaluation across 5 operational phases (Intake Validation, Customer Identification, Invoice-to-Remittance Allocation, Settlement Lineage, GL Control).
- **Interactive Rules Studio**: Real-time rule toggling, priority ordering, confidence score indicators, and hit-count telemetry.
- **AR Exceptions Resolution Center**: Specialized resolution drawer workflows for **Short-Pay**, **Suspense / Unidentified Payments**, **Double Collision**, **No Payment Received**, and **Bank Charge Write-offs**.
- **Manual Multi-Table Matcher**: Split two-table interactive matcher for manual cash-to-invoice association.
- **Finish & Period Sign-off**: Locked period certification with SHA-256 audit hash generation.

### 2. Data Integration Hub (Ingestion)
- **Multi-Source Data Ingestion**: Supports CSV, XLS, OFX, and PDF statement formats.
- **Schema Field Mapping**: Visual mapping interface between bank raw fields and internal sub-ledger schemas.
- **Staging Data Explorer**: Real-time tabular viewer with pagination, search filtering, and row insertion.

### 3. Audit Reports & Settlement Analytics
- **Summary Statements Archive**: Historical run statements with certified sign-off status pills and 6-KPI metrics.
- **Matched Register**: Multi-stream tabs for Bank Deposits vs. Open Invoices, Gateway Settlements, and GL Control Schedules.
- **SOX-Compliant Audit Trail**: Immutable append-only log recording every user action, engine run, and manual override.
- **Export Capabilities**: Server-ready CSV, Excel, and PDF summary generator with browser print integration.

### 4. Intercompany Elimination & Settlement
- **Entity Balance Matching**: Cross-entity AR/AP balance reconciliation (US Parent, India, UK, Singapore).
- **Transfer Pricing Compliance**: Cost-plus royalty and shared service transfer pricing schedules.

### 5. Backend-Ready Service Layer
- **Unified Service Architecture (`src/services/`)**: Decoupled domain service layer (`arService`, `reconciliationsService`, `reportsService`, `dataHubService`, `intercompanyService`).
- **Mock Toggle Flag (`VITE_USE_MOCK_DATA`)**: Switch effortlessly between mock data in development and live REST API endpoints without altering UI components.

---

## 🛠 Tech Stack

- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + Custom Design System
- **Icons**: Lucide React
- **State Management**: Zustand
- **Typography**: Inter Font System

---

## 💻 Getting Started Locally

### Prerequisites

Ensure you have one of the following package managers installed:
- [Bun](https://bun.sh/) (Recommended, fast)
- Node.js (v18+) & [npm](https://nodejs.org/)

---

### Step 1: Clone the Repository

```bash
git clone https://github.com/shishirag20/recon-frontend.git
cd recon-frontend
```

---

### Step 2: Install Dependencies

Using **Bun**:
```bash
bun install
```

*(OR using npm)*:
```bash
npm install
```

---

### Step 3: Environment Setup

Copy the example environment file to configure local development settings:

```bash
cp .env.example .env.development
```

**Environment Variables (`.env.development`)**:
```env
# Set to 'true' to run with mock data services, or 'false' to connect to a live backend API
VITE_USE_MOCK_DATA=true

# Base URL for the reconciliation backend REST API
VITE_API_BASE_URL=http://localhost:8000/api/v1

# Auth Token storage key name
VITE_AUTH_TOKEN_KEY=recon_auth_token
```

---

### Step 4: Start Development Server

Using **Bun**:
```bash
bun run dev
```

*(OR using npm)*:
```bash
npm run dev
```

The application will launch locally at `http://localhost:5173`.

---

### Step 5: Build for Production

To run TypeScript type-checking and build the production bundle:

Using **Bun**:
```bash
bun run build
```

*(OR using npm)*:
```bash
npm run build
```

To preview the production build locally:
```bash
bun run preview
```

---

## 📁 Project Directory Structure

```
recon-frontend/
├── public/                 # Static assets & icons
├── src/
│   ├── assets/             # Images and SVG graphics
│   ├── components/         # Modular React components
│   │   ├── ar/             # AR Workspace, Rules Studio & Exception Drawers
│   │   ├── data-hub/       # Ingestion Jobs, Schemas & Staging Explorer
│   │   ├── layout/         # Topbar, Sidebar, Modal, TabBar, Toast
│   │   ├── reconciliation/ # Generic Reconciliation Cards & Modals
│   │   ├── reports/        # Run Statement Snapshot Modal
│   │   └── ui/             # Reusable UI Atoms (Button, Badge, KpiCard, etc.)
│   ├── hooks/              # Custom React Hooks (useToast, useModal)
│   ├── mocks/              # Production-grade Mock Data Sets
│   ├── pages/              # Primary Route Views (ARWorkspacePage, DataHubPage, etc.)
│   ├── services/           # Service Layer & HTTP Client (backend integration point)
│   │   ├── api/            # Fetch Client & Route Registry
│   │   ├── ar.service.ts
│   │   ├── dataHub.service.ts
│   │   ├── reconciliations.service.ts
│   │   └── reports.service.ts
│   ├── store/              # Global Store (Zustand)
│   ├── types/              # TypeScript Interfaces & API Types
│   ├── App.tsx             # Main Application Shell & Navigation
│   ├── index.css           # Global Design Tokens & Typography
│   └── main.tsx            # Application Entry Point
├── .env.example            # Environment configuration template
├── package.json            # Project dependencies & scripts
├── tsconfig.json           # TypeScript configuration
└── vite.config.ts          # Vite build configuration
```

---

## 🔒 License

Distributed under the MIT License.
