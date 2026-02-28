# HyprDoc Editor Agent Guide

## Mission
Build a fast, modular block editor for template authoring and envelope signing with strict consistency between UI, schema, and audit semantics.

## Scope
- Block definitions: `src/lib/blocks/definitions/*.block.ts`
- Block components: `src/lib/blocks/components/*Block.svelte`
- Block registry: `src/lib/blocks/registry/block-registry.svelte.ts`
- Node view bridge: `src/lib/editor/extensions/BlockView.svelte`
- Properties panel: `src/lib/components/editor/properties/*`

## Editing Mode Contract
Every block interaction must respect mode boundaries:
1. `edit`: template authoring, full controls.
2. `sign`: signer interaction only for eligible assigned blocks.
3. `view`: read-only final presentation.

## Block Module Contract
1. Every block definition must include typed schema and defaults for `data`.
2. `assignable` behavior must be explicit and honored in UI and backend.
3. Block metadata should be ready for integrity features (hash inclusion, signing role, lock behavior).
4. Do not bypass `blockRegistry` for ad-hoc block wiring.

## Node View and Sync Rules
1. Avoid raw per-keystroke ProseMirror writes when data can be buffered.
2. Prevent feedback loops between node view and properties panel updates.
3. Validate payload shape before persisting block `data`.
4. Preserve editor responsiveness under dense block documents.

## UI Consistency Rules
1. Use semantic token classes and shared UI primitives.
2. Avoid hard-coded color hex values in feature components.
3. Reuse common CTA/input/control variants across dashboard, onboarding, and editor.
4. Keep typography/spacing on shared presets instead of one-off class stacks.

## Validation
Run `bun run validate` before merge.