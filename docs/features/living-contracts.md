# Living Contracts Feature Specification

> Status: **Planned** (Horizon 3)
> Priority: **High**
> Size: **Epic**

## Overview

Living Contracts is the core innovation of HyprDoc - contracts that stay alive after signing, providing a real-time dashboard for the business relationship.

## Problem Statement

Today, after a contract is signed:
- It gets saved as a PDF and forgotten
- Payment tracking happens in spreadsheets
- Deliverable tracking happens in Jira/Asana
- Renewal dates are in Google Calendar
- Disputes are handled via email threads

**The contract - the source of truth - becomes disconnected from reality.**

## Solution

Every signed HyprDoc contract has two views:

1. **Sealed View** (Left Panel)
   - Cryptographically secured PDF
   - Immutable record of what was agreed
   - Legal evidence

2. **Live View** (Right Panel)
   - Dynamic dashboard
   - Real-time status of payments, deliverables, deadlines
   - Actions: remind, mark paid, dispute, amend

## User Stories

### As a Contract Owner (Admin)
- I want to see payment status in my contract so I don't need a spreadsheet
- I want automatic reminders before deadlines so I don't miss them
- I want to message my client within the contract context
- I want to propose amendments and track approval

### As a Contract Signer (Client)
- I want to see what I owe and when
- I want to see deliverable progress
- I want to mark my payments as made
- I want to communicate with the other party

## Technical Requirements

### New Database Schema

```typescript
// Live state separate from sealed document
liveState: defineTable({
  documentId: v.id("documents"),
  
  // Payment tracking
  payments: v.array(v.object({
    id: v.string(),
    dueDate: v.number(),
    amount: v.number(),
    currency: v.string(),
    status: v.union(v.literal("pending"), v.literal("paid"), v.literal("overdue")),
    paidAt: v.optional(v.number()),
    paidAmount: v.optional(v.number()),
    notes: v.optional(v.string()),
  })),
  
  // Milestone tracking
  milestones: v.array(v.object({
    id: v.string(),
    title: v.string(),
    dueDate: v.optional(v.number()),
    status: v.union(v.literal("pending"), v.literal("in_progress"), v.literal("completed")),
    completedAt: v.optional(v.number()),
    completionPercent: v.optional(v.number()),
  })),
  
  // Messages
  messages: v.array(v.object({
    id: v.string(),
    senderId: v.string(),
    content: v.string(),
    createdAt: v.number(),
  })),
  
  // Amendments
  amendments: v.array(v.object({
    id: v.string(),
    proposedBy: v.string(),
    description: v.string(),
    status: v.union(v.literal("proposed"), v.literal("accepted"), v.literal("rejected")),
    createdAt: v.number(),
    resolvedAt: v.optional(v.number()),
  })),
})
```

### New Living Blocks

| Block | Attributes | Live Behavior |
|-------|------------|---------------|
| `payment-tracker` | schedule, currency | Shows payment table, status, actions |
| `milestone-tracker` | phases[] | Shows progress, completion % |
| `countdown` | targetDate, alertDays | Shows countdown, sends alerts |
| `balance` | sourceBlocks[] | Calculates running total |
| `message-thread` | - | In-contract communication |

### UI Components

- `DualViewContainer.svelte` - Split view layout
- `SealedPanel.svelte` - PDF viewer (left)
- `LivePanel.svelte` - Dashboard (right)
- `PaymentTable.svelte` - Payment status grid
- `MilestoneList.svelte` - Deliverable progress
- `MessageThread.svelte` - Communication
- `AmendmentFlow.svelte` - Change proposals

### Event System

```typescript
// Blocks emit events
interface BlockEvent {
  type: 'payment_due' | 'payment_overdue' | 'milestone_complete' | 'deadline_approaching';
  blockId: string;
  documentId: string;
  data: Record<string, unknown>;
  timestamp: number;
}

// Handlers respond
interface EventHandler {
  trigger: BlockEvent['type'];
  condition?: string; // e.g., "daysUntil < 7"
  action: 'notify' | 'email' | 'slack' | 'webhook';
  target: string;
}
```

## Design Mockups

```
+------------------------------------------------------------------+
|  [← Back to Dashboard]        Contract #1234        [Actions ▼]  |
+------------------------------------------------------------------+
|                              |                                    |
|    SEALED DOCUMENT           |    LIVE DASHBOARD                 |
|    ─────────────────         |    ──────────────────              |
|                              |                                    |
|    ┌──────────────────┐      |    Payment Status                 |
|    │                  │      |    ┌────────────────────────────┐ |
|    │  [PDF Preview]   │      |    │ Jan 15  $5,000  ✅ Paid    │ |
|    │                  │      |    │ Feb 15  $5,000  ⏳ Due 3d  │ |
|    │                  │      |    │ Mar 15  $5,000  ○ Pending  │ |
|    │                  │      |    └────────────────────────────┘ |
|    │                  │      |                                    |
|    │                  │      |    Deliverables                   |
|    │                  │      |    ┌────────────────────────────┐ |
|    │                  │      |    │ ✅ Phase 1: Design         │ |
|    │                  │      |    │ 🔄 Phase 2: Dev (60%)      │ |
|    │                  │      |    │ ○  Phase 3: Launch         │ |
|    │                  │      |    └────────────────────────────┘ |
|    │                  │      |                                    |
|    │                  │      |    [+ Add Note] [Propose Change]  |
|    │                  │      |                                    |
|    └──────────────────┘      |                                    |
|                              |                                    |
+------------------------------------------------------------------+
```

## Dependencies

- Horizon 1 complete (core editor working)
- Horizon 2 complete (share & fill flow)
- Event system architecture
- Notification infrastructure

## Success Metrics

- Users return to view contract status (not just sign)
- Users stop using external spreadsheets
- "Can't go back to regular contracts" feedback
- Reduced payment disputes due to transparency

## Open Questions

1. Can both parties edit live state, or only owner?
2. How do we handle disputes? Formal process or just messages?
3. Should amendments create a new sealed version?
4. How much history to keep?

## Related Issues

- [FEATURE] Payment Tracker Block
- [FEATURE] Milestone Tracker Block
- [FEATURE] In-Contract Messaging
- [FEATURE] Amendment Workflow
