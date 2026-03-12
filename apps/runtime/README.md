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
- `SIGNING_SOURCE_BASE_URL`
  Optional signing bridge override. Defaults to `RUNTIME_SOURCE_BASE_URL`.
- `SIGNING_SOURCE_SECRET`
  Optional signing bridge override. Defaults to `RUNTIME_SOURCE_SECRET`.

The SvelteKit source routes live under:

- `/api/runtime/source/contracts/:document_id`
- `/api/runtime/source/contracts/:document_id/mutations`
- `/api/signing/source/sessions`
- `/api/signing/source/sessions/:session_id`
- `/api/signing/source/portal/:access_token`

Those routes bypass the normal runtime gateway and hit Convex directly so Phoenix
can sit in front without creating a request loop.

Phoenix now also fronts the signing lifecycle directly:

- `/api/signing/sessions`
- `/api/signing/sessions/:session_id/assignments`
- `/api/signing/sessions/:session_id/start`
- `/api/signing/portal/:access_token`
- `/api/signing/portal/:access_token/challenges`
- `/api/signing/portal/:access_token/signatures`
- `/api/signing/portal/:access_token/complete`

Phoenix also keeps a local in-memory cache of fetched projection envelopes and
forwarded mutation envelopes. That lets the runtime keep serving the last known
projection if the transitional source blips, but it is still not a substitute
for native persistence.

The current default source adapter is now composite:

- read from Phoenix cache first
- fall back to the HTTP source bridge on a cache miss
- write locally against the cached projection once a document has been bootstrapped

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
