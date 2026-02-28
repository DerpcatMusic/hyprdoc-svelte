# HyprDoc Convex Agent Guide

## Core Rule
Import server wrappers from `convex/lib/core.ts`. Do not bypass shared auth/RLS/trigger behavior.

## Domain Invariants to Enforce Server-Side
1. A sent envelope is a cloned snapshot of a template at a specific version.
2. Template updates never mutate previously created envelopes.
3. Sealed/sent envelopes are content-immutable.
4. Every signing lifecycle transition is auditable and linked to version/hash metadata.

## Required Write Flows
1. `createTemplateDraft`
2. `updateTemplateDraft`
3. `createEnvelopeFromTemplate` (clone + `sourceTemplateId` + `instanceNumber`)
4. `sealEnvelope` (freeze content + store canonical hash/version)
5. `startSigningSession` (only for envelope records)
6. `recordSignature` / `completeEnvelope`

Do not mix template edits and envelope-signing writes in one mutation path.

## Data Rules
1. `documents.kind` must be authoritative (`template` or `envelope`).
2. Envelope rows must always include `sourceTemplateId`.
3. Template `instanceCount` must update atomically with envelope creation.
4. Envelope content updates must be rejected once locked/sealed.
5. Party assignments and signer bindings must be validated by ID and ownership.

## Audit and Versioning Rules
1. Persist a version snapshot before seal/send.
2. Persist the sealed hash used for signature verification.
3. Attach audit entries to document ID and version/hash checkpoint.
4. Use append-only audit semantics for signing events.

## Implementation Rules
1. Prefer `protectedQuery` / `protectedMutation` for user paths.
2. Keep business logic in domain modules, not route handlers.
3. Keep mutations idempotent where retries are possible.
4. Avoid `any`; keep validators aligned with schema types.

## Validation
Run `bun run validate` before merge.