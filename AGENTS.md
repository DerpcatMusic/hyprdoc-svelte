# HyprDoc Agent Guide

This repo builds HyprDoc as a modular live-contract platform on SvelteKit 5 + Convex.

## Product Goal
Replace static PDF workflows with programmable, re-signable, auditable contract pages.

## Execution Priority (Current)
1. Frontend consistency baseline (token drift removal, shared UI primitives, mode clarity).
2. Envelope lifecycle correctness (template->envelope clone, seal immutability, signing transitions).
3. Block platform hardening (schema-first block data, node-view sync, performance).
4. Audit/hash integrity foundations (deterministic hashes, append-only lifecycle records).

## Agent Lanes (Use in Parallel)
- `UI Consistency Agent`: semantic tokens, shared variants, `edit/sign/view` parity.
- `Editor/Blocks Agent`: Tiptap node views, block schemas, properties-panel synchronization.
- `Lifecycle/Convex Agent`: template/envelope invariants, authz, sealing and signature state machine.
- `Audit/Version Agent`: immutable version checkpoints, hash-chain correctness, export evidence.

Lane contract:
1. Never bypass domain invariants to satisfy UI behavior.
2. Keep write ownership explicit per bounded context.
3. Prefer refactors that reduce duplication and lock in shared primitives.

## Domain Vocabulary
- `Template`: reusable source document.
- `Envelope`: immutable snapshot created from a template version for a signing run.
- `Party`: abstract assignable slot on a document (not a real person).
- `Signer`: real recipient bound to a party during envelope send.
- `Smart Block`: typed Tiptap block with schema, UI, and signing/audit metadata.

## Non-Negotiable Invariants
1. Sending an envelope must clone the current template state into a new envelope record.
2. Template edits must never mutate existing envelopes.
3. After sealing/sending, envelope content is immutable; only signing lifecycle fields may change.
4. Every significant transition must be auditable: draft edit, envelope creation, seal, assignment, signature, completion.
5. Block data must be schema-valid before persistence and before hash/signature generation.

## Core Stack
- Framework: SvelteKit 5 with runes.
- Styling: UnoCSS + semantic design tokens.
- Editor: Tiptap v3 with custom block node views.
- State: class-based runes stores (`*.svelte.ts`).
- Backend: Convex modular monolith.

## Architecture Baseline
Keep a modular monolith until scaling metrics force service splits.

Bounded contexts:
- `Authoring`: template editing and block composition.
- `Envelope Lifecycle`: snapshot creation, sealing, signing state transitions.
- `Party and Assignment`: party slots, signer binding, routing.
- `Audit and Versioning`: immutable snapshots, chainable logs, export history.
- `Rendering and Export`: live doc views, PDF export, downstream integrations.

## Frontend Rules
1. Use Svelte 5 runes only (`$state`, `$derived`, `$effect`, `$props`, `$bindable`).
2. Use semantic tokens and shared UI primitives; avoid hard-coded color hex values in feature components.
3. Reuse shared component variants for CTA/button/input patterns; avoid per-page style forks.
4. Keep mode-aware behavior explicit (`edit`, `sign`, `view`) in editor components.
5. No duplicated color preset arrays across editor controls; pull from shared palette constants.
6. Do not add `.bak`, scratch outputs, or generated debug artifacts to tracked source.

## Smart Block Rules
1. Definitions live in `src/lib/blocks/definitions/*.block.ts`.
2. Block UI components live in `src/lib/blocks/components/*Block.svelte`.
3. Each block definition must provide:
   - Typed schema for `data`.
   - `assignable` policy.
   - Category and default data.
   - Hash/signing metadata when it participates in sealing/signature integrity.
4. Registration must remain centralized via `src/lib/blocks/registry/block-registry.svelte.ts`.

## Tiptap-Svelte Bridge Rules
1. Node view synchronization must avoid per-keystroke write storms.
2. Use debounced updates and `untrack`-safe synchronization to prevent feedback loops.
3. Validate block payloads before `updateAttributes`.
4. Do not let properties panel and node view race on the same attrs without conflict strategy.

## Convex Rules
1. Import wrappers from `convex/lib/core.ts`.
2. Enforce envelope/template invariants server-side, not only in UI.
3. Create envelopes via explicit clone mutation (`template -> envelope`) with version metadata.
4. Enforce lock checks after sealing before any content mutation.
5. Write audit entries with references to version/hash checkpoints.
6. Hashing used for integrity verification must be deterministic for identical version payloads.

## Validation
Run from repo root:
- `bun run dev`
- `bun run validate` (required before merge)
- `bun run build`

Completion checklist:
1. No broken invariants for template/envelope behavior.
2. No new UI token drift.
3. No untyped `any` added without reason.
4. Validation passes.
