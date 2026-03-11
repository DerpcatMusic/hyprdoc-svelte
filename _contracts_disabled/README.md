# Living Contract System - Implementation Guide

## Overview
This directory contains the **living contract foundation** for Hyprdoc, implementing a state-driven agreement engine with:
- **Hierarchical block system** with robust parent-child relationships
- **Zod v4 validation** for runtime type safety
- **Convex-helpers integration** for tree traversal and mutations
- **Merkle tree cryptography** for legal integrity
- **Immutable audit trails** for compliance

---

## Architecture

### Directory Structure
```
convex/contracts/
├── schema.ts        # Hierarchical Convex schema for envelopes, templates, blocks
├── validators.ts    # Zod v4 validators for type-safe inputs/outputs
├── helpers.ts       # Convex-helpers utilities for tree operations
├── mutations.ts     # Core mutations (create, sign, move, delete)
└── README.md        # This file
```

### Hierarchical Model
```
Envelope (Contract Container)
  └── Template (Reusable Structure)
       └── Block (Hierarchical Content)
            └── Child Blocks (Nested Content)
                 └── Grandchild Blocks...
```

**Key Features**:
- Each block knows its **parent** and **children**
- Blocks track their **depth** in the tree
- Blocks maintain their **position** among siblings
- Tree operations (move, delete) update all relationships

---

## Schema Highlights

### Envelopes
```typescript
envelopes: defineTable({
  title: v.string(),
  envelopeNumber: v.string(), // "ENV-2026-001"
  templateId: v.optional(v.id('templates')),
  status: v.union(...),
  category: v.union(...),
  jurisdiction: v.union(...),
  documentJSON: v.any(), // Tiptap content
  yState: v.optional(v.bytes()), // Yjs CRDT state
  merkleRoot: v.optional(v.string()), // Root hash
  liveBlocks: v.array(...), // Live API bindings
  parties: v.array(...), // Signers
  signatures: v.array(...),
  // ...
})
```

### Blocks (Hierarchical)
```typescript
blocks: defineTable({
  blockId: v.string(),
  type: v.union('paragraph', 'heading', 'table', 'list', 'signature', 'liveData', ...),
  
  // HIERARCHY
  parentBlockId: v.optional(v.string()), // null = root block
  childBlockIds: v.array(v.string()), // Ordered children
  depth: v.number(), // 0 = root, 1 = child, 2 = grandchild...
  position: v.number(), // Order among siblings
  
  // CONTENT
  content: v.any(), // ProseMirror JSON
  attrs: v.object({
    isLive: v.boolean(),
    apiSource: v.optional(...), // For live blocks
    dataSchema: v.optional(v.string()), // Zod schema
    // ...
  }),
  
  // INTEGRITY
  hash: v.string(), // SHA-256
  version: v.number(),
  lastModified: v.number(),
  modifiedBy: v.id('users'),
})
```

### Templates
```typescript
templates: defineTable({
  name: v.string(),
  version: v.string(), // Semantic versioning
  parentTemplateId: v.optional(v.id('templates')), // For versioning
  isLatestVersion: v.boolean(),
  structure: v.any(), // Base Tiptap JSON
  requiredClauses: v.array(...), // Legal compliance
  variables: v.array(...), // {{placeholders}}
  rootBlockIds: v.array(v.string()), // Top-level blocks
  compliance: v.object(...),
  // ...
})
```

---

## Key Utilities (helpers.ts)

### Hierarchical Traversal
```typescript
// Get all descendants (children, grandchildren...)
const descendants = await getDescendantBlocks(ctx, blockId);

// Get all ancestors (parent, grandparent...)
const ancestors = await getAncestorBlocks(ctx, blockId);

// Get siblings (blocks with same parent)
const siblings = await getSiblingBlocks(ctx, blockId);

// Get root blocks for envelope/template
const roots = await getRootBlocks(ctx, { envelopeId });
```

### Tree Mutations
```typescript
// Move a block to a new parent
await moveBlock(ctx, {
  blockId: 'block-123',
  newParentId: 'block-456', // or undefined for root
  newPosition: 2,
});

// Delete a block and all descendants
const deletedCount = await deleteBlockTree(ctx, blockId);
```

### Merkle Tree Operations
```typescript
// Hash a single block
const hash = hashBlock(block);

// Compute Merkle root from block hashes
const root = computeMerkleRoot(blockHashes);

// Generate proof for a specific block
const proof = await generateMerkleProof(ctx, envelopeId, blockId);
// { blockHash, siblingHashes, rootHash }
```

### Signature & Compliance
```typescript
// Check if all required parties have signed
const allSigned = await areAllPartiesSigned(ctx, envelopeId);

// Get pending signers
const pending = await getPendingSigners(ctx, envelopeId);
// [{ partyId, name, email }, ...]
```

---

## Usage Examples

### 1. Create Envelope with Hierarchical Blocks
```typescript
import { api } from '../_generated/api';

// Create envelope
const { envelopeId } = await ctx.runMutation(api.contracts.mutations.createEnvelope, {
  title: 'Mutual NDA',
  category: 'commercial',
  jurisdiction: 'US',
  parties: [
    { partyId: 'party-1', name: 'Acme Corp', email: 'legal@acme.com', ... },
    { partyId: 'party-2', name: 'Wayne Enterprises', email: 'legal@wayne.com', ... },
  ],
  documentJSON: { ... },
});

// Add root block (paragraph)
await ctx.runMutation(api.contracts.mutations.addBlock, {
  envelopeId,
  blockId: 'block-intro',
  type: 'paragraph',
  parentBlockId: undefined, // Root block
  position: 0,
  content: { type: 'paragraph', content: [{ type: 'text', text: 'This Agreement...' }] },
  attrs: { isEditable: true, isRequired: true, isLive: false, ... },
});

// Add child block (list under paragraph)
await ctx.runMutation(api.contracts.mutations.addBlock, {
  envelopeId,
  blockId: 'block-terms',
  type: 'list',
  parentBlockId: 'block-intro', // Child of intro
  position: 0,
  content: { ... },
  attrs: { ... },
});
```

### 2. Sign with Merkle Tree Snapshot
```typescript
const result = await ctx.runMutation(api.contracts.mutations.signEnvelope, {
  envelopeId,
  partyId: 'party-1',
  signatureType: 'US_ESIGN',
  signatureValue: 'base64_signature_data',
});

console.log(result);
// {
//   signatureHash: '7a8f9e...',
//   snapshotId: 'snapshot_1737318000_signature',
//   merkleRoot: '0x1a2b3c...',
//   allSigned: false,
//   pendingSigners: [{ partyId: 'party-2', name: 'Wayne Enterprises', ... }]
// }
```

### 3. Query with Full Block Tree
```typescript
const data = await ctx.runQuery(api.contracts.mutations.getEnvelopeWithBlocks, {
  envelopeId,
});

console.log(data);
// {
//   envelope: { ... },
//   blockTree: [
//     {
//       blockId: 'block-intro',
//       type: 'paragraph',
//       depth: 0,
//       descendants: [
//         { blockId: 'block-terms', type: 'list', dept h: 1, descendants: [...] },
//       ],
//     },
//   ],
// }
```

---

## Zod v4 Validation

All inputs and outputs are validated using **Zod v4** schemas:

```typescript
import {
  createEnvelopeInputSchema,
  signEnvelopeInputSchema,
  updateBlockInputSchema,
} from './validators';

// Validate envelope creation
const validated = createEnvelopeInputSchema.parse(input);

// Type-safe inference
type CreateEnvelopeInput = z.infer<typeof createEnvelopeInputSchema>;
```

See `validators.ts` for full list of schemas.

---

## Parent-Child Relationship Guarantees

The system enforces:
1. **Referential Integrity**: Parent always knows its children, children know parent
2. **Depth Consistency**: Depth is always calculated correctly
3. **Position Ordering**: Siblings maintain consistent order
4. **Cascade Operations**: Deleting a parent deletes all descendants
5. **Reparenting Safety**: Moving blocks updates both old and new parents

Example invariant checks:
```typescript
// A block's depth = parent's depth + 1
assert(block.depth === (parent?.depth ?? -1) + 1);

// A block is in its parent's childBlockIds
assert(parent.childBlockIds.includes(block.blockId));

// No circular references (block cannot be its own ancestor)
assert(!ancestors.some(a => a.blockId === block.blockId));
```

---

## Next Steps

**Phase 1 Remaining**:
- [ ] Tiptap extensions for live blocks
- [ ] Yjs integration for real-time collaboration
- [ ] Device fingerprinting for audit logs

**Phase 2**:
- [ ] API binding execution engine
- [ ] Webhook notification system
- [ ] Template marketplace

**Phase 3**:
- [ ] eIDAS 2.0 compliance
- [ ] GDPR pseudonymization
- [ ] Certificate of Completion generation

---

## Legal & Compliance

This system is designed for:
- **SOX Compliance**: 7-year retention, immutable logs
- **HIPAA**: Encrypted storage, access control
- **GDPR**: Right to erasure (via pseudonymization)
- **eIDAS/ESIGN**: Multi-tier signature support
- **UCC/Common Law**: Dynamic contract validity

---

## Contributing

When adding new features:
1. Update schema in `schema.ts`
2. Add Zod validators in `validators.ts`
3. Create helpers in `helpers.ts` if needed
4. Write mutations in `mutations.ts`
5. Update this README

---

**Version**: 1.0.0  
**Created**: 2026-01-19  
**Author**: Antigravity AI Agent
