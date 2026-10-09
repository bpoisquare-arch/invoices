# Security Hardening & Vulnerability Remediation Plan (A to Z)

**Project:** MIS Invoice & Installment Management System  
**Date:** October 2026  
**Objective:** Resolve all identified Critical, High, and Medium security vulnerabilities using enterprise-grade, professional system design patterns with zero disruption to existing business features and zero data loss.

---

## 1. Executive Summary & Design Principles

### Non-Negotiable Safety Principles
1. **Zero Data Loss:** No database tables dropped, altered, or truncated. All invoices, installment records, students, templates, companies, and settings remain 100% intact.
2. **Zero Feature Regression:** Invoicing, STC/AIMT installment schedules, PDF generation, reports export, and attendance workflows remain fully functional.
3. **Seamless Authentication:** Existing credentials (`admin@mis.isquarebpo.com` & `team@mis.isquarebpo.com`) continue working as expected without changing passwords or database schemas.
4. **Defense-in-Depth:** Every API route verifies authenticity at the edge/middleware level and validates input at the route handler level.

---

## 2. A to Z Implementation Architecture

### Phase A: Cryptographic Session Management (Enterprise Standard)
* **File to Create:** `src/lib/auth/session.ts`
* **Mechanism:**
  - Implement a tamper-proof HMAC-SHA256 session token system using Node.js native `crypto`.
  - Session Payload:
    ```typescript
    interface SessionPayload {
      userId?: string;
      email: string;
      role: 'admin' | 'viewer';
      iat: number; // Issued At
      exp: number; // Expiration (e.g. 7 days)
    }
    ```
  - Cookie Configuration:
    - `HttpOnly: true` (prevents XSS script access / cookie theft)
    - `SameSite: 'Lax'` (CSRF defense)
    - `Secure: true` in production (encrypted over HTTPS)
    - `Path: '/'`
  - Client state synchronization: Also maintain readable cookie indicators (`user-role`, `user-email`) solely for UI badges/display, while server-side authorization strictly verifies the cryptographic session token.

---

### Phase B: Secure Password Verification & Timing-Attack Mitigation
* **File to Update:** `src/lib/auth/password.ts`
* **Mechanism:**
  - Remove plaintext fallback match (`password === storedHash`).
  - Replace standard string equality `hash === originalHash` with `crypto.timingSafeEqual` to prevent timing analysis attacks.

---

### Phase C: Login Hardening & Elimination of Hardcoded Backdoors
* **Files to Update:**
  1. `src/app/api/auth/login/route.ts`
  2. `src/components/login-form.tsx`
* **Mechanism:**
  - Eliminate hardcoded credentials check (`admin123` / `Team@1230`) from both client component and server route.
  - Authenticate all login attempts strictly against MySQL `Profile` table via PBKDF2 hash verification.
  - Issue signed HMAC session token upon successful verification.

---

### Phase D: API Protection & Middleware Hardening (Broken Access Control Fix)
* **File to Update:** `src/lib/auth-middleware.ts`
* **Mechanism:**
  - Remove blanket `/api` exemption from `isPublicRoute`.
  - Whitelist public endpoints strictly:
    - `/login`
    - `/api/auth/login`
    - `/api/auth/logout`
    - `/api/auth/session`
    - Static assets (`_next/*`, `favicon.ico`, static images)
  - Intercept all other `/api/*` routes:
    - If valid signed session exists: Allow request.
    - If missing or invalid session: Return `401 Unauthorized` JSON.
  - Enforce Role-Based Access Control (RBAC):
    - Prevent `viewer` role from mutating or accessing restricted admin endpoints.

---

### Phase E: Arbitrary Account Takeover & Password Reset Fix
* **File to Update:** `src/app/api/auth/password/route.ts`
* **Mechanism:**
  - Extract email from verified cryptographic session, never from an untrusted cookie.
  - Require `currentPassword` in the request body.
  - Verify `currentPassword` against database profile before hashing and saving `newPassword`.

---

### Phase F: Unauthenticated Email Relay & Spam/Phishing Lockdown
* **Files to Update:**
  1. `src/app/api/attendance/payslips/send-email/route.ts`
  2. `src/app/api/installments/send-email/route.ts`
  3. `src/app/api/stc/installments/send-email/route.ts`
* **Mechanism:**
  - Require verified authenticated admin session before allowing email dispatch.
  - Sanitize and validate recipient email against authorized domains/patterns.

---

### Phase G: Database Setup & Seed Routes Protection
* **Files to Update:**
  1. `src/app/api/setup-db/route.ts`
  2. `src/app/api/attendance/setup-db/route.ts`
* **Mechanism:**
  - Require authenticated Admin session or secret internal header token (`process.env.SETUP_SECRET`).
  - Block unauthenticated public triggers to prevent DoS or lock contention.

---

### Phase H: Audit Logging & Clean Verification
* **Files to Verify:**
  1. `src/app/api/audit-log/route.ts`
  2. `src/app/api/auth/session/route.ts`
  3. `src/app/api/auth/logout/route.ts`
* **Mechanism:**
  - Verify clean session extraction and audit trail integrity.
  - Test login, session renewal, role verification, PDF download, and logout.

---

## 3. Verification & Testing Checklist

- [ ] Admin login (`admin@mis.isquarebpo.com`) functions seamlessly via DB hash.
- [ ] Viewer login (`team@mis.isquarebpo.com`) functions seamlessly via DB hash.
- [ ] Direct cURL/unauthenticated requests to `/api/invoices` receive `401 Unauthorized`.
- [ ] Legitimate dashboard invoices, installments, and PDF templates download without error.
- [ ] Cookie injection (`dev-auth-session=admin`) in DevTools is rejected by cryptographic verification.
- [ ] Password reset requires valid `currentPassword`.
- [ ] Zero database data loss or schema disruptions.
