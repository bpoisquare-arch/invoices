# Supabase (PostgreSQL) to Hostinger MySQL Migration Blueprint

> **Status:** Planned / Ready for Execution  
> **Target Date:** Next Session  
> **Goal:** 100% safe migration from Supabase Free Tier to Hostinger MySQL with **0.0% data loss** and **zero system downtime/crash**.

---

## 1. Executive Summary & Objective

The application currently relies on **Supabase** (PostgreSQL) for:
- Database storage (Invoices, Schedules, Attendance, Deductions, Payslips, Reports, etc.)
- Authentication & session handling (`auth.users`, `@supabase/ssr`, `middleware.ts`)
- Client-side queries via `@supabase/supabase-js`

**The Goal:**
Migrate the database to **Hostinger MySQL** to eliminate Supabase free tier limitations/pauses while preserving all data integrity, relational constraints, sequences, and application functionality without any disruption to current users.

---

## 2. Key Architecture & Technical Changes

| Component | Current (Supabase) | Proposed (Hostinger MySQL) | Reason / Solution |
| :--- | :--- | :--- | :--- |
| **Database Engine** | PostgreSQL (Supabase Cloud) | MySQL 8.0 / MariaDB (Hostinger) | Types adjusted (`UUID` $\rightarrow$ `VARCHAR(36)`, `JSONB` $\rightarrow$ `JSON`, `TIMESTAMPTZ` $\rightarrow$ `DATETIME`, `NUMERIC` $\rightarrow$ `DECIMAL`). |
| **Data Access Layer** | Direct browser query (`@supabase/supabase-js`) | **Prisma ORM** + Next.js Server Actions / API Routes | Browser cannot directly connect to MySQL safely. Prisma provides type safety, connection pooling, and secure server-side queries. |
| **Authentication** | Supabase Auth (`auth.users`, JWT) | Custom Auth / Session JWT with `users` table | MySQL does not have native Supabase Auth. Session management will be handled cleanly via JWT and hashed credentials in MySQL. |
| **Remote Access** | Port 443 (HTTPS REST API) | Port 3306 (MySQL TCP) | Hostinger hPanel mein **Remote MySQL** access enable kiya jaye ga (`%` wildcard with strong password). |
| **Sequencing** | `company_sequences` table | `company_sequences` with MySQL Transactions | Concurrency-safe transactions (`prisma.$transaction`) ensure zero duplicate invoice numbers. |

---

## 3. Downtime & Crash Risk Analysis

- **Live Application Downtime:** **0% (Zero Downtime)**.
- **Crash Risk:** **0%**.
- **Reason:** We will use a **Parallel (Shadow) Migration Strategy**:
  1. The live app remains 100% active on Supabase during development, schema creation, data ETL, and testing.
  2. All code updates and testing will take place in an isolated branch / local environment.
  3. The final cutover only involves updating production environment variables (`DATABASE_URL`) during standard deployment (1–2 minutes build time).
  4. **Instant 60-Second Rollback:** If any issue occurs, reverting the `.env` back to Supabase restores normal operations in under a minute.

---

## 4. Estimated Timeline Breakdown

| Phase | Tasks | Estimated Duration |
| :--- | :--- | :--- |
| **Phase 1 & 2** | Hostinger MySQL DB setup, Remote MySQL access, Prisma initialization & schema mapping | **30 - 45 mins** |
| **Phase 3** | Automated ETL Data Migration script (Export Supabase $\rightarrow$ Transform $\rightarrow$ Load to MySQL) | **30 - 45 mins** |
| **Phase 4** | Refactoring service layer (`invoice.service.ts`, `installment.service.ts`, `attendance.service.ts`, Auth) | **1.5 - 2.0 hours** |
| **Phase 5** | Complete functional testing (PDF generator, Email logs, Sequences, Payslips, Excel import/export) | **45 - 60 mins** |
| **Phase 6** | Final delta sync & production cutover | **10 - 15 mins** |
| **Total Estimated Time** | | **~3.5 - 4.5 Hours** |

---

## 5. Phase-by-Phase Execution Plan (Step-by-Step)

### Phase 1: Safety & Backups
1. Create a safety backup branch in Git:
   ```bash
   git checkout -b backup-supabase-stable
   git push origin backup-supabase-stable
   git checkout -b feat/hostinger-mysql-migration
   ```
2. Full data export from Supabase (all tables exported to JSON/CSV backups).

### Phase 2: Hostinger MySQL Setup
1. Hostinger hPanel $\rightarrow$ **Databases** $\rightarrow$ **MySQL Databases**:
   - Create Database name (e.g. `u123_invoicedb`)
   - Create User & Strong Password
2. Hostinger hPanel $\rightarrow$ **Remote MySQL**:
   - Add Host/IP: `%` (allows secure connection from deployment platforms/local machine)
   - Assign to the created database.
3. Formulate Database Connection String:
   ```env
   DATABASE_URL="mysql://username:password@sql.hostinger.com:3306/database_name?connection_limit=10"
   ```

### Phase 3: Prisma ORM Schema Mapping
1. Install Prisma & MySQL dependencies:
   ```bash
   npm install prisma @prisma/client mysql2
   npx prisma init --datasource-provider mysql
   ```
2. Map all 15+ existing Supabase tables into `prisma/schema.prisma`:
   - `companies`
   - `company_sequences`
   - `templates`
   - `invoices` & `invoice_items`
   - `installment_schedules` & `installment_email_logs`
   - `stc_installment_schedules` & `stc_installment_email_logs`
   - `employees`, `attendance_records`, `deductions`, `commissions`, `adjustments`, `payslips`
   - `reports` & `import_history`
   - `users`, `profiles`, `security_audit_logs`
3. Push schema to Hostinger:
   ```bash
   npx prisma db push
   ```

### Phase 4: Automated Data Migration Script (ETL)
1. Create migration script (`scripts/migrate-supabase-to-mysql.ts`):
   - Reads records from Supabase REST API in relational order.
   - Converts UUIDs and date strings to MySQL compatible formats.
   - Batch inserts records into Hostinger MySQL.
   - Runs validation assertions: checks that row count in Supabase equals row count in MySQL.

### Phase 5: Service Layer Refactoring
1. Update core service files from `supabase.from('...').select()` to Prisma client calls:
   - `src/lib/services/invoice.service.ts`
   - `src/lib/services/installment.service.ts`
   - `src/lib/services/stc-installment.service.ts`
   - `src/lib/services/attendance.service.ts`
   - `src/lib/services/company.service.ts`
   - `src/lib/services/template.service.ts`
   - `src/lib/services/report.service.ts`
   - `src/lib/services/edlink-payslip.service.ts`
2. Update Authentication & Session handling to work independently of Supabase Auth.

### Phase 6: Comprehensive Verification Checklist
- [ ] User login, logout, and role access control (Admin / User).
- [ ] Invoice creation with automated sequential numbering (`company_sequences`).
- [ ] PDF rendering and export for invoices, STC schedules, and payslips.
- [ ] Email dispatch and email logging (`installment_email_logs`).
- [ ] Biometric attendance record upload & calculation.
- [ ] Excel/CSV import and export.
- [ ] Audit logs recording accurately.

### Phase 7: Production Cutover & Cleanup
1. Run final delta sync (for any new records created during testing).
2. Update production `.env` with Hostinger `DATABASE_URL`.
3. Deploy new build.
4. Keep Supabase active for 48–72 hours as a safety fallback before decommissioning.

---

## 6. Information Needed From User Before Starting Tomorrow
When resuming work tomorrow, please have the following Hostinger details ready:
1. **Hostinger MySQL Host / Server Name** (e.g. `sqlXXX.hostinger.com` or IP)
2. **Database Name** (e.g. `u123456789_dbname`)
3. **Database Username** (e.g. `u123456789_dbuser`)
4. **Database Password**
5. Hostinger Remote MySQL access set to allow external connections (`%`).
