# HyprDoc Roadmap

> Last updated: January 2026

This roadmap uses a **4-Horizon Model** to balance immediate execution with long-term vision.

---

## Horizon 1: NOW (0-4 weeks)

**Theme: Complete the Core**

The editor is 85% done. Let's get it to 100% and ship.

### Critical Path

| Task | Status | Priority |
|------|--------|----------|
| Fix Smart Block compilation errors (checkbox/radio) | TODO | Critical |
| Wire Export PDF button | TODO | Critical |
| Wire Share Link functionality | TODO | Critical |
| Complete EditorTopBar handlers | TODO | Critical |

### High Priority

| Task | Status | Priority |
|------|--------|----------|
| Implement Visibility Conditions logic | TODO | High |
| Complete Dashboard Settings view | TODO | High |
| Complete Dashboard "Signed by Me" view | TODO | High |
| Add more Slash Commands | TODO | High |
| Mobile responsive editor | TODO | High |

### Acceptance Criteria

- [ ] User can create a document from scratch
- [ ] User can add any Smart Block without errors
- [ ] User can export document as PDF
- [ ] User can generate and copy a share link
- [ ] Recipient can open share link and view document

---

## Horizon 2: NEXT (1-3 months)

**Theme: The Share & Fill Flow**

Enable non-authenticated users to fill documents.

### Features

| Feature | Description | Size |
|---------|-------------|------|
| `/view/[slug]` route | Public document viewing | Large |
| FillableEditor component | Interactive Smart Blocks in view mode | Large |
| Simplified signing | Single signature, no ceremony | Medium |
| User profiles & autofill | Save user data for magic autofill | Large |
| Onboarding flow | Collect user details (like agree.com) | Medium |
| Notification system | Email alerts for actions | Medium |

### Integrations (Phase 1)

| Integration | Purpose | Priority |
|-------------|---------|----------|
| Stripe | Payment tracking | High |
| Email (Resend/SendGrid) | Notifications | High |
| Google Calendar | Deadline sync | Medium |

### Acceptance Criteria

- [ ] Recipient can fill Smart Blocks without logging in
- [ ] Recipient can sign and download PDF
- [ ] Owner gets notified when document is filled/signed
- [ ] Stripe payments auto-update contract status

---

## Horizon 3: LATER (3-6 months)

**Theme: Living Contracts v1**

The core innovation - contracts that stay alive after signing.

### Living Blocks

| Block | Purpose |
|-------|---------|
| Payment Tracker | Track payment schedules, amounts, status |
| Milestone Tracker | Track deliverable phases, completion % |
| Countdown Block | Time-based alerts, deadlines |
| Balance Block | Running totals (paid vs owed) |
| Message Thread | In-contract communication |
| Amendment Block | Track changes with approval workflow |

### Architecture

| Component | Purpose |
|-----------|---------|
| Dual-View UI | Sealed (left) + Live (right) panels |
| Event System | Blocks emit events, handlers respond |
| Automation Engine | Triggers, conditions, actions |
| Notification Center | In-app + email + Slack |

### Integrations (Phase 2)

| Integration | Purpose |
|-------------|---------|
| HubSpot | CRM sync, contact autofill |
| Slack | Notifications, approvals |
| Zapier | No-code connections |
| Wisepay | International payments |

### Acceptance Criteria

- [ ] Signed contracts show dual-view (sealed + live)
- [ ] Payment status updates in real-time
- [ ] Both parties can see contract dashboard
- [ ] Automatic reminders work for upcoming deadlines

---

## Horizon 4: FUTURE (6-12 months)

**Theme: Platform & Ecosystem**

Become the operating system for business relationships.

### Platform Features

| Feature | Description |
|---------|-------------|
| Block Marketplace | Community-contributed Smart Blocks |
| API Platform | Third-party developers build integrations |
| White-label | Custom branding for agencies |
| Enterprise SSO | SAML, SCIM, audit logs |
| AI Contract Analysis | Risk scoring, clause detection |

### Advanced Living Blocks

| Block | Purpose |
|-------|---------|
| API Connector | Live data from external sources |
| SLA Monitor | Track performance metrics |
| Dispute Block | Formal dispute resolution |
| Renewal Automator | Auto-generate renewal docs |

### Integrations (Phase 3)

| Integration | Purpose |
|-------------|---------|
| Airtable | Flexible data source |
| ZohoBooks | Accounting sync |
| Linear | Issue tracking |
| ID Verification | High-value contract security |
| Receipt Scanning | Payment proof uploads |

### Acceptance Criteria

- [ ] External developers can create and publish blocks
- [ ] Contracts can pull live data from APIs
- [ ] Enterprise customers can white-label
- [ ] AI can analyze contracts for risks

---

## How to Use This Roadmap

### Adding Features

1. Create a GitHub Issue using the Feature Request template
2. Add appropriate labels (see below)
3. Reference this roadmap in the issue
4. Features will be triaged into the appropriate horizon

### Labels Reference

| Label | Meaning |
|-------|---------|
| `horizon-1` | NOW (0-4 weeks) |
| `horizon-2` | NEXT (1-3 months) |
| `horizon-3` | LATER (3-6 months) |
| `horizon-4` | FUTURE (6-12 months) |
| `critical` | Blocking core functionality |
| `high` | Significant user value |
| `medium` | Nice to have |
| `low` | Future consideration |

### Moving Items

- Items move from Horizon 2 → Horizon 1 when Horizon 1 is complete
- Items can be deprioritized by moving to a later horizon
- New urgent items can be added to any horizon

---

## Key Decisions Pending

These need resolution before certain features can be built:

1. **Document States**: Is `draft → published → filled` sufficient?
2. **Recipient Auth**: Require email before filling, or fully anonymous?
3. **Amendment Flow**: How do both parties approve changes?
4. **Pricing Model**: Affects which integrations to prioritize

---

## Success Metrics

### Horizon 1 Success

- Zero TypeScript errors in Smart Blocks
- Export PDF works 100% of the time
- Editor loads in < 2 seconds

### Horizon 2 Success

- Users successfully share and get filled documents
- Stripe integration auto-detects 90% of payments
- NPS > 50 from early users

### Horizon 3 Success

- Users check contract dashboard (not just sign)
- "I can't go back to regular contracts" feedback
- Churn < 5% monthly

### Horizon 4 Success

- Community-contributed blocks in marketplace
- Enterprise customers paying premium
- API usage growing month-over-month
