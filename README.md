# HyprDoc

HyprDoc is a live-contract platform built on SvelteKit + Convex.

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

