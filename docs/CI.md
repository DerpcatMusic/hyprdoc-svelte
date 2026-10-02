# CI

This follows CI baseline PR #44. The `Quality Gate` still runs validation, production build and Rust proof tests in one job. `conclusion` now requires that job to actually succeed, including on the existing merge-queue event. No checks are omitted to hide existing failures.

Bun 1.4.0 is fixed in the workflow. Previously both Bun lockfile formats were ignored: `--frozen-lockfile` with no file did not provide a committed dependency resolution, and every cache key hashed a missing file. `bun.lock` now records the manifest's resolved versions and is required before installation. The package manifest is unchanged. Review this initial lock resolution with the PR; it is not a claim of compatibility with every previously installed version.

Only Bun's download cache is restored, not node_modules. Rust caching keys include toolchain/build inputs and the committed Cargo lock, and tests use `--locked`. The Rust stable toolchain channel is retained.

Local commands: `bun install --frozen-lockfile`, `bun run validate`, `bun run build`, and `cargo test --locked --manifest-path rust/hyprproof-core/Cargo.toml`. Validation combines Svelte/TypeScript checking and Biome rules; the build checks bundling; Rust tests check proof logic.

## Baseline blockers

A clean checkout currently fails SvelteKit synchronization on `/(marketing)/signup`, which has both a page and a server route while prerendering is enabled. Generated Convex files are also ignored. Those application/setup issues need separate work; this PR does not run Convex codegen, use production secrets or relax the gate.

## Why this shape

GitHub recommends [minimum token permissions](https://docs.github.com/en/actions/tutorials/authenticate-with-github_token), [scoped concurrency](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency), and [full action commit pins](https://docs.github.com/en/actions/reference/security/secure-use). Validation cancels obsolete runs without changing deployment queues. Ubuntu 24.04 is explicit so the upcoming ubuntu-latest image migration does not silently change this lane. Required jobs have no workflow-level path exclusions, which can otherwise leave a required result pending.
