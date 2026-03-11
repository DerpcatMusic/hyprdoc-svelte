# HyprDoc Architecture (Canonical)

## Stack
- Current frontend: SvelteKit 5 + Tiptap v3 + UnoCSS.
- Transitional backend: Convex modular monolith.
- Target runtime: Phoenix for orchestration and realtime runtime concerns.
- Proof kernel: Rust for deterministic hashing and verification.
- Security primitives: SHA-256 hashing, append-only audit/event logs, server-side invariants.

## Core Domain
- `Template`: editable source document.
- `Envelope`: cloned immutable signing instance created from a template snapshot.
- `Sealed Envelope`: envelope with fixed `contentHash` and `sealedAt`; content/blocks become immutable.
- `Live Contract State`: mutable operational state layered on top of a sealed envelope without mutating sealed content.

## Non-Negotiable Invariants
1. Envelope creation must clone template state (`template -> envelope`).
2. Template edits never mutate existing envelopes.
3. Sealed envelope content is immutable.
4. Significant lifecycle transitions are auditable.
5. Live updates are event-driven and hash-chained; they do not rewrite sealed payload.

## Data Model (High Signal)
- `documents`: template/envelope dual model with `kind`, `sourceTemplateId`, `contentHash`, `sealedAt`, `version`.
- `documentVersions`: append-only snapshots for version history.
- `auditLogs`: append-only operational and security trail.
- `liveContractStates`: current deterministic live state anchored to `baseSealHash`.
- `liveContractEvents`: append-only hash-chained event stream (`previousHash` -> `eventHash`).
- `blockLineageEvents`: append-only per-block hash lineage (`previousBlockHash` + optional `parentAnchorHash`).

## Lifecycle
1. Authoring: create/edit template.
2. Clone: create envelope from template snapshot.
3. Seal/send: compute deterministic seal hash and lock content.
4. Sign: signer assignment, auth challenges, signature recording, completion.
5. Live operation: ingest external/internal signals to update only `liveContractStates`.

## Live Contract Security Model
- Sealed content hash is immutable (`documents.contentHash`).
- Live state hash is deterministic (`liveContractStates.stateHash`) using canonical serialization.
- Each live event includes `previousHash` and `eventHash` for tamper evidence.
- Each block mutation writes a lineage event with:
  - `blockHash` (current block payload),
  - `previousBlockHash` (prior state),
  - `parentAnchorHash` (hash of parent/creator block when provided),
  - `lineageHash` (tamper-evident linkage hash),
  - `reason` + `how` for why/how traceability.
- Rules/actions are data-driven only; no dynamic code execution.
- All writes enforced server-side in Convex functions.

## Module Ownership
- `convex/documents/*`: template/envelope create/update/query flows.
- `convex/signing.ts`: seal + signing session + signer auth/signature lifecycle.
- `convex/liveContracts.ts`: live state initialization, signal ingestion, queued action execution, event feed.
- `convex/lib/services/sealing_service.ts`: lock/seal semantics.
- `convex/lib/crypto.ts`, `convex/lib/stable_json.ts`: deterministic hashing utilities.

## Current Focus
1. Cohesive UI/token cleanup.
2. Stronger envelope lifecycle immutability and audit completeness.
3. Smart block schema hardening.
4. Live state orchestration (notifications, integrations, rule-action engine) on top of sealed envelopes.

## Target Direction
- Keep Svelte for authoring/sign/view UX.
- Move live contract orchestration into Phoenix.
- Keep deterministic proof and verification logic in Rust.
- Preserve the sealed/live split throughout migration.
