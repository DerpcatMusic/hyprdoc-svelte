# Phoenix Runtime Migration

## Branch Intent
This branch starts the endgame stack transition:

- keep Svelte for product UX
- introduce Phoenix for runtime orchestration
- keep Rust as the proof kernel

## Scope Now

### In scope
- define the target runtime boundary
- scaffold a Phoenix app under `apps/runtime`
- define shared contracts for live block policy and proof verification

### Out of scope
- deleting Convex today
- moving the entire auth system today
- rewriting the editor
- replacing the current deployment topology in one pass

## Runtime Responsibilities

Phoenix should eventually own:

- envelope creation orchestration
- sealing pipeline orchestration
- signer assignment and delivery workflows
- post-seal live block mutation authorization
- integration webhooks and normalization
- event broadcasting and audit projections

Rust should own:

- seal hash computation
- live mutation hash computation
- block lineage verification
- event replay verification
- proof bundle verification

Svelte should own:

- document authoring
- smart block editing
- sign/view UI
- live block visualization
- evidence inspection UI

## First Migration Cuts

1. Freeze shared contracts in `packages/domain-types`.
2. Add Phoenix modules for:
   - live block policy evaluation
   - post-seal mutation validation
   - contract validity projection
3. Define a proof client boundary that Phoenix uses instead of owning hashing logic.
4. Move one thin runtime read/write path behind Phoenix before broader migration.

## Cutover Strategy

### Read path first
Expose Phoenix projections for live contract state while Svelte still uses the current write path.

### Then mutation path
Route one authorized post-seal mutation flow through Phoenix.

### Then lifecycle path
Move envelope and signing orchestration after the live runtime path is stable.

## Failure Conditions
Abort or pause migration if:

- policy contracts are still unstable
- sealed/live boundaries remain mixed in current data models
- proof verification is still duplicated across runtimes

Those are architecture blockers, not implementation details.
