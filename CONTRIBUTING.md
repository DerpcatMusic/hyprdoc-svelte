# Contributing to HyprDoc

Thank you for your interest in contributing to HyprDoc! This document provides guidelines and instructions for contributing.

## Getting Started

### Prerequisites
- **Bun** v1.0+ (package manager)
- **Node.js** v18+ (for compatibility)
- **Git** for version control
- **Convex CLI** (`bunx convex`)

### Setup
1. Clone the repository
2. Copy `.env.example` to `.env.local`
3. Fill in required environment variables
4. Install dependencies: `bun install`
5. Start Convex dev: `bunx convex dev`
6. Start dev server: `bun run dev`

## Development Workflow

### Branch Strategy
- `master` - Main production branch
- `feature/*` - New features
- `fix/*` - Bug fixes
- `docs/*` - Documentation updates
- `refactor/*` - Code refactoring

### Making Changes

1. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow existing code patterns
   - Keep commits focused and atomic
   - Write descriptive commit messages

3. **Test your changes**
   ```bash
   bun run validate  # Run all checks
   ```

4. **Commit with co-author**
   ```bash
   git commit -m "feat: add new feature
   
   Co-Authored-By: Warp <agent@warp.dev>"
   ```

5. **Push and create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

## Code Standards

### TypeScript
- **Strict mode** enabled
- Use explicit types for function parameters and returns
- Avoid `any` - use `unknown` or proper typing
- Use branded types for IDs

### Svelte 5
- Use **runes** (`$state`, `$derived`, `$effect`)
- Avoid old Svelte 3/4 patterns (stores, reactive statements)
- Use `$props()` for component props
- Use `$bindable()` for two-way binding

### Component Structure
```svelte
<script lang="ts">
  // 1. Imports
  import { ComponentType } from './types';
  
  // 2. Props interface
  interface Props {
    value: string;
    onchange?: (value: string) => void;
  }
  
  // 3. Props destructuring
  let { value = $bindable(), onchange }: Props = $props();
  
  // 4. Local state
  let count = $state(0);
  
  // 5. Derived values
  const doubled = $derived(count * 2);
  
  // 6. Effects
  $effect(() => {
    console.log('value changed:', value);
  });
  
  // 7. Functions
  function handleClick() {
    count++;
  }
</script>

<!-- 8. Template -->
<div>
  <button onclick={handleClick}>
    {doubled}
  </button>
</div>

<!-- 9. Styles (if needed) -->
<style>
  div {
    /* Scoped styles */
  }
</style>
```

### File Naming
- **Components**: `PascalCase.svelte`
- **Routes**: `+page.svelte`, `+layout.svelte`, `+server.ts`
- **Stores**: `kebab-case.svelte.ts`
- **Utils**: `kebab-case.ts`
- **Types**: `kebab-case.ts`
- **Smart Blocks**: `kebab-case.block.svelte`

### Import Order
1. Svelte/SvelteKit imports
2. Third-party libraries
3. Local utilities/types
4. Local components
5. Relative imports

```typescript
import { onMount } from 'svelte';
import { page } from '$app/stores';
import { z } from 'zod';

import { cn } from '$lib/utils';
import type { User } from '$lib/types';

import Button from './Button.svelte';
import { localHelper } from './utils';
```

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting, no code change
- `refactor`: Code restructuring
- `perf`: Performance improvement
- `test`: Adding tests
- `chore`: Maintenance tasks

### Examples
```bash
feat(editor): add signature block
fix(auth): handle expired sessions
docs(readme): update installation steps
refactor(stores): simplify document store logic
```

## Testing

### Manual Testing
Before submitting:
1. Test in both light and dark mode
2. Test with corporate mode enabled
3. Test on different screen sizes
4. Check console for errors
5. Verify no TypeScript errors

### Validation
```bash
# Run all checks (required before PR)
bun run validate

# Individual checks
bun run check        # TypeScript
bun run lint         # Biome lint
bun run format       # Biome format
```

## Creating Smart Blocks

See detailed guide in `README.md` under "🧩 Creating Smart Blocks".

### Quick Steps
1. Create `your-block.block.svelte` in `src/lib/components/editor/smart-blocks/blocks/`
2. Export schema and definition in `<script module>`
3. Implement component using `SmartField` and `getBlockContext`
4. Restart dev server to register

## Code Review

### PR Checklist
- [ ] Code follows project conventions
- [ ] `bun run validate` passes
- [ ] Tested manually
- [ ] Updated documentation (if needed)
- [ ] Added co-author line to commits
- [ ] No console errors or warnings
- [ ] No commented-out code
- [ ] Removed debug statements

### Review Process
1. Submit PR with clear description
2. Address reviewer feedback
3. Update PR with changes
4. Merge after approval

## Architecture Guidelines

### State Management
- Use **Svelte 5 runes** for local state
- Use **stores** only for global state
- Use **context API** for component trees
- Use **Convex hooks** for server state

### Performance
- **Lazy load** components when possible
- **Debounce** expensive operations
- **Memoize** with `$derived`
- **Virtual scroll** for long lists

### Security
- **Validate** all user input with Zod
- **Sanitize** before rendering
- **Never commit** secrets
- Use **environment variables**

## Documentation

### Code Comments
- Document **why**, not **what**
- Explain non-obvious decisions
- Link to relevant issues/docs
- Keep comments up-to-date

### README Updates
- Update features list
- Document new APIs
- Add examples
- Update status table

### Architecture Docs
- Update `ARCHITECTURE.md` for structural changes
- Document new patterns
- Explain design decisions

## Getting Help

### Resources
- Check `ARCHITECTURE.md` for patterns
- Check `README.md` for features
- Search existing issues
- Ask in project discussions

### Questions
- Use descriptive titles
- Provide context and examples
- Include error messages
- Show what you've tried

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.

## Recognition

Contributors will be acknowledged in:
- Git commit history (with co-author lines)
- Release notes
- Project documentation

Thank you for contributing to HyprDoc! 🚀
