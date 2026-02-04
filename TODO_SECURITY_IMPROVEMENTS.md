# Security Improvements Plan

## Phase 1: Critical Authentication Fixes

### 1.1 Fix Session Cookie Timing Attack (src/lib/auth.ts)
- [ ] Fix `timingSafeEqual_` function to compare raw bytes
- [ ] Add session fingerprinting (user-agent + IP hash)
- [ ] Add session creation timestamp validation
- [ ] Implement proper HMAC verification

### 1.2 Remove Hardcoded Credentials (src/app/api/auth/login/route.ts)
- [ ] Move DEMO_USERS to environment variables
- [ ] Add ADMIN_USERNAME, ADMIN_PASSWORD, STAFF_PASSWORD env vars
- [ ] Add password complexity requirements
- [ ] Add maximum login attempts tracking

### 1.3 Add Rate Limiting (src/app/api/auth/)
- [ ] Create rate limiter utility
- [ ] Add rate limiting to login endpoint (5 attempts/15min)
- [ ] Add rate limiting to sensitive operations

## Phase 2: API Security

### 2.1 Add Authentication to Market Price Update
- [ ] Add session validation to /api/market-price/update/route.ts
- [ ] Restrict to Admin role only

### 2.2 Add CSRF Protection
- [ ] Create CSRF token utility
- [ ] Add CSRF token validation to state-changing operations

### 2.3 Add SSRF Protection
- [ ] Create URL validation utility
- [ ] Add allowlist for external URLs
- [ ] Block internal IP ranges

## Phase 3: Input Validation & Sanitization

### 3.1 Add Input Length Limits
- [ ] Add maxLength to all text inputs in pages
- [ ] Add server-side validation

### 3.2 Improve Image Upload Validation
- [ ] Add magic byte validation for images
- [ ] Add file size limits
- [ ] Add type validation

## Phase 4: Security Headers & CSP

### 4.1 Strengthen CSP
- [ ] Remove unsafe-inline from script-src where possible
- [ ] Add nonce-based script loading
- [ ] Restrict object-src

### 4.2 Add Security Headers
- [ ] Add Cross-Origin headers
- [ ] Add Cache-Control for sensitive pages

## Phase 5: Logging & Monitoring

### 5.1 Add Security Event Logging
- [ ] Create security logger utility
- [ ] Log login attempts (success/failure)
- [ ] Log permission denials
- [ ] Log API errors

---

## Implementation Order (Priority)

1. Fix session cookie timing attack (HIGH)
2. Add authentication to market-price/update (CRITICAL)
3. Remove hardcoded credentials (CRITICAL)
4. Add rate limiting to login (HIGH)
5. Add session fingerprinting (MEDIUM)
6. Add input validation (MEDIUM)
7. Strengthen CSP (MEDIUM)
8. Add SSRF protection (HIGH)
9. Improve image validation (MEDIUM)
10. Add security logging (LOW)

