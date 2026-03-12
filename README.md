# HyprDoc

HyprDoc is a live-contract platform moving toward an endgame stack of SvelteKit + Phoenix + Rust.

## License

This repository is source-available under `PolyForm Noncommercial 1.0.0`.
You may not use copied source from this repository for commercial or monetized use.
See [LICENSE](./LICENSE).

## Workspace Layout
- `.`: primary SvelteKit app and current transitional backend.
- `apps/runtime`: Phoenix runtime scaffold for live-contract orchestration.
- `packages/domain-types`: shared domain event/types contract.
- `packages/contract-core`: deterministic canonicalization/hash helpers and Rust/WASM adapter boundary.
- `rust/hyprproof-core`: Rust proof kernel.

## What It Does
- Author reusable templates.
- Clone templates into envelopes for signing runs.
- Seal envelopes with deterministic hashes for legal immutability.
- Run a live operational layer (signals, requirements, automations) without mutating sealed content.

## Core Principles
1. Template edits never mutate existing envelopes.
2. Sealed envelope content is immutable.
3. Live contract behavior happens in a separate hash-chained event/state layer.
4. Server-side invariants enforce legal integrity.

## Main Docs
- Architecture: [ARCHITECTURE.md](./ARCHITECTURE.md)
- Endgame stack: [docs/architecture/endgame-stack.md](./docs/architecture/endgame-stack.md)
- Agent operating rules: [AGENTS.md](./AGENTS.md)
- Product docs: `docs/`

## Development
```bash
bun install
bun run dev
```

## Validation
```bash
bun run validate
bun run build
```
