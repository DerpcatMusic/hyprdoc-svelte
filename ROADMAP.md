# HyprDoc Roadmap (Execution)

## Phase 1: Cohesion + Invariants
- Remove stale docs/artifacts and keep one canonical architecture source.
- Enforce template/envelope/seal invariants server-side everywhere.
- Complete audit coverage for all lifecycle transitions.

## Phase 2: Live Contract Core
- Done baseline: `liveContractStates` + `liveContractEvents` + hash-chained eventing.
- Add scheduler-driven action execution (`notify`, `set_variable`, `append_note`).
- Add integration signal adapters (payments/CRM/webhooks).

## Phase 3: Productized Live Panels
- Build split Sealed/Live view UX.
- Requirement authoring UI (no code, schema-driven).
- Action history + explainability in UI.

## Phase 4: Compliance Hardening
- Signed exports that include sealed hash + live event proofs.
- Retention policy automation.
- Evidence bundles for legal/compliance review.

