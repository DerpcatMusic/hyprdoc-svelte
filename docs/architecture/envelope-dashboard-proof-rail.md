# Envelope Dashboard Proof Rail

## Purpose

The protected envelope route is the first place where HyprDoc shows all three trust layers together:

- sealed document artifact
- live post-seal operational state
- audit and proof metadata

This route should stay read-heavy and projection-heavy. It is not the place to invent new sources of truth.

## Current Files

- route: `src/routes/(protected)/envelope/[documentId]/+page.svelte`
- dashboard query: `convex/envelopes/queries.ts`
- block status UI: `src/lib/components/envelope/EnvelopeLiveBlockStatusList.svelte`
- shared envelope UI types: `src/lib/components/envelope/types.ts`
- proof kernel: `rust/hyprproof-core/src/lib.rs`
- portable proof adapter boundary: `packages/contract-core/src/index.ts`

## Source Of Truth

### Sealed document

The envelope document row is the sealed artifact source of truth:

- `documents.title`
- `documents.content`
- `documents.blocks`
- `documents.settings`
- `documents.contentHash`
- `documents.sealedAt`

The left-hand document viewer should render from this envelope snapshot only.

### Signer state

The current signer/session truth comes from:

- `signingSessions`
- `signerAssignments`
- `signatures`

The envelope dashboard query projects this into `signatureState` and `signerAssignments`.

### Live state

The live operational layer comes from:

- `liveContractStates`
- `liveContractEvents`

This data is append-only in intent. The query should project a per-block head, not rewrite the sealed document snapshot.

### Block lineage

The sealed or structural proof trail comes from:

- `blockLineageEvents`

This is the anchor for block hashes, lineage hashes, and parent anchor hashes.

## Query Contract

`convex/envelopes/queries.ts#getDashboard` is the aggregation point.

It is responsible for:

- loading the envelope document and source template
- loading current signing session state
- loading signatures and assignment field values
- loading live state and live events
- loading block lineage events
- rebuilding canonical smart blocks from `documents.blocks`, with `content` parsing fallback for legacy documents
- projecting `currentSmartBlocks`

`currentSmartBlocks` is the right-rail block truth. Do not throw data away in the route if the UI may need it later.

## Smart Block Projection

Each projected block currently carries:

- static sealed snapshot fields
- lineage proof fields
- signer completion fields
- live freshness fields
- UI projection fields

Important fields:

- `lineage.blockHash`
- `lineage.lineageHash`
- `live.currentEventHash`
- `live.lastEventAt`
- `live.matchedBy`
- `currentValue`
- `ui`

## Viewer Freshness

The route keeps a local viewer acknowledgement map in browser storage:

- key prefix: `hyprdoc:envelope:block-acks:`

This is intentionally client-local for now.

Meaning:

- server truth says what the current live head is
- client-local ack says whether this viewer has already opened that head

If `live.currentEventHash !== acknowledgedHash`, the block is projected as `updated` and continues pulsing until selected.

This is a UX acknowledgement, not legal evidence. If we later need shared acknowledgement, it should move into append-only live events or a dedicated viewer-state table.

## Clocking

Fresh/stale transitions cannot rely on Convex pushes alone.

The route owns a local ticking `renderNow` value so stale badges transition even when the underlying query result does not change.

## Rust Boundary

`rust/hyprproof-core` owns deterministic proof math:

- seal hash
- block hash
- signature hash
- live event hash
- lineage hash

The dashboard now uses Rust-backed browser verification through:

- `packages/contract-core/src/index.ts`
- `packages/contract-core/src/wasm/*`

Current usage:

- the envelope route recomputes the seal hash in-browser
- the recomputed hash is compared against `documents.contentHash`
- the right rail surfaces `Rust proof verified`, `Seal mismatch`, or `Verifier unavailable`

This is verification-only. The server remains the source of truth for persisted seal hashes.

Recommended order:

1. server-side replacement of TypeScript seal hashing
2. server-side replacement of lineage/live hashing
3. broader block/event proof inspection UI
4. export-time `.hypr` proof verification

## Rules

- Never mutate the sealed payload after seal.
- Never use live state to rewrite the document viewer payload.
- Never compute a block proof from ad hoc UI state.
- Keep the query authoritative and the route projection thin.
- Keep viewer acknowledgement explicitly separate from proof state.
