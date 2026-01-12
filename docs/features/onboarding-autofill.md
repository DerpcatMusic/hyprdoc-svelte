# Onboarding & Autofill Feature Specification

> Status: **Planned** (Horizon 2)
> Priority: **High**
> Size: **Large**

## Overview

A streamlined onboarding experience that collects user information once, then enables "magic autofill" for all future contracts.

Inspired by: agree.com

## Problem Statement

Currently, every time someone signs a contract they must:
- Manually enter their name, email, address
- Re-enter payment details
- Provide the same information repeatedly

This creates friction and errors.

## Solution

### 1. Progressive Onboarding

When a user first encounters HyprDoc (either as a signer or creator):

```
Step 1: Basic Info
├── Full Name
├── Email
└── Phone (optional)

Step 2: Identity (optional, for signers)
├── Company Name
├── Title/Role
└── Address

Step 3: Payment Info (optional)
├── Preferred payment method
└── Billing address

Step 4: Preferences
├── Notification preferences
└── Default signature style
```

### 2. Magic Autofill Button

When filling a contract:

```
┌─────────────────────────────────────────┐
│  Contract: Service Agreement            │
├─────────────────────────────────────────┤
│                                         │
│  Client Name: [________________] [✨]   │
│  Email:       [________________] [✨]   │
│  Company:     [________________] [✨]   │
│  Address:     [________________] [✨]   │
│                                         │
│  [✨ Autofill All]                      │
│                                         │
└─────────────────────────────────────────┘

[✨] = Magic autofill button (fills from profile)
```

### 3. Profile Management

Users can manage their stored information:

```
Settings → My Profile
├── Personal Information
│   ├── Name, Email, Phone
│   └── [Edit]
├── Business Information
│   ├── Company, Title, Address
│   └── [Edit]
├── Payment Information
│   ├── Saved methods
│   └── [Manage]
├── Signatures
│   ├── Saved signature styles
│   └── [Manage]
└── Connected Accounts
    ├── Google (for autofill)
    └── LinkedIn (for autofill)
```

## User Stories

### As a First-Time Signer
- I want to enter my information once
- So I don't have to type it every time I sign a contract

### As a Returning Signer
- I want to click one button to fill my details
- So signing is fast and error-free

### As a Contract Owner
- I want signers to have complete, accurate information
- So contracts don't have errors or missing fields

### As a Power User
- I want to save multiple profiles (personal, business)
- So I can quickly switch contexts

## Technical Requirements

### Database Schema

```typescript
userProfiles: defineTable({
  userId: v.id("users"),
  
  // Can have multiple profiles per user
  name: v.string(), // "Personal", "Business", etc.
  isDefault: v.boolean(),
  
  // Personal
  fullName: v.optional(v.string()),
  email: v.optional(v.string()),
  phone: v.optional(v.string()),
  
  // Business
  companyName: v.optional(v.string()),
  title: v.optional(v.string()),
  
  // Address
  address: v.optional(v.object({
    line1: v.string(),
    line2: v.optional(v.string()),
    city: v.string(),
    state: v.optional(v.string()),
    postalCode: v.string(),
    country: v.string(),
  })),
  
  // Signatures
  savedSignatures: v.optional(v.array(v.object({
    id: v.string(),
    type: v.union(v.literal("draw"), v.literal("type")),
    data: v.string(), // SVG or font styling
    createdAt: v.number(),
  }))),
  
  // Metadata
  createdAt: v.number(),
  updatedAt: v.number(),
})
```

### Smart Block Integration

Blocks can declare which profile fields they accept:

```typescript
defineBlock({
  type: 'smart-text',
  name: 'Full Name',
  // This block can be autofilled from these profile fields
  autofillSources: ['fullName', 'companyName'],
  // Priority order for autofill
  autofillPriority: ['fullName'],
});
```

### Autofill Algorithm

```typescript
async function autofillDocument(documentId: string, profileId: string) {
  const profile = await getProfile(profileId);
  const blocks = await getDocumentBlocks(documentId);
  
  const updates: BlockUpdate[] = [];
  
  for (const block of blocks) {
    if (block.autofillSources) {
      for (const source of block.autofillPriority || block.autofillSources) {
        const value = profile[source];
        if (value) {
          updates.push({ blockId: block.id, value });
          break;
        }
      }
    }
  }
  
  return applyUpdates(documentId, updates);
}
```

## UI Components

- `OnboardingWizard.svelte` - Multi-step profile collection
- `ProfileManager.svelte` - Settings page for profile management
- `AutofillButton.svelte` - The magic button on each field
- `AutofillBar.svelte` - "Autofill All" floating action
- `ProfileSelector.svelte` - Choose which profile to use
- `SignatureManager.svelte` - Save/manage signature styles

## Onboarding Flow

### For New Signers (via share link)

```
1. Open shared contract link
2. "To sign, we need some information" modal
3. Quick 3-field form: Name, Email, Phone
4. Optional: "Save for future contracts?" checkbox
5. Contract opens with autofill applied
```

### For New Users (registration)

```
1. Sign up with email/Google/WorkOS
2. "Let's set up your profile" wizard
3. Progressive disclosure - only required fields first
4. "Complete your profile later" option
5. Dashboard with profile completion indicator
```

## Success Metrics

- 80% of returning signers use autofill
- Average signing time reduced by 50%
- Profile completion rate > 60%
- Error rate in filled fields < 2%

## Open Questions

1. How long to retain profile data for non-registered users?
2. GDPR/privacy implications of storing signer data?
3. Should we integrate with LinkedIn/Google for one-click profile import?
4. How to handle profile conflicts (different info in contract vs profile)?

## Related Issues

- [FEATURE] User Profile System
- [FEATURE] Magic Autofill Button
- [FEATURE] Saved Signatures
- [FEATURE] Social Profile Import
