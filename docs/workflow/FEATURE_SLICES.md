# Feature Slices

## Active core path

Template -> Envelope -> Seal -> Sign -> Dashboard

## Next slices

### Slice 1

Persist canonical smart blocks into `documents.blocks`.

Definition of done:

- editor updates keep `content` and `blocks` in sync
- template clone preserves canonical blocks
- envelope dashboard can trust `documents.blocks`

### Slice 2

Replace loose `partyId` assignment with stable slot linkage.

Definition of done:

- template blocks reference stable slot identity
- cloned envelope slots remain mappable to signer assignments
- send-for-signing no longer relies on party order alone

### Slice 3

Signer-side smart block submission for text inputs and signatures.

Definition of done:

- signer sees assigned blocks
- non-signature values persist
- required-block completion can be computed server-side

### Slice 4

Session completion must validate assigned required blocks.

Definition of done:

- incomplete required fields block completion
- signature records reference actual block IDs
- audit trail shows completion basis

### Slice 5

Rust migration of remaining proof primitives.

Definition of done:

- TS proof helpers call or mirror the Rust kernel
- state hash added to Rust
- contract-core hashing converges on one canonical implementation

### Slice 6

Completion artifacts.

Definition of done:

- completed hash set
- certificate generated
- signed artifact export path defined
