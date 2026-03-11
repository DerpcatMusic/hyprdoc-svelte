# Endgame Stack

## Goal
Move HyprDoc toward an architecture that matches the product's actual shape:

- SvelteKit for authoring, signing, and viewing UX
- Phoenix for the live-contract runtime and orchestration layer
- Rust for proof-critical hashing, canonicalization, and verification

The key shift is conceptual:

- a contract is not just a document
- a contract is a sealed legal snapshot plus an authorized live runtime

## Why This Stack

### SvelteKit
Keep SvelteKit for:

- the editor
- smart block configuration
- signer flows
- live dashboards
- website-like contract rendering

The product surface is interaction-heavy and document-heavy. Svelte remains a strong fit.

### Phoenix
Move runtime orchestration to Phoenix for:

- long-lived workflow coordination
- realtime fanout
- integration ingestion
- durable state transitions
- supervised background processing

This backend is a workflow engine, not a CRUD API.

### Rust
Use Rust as the proof kernel for:

- canonical JSON normalization
- seal hash generation
- live event hash generation
- block lineage hashing
- offline proof verification
- evidence bundle verification

Rust should verify truth, not orchestrate product workflows.

## Runtime Model

### 1. Template
Mutable authoring source.

### 2. Envelope
Immutable clone of a template snapshot created for a signing run.

### 3. Seal
Creates the canonical legal payload and fixed `sealHash`.

### 4. Live Block Policy
Each smart block declares whether it may change after seal and under what conditions.

### 5. Authorized Mutation
Every post-seal change is an append-only event, never a document rewrite.

### 6. Validity Projection
The contract remains valid when:

- the sealed payload still matches the original `sealHash`
- every live mutation targets a block with an allowed policy
- every mutation is chained to the previous hash
- every mutation can be replayed deterministically

## Bounded Contexts

### Frontend
Owned by SvelteKit:

- template editor
- smart block node views
- authoring properties panels
- signer UI
- view mode and live overlays

### Runtime
Owned by Phoenix:

- envelope lifecycle orchestration
- signer assignment workflows
- post-seal live mutation authorization
- integration ingestion
- event broadcasting
- audit event projection

### Proof
Owned by Rust:

- canonical serialization
- hash generation
- replay verification
- exportable evidence verification

## Repo Target Layout

```text
.
├── apps/
│   └── runtime/               # Phoenix runtime app
├── rust/
│   └── hyprproof-core/        # Rust proof kernel
├── packages/
│   ├── contract-core/         # browser/server adapters to proof kernel
│   └── domain-types/          # shared contracts across UI/runtime/proof
└── src/                       # current SvelteKit app
```

## Migration Rules

1. Do not move editor/product UX out of Svelte unless there is a concrete runtime reason.
2. Do not move auth or workflow policy into Rust.
3. Do not let Phoenix mutate the sealed document payload after seal.
4. Treat live updates as event-sourced projections over the sealed base.
5. Move invariants and policies before moving incidental helpers.

## Migration Sequence

### Phase 0
- Keep the current SvelteKit app running.
- Add Phoenix runtime as a sibling app.
- Freeze shared runtime contracts in `packages/domain-types`.

### Phase 1
- Move live mutation authorization and projection logic into Phoenix.
- Keep Svelte reading from current backend until the new runtime API stabilizes.

### Phase 2
- Move envelope lifecycle orchestration from Convex to Phoenix.
- Keep proof logic delegated to Rust.

### Phase 3
- Reduce Convex to transitional or removable infrastructure.
- Make Svelte talk to Phoenix runtime APIs and realtime channels directly.

## Immediate Branch Outcome
This branch does not pretend to finish the rewrite. It creates:

- a Phoenix runtime scaffold
- shared live-runtime contracts
- migration documentation for the target architecture

That is the minimum viable starting point for a real stack transition.
