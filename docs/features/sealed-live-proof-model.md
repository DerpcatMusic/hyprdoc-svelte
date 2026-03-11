# Sealed Live Proof Model

## Goal
Keep the signed document legally immutable while allowing selected smart blocks to update in real time after seal.

This model exists to support:
- live post-sign contract dashboards
- CRM and integration-driven updates
- offline proof verification
- obvious UI trust boundaries

## Non-Negotiables
1. The sealed payload never changes after seal.
2. Post-seal updates are append-only events, not document rewrites.
3. A live block may update operational state after seal only if that state is outside the signed semantic payload.
4. Any change to legal meaning requires a new revision and a new signature flow.

## Layer Model

### Sealed Layer
The sealed layer is the legal record.

- `sealHash`
- canonical snapshot of document meaning
- canonical snapshot of sealed blocks
- signer evidence and timestamps

This is what gets signed.

### Live Layer
The live layer is operational state anchored to the sealed layer.

- append-only live block events
- derived live state
- integration signals
- viewer acknowledgements

This is what keeps moving after signing.

## Hash Model

### 1. `sealHash`
Hash of the canonical sealed document snapshot.

Includes:
- title
- canonical document content
- sealed block data
- settings that affect meaning
- signing-relevant party metadata

Does not include:
- viewer UI preferences
- ephemeral cursors
- comments that are not part of signed meaning
- post-seal live values

### 2. `sealedBlockHash`
Hash of one block as it existed at seal time.

Use this as the immutable anchor for every future live event involving that block.

### 3. `parentAnchorHash`
Immutable parent reference for block graph verification.

For a child block:
- point to the parent block's sealed anchor when available
- never rewrite this because a live child update happened

This avoids cascading full-tree rehashing on every live mutation.

### 4. `previousEventHash`
Pointer to the prior live event for the same block or stream.

This creates the append-only live chain.

### 5. `eventHash`
Hash of one canonical live event.

Canonical input:
- `documentId`
- `blockId`
- `type`
- `at`
- `actor`
- `baseSealHash`
- `sealedBlockHash`
- `parentAnchorHash`
- `previousEventHash`
- canonical mutation payload

### 6. `stateHash`
Hash of the current derived live state for a block or document.

Use this for:
- cheap verification
- checkpoints
- cache invalidation

Do not treat `stateHash` as the legal source of truth. The event chain is the source of truth.

## Event Schema

Every post-seal block update should look like this logically:

```ts
type LiveBlockEvent = {
  eventId: string;
  documentId: string;
  blockId: string;
  type:
    | "field_value_set"
    | "status_changed"
    | "calculation_refreshed"
    | "integration_synced"
    | "note_appended"
    | "acknowledged";
  at: number;
  actor: {
    source: "system" | "owner" | "signer" | "integration";
    workosId?: string;
    memberId?: string;
    displayName?: string;
  };
  baseSealHash: string;
  sealedBlockHash: string;
  parentAnchorHash?: string;
  previousEventHash?: string;
  eventHash: string;
  mutation: {
    op: "set" | "unset" | "append" | "remove" | "replace";
    path: string;
    value?: unknown;
    previousValue?: unknown;
    metadata?: Record<string, unknown>;
  };
};
```

## Which Blocks May Update Post-Seal

Allowed:
- payment tracker
- milestone tracker
- delivery status
- CRM mirror fields
- balance or formula blocks derived from live state
- operational notes

Not allowed without new revision:
- core clause text
- obligations
- dates that change legal commitment
- parties
- signature blocks
- signed consent language

Rule:
- operational update -> append live event
- semantic or legal update -> create new revision and re-sign

## Viewer Freshness Model

To support "older version of this block" highlighting, track both:
- `currentEventHash`
- `acknowledgedEventHash`

If they differ:
- the viewer is behind
- the block should visually pulse or glow
- clicking the block should reveal a diff/event drawer

Suggested UI states:
- `fresh`: viewer is at current head
- `updated-unseen`: new head exists, viewer has not acknowledged it
- `stale-view`: client is rendering an older derived state

## Real-Time UX Rules

When a live block changes after seal:
1. Keep the sealed content visually stable.
2. Update only the live panel or the live overlay area of the block.
3. Show an explicit badge such as `Live update`.
4. If the viewer is behind, use a subtle pulse until the new state is opened or acknowledged.
5. Always let the user inspect:
   - previous value
   - current value
   - source
   - time
   - proof hash

## Integration Model

External systems should never rewrite the sealed document directly.

Instead:
1. Connector normalizes incoming CRM/payment/product data into a HyprDoc signal.
2. Signal becomes a canonical live event.
3. Derived live state updates the allowed block surfaces.
4. Audit entry is written for the connector action.

Recommended external source fields:
- `integration`
- `externalObjectType`
- `externalObjectId`
- `receivedAt`
- `sourceEventId`
- `idempotencyKey`

## Rust/WASM Boundary

Rust should own:
- canonical serialization
- hash generation
- event verification
- state replay verification
- proof bundle verification

TypeScript should own:
- block rendering
- editor UX
- live subscriptions
- integration adapters

Convex should own:
- append-only persistence
- auth and authorization
- queries and workflow triggers

## Implementation Sequence

### Phase 1
- Freeze the shared type contract in `packages/domain-types`.
- Stop mixing sealed document updates and live updates.
- Add explicit `live-capable` block metadata.

### Phase 2
- Move canonical block and event hashing into a Rust crate compiled to WASM.
- Verify hashes in both backend tests and browser viewer code.

### Phase 3
- Add per-block live head tracking and viewer acknowledgement tracking.
- Implement glow/pulse state for unseen live updates.

### Phase 4
- Add CRM and payment connectors as signal producers.
- Add proof inspection drawer per live block event.

## First Principle
HyprDoc should not behave like "an editable signed page."

It should behave like:
- an immutable signed agreement
- with a separately provable live operational layer
- where every trusted update is inspectable, replayable, and anchored to the original seal
