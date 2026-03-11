# Delivery Workflow

## Goal

Ship HyprDoc in small, reviewable slices instead of giant unstable rewrites.

## Cadence

Each slice follows the same loop:

1. Define the smallest feature that moves the contract path forward.
2. Implement it on an isolated branch.
3. Validate it locally.
4. Review for regressions and security holes.
5. Merge only when the slice is coherent.

## Slice rules

- One slice should solve one problem.
- Do not mix infrastructure cleanup with product behavior unless they are directly coupled.
- Do not merge speculative abstractions without one real consumer.
- Rust slices should only move deterministic proof logic, not Convex orchestration.

## Branch naming

- `feat/envelope-dashboard-proof-rail`
- `feat/smart-block-snapshot`
- `feat/signer-block-submission`
- `feat/rust-proof-state-hash`
- `chore/knip-safe-cleanup`

## Minimum validation per slice

- relevant unit tests
- relevant route/query smoke test
- manual proof that the targeted user flow still works
- one short written review summary

## Review checklist

- Is there one clear source of truth?
- Did the slice add hard-coded IDs or state drift?
- Does sealed state remain immutable?
- Is any new Convex public function properly protected?
- Did we move deterministic logic into Rust only when it is actually pure?

## Merge rule

Do not merge a slice that increases ambiguity in:

- slot identity
- block snapshot ownership
- signer completion rules
- seal hash inputs
- live-state mutation boundaries

## Current feature order

1. Smart block snapshot persistence
2. Slot reconciliation between editor and signer assignments
3. Signer-side block submission
4. Required-block completion checks
5. Rust migration of remaining proof helpers
6. Evidence export and completion artifacts
