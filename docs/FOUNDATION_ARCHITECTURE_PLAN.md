# Foundation Architecture Plan (February 17, 2026)

## 1. Context and assumptions
- Goal: establish a reliable base for a live-contract platform (Svelte 5 + Runed + Tiptap v3 + Convex).
- Non-negotiable behavior:
  - Template edits never mutate existing envelopes.
  - Sending creates an envelope snapshot from the current template version.
  - Sealed envelope content is immutable.
  - Critical transitions are auditable and hash-verifiable.
- Current state from multi-agent audit:
  - Frontend token drift and duplicated style logic across onboarding/auth/dashboard/editor.
  - Editor has schema validation in node views but not consistently in the properties panel path.
  - Backend signing flow is largely aligned, but sealing hash was nondeterministic (now patched in `convex/lib/services/sealing_service.ts`).

## 2. Candidate architectures (2-3 options)
1. Hardened modular monolith (recommended):
   - Keep Convex + SvelteKit as one system.
   - Enforce internal bounded contexts and strict contracts.
2. Early microservices split:
   - Separate authoring/signing/audit services now.
   - Better isolation, but much higher complexity and slower delivery.
3. Monolith with event outbox:
   - Keep monolith write path, add outbox/event consumers for integrations and integrity anchoring.

## 3. Recommended architecture and rationale
- Recommendation: Option 1 now, evolve toward Option 3 when external integrations/anchoring pressure appears.
- Why:
  - Fastest path to correctness and consistency.
  - Lowest operational complexity while your domain model is still moving.
  - Preserves reversible decisions before high-scale constraints are real.
- Tradeoffs:
  - Less independent scaling today.
  - Requires strict module boundaries to avoid monolith sprawl.
  - Event-driven integrations are deferred, not eliminated.

## 4. Data model and consistency strategy
- Core records:
  - `documents` (`kind: template|envelope`, `status`, `sealedAt`, `sourceTemplateId`, `instanceNumber`).
  - `documentVersions` immutable snapshots.
  - `signingSessions`, `signerAssignments`, `signatures`.
  - `auditLogs` append-only lifecycle events.
- Write model:
  - Strong consistency for clone/seal/sign transitions.
  - Eventual consistency acceptable for dashboard analytics/read models.
- Required server checks:
  - Authoring mutations reject locked envelope edits.
  - Sending only accepts `kind=envelope` draft for session start.
  - Every signature references the sealed payload checkpoint.

## 5. Reliability and failure mode handling
- Failure mode: duplicate send clicks / retries.
  - Mitigation: idempotency key for send/session-start path.
- Failure mode: partial send (envelope exists but assignments incomplete).
  - Mitigation: explicit lifecycle statuses (`draft` -> `sealing` -> `pending_signatures`) with rollback/cancel behavior.
- Failure mode: node-view vs properties-panel conflicting writes.
  - Mitigation: one schema validation path used by both, plus deterministic write policy.

## 6. Security and compliance posture
- Convex mutations enforce ownership/authz; UI checks are not sufficient.
- Keep signature evidence + audit logs append-only.
- Hashes must be deterministic for repeat verification.
- Prepare for legal defensibility with version/hash references in each critical audit event.

## 7. Scalability and cost model
- Near-term projection assumption:
  - 20k MAU, 500k edits/month, 1M signer actions/month.
- Scaling strategy:
  - Keep request path stateless.
  - Queue heavy async work (email, PDF export, future chain anchoring).
  - Add read-optimized projections for dashboards before service split.

## 8. Delivery phases and migration plan
### Phase 0 (UI consistency, 1-2 weeks)
- Eliminate high-drift hex usage first:
  - `src/lib/components/auth/AuthModal.svelte`
  - `src/lib/components/onboarding/OnboardingWizard.svelte`
  - `src/lib/components/dashboard/SettingsView.svelte`
  - `src/lib/components/landing/Navbar.svelte`
  - `src/lib/components/landing/SovereignTerminal.svelte`
- Create shared palette constants and consume them in:
  - `src/lib/components/editor/properties/SmartColorPicker.svelte`
  - `src/lib/components/editor/toolbar/ToolbarColorPicker.svelte`
- Acceptance criteria:
  - no feature-level hard-coded brand hex outside token/palette modules,
  - no duplicated picker preset arrays,
  - `edit/sign/view` visuals use shared primitives.

### Phase 1 (backend lifecycle correctness, 1-2 weeks)
- Complete envelope lifecycle guards:
  - idempotent send/session start,
  - explicit sealing transaction status,
  - lock checks on all envelope content mutations.
- Ensure every send path uses template->envelope clone before signing.
- Acceptance criteria:
  - template edit cannot affect existing envelope,
  - post-seal content mutation always rejected server-side,
  - repeated send calls are safe.

### Phase 2 (block platform hardening, 1-2 weeks)
- Apply block schema validation to properties panel updates (not only node view).
- Reduce selection recomputation and heavy re-renders in properties panel.
- Add deterministic conflict handling for node-view/panel attr writes.

### Phase 3 (audit/version + integrity, 2 weeks)
- Standardize lifecycle audit event taxonomy.
- Ensure version/hash checkpoint linkage for send, seal, assign, sign, complete.
- Build verification endpoint/report for sealed envelope integrity checks.

### Phase 4 (advanced live-contract model, later)
- Controlled re-sign policies (threshold-based material change).
- Event outbox for external systems + optional blockchain anchoring.
- PDF export and verification bundle from live data + signed snapshot lineage.

## 9. Risks, unknowns, and decision log (ADR-style)
- ADR-001: modular monolith first. Status: accepted.
- ADR-002: envelope is immutable snapshot, never live-linked to template. Status: accepted.
- ADR-003: deterministic hash + audit chain before blockchain anchoring. Status: accepted.
- Open unknowns:
  - exact legal policy for “material change requires re-sign,”
  - canonical serialization rules for hash input across all smart block types,
  - public verification UX model for non-technical recipients.
