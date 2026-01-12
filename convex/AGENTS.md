# HyprDoc Convex Guide

Focus on maintainability, security, and high performance in the serverless backend.

## 1. Best Practices & Standards
- **Return Validators**: ALWAYS use `returns: v...` for public queries/mutations. Use shared validators from `lib/validators.ts`.
- **Internal Functions**: Use `internalMutation` and `internalQuery` for system-only tasks (e.g., audit logging, usage tracking).
- **Indexing**: 
  - Frequently queried fields MUST be indexed (e.g., `by_owner`, `by_email`).
  - Use compound indexes for complex filters (e.g., `by_owner_and_status`).
- **Actions**: Use for side effects (AI, Email, Polar API). NEVER perform side effects in mutations.

## 2. Unified Document Model
HyprDoc uses a shared schema between Next.js and SvelteKit.
- **Documents Table**: Holds both Templates and Envelopes (`kind: 'template' | 'envelope'`).
- **Source Link**: Envelopes link back to parents via `sourceTemplateId`.
- **Blocks**: Rich content is stored as an array of Zod-validated blocks.

## 3. Hybrid Auth System
- **Primary (WorkOS)**: Standard SSO/Social login for account holders.
- **Guest Access**: Non-account holders use Guest Access Tokens.
- **OTP Verification**: `requestGuestOtp` + `verifyGuestOtp` provides temporary `guestAccessToken` for secure collaboration without registration.

## 4. Multi-Channel Sharing Logic
- **Public Slug**: `sharedSigningSlug` enables O(1) public access for "One Link" signing.
- **Temp Invites**: `tempInviteLinks` for restricted, multi-use links with expiration.
- **Direct Collaboration**: `documentMembers` for named users with specific roles (`viewer`, `editor`, `admin`).

## 5. Scheduler & Crons
- **Async Side Effects**: Use `ctx.scheduler.runAfter(0, ...)` for non-blocking tasks like audit logging and email notifications.
- **Crons (`crons.ts`)**:
  - `cleanup expired otps`: Hourly maintenance.
  - `send signing reminders`: Daily automated follow-ups.
  - `reset daily usage`: Midnight UTC counter resets.
  - `expire subscriptions`: Daily Polar.sh sync.

## 6. Access Control
Use `lib/auth.ts` helpers:
- `requireAuth(ctx)`: Ensures WorkOS identity.
- `requireDocumentAccess(ctx, id, role, guestToken?)`: Unified permission check for owners, members, and guests.
