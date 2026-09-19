# Supabase (PostgreSQL) to Hostinger MySQL Migration Blueprint

> **Status:** Ready for Execution (Planned for Tomorrow / Next 48 Hours)  
> **Target Deployments:**  
> 1. **Vercel Live:** `https://invoices-swart-five.vercel.app/` (Connected to GitHub)  
> 2. **Hostinger Live:** `https://mis.isquarebpo.com/` (Connected to GitHub)  
> **Current Database:** Supabase Live (PostgreSQL)  
> **Target Database:** Hostinger MySQL 8.0  
> **Goal:** 100% safe migration with **0.0% data loss**, **0% feature loss**, and **zero system crash/downtime**.

---

## 1. Executive Summary & Dual Deployment Setup

The application is deployed and actively used in two locations, both feeding into the same live Supabase database:
- **Vercel Production:** `https://invoices-swart-five.vercel.app/`
- **Hostinger Production:** `https://mis.isquarebpo.com/`

Both production apps auto-deploy from the GitHub repository. Because of this dual setup, **no changes should ever be pushed directly to the `main` branch until the new MySQL database is completely migrated and tested**.

---

## 2. Business Operations & Work Continuity During Migration

### Can the team continue working during migration?
**YES (95% of the time).** Routine operations do not need to stop during the migration process.

| Phase | Duration | Can Team Work & Enter Data? | Which Website to Use? | How is Data Kept Safe? |
| :--- | :--- | :--- | :--- | :--- |
| **Phase 1: Setup & Initial ETL (Background)** | ~2 – 3 Hours | **YES (Normal Work)** | Either `invoices-swart-five.vercel.app` or `mis.isquarebpo.com` | Live traffic continues writing to Supabase. We work in a separate Git branch and test in background. |
| **Phase 2: Final Switch Window (Cutover)** | **10 – 15 Minutes** | **PAUSE (Brief Data Freeze)** | None (Maintenance window) | A **Delta Sync Script** runs to fetch every single record added/edited during Phase 1. Both sites are switched to MySQL. |
| **Phase 3: Post-Cutover** | Immediate | **YES (Normal Work Resumes)** | Both websites fully functional | Data is now saving directly to Hostinger MySQL. |

### How does newly entered data during migration reach MySQL?
1. During Phase 1, the initial data export copies existing data to MySQL.
2. During the 10–15 minute cutover window, a dedicated **Delta Sync Script** runs:
   ```typescript
   // Delta Sync Query Logic:
   // Fetches any row where created_at >= migration_start_time OR updated_at >= migration_start_time
   ```
3. It inserts or updates these records into Hostinger MySQL.
4. Record counts are verified 1-to-1 between Supabase and MySQL before completing the switch.
5. Result: **Zero records lost, zero sequence numbers skipped.**

---

## 3. Architecture & Technical Differences

| Component | Current (Supabase) | Proposed (Hostinger MySQL) | Technical Reason / Solution |
| :--- | :--- | :--- | :--- |
| **Database Engine** | PostgreSQL (Supabase Cloud) | MySQL 8.0 (Hostinger) | Types adjusted: `UUID` $\rightarrow$ `VARCHAR(36)`, `JSONB` $\rightarrow$ `JSON`, `TIMESTAMPTZ` $\rightarrow$ `DATETIME`, `NUMERIC` $\rightarrow$ `DECIMAL(12,2)`. |
| **Data Access Layer** | Direct browser query (`@supabase/supabase-js`) | **Prisma ORM** + Next.js Server Actions / API Routes | Browsers cannot connect directly to MySQL securely. Prisma provides type safety, connection pooling, and secure server-side execution. |
| **Authentication** | Supabase Auth (`auth.users`, JWT) | Custom Auth / Session JWT with `users` table | Migrating user accounts and passwords/sessions cleanly to MySQL. |
| **Remote Access** | Port 443 (HTTPS REST API) | Port 3306 (MySQL TCP) | Hostinger hPanel **Remote MySQL** enabled with `%` wildcard and strong password so Vercel can connect. |
| **Connection Pooling** | Supabase connection pooler | Prisma `connection_limit=5` | Prevents serverless lambdas on Vercel from exhausting Hostinger's MySQL connection limits. |
| **Sequencing** | `company_sequences` table | `company_sequences` with MySQL Transactions | Concurrency-safe transactions (`prisma.$transaction`) ensure zero duplicate invoice numbers. |

---

## 4. Downtime & Crash Risk Analysis

- **Live Application Downtime:** **0% (Zero Downtime)** during development and initial sync.
- **Maintenance Window:** **10 – 15 minutes** only for the final Delta sync and environment cutover.
- **Crash Risk:** **0%**.
- **Instant 60-Second Rollback:** Supabase will remain active for 72 hours after migration. If any unexpected issue arises on MySQL, reverting the environment variables on Vercel and Hostinger immediately restores normal Supabase operation.

---

## 5. Step-by-Step Execution Plan

### Step 1: Pre-Migration Safety & Backups
- [ ] Create a dedicated migration branch in Git:
  ```bash
  git checkout -b feat/hostinger-mysql-migration
  ```
- [ ] Export full database dump from Supabase (CSV/JSON backups of all tables).
- [ ] Notify team of the planned 15-minute maintenance window time.

### Step 2: Hostinger MySQL Database Setup
- [ ] In **Hostinger hPanel** $\rightarrow$ **Databases** $\rightarrow$ **MySQL Databases**:
  - Create database (e.g. `u123456_invoicedb`).
  - Create MySQL user with a strong 32+ character password.
- [ ] In **Hostinger hPanel** $\rightarrow$ **Remote MySQL**:
  - Add Host/IP: `%` (allows Vercel cloud and local deployment to connect).
  - Select the created database and save.
- [ ] Note down the connection string:
  ```env
  DATABASE_URL="mysql://username:password@sqlXXX.hostinger.com:3306/u123456_invoicedb?connection_limit=5"
  ```

### Step 3: Prisma ORM Initialization & Schema Mapping
- [ ] Install Prisma dependencies:
  ```bash
  npm install prisma @prisma/client mysql2
  npx prisma init --datasource-provider mysql
  ```
- [ ] Map all tables in `prisma/schema.prisma`:
  - `companies`, `company_sequences`, `templates`
  - `invoices`, `invoice_items`
  - `installment_schedules`, `installment_email_logs`
  - `stc_installment_schedules`, `stc_installment_email_logs`
  - `employees`, `attendance_records`, `deductions`, `commissions`, `adjustments`, `payslips`
  - `aimt_report_records`, `aimt_report_imports`
  - `stc_report_records`, `stc_report_imports`
  - `users`, `profiles`, `security_audit_logs`
- [ ] Push schema to Hostinger:
  ```bash
  npx prisma db push
  ```

### Step 4: Automated Data Migration (ETL Script)
- [ ] Create migration script `scripts/migrate-supabase-to-mysql.ts`.
- [ ] Read all data from Supabase in relational order:
  1. Master tables (`companies`, `templates`, `users`).
  2. Main entities (`invoices`, `employees`, `installment_schedules`, `aimt_report_imports`, `stc_report_imports`).
  3. Relational child records (`invoice_items`, `attendance_records`, `aimt_report_records`, `stc_report_records`).
- [ ] Transform PostgreSQL types (UUIDs, ISO dates) to MySQL format.
- [ ] Batch insert into Hostinger MySQL.
- [ ] Run validation assertions (assert `supabase_count === mysql_count` for every table).

### Step 5: Service Layer Refactoring
- [ ] Update service files from `@/lib/supabase/client` to server-side Prisma calls / API routes:
  - `src/lib/services/invoice.service.ts`
  - `src/lib/services/installment.service.ts`
  - `src/lib/services/stc-installment.service.ts`
  - `src/lib/services/attendance.service.ts`
  - `src/lib/services/company.service.ts`
  - `src/lib/services/template.service.ts`
  - `src/lib/services/report.service.ts` (AIMT Report parsing & duplicate logic preserved)
  - `src/lib/services/edlink-payslip.service.ts`
- [ ] Implement MySQL-backed Auth session handling.

### Step 6: Functional Testing (Local & Preview)
- [ ] Verify user login, logout, and role access control.
- [ ] Verify sequential invoice creation (`INV-XXXX`) with zero duplicate risk.
- [ ] Verify PDF generation for invoices, STC schedules, and payslips.
- [ ] Verify biometric attendance calculation.
- [ ] Verify AIMT Excel report upload, preview, and duplicate checking.
- [ ] Verify email logs.

### Step 7: Final Cutover Window (10 – 15 Minutes)
- [ ] Announce 15-minute maintenance pause to users.
- [ ] Run **Delta Sync Script** (syncs records created/updated during testing).
- [ ] Confirm row counts between Supabase and MySQL match 100%.
- [ ] Add `DATABASE_URL` in **Vercel Project Settings** $\rightarrow$ **Environment Variables**.
- [ ] Add `DATABASE_URL` in **Hostinger Environment Configuration**.
- [ ] Merge `feat/hostinger-mysql-migration` into `main` and push to GitHub.
- [ ] Both Vercel (`invoices-swart-five.vercel.app`) and Hostinger (`mis.isquarebpo.com`) deploy automatically.
- [ ] Announce maintenance window complete.

### Step 8: Post-Migration Safety Buffer
- [ ] Keep Supabase project active and untouched for **72 hours**.
- [ ] Monitor both sites for any performance or connection bottlenecks.
- [ ] After 72 hours of stable operation, decommission Supabase.

---

## 6. Information Needed From Hostinger Before Execution

When ready to start migration, keep these 4 details ready:
1. **Hostinger MySQL Host / Server Name** (e.g. `sqlXXX.hostinger.com` or IP)
2. **Database Name** (e.g. `u123456789_dbname`)
3. **Database Username** (e.g. `u123456789_dbuser`)
4. **Database Password**
5. Remote MySQL access verified (`%` host added in hPanel).
