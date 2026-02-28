# Living Contracts

## Goal
Keep a contract legally immutable while allowing trusted operational updates over time.

## Model
- **Sealed Layer**: `documents.content`, `documents.blocks`, `documents.contentHash`, `documents.sealedAt`.
- **Live Layer**:
  - `liveContractStates` (current state anchored to `baseSealHash`).
  - `liveContractEvents` (append-only, hash-chained).

The live layer never mutates sealed envelope payload.

## Implemented Backend
- `initializeLiveContract`:
  - Requires sealed envelope.
  - Creates deterministic initial live state hash.
- `ingestSignal`:
  - Updates variable state from trusted signal input.
  - Evaluates requirements.
  - Enqueues actions when requirements are met.
  - Appends hash-chained events.
- `executePendingAction`:
  - Marks queued action complete/failed.
  - Appends execution event.
- `getLiveContract`:
  - Returns state + latest event feed + seal anchor info.

## Security/Integrity
- Deterministic hashing with canonical JSON serialization.
- Event chain with `previousHash` -> `eventHash`.
- Block lineage chain for block-level mutations:
  - `blockHash` links to `previousBlockHash`.
  - Optional `parentAnchorHash` links child blocks to creator/parent block lineage.
  - `reason` and `how` recorded for each block lineage update.
- No dynamic JS execution for rules/actions.
- Server-side ownership/invariant checks for all writes.

## Next Steps
1. Add scheduler worker to process pending actions.
2. Expose dual-panel Sealed/Live UI.
3. Add event proof export for legal evidence bundles.
