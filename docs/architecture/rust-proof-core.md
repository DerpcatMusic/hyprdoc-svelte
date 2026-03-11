# Rust Proof Core

HyprDoc needs one place where canonical hashing, lineage hashing, and offline verification stay deterministic across the browser, backend, and exported artifacts. That place should be Rust.

## Scope

The Rust core owns:

- canonical JSON normalization
- seal hash generation
- smart-block snapshot hashing
- signature payload hashing
- live event hash generation
- block lineage hash generation
- offline verification entrypoints

The TypeScript app keeps ownership of:

- SvelteKit UI
- Convex orchestration and persistence
- CRM/integration workflows
- dashboard rendering

## Why this split works

- The proof kernel stays tiny and auditable.
- The frontend and backend can both call the same logic through WASM or an HTTP sidecar later.
- Signed artifacts are no longer tied to one JS runtime's serialization behavior.
- New proof operations can be added without forcing a UI rewrite.

## Initial crate

`rust/hyprproof-core` is the first kernel crate. It currently exposes:

- `compute_seal_hash`
- `compute_block_hash`
- `compute_signature_hash`
- `compute_live_event_hash`
- `compute_lineage_hash`

These mirror the current TypeScript proof primitives closely enough to start migration without breaking existing flows.

## Current browser seam

The first browser-consumable WASM output now lives in:

- `packages/contract-core/src/wasm/hyprproof_core.js`
- `packages/contract-core/src/wasm/hyprproof_core_bg.wasm`

The shared adapter entrypoint is:

- `packages/contract-core/src/index.ts`

That package is the intended import surface for Svelte routes and future verification UI. App code should not import the generated WASM glue directly.

## Build path

For this workspace, the repeatable build command is:

- `bun run proof:rust:wasm`

That command:

1. builds `rust/hyprproof-core` for `wasm32-unknown-unknown`
2. runs local `wasm-bindgen`
3. refreshes the generated package files in `packages/contract-core/src/wasm`

## Expansion path

1. Add a thin WASM package for browser-side verification.
2. Add a Rust sidecar or API service for heavy verification/export jobs.
3. Move Convex proof writes behind a shared request contract.
4. Make `.hypr` export verification call this kernel directly.

## Guardrails

- Do not move workflow or auth policy into Rust first.
- Move deterministic proof math first.
- Keep the Rust inputs plain JSON contracts so SvelteKit, Convex, and future APIs can share them.
