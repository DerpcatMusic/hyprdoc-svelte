# Feature Request: Track Changes / Redlining

**Status**: Planned for future implementation  
**Priority**: Medium  
**Tier**: Pro users only

## Description
Implement a track changes / redlining system for collaborative document editing, similar to Google Docs or Microsoft Word's suggestion mode.

## Previous Implementation (Removed)
A basic track changes system was previously implemented but removed during backend cleanup on 2026-01-13.

### Old Schema
```typescript
documentChanges table:
- changeType: "insertion" | "deletion" | "replacement"
- originalContent / newContent
- position / endPosition
- status: "pending" | "accepted" | "rejected"
- authorId, authorName, authorColor
- changeId for tracking
```

### Old Functions
- Mutations: `createChange`, `resolveChange`, `bulkResolveChanges`, `deleteChange`
- Queries: `listPendingChanges`, `listAllChanges`, `getChangeStats`, `getChangesByAuthor`

## Requirements for New Implementation

### Backend (Convex)
- [ ] Create `documentChanges` table in `schema.ts`
- [ ] Add RLS rules to `lib/core.ts`
- [ ] Implement mutations in `documentChanges/mutations.ts`
- [ ] Implement queries in `documentChanges/queries.ts`
- [ ] Add triggers for audit logging

### Frontend (Tiptap + Svelte 5)
- [ ] Tiptap extension for change tracking
- [ ] Visual indicators (insertions=green, deletions=red strikethrough)
- [ ] Author color assignment (consistent per user)
- [ ] Accept/Reject change buttons
- [ ] Accept/Reject all changes
- [ ] Side panel for managing changes
- [ ] Change statistics display

### UX Details
- Hoverable change tooltips (author, timestamp, comment)
- Keyboard shortcuts: `Ctrl+Shift+A` (accept), `Ctrl+Shift+R` (reject)
- Real-time updates when collaborators accept/reject changes
- Export to PDF with/without changes visible

## Technical Notes
- Only available for Pro tier users
- Requires real-time sync (ProseMirror Sync) for multi-user editing
- Consider using Yjs for conflict resolution
- Store changes as JSON in database for queryability

## Priority Justification
Medium priority - this is a premium feature that differentiates HyprDoc from basic editors. Essential for legal/enterprise use cases where document revision history is critical.
