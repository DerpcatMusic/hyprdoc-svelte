# Integrations Roadmap

> Status: **Planned** (Horizon 2-4)

## Overview

HyprDoc integrations connect contracts to external business systems, enabling:
- Automatic data population
- Real-time status updates  
- Payment tracking
- Notification delivery
- Workflow automation

## Integration Tiers

### Tier 1: Payment & Finance (Horizon 2)

| Integration | Purpose | Priority | Complexity |
|-------------|---------|----------|------------|
| **Stripe** | Payment tracking, invoicing | Critical | Medium |
| **Polar** | Open-source friendly payments | High | Low |
| **Wisepay** | International payments | Medium | Medium |

#### Stripe Integration Spec

**Capabilities:**
- Detect payments matching contract amounts
- Auto-update payment status in Live View
- Generate invoices from payment blocks
- Handle subscriptions/recurring payments

**Implementation:**
```typescript
// Webhook handler
app.post('/api/webhooks/stripe', async (req) => {
  const event = stripe.webhooks.constructEvent(req.body, sig, secret);
  
  if (event.type === 'payment_intent.succeeded') {
    const payment = event.data.object;
    // Match to contract by metadata or amount
    await updateContractPaymentStatus(payment);
  }
});
```

**Required Blocks:**
- `stripe-payment` - Connected payment button
- `stripe-invoice` - Invoice generator

---

### Tier 2: CRM & Data (Horizon 2-3)

| Integration | Purpose | Priority | Complexity |
|-------------|---------|----------|------------|
| **HubSpot** | Contact sync, deal tracking | High | Medium |
| **Airtable** | Flexible data source | Medium | Low |
| **Google Sheets** | Simple data sync | Low | Low |

#### HubSpot Integration Spec

**Capabilities:**
- Autofill contracts from CRM contacts
- Create deals when contracts are signed
- Update deal status based on contract status
- Sync contact information

**Implementation:**
- OAuth2 connection flow
- Bidirectional sync via webhooks
- Field mapping configuration

---

### Tier 3: Productivity (Horizon 3)

| Integration | Purpose | Priority | Complexity |
|-------------|---------|----------|------------|
| **Slack** | Notifications, approvals | High | Low |
| **Google Calendar** | Deadline sync | Medium | Low |
| **Linear** | Issue/task creation | Medium | Low |
| **Zapier** | No-code connections | High | Medium |

#### Slack Integration Spec

**Capabilities:**
- Notify on contract events (signed, payment due, etc.)
- Approval workflows via Slack buttons
- Channel per contract (optional)

**Notification Types:**
- `contract.signed` → "🎉 Contract #1234 was signed by John Doe"
- `payment.due` → "💰 Payment of $5,000 due in 3 days for Contract #1234"
- `payment.overdue` → "⚠️ Payment overdue for Contract #1234"
- `milestone.completed` → "✅ Phase 1 marked complete on Contract #1234"

---

### Tier 4: Verification (Horizon 3-4)

| Integration | Purpose | Priority | Complexity |
|-------------|---------|----------|------------|
| **ID Verification** | Identity check for high-value | Medium | High |
| **Receipt Scanning** | Payment proof uploads | Medium | Medium |
| **Document Verification** | Supporting doc validation | Low | High |

#### ID Verification Spec

**Providers to evaluate:**
- Stripe Identity
- Jumio
- Onfido
- Veriff

**Use Cases:**
- High-value contracts (> $10,000)
- Regulatory requirements
- International signers

---

## Integration Architecture

### Connection Flow

```
User → OAuth/API Key → HyprDoc stores credentials → Periodic sync + webhooks
```

### Data Model

```typescript
integrations: defineTable({
  userId: v.id("users"),
  provider: v.string(), // "stripe", "hubspot", etc.
  status: v.union(v.literal("connected"), v.literal("disconnected"), v.literal("error")),
  credentials: v.string(), // Encrypted
  settings: v.object({
    // Provider-specific settings
  }),
  lastSyncAt: v.optional(v.number()),
  error: v.optional(v.string()),
})
```

### Webhook Infrastructure

```typescript
// Generic webhook receiver
app.post('/api/webhooks/:provider', async (req) => {
  const { provider } = req.params;
  const handler = webhookHandlers[provider];
  
  if (!handler) {
    return res.status(404).send('Unknown provider');
  }
  
  const verified = await handler.verify(req);
  if (!verified) {
    return res.status(401).send('Invalid signature');
  }
  
  await handler.process(req.body);
  return res.status(200).send('OK');
});
```

## Integration Blocks

Each integration can provide custom Smart Blocks:

| Block | Integration | Purpose |
|-------|-------------|---------|
| `stripe-payment` | Stripe | Payment button with tracking |
| `hubspot-contact` | HubSpot | Contact picker with autofill |
| `calendar-deadline` | Google Cal | Deadline with auto-sync |
| `api-connector` | Generic | Custom API data binding |

## Settings UI

```
Settings → Integrations
├── Payments
│   ├── Stripe [Connected ✓] [Disconnect]
│   ├── Polar [Connect]
│   └── Wisepay [Connect]
├── CRM
│   ├── HubSpot [Connect]
│   └── Airtable [Connect]
├── Productivity
│   ├── Slack [Connect]
│   ├── Google Calendar [Connect]
│   └── Linear [Connect]
└── Verification
    └── ID Verification [Configure]
```

## Open Questions

1. How to handle credential refresh/expiry?
2. Rate limiting strategy for each provider?
3. Data residency concerns for EU customers?
4. Fallback when integration is disconnected mid-contract?
