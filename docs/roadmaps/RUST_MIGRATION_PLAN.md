# Rust Migration Plan

Last updated: 2026-03-07

## Boundary

Rust owns deterministic proof logic.

TypeScript keeps:

- SvelteKit UI
- Convex queries, mutations, and auth
- workflow orchestration
- integrations and scheduling

## Immediate Rust targets

- canonical JSON normalization
- SHA-256 hash helpers
- seal hash generation
- shared contract-core hashing

Current crate:

- [rust/hyprproof-core/src/lib.rs](/home/derpcat/projects/queue/_hyprdoc_link/rust/hyprproof-core/src/lib.rs)

## Next Rust targets

- state hash generation for live contracts
- block hash helper
- audit hash helper
- WASM-facing JSON adapters for browser verification

## Keep in TypeScript

- OTP/token generation
- Convex DB access
- scheduler/audit orchestration
- browser-only heuristics and fingerprinting

## Migration order

1. Make TS helpers mirror the Rust crate exactly.
2. Add a thin TS adapter layer around the Rust/WASM contract.
3. Move `packages/contract-core` hashing onto the adapter.
4. Move Convex sealing/live/lineage hash functions onto the same adapter contract.
5. Add offline verifier/export consumers.

## Rule

If logic is deterministic, pure, and evidence-critical, it should migrate to Rust.

If logic is policy, storage, auth, or UI, it should stay in TypeScript.
