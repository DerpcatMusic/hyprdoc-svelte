# HyprDoc Execution Plan

Last updated: 2026-03-07

## Core thesis

HyprDoc wins by shipping a live signed document system, not a prettier PDF workflow.

The product wedge is:

- author a reusable template
- clone it into an envelope
- seal the canonical snapshot
- collect signatures
- keep a post-seal live state layer that never rewrites sealed meaning
- show the whole proof surface in a first-class envelope dashboard

## What must work first

This is the current v1 contract path:

1. Template authoring in the editor
2. Envelope creation from a template
3. Slot-based signer assignment
4. OTP-gated signing
5. Sealed envelope dashboard
6. Basic smart blocks:
   text input
   signature
7. Deterministic proof kernel in Rust for canonical hashing

## Current reality

What is already real:

- templates and envelopes exist in the unified `documents` model
- template -> envelope cloning exists
- signing sessions, signer assignments, OTP, signatures, and completion exist
- block lineage and live contract state tables exist
- the editor-side smart block node system exists
- the sealed envelope dashboard route exists
- a first Rust proof crate exists

What is still broken or incomplete:

- signer portal still does not persist non-signature smart block values
- smart blocks are not yet a canonical backend snapshot across the full flow
- slot identity and frontend `partyId` are not reconciled tightly enough
- signature evidence still has the `signatures.signerId` mismatch
- certificate/export completion is still incomplete

## Non-negotiables

- never mutate signed meaning after seal
- keep post-seal live state append-only and separately verifiable
- treat Rust as the proof kernel, not as a rewrite target for UI or Convex orchestration
- do not expand scope until template -> envelope -> sign -> dashboard is reliable

## Phase plan

### Phase 1: Harden the golden path

Ship a boring but reliable path:

- template -> envelope cloning
- slot cloning and signer assignment
- signer portal that targets real signature blocks
- envelope dashboard with seal, session, signer, lineage, and live-state evidence
- fix critical signing/security mismatches

Exit criteria:

- one template can reliably produce one envelope
- signers can complete an assigned signature block end-to-end
- envelope dashboard shows the sealed artifact and proof rail

### Phase 2: Canonical smart blocks

Make smart blocks a first-class backend concept:

- persist a normalized block snapshot into `documents.blocks`
- bind editor block assignment to stable slot identity
- compute signer-specific worklists from the sealed snapshot
- validate required-block completion before session completion
- persist non-signature field values for signer assignments

Exit criteria:

- text input and signature blocks work deterministically through the full flow
- backend can answer:
  which blocks belong to which signer
  which required blocks are complete
  what exact block snapshot was sealed

### Phase 3: Rust proof migration

Move deterministic proof math behind one shared kernel:

- canonical JSON normalization
- seal hash generation
- audit hash helpers
- live event hash generation
- lineage hash generation
- state hash generation

Exit criteria:

- TS proof helpers become adapters over the Rust kernel or match it exactly
- browser/offline verification can rely on the same deterministic logic

### Phase 4: Live-after-signing

Add the actual differentiator:

- append-only live block events
- CRM/integration writes against live state
- per-block freshness indicators
- stale viewer highlighting and pulse affordances
- downloadable `.hypr` artifact plan

Exit criteria:

- live state updates without invalidating the seal
- viewers can distinguish sealed content from live overlays

## Scope boundaries

### In scope now

- basic smart blocks
- proof kernel
- dashboard
- signing correctness
- cleanup of obviously dead code

### Deferred until the golden path is stable

- giant AI feature expansion
- payments
- rich contract automation
- multi-runtime collaboration transport rewrite
- broad PDF ingestion ambitions
- enterprise packaging beyond proof/evidence essentials

## Immediate engineering backlog

1. Fix `signatures.signerId` so it points to the right identity model.
2. Persist a canonical smart-block snapshot and stop treating `documents.blocks` as secondary.
3. Reconcile `partyId` and cloned `slots`.
4. Add persistence for text-input smart block submissions.
5. Make signer completion validate required assigned blocks.
6. Replace remaining TS proof helpers with Rust-backed equivalents.
7. Finish evidence outputs:
   completed hash
   certificate
   signed artifact export

## Cleanup lane

Use `knip` as a scoped cleanup tool, not a delete-all button.

Safe first candidates:

- dead barrel files
- disabled extensions already excluded from tsconfig
- detached landing/envelope component namespaces with no imports
- unused certificate/import helpers after confirmation

Do not mass-delete UI primitives or Convex barrels until the refined `knip` config has been re-run.
