# Svelte 5 Audit - Quick Action Checklist

## 🔴 HIGH PRIORITY (Do First)

### Type Safety Fixes
- [ ] **Fix `EditorTopBar.svelte:78`** - Replace `as any` with proper type
  ```typescript
  // Current: onclick={() => handleModeChange(mode.id as any)}
  // Fix: Ensure mode.id is typed as "builder" | "preview"
  ```

- [ ] **Audit `lib/utils/error-utils.ts`** - Fix 14 `any`/`unknown` instances
- [ ] **Audit `lib/utils/slot-utils.ts`** - Fix 8 `any`/`unknown` instances  
- [ ] **Audit `lib/utils/id.ts`** - Fix 5 `any`/`unknown` instances
- [ ] **Audit `lib/editor/core/EditorBrain.svelte.ts`** - Fix 8 `any`/`unknown` instances

### Performance Critical
- [ ] **Find all large state objects** and convert to `$state.raw()`
  - Search for: `$state(largeObject)` or `$state(complexData)`
  - Convert immutable data structures
  - Focus on: document content, settings objects, large arrays

## 🟡 MEDIUM PRIORITY

### Runed Library Improvements
- [ ] **Replace manual event listeners** with `useEventListener`
  ```typescript
  // Find: window.addEventListener / document.addEventListener
  // Replace with: useEventListener('event', handler)
  ```

- [ ] **Add `Throttled` for scroll/resize handlers**
  ```typescript
  // Example: const throttledScroll = new Throttled(() => scrollY, 100);
  ```

- [ ] **Use `ElementSize` for responsive components**
  ```typescript
  // Example: const size = new ElementSize(() => container);
  ```

### Code Organization
- [ ] **Move `lib/dragState.ts`** to `lib/utils/` or `lib/stores/`
- [ ] **Verify smart-blocks directory** exists and is properly organized
- [ ] **Standardize export patterns** across files

### Debugging
- [ ] **Replace `console.log` with `$inspect()`** (98 instances)
  ```typescript
  // Find: console.log('State:', state)
  // Replace: $inspect(state)
  ```

## 🟢 LOW PRIORITY

### Code Quality
- [ ] **Audit component sizes** - Split any >300 lines
- [ ] **Review data waterfalls** in load functions
- [ ] **Add missing TypeScript return types** to public functions
- [ ] **Standardize import ordering** (use Biome auto-sort)

---

## Quick Commands

### Find Type Issues
```bash
# Find all 'as any' usage
grep -r "as any" src/

# Find all 'any' type annotations
grep -r ": any" src/ --include="*.ts" --include="*.svelte"

# Find all console.log
grep -r "console\." src/
```

### Find Performance Opportunities
```bash
# Find large state objects (manual review needed)
grep -r "\$state(" src/ --include="*.svelte" --include="*.ts"
```

### Run Validation
```bash
# Type check
bun run check

# Lint and format
bun run lint:fix

# Full validation
bun run validate
```

---

## File-by-File Checklist

### Critical Files to Fix
- [ ] `src/lib/components/editor/EditorTopBar.svelte` (line 78)
- [ ] `src/lib/utils/error-utils.ts` (14 issues)
- [ ] `src/lib/utils/slot-utils.ts` (8 issues)
- [ ] `src/lib/utils/id.ts` (5 issues)
- [ ] `src/lib/editor/core/EditorBrain.svelte.ts` (8 issues)

### Files to Review for $state.raw()
- [ ] `src/lib/stores/signing-store.svelte.ts`
- [ ] `src/lib/stores/auth-state.svelte.ts`
- [ ] `src/lib/stores/ui-store.svelte.ts`
- [ ] `src/lib/editor/core/EditorBrain.svelte.ts`
- [ ] `src/routes/(protected)/editor/[documentId]/+page.svelte`

---

## Progress Tracking

**Started:** _Date_  
**Target Completion:** _Date_  
**Current Status:** _Not Started / In Progress / Complete_

### Completion Status
- 🔴 High Priority: 0/6 complete
- 🟡 Medium Priority: 0/8 complete  
- 🟢 Low Priority: 0/4 complete

**Total Progress:** 0/18 tasks (0%)

---

*Last Updated: [Date]*
