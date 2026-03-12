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

## Transitional Source Bridge

Phoenix now expects an upstream runtime source while the cutover is still in progress.

- `RUNTIME_SOURCE_BASE_URL`
  Set this to the SvelteKit app base URL, not the Phoenix runtime URL.
- `RUNTIME_SOURCE_SECRET`
  Shared secret Phoenix sends to the SvelteKit runtime source routes.

The SvelteKit source routes live under:

- `/api/runtime/source/contracts/:document_id`
- `/api/runtime/source/contracts/:document_id/mutations`

Those routes bypass the normal runtime gateway and hit Convex directly so Phoenix
can sit in front without creating a request loop.

## Intended Commands

```bash
cd apps/runtime
mix deps.get
mix ecto.create
mix phx.server
```

## Immediate Next Steps
1. Compile and normalize the scaffold with local Elixir tooling.
2. Replace the transitional HTTP source adapter with native Phoenix persistence.
3. Add persistence schemas for envelopes, live block events, and chain heads.
