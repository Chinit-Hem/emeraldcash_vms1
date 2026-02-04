# Password Validation Fix - TODO

## Task: Fix "Password is too common" error for demo accounts

### Issue
The password validation in `src/app/api/auth/login/route.ts` rejects common passwords like "1234", but the demo users ( still use "123admin/staff)4" as their password. This prevents login to demo accounts.

### Plan
1. Update the hardcoded demo user passwords to be more secure
2. Generate new bcrypt hashes for the updated passwords
3. Update the weak password list if needed
4. Test the login functionality

### Files to modify:
- `src/app/api/auth/login/route.ts` - Update DEMO_USERS passwords and hashes

### Steps completed:
- [x] Analyze the codebase to understand the password validation logic
- [x] Identify the conflict between weak password validation and demo account passwords
- [x] Create a plan to fix the issue

### Steps pending:
- [ ] Update DEMO_USERS in login/route.ts with secure passwords and bcrypt hashes
- [ ] Verify the fix works correctly

