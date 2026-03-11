# HyprDoc Runtime

This directory is the Phoenix runtime scaffold for the endgame HyprDoc stack.

## Purpose
Own the parts of HyprDoc that behave like a live workflow engine:

- envelope lifecycle orchestration
- signer routing and transitions
- post-seal live block authorization
- integration ingestion
- realtime event fanout

It should not own:

- the editor UI
- smart block authoring UX
- proof math and canonical hashing

## Expected Runtime Boundary

- `HyprdocRuntime.LiveContracts`: policy checks and live mutation orchestration
- `HyprdocRuntime.Envelopes`: immutable envelope lifecycle
- `HyprdocRuntime.ProofClient`: adapter to the Rust proof kernel

## Notes
- `mix` is not installed in the current workspace, so this scaffold was added manually.
- Once Elixir tooling is available, the next step is to run normal Phoenix setup and compile this app.

## Intended Commands

```bash
cd apps/runtime
mix deps.get
mix ecto.create
mix phx.server
```

## Immediate Next Steps
1. Compile and normalize the scaffold with local Elixir tooling.
2. Add persistence schemas for envelopes, live block events, and chain heads.
3. Replace placeholder controllers with the first real runtime endpoint.
