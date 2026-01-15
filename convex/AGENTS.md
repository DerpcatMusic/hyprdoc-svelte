# HyprDoc Convex Backend Architecture

> **Single Source of Truth**: All functions import from `lib/core.ts`. Period.

## The Pattern

```typescript
// THE ONLY IMPORTS ANY FILE NEEDS:
import { protectedMutation, protectedQuery, query, mutation } from "@/convex/lib/core";
```

## Core Wrappers

| Wrapper | Auth Required | RLS | Triggers | Use Case |
|---------|---------------|-----|----------|----------|
| `query` | ❌ | ✅ | ❌ | Public reads, optional user |
| `mutation` | ❌ | ✅ | ✅ | Public writes, `users.store` |
| `protectedQuery` | ✅ | ✅ | ❌ | User-specific reads |
| `protectedMutation` | ✅ | ✅ | ✅ | **Most common** - user writes |
| `internalQuery` | ❌ | ❌ | ❌ | Scheduled jobs, internal reads |
| `internalMutation` | ❌ | ❌ | ✅ | Webhooks, system writes |

## Features Built-In

### 1. Authentication (WorkOS JWT)
- `protectedQuery` and `protectedMutation` throw `AuthError` if no user
- `query` and `mutation` provide `ctx.user` (nullable)

### 2. Row-Level Security (RLS)
- Every table query is wrapped with access rules
- Users can only read/write their own data
- Public documents are readable by anyone

### 3. Triggers (Auto-Audit)
- Every mutation on `documents` and `users` tables is logged
- Audit logs stored in `auditLogs` table automatically

## Usage Examples

### Protected Query (User-specific read)
```typescript
import { protectedQuery } from "@/convex/lib/core";
import { v } from "convex/values";

export const list = protectedQuery({
  args: { status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    // RLS already filters to user's docs
    const docs = await ctx.db.query("documents").collect();
    return docs;
  },
});
```

### Protected Mutation (User-specific write)
```typescript
import { protectedMutation, v } from "@/convex/lib/core";

export const create = protectedMutation({
  args: { title: v.string() },
  handler: async (ctx, args) => {
    // Triggers will auto-log this insert
    return ctx.db.insert("documents", {
      title: args.title,
      ownerId: ctx.user._id,
      // ...
    });
  },
});
```

### Public Query (Optional auth)
```typescript
import { query, v } from "@/convex/lib/core";

export const get = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    // ctx.user may be null
    // RLS allows public docs or user's own docs
    return ctx.db.get(args.documentId);
  },
});
```

## File Structure

```
convex/
├── lib/
│   ├── core.ts      # THE POWERHOUSE - all wrappers
│   └── triggers.ts  # Trigger registrations only
├── documents/
│   ├── mutations/
│   │   ├── create.ts
│   │   ├── delete.ts
│   │   └── update.ts
│   └── queries/
│       ├── get.ts
│       └── list.ts
├── users/
│   ├── mutations.ts
│   └── queries.ts
└── ...
```

## Rules

1. **NEVER** import from `_generated/server` directly - use `lib/core.ts`
2. **NEVER** call `ctx.auth.getUserIdentity()` - use `ctx.user`
3. **NEVER** manually insert audit logs - triggers handle it
4. **ALWAYS** use `protectedMutation` for user writes
5. **ALWAYS** use `protectedQuery` for user reads
