# HyprDoc Vision

> **Contracts that think, adapt, and act.**

HyprDoc is pioneering the **Living Contract** - a paradigm shift from static PDFs to dynamic, data-connected business relationships.

---

## The Core Philosophy

### What We Believe

1. **Contracts are relationships, not documents**
   - A signed PDF is just a snapshot. The real value is in the ongoing relationship.

2. **The contract should be the source of truth**
   - Not spreadsheets, not Jira, not email threads. The contract itself.

3. **Contracts should work for you, not the other way around**
   - Automatic reminders, live tracking, proactive alerts.

4. **Simplicity wins**
   - We're not building another DocuSign clone. We're building something new.

---

## The Living Contract Architecture

### The Dual-State Model

Every HyprDoc contract exists in two parallel states:

```
+----------------------------------+    +----------------------------------+
|      SEALED STATE                |    |      LIVE STATE                  |
|      (Immutable)                 |    |      (Dynamic)                   |
|                                  |    |                                  |
|  - Cryptographic hash            |    |  - Payment tracking              |
|  - Original terms                |    |  - Deliverable status            |
|  - Signature records             |    |  - Running balances              |
|  - Legal timestamp               |    |  - Communication thread          |
|  - PDF snapshot                  |    |  - Amendment history             |
|                                  |    |  - Real-time calculations        |
|  "What we agreed to"             |    |  "What's actually happening"     |
+----------------------------------+    +----------------------------------+
```

### The User Experience

When a user opens a signed contract, they see:

- **Left Panel**: The sealed PDF - the legal record of what was agreed
- **Right Panel**: The live dashboard - payment status, milestones, alerts, actions

This dual-view is the core innovation. The sealed version PROVES the live version.

---

## The HyprDoc Flow

```
CREATE -> EDIT -> SHARE -> FILL -> SIGN -> LIVE
   |        |        |        |       |       |
   v        v        v        v       v       v
Template  Smart   Generate  Recipient  Legal   Dynamic
AI Gen    Blocks   Link     Fills     Record  Dashboard
```

### What Makes Us Different

| Traditional CLM | HyprDoc |
|-----------------|---------|
| Contract -> PDF -> Folder -> Forget | Contract -> Living Dashboard |
| Track payments in QuickBooks | Track payments IN the contract |
| Track deliverables in Jira | Track deliverables IN the contract |
| Renewals in Google Calendar | Contract itself reminds you |
| Disputes via email threads | Dispute resolution IN the contract |

---

## Smart Blocks: The Foundation

Smart Blocks are dynamic, data-aware elements that can:

1. **Collect data** (forms, signatures, uploads)
2. **Display live information** (balances, status, dates)
3. **Trigger actions** (reminders, payments, notifications)
4. **Connect to external systems** (Stripe, CRM, calendars)

### Current Smart Blocks

| Block | Purpose |
|-------|---------|
| smart-text | Dynamic text fields |
| smart-number | Numeric inputs with formatting |
| smart-email | Email validation |
| checkbox | Boolean toggles |
| radio | Single-select options |
| select | Dropdown selections |
| signature | Draw/type signatures |
| formula | Calculated values |
| data-grid | Tabular data |

### Planned Living Blocks

| Block | Purpose |
|-------|---------|
| payment-tracker | Track payment schedules, status, history |
| milestone-tracker | Track deliverable phases and completion |
| countdown | Time-based alerts and deadlines |
| balance | Running totals (paid vs owed) |
| message-thread | In-contract communication |
| amendment | Track changes with approval workflow |
| api-connector | Live data from external sources |

---

## Integration Vision

### Tier 1: Payment & Finance
- **Stripe** - Payment tracking, auto-detect payments
- **Polar** - Open-source friendly payments
- **Wisepay** - International payments
- **ZohoBooks** - Accounting sync

### Tier 2: CRM & Data
- **HubSpot** - Contact sync, autofill
- **Airtable** - Flexible data source
- **Google Sheets** - Simple data sync

### Tier 3: Productivity
- **Slack** - Notifications, approvals
- **Linear** - Issue tracking integration
- **Google Calendar** - Deadline sync
- **Zapier** - No-code connections

### Tier 4: Verification
- **ID Scanning** - Identity verification for high-value contracts
- **Receipt Scanning** - Payment proof uploads

---

## The Onboarding Experience

Inspired by agree.com - when users sign up or sign a contract:

1. **Profile Collection**: Name, company, address, payment details
2. **Magic Autofill**: Pre-fill any contract with saved profile data
3. **One-Click Signing**: If profile is complete, signing is instant
4. **Account Dashboard**: View all contracts (as admin or signer)

---

## Competitive Positioning

### What Exists Today

| Platform | Focus | Weakness |
|----------|-------|----------|
| DocuSign | E-signature | Just signing, no lifecycle |
| Ironclad | CLM for enterprise | Expensive, complex |
| PandaDoc | Proposals + signing | Limited post-signature |
| agree.com | Modern signing | No dynamic contracts |

### HyprDoc's Blue Ocean

**We are the only platform where:**
1. Contracts have embedded intelligence (Smart Blocks)
2. Contracts stay alive after signing (Living Dashboard)
3. The contract IS the project management tool
4. Dynamic data binding connects contracts to reality

---

## Technical Principles

### Must Follow

- **Svelte 5 Runes only** - No legacy stores
- **Convex for real-time** - All data through Convex
- **Smart Block auto-discovery** - No manual registration
- **Type safety** - Zod + TypeScript, never `any`
- **Mobile-first** - Responsive by default

### Architecture Patterns

- **EditorEngine** - Central Tiptap orchestrator
- **Block Registry** - Auto-discover blocks via import.meta.glob
- **Living State** - Separate mutable state from sealed state
- **Event System** - Blocks emit events, handlers respond
- **Integration Layer** - Pluggable external connections

---

## Success Metrics

### Product-Market Fit Signals

- Users return to check contract status (not just to sign)
- Users stop using spreadsheets for payment tracking
- Users invite clients to view shared contract dashboard
- "I can't go back to regular contracts" feedback

### Technical Health

- Zero TypeScript `any` usage
- All Smart Blocks work in all modes (edit, preview, fill, sealed)
- Sub-second editor interactions
- Real-time sync with <100ms latency

---

## The Vision Statement

> **HyprDoc transforms contracts from static legal documents into living business relationships. When you sign a HyprDoc contract, you're not filing away a PDF - you're opening a dashboard that keeps both parties aligned, accountable, and informed throughout the entire relationship.**

---

## Related Documents

- [ROADMAP.md](./ROADMAP.md) - Phased implementation plan
- [features/](./features/) - Detailed feature specifications
- [architecture/](./architecture/) - Technical design documents
