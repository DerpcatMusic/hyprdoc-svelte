# HyprDoc Agent Guide (SvelteKit 5 Migration)

You are an agentic AI assistant working on the SvelteKit 5 migration of HyprDoc.

## Core Tech Stack
- **Framework**: SvelteKit 5 (Svelte 5 Runes)
- **Styling**: UnoCSS (Tailwind-compatible)
- **Editor**: Tiptap v3 (Smart Block System)
- **State**: Svelte 5 Class-based Runes
- **Backend**: Convex (Serverless)

## Critical Commands
Run these in `hyprdoc-svelte/`:
- `bun run dev`: Start dev server
- `bun run validate`: Biome lint + Svelte-check (REQUIRED before commit)
- `bun run build`: Production build

## Svelte 5 Runes Patterns
ALWAYS use Runes. Avoid Svelte 4 syntax.
- **State**: `let value = $state(initial)`
- **Derived**: `const doubled = $derived(value * 2)`
- **Effects**: `$effect(() => { ... })`
- **Props**: `let { prop1, prop2 = defaultValue }: Props = $props()`
- **Binding**: `let { value = $bindable() }: Props = $props()`

## Naming Conventions
- **Components**: `PascalCase.svelte` (e.g., `EditorSidebar.svelte`)
- **Runes/Stores**: `kebab-case.svelte.ts` (e.g., `document-store.svelte.ts`)
- **Utilities**: `kebab-case.ts`
- **Smart Blocks**: `kebab-case.block.svelte`

## Smart Block Discovery
HyprDoc uses an auto-discovery architecture for `*.block.svelte` files.
1. Create `your-block.block.svelte` in `src/lib/components/editor/smart-blocks/blocks/`.
2. Export `schema` and `definition` in `<script module lang="ts">`.
3. Blocks are automatically registered via `block-registry.svelte.ts`.

## Svelte 5 Proxy Bridge (Tiptap)
The `SmartNodeView` (`SmartNodeView.svelte.ts`) acts as a high-performance bridge between Tiptap and Svelte 5.
- **Reactive Proxy**: Maps Tiptap `node.attrs` to a Svelte `$state` proxy.
- **Debounced Sync**: Writes changes back to Tiptap with a 300ms debounce to prevent editor lag.
- **Untracked Updates**: Uses `untrack` to prevent circular updates when Tiptap syncs back.

## Migration Status
We are migrating logic from `hyprdoc-next/` (React/Zustand) to `hyprdoc-svelte/` (Svelte/Runes).
- Map Zustand slices to Svelte classes with `$state`.
- Convert React components to Svelte 5 snippets/components.
- Keep Convex schemas identical during transition.

## Validation
Before completing any task:
1. Run `bun run validate`.
2. Fix all Biome and TypeScript errors.
3. Ensure no `any` types are introduced without justification.
