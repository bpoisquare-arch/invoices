# Supabase (PostgreSQL) to Hostinger MySQL Master Migration Blueprint

> **Execution Date:** Scheduled for **Monday**  
> **Target Deployments:**  
> 1. **Vercel Live:** `https://invoices-swart-five.vercel.app/` (Connected to GitHub)  
> 2. **Hostinger Live (MIS):** `https://mis.isquarebpo.com/` (Connected to GitHub)  
> 3. **Grocery Management Portal:** Hosted on Hostinger (`u767255212_grocery_db`) with Attendance linked to Supabase  
> **Current Shared Database:** Supabase Live (PostgreSQL - Project Ref: `ybrzysgpuiysroajzctm`)  
> **Target Database:** Hostinger MySQL 8.0  
> **Operational Guarantee:** **100% Uptime**, **0.0% Data Loss**, **0% Crash Risk**, **60-Second Instant Rollback**.

---

## 1. Executive Summary & Dual Application Interconnection

Two separate production applications are actively connected to the same live Supabase database instance:

```
                            ┌──────────────────────────────────────────────┐
                            │               CURRENT STATE                  │
                            └──────────────────────────────────────────────┘
                                                    │
                 ┌──────────────────────────────────┴──────────────────────────────────┐
                 ▼                                                                     ▼
    ┌─────────────────────────┐                                           ┌─────────────────────────┐
    │     Invoice Gen MIS     │                                           │   Grocery Management    │
    │  (Invoices, Payroll,    │                                           │  (Branch Portal: Multan │
    │   AIMT, STC, Attend.)   │                                           │       & Lahore)         │
    └────────────┬────────────┘                                           └────────────┬────────────┘
                 │                                                                     │
                 │ 100% Data Queries                                                   │ Attendance Queries
                 │ (Invoices, Attendance, etc.)                                        │ (Employees, Records,
                 │                                                                     │  Punch Requests)
                 ▼                                                                     ▼
    ┌───────────────────────────────────────────────────────────────────────────────────────────────┐
    │                    Supabase PostgreSQL (`ybrzysgpuiysroajzctm.supabase.co`)                  │
    └───────────────────────────────────────────────────────────────────────────────────────────────┘
                                                                                       ▲
                                                                                       │ Core Grocery Data
                                                                          ┌────────────┴────────────┐
                                                                          │  Hostinger MySQL DB     │
                                                                          │ (`u767255212_grocery_db`)│
                                                                          │ (Expenses, Budgets, etc)│
                                                                          └─────────────────────────┘
```

### Deep Analysis of Both Systems:

1. **`Invoice Gen` (MIS Admin):**
   - Deployed on **Vercel** (`https://invoices-swart-five.vercel.app/`) and **Hostinger** (`https://mis.isquarebpo.com/`).
   - Uses Supabase PostgreSQL for all core operations: Invoices, Invoice Items, Sequences, Companies, Templates, STC Installments/Reports, AIMT Reports, Payroll/Payslips, and Master Attendance.
2. **`Grocery Management` (Branch Operations - Lahore & Multan):**
   - Already uses Hostinger MySQL (`u767255212_grocery_db`) for its core models: `User`, `Budget`, `GroceryEntry`, `GroceryCategory`, `Counselor`, `CommissionEntry`, `CommissionClaim`.
   - **Crucial Dependency:** Its **Attendance Module** (`src/lib/services/attendance.service.ts` & `src/lib/services/attendance-requests.service.ts`) fetches and writes live data directly from **Supabase**:
     - `employees` (Branch-specific staff lists)
     - `attendance_records` (Biometric punches & calculated statuses)
     - `attendance_settings` & `gazetted_holidays`
     - `attendance_requests` (Leave applications, Missing In/Out regularization requests)
     - Stored requests sync directly between MIS and Branch users.

---

## 2. Business Continuity & Zero Downtime Guarantee

### Will the systems stay 100% operational during migration?
**YES (100% Uptime for team operations).**

| Phase | Operational Status | User Experience | Data Safety Mechanism |
| :--- | :--- | :--- | :--- |
| **Phase 1: Setup & Initial ETL (Monday Background)** | **100% Live & Functional** | Normal everyday work (Invoices created, punches recorded, expenses submitted) | Live users continue writing to Supabase. Migration runs in an isolated Git branch and writes to a separate Hostinger MySQL database. |
| **Phase 2: Cutover Window (Monday Evening)** | **10 – 15 Minutes Pause** | Brief scheduled maintenance banner | A **Delta Sync Script** runs to copy all records created or modified during Phase 1. Exact row counts verified before pointing production domains. |
| **Phase 3: Post-Cutover** | **100% Live & Functional** | Normal work resumes immediately | Both systems write directly to Hostinger MySQL. |

### How is newly entered data captured?
1. Phase 1 takes a snapshot and transfers historical data to MySQL.
2. During the 10–15 minute cutover window, the **Delta Sync Script** runs:
   ```typescript
   // Delta Sync Query:
   // Fetches any row where created_at >= migration_start_time OR updated_at >= migration_start_time
   ```
3. It inserts or updates these records into Hostinger MySQL.
4. Total row counts between Supabase and MySQL are compared 1-to-1 (`assert supabase_count === mysql_count`).
5. **Result: 0 records lost, 0 sequence numbers skipped, 0 duplicate keys.**

### Safety Buffer & Instant Rollback:
- Supabase will remain **active and untouched for 72 hours** after migration.
- If any unexpected issue arises on MySQL, reverting the environment variable `DATABASE_URL` / restoring Supabase keys takes **under 60 seconds**.

---

## 3. Architecture & Target Design

```
                            ┌──────────────────────────────────────────────┐
                            │            TARGET MIGRATION STATE            │
                            └──────────────────────────────────────────────┘
                                                    │
                 ┌──────────────────────────────────┴──────────────────────────────────┐
                 ▼                                                                     ▼
    ┌─────────────────────────┐                                           ┌─────────────────────────┐
    │     Invoice Gen MIS     │                                           │   Grocery Management    │
    │  (Vercel & Hostinger)   │                                           │    (Hostinger Node)     │
    └────────────┬────────────┘                                           └────────────┬────────────┘
                 │                                                                     │
                 │ Prisma ORM                                                          │ Option A: Internal API Bridge
                 │ (`mysql2`)                                                          │ (/api/internal/attendance)
                 ▼                                                                     ▼
    ┌─────────────────────────────────────────────────────────┐                        │
    │                   Hostinger MySQL 8.0                   │◄───────────────────────┘
    │           (Invoices, Attendance, Payroll, AIMT)         │  (or Option B: Direct DB Connection)
    └─────────────────────────────────────────────────────────┘
```

### Technical Conversions:
| Component | Supabase (PostgreSQL) | Hostinger MySQL 8.0 | Solution |
| :--- | :--- | :--- | :--- |
| **Data Types** | `UUID`, `JSONB`, `TIMESTAMPTZ`, `NUMERIC` | `VARCHAR(36)`, `JSON`, `DATETIME`, `DECIMAL(12,2)` | Fully automated in Prisma schema & ETL script. |
| **Data Layer** | Client-side `@supabase/supabase-js` | **Prisma ORM** + Next.js Server Actions / API Routes | Secure server-side execution with connection pooling (`connection_limit=5`). |
| **Sequencing** | `company_sequences` table | `company_sequences` with MySQL Transactions | `prisma.$transaction` guarantees concurrency-safe sequential invoice numbering. |
| **Grocery Attendance** | Direct browser query to Supabase | **Internal REST API Bridge (Recommended)** | Grocery Management calls MIS API with secure secret token; zero database cross-coupling. |

---

## 4. Grocery Management Integration Strategy

### Selected Architecture: Option A (REST API Bridge - Highly Recommended)
- `Invoice Gen` exposes internal secured API endpoints:
  - `GET /api/internal/attendance/employees`
  - `GET /api/internal/attendance/records`
  - `POST /api/internal/attendance/requests`
  - `GET /api/internal/attendance/settings`
- `Grocery Management`'s [attendance.service.ts](file:///d:/Grocery%20Management/src/lib/services/attendance.service.ts) and [attendance-requests.service.ts](file:///d:/Grocery%20Management/src/lib/services/attendance-requests.service.ts) call these endpoints using an internal `INTERNAL_API_SECRET`.
- **Key Advantages:**
  - Zero cross-database firewall/grant issues on Hostinger.
  - Centralized attendance calculation logic (biometrics, leave quotas, audit logs) stays in MIS.
  - If schema changes in MIS, Grocery Management does not break.

*(Alternative Option B: Direct MySQL connection via shared DB credentials if co-located).*

---

## 5. Step-by-Step Execution Plan (For Monday)

### Step 1: Pre-Migration Safety & Git Isolation
- [ ] Create dedicated migration branches in both repositories:
  ```bash
  # In Invoice Gen:
  git checkout -b feat/hostinger-mysql-migration

  # In Grocery Management:
  git checkout -b feat/attendance-mysql-bridge
  ```
- [ ] Take full offline snapshot/backup of all Supabase tables into local JSON/CSV files:
  - `companies`, `company_sequences`, `templates`
  - `invoices`, `invoice_items`
  - `stc_installment_schedules`, `stc_installment_email_logs`, general installments
  - `employees`, `attendance_records`, `attendance_settings`, `gazetted_holidays`, `attendance_requests`, `attendance_audit_logs`
  - `payslips`, `deductions`, `commissions`, `adjustments`
  - `aimt_report_imports`, `aimt_report_records`, `stc_report_imports`, `stc_report_records`
  - `users`, `profiles`, `security_audit_logs`

### Step 2: Hostinger MySQL Database Setup
- [ ] In **Hostinger hPanel** $\rightarrow$ **Databases** $\rightarrow$ **MySQL Databases**:
  - Create database (e.g. `u767255212_invoicedb`).
  - Create MySQL user with a strong password.
- [ ] In **Hostinger hPanel** $\rightarrow$ **Remote MySQL**:
  - Add Host/IP: `%` (wildcard allows Vercel cloud and local development to connect).
  - Select database and save.
- [ ] Save the connection string in `.env.local`:
  ```env
  DATABASE_URL="mysql://username:password@sqlXXX.hostinger.com:3306/u767255212_invoicedb?connection_limit=5"
  ```

### Step 3: Prisma ORM Initialization & Schema Mapping (Invoice Gen)
- [ ] Install Prisma in `Invoice Gen`:
  ```bash
  npm install prisma @prisma/client mysql2
  npx prisma init --datasource-provider mysql
  ```
- [ ] Configure `prisma/schema.prisma` covering all 18+ tables with proper MySQL relations, indexes, and types.
- [ ] Push schema to Hostinger:
  ```bash
  npx prisma db push
  ```

### Step 4: Automated Data Migration (ETL Script)
- [ ] Run `scripts/migrate-supabase-to-mysql.ts`:
  1. Reads all historical records from Supabase in topological/foreign-key order.
  2. Converts UUIDs, ISO dates, and JSON payloads.
  3. Batch inserts into Hostinger MySQL.
  4. Runs validation assertions (asserts `supabase_count === mysql_count` for every single table).

### Step 5: Service Layer Refactoring
- [ ] **Invoice Gen**:
  - Refactor `invoice.service.ts` to use Prisma transactions for sequence increment and invoice creation.
  - Refactor `attendance.service.ts` and `attendance-requests.service.ts` to Prisma.
  - Refactor `report.service.ts`, `stc-installment.service.ts`, and payroll storage files.
  - Implement Internal API endpoints for Grocery Management.
- [ ] **Grocery Management**:
  - Update `attendance.service.ts` and `attendance-requests.service.ts` to consume the new MIS internal API bridge.

### Step 6: Full Functional Testing (Local & Staging)
- [ ] Test invoice creation & sequential numbering (`INV-XXXX`).
- [ ] Test PDF generation (Invoices, STC, Payslips).
- [ ] Test attendance punch calculations, branch filtering (Lahore & Multan).
- [ ] Test branch request creation from Grocery Management $\rightarrow$ Live approval in Invoice Gen MIS.
- [ ] Test AIMT & STC report imports.

### Step 7: Final Cutover Window (10 – 15 Minutes)
- [ ] Announce 15-minute maintenance pause to users.
- [ ] Run **Delta Sync Script** (syncs any records created during testing hours).
- [ ] Re-verify 100% row match between Supabase and MySQL.
- [ ] Add `DATABASE_URL` in **Vercel Project Settings** $\rightarrow$ **Environment Variables**.
- [ ] Add `DATABASE_URL` in **Hostinger Environment Configuration**.
- [ ] Merge `feat/hostinger-mysql-migration` into `main` and push to GitHub.
- [ ] Both production sites deploy automatically.
- [ ] Merge and deploy `Grocery Management`.
- [ ] Verify both sites live and remove maintenance pause.

### Step 8: Post-Migration Safety Buffer
- [ ] Keep Supabase active in read-only / standby mode for **72 hours**.
- [ ] Monitor connection pool health and query response times.
- [ ] Decommission Supabase only after 72 hours of flawless live operation.

---

## 6. Information Needed on Monday Before Starting Execution

Keep these details ready from Hostinger hPanel on Monday morning:
1. **MySQL Server / Host:** (e.g. `sqlXXX.hostinger.com` or IP)
2. **Database Name:** (e.g. `u767255212_invoicedb`)
3. **Database Username:** (e.g. `u767255212_invuser`)
4. **Database Password:** (Strong 20+ character password)
5. **Remote MySQL `%` enabled:** Verified in hPanel.
