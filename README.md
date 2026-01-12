# HyprDoc Svelte

A modern document signing platform built with SvelteKit 5, Convex, and WorkOS.

## Tech Stack

- **Frontend**: SvelteKit 5 with Svelte 5 Runes
- **Backend**: Convex (serverless database + functions)
- **Auth**: WorkOS AuthKit
- **Styling**: UnoCSS with shadcn-style tokens
- **UI Components**: Bits UI v2.15.4
- **Icons**: Iconify (Lucide)

| Phase | Status |
|-------|--------|
| Foundation (Stores, Layout) | ✅ Complete |
| Authentication (WorkOS) | ✅ Complete |
| UI Components & Styling | ✅ Complete |
| Dashboard (Real Data) | ✅ Complete |
| Core Editor (Tiptap + EditorEngine) | ✅ Complete |
| Backend Safety (Strict Schemas) | ✅ Complete |
| Realtime Collaboration | ✅ Complete |
| Smart Block System | 🟢 Active |
| Landing Pages (Astro Migration) | ✅ Complete |
| Envelope Sending Workflow | 🔄 In Progress |

## Features

### State Management

**Svelte 5 Runes Architecture** - Production-ready state with zero dependencies:

- **DocumentStore**: Core document editor state (blocks, slots, settings, simulation mode)
- **SigningStore**: Signing wizard orchestration (field management, validation, progress)
- **UiStore**: Global UI preferences (theme, corporate mode)
- **Convex Hooks**: Typed query/mutation wrappers with optimistic updates

All stores use: `$state` for reactivity, `$derived` for computed values, context API for scoping.

### Implemented
- WorkOS authentication flow (login, callback, logout)
- Protected routes with session hydration
- Dashboard with real-time Convex data
- Theme system (light/dark mode with violet/cyan palette)
- Corporate mode toggle (professional green theme)
- **State Management**:
  - Svelte 5 rune-based stores (DocumentStore, SigningStore, UiStore)
  - Convex integration layer with typed hooks
  - Context-based injection for component-scoped stores
- **Core Editor Infrastructure**:
  - Tiptap integration with Svelte 5 Runes natively (no React dependency)
  - **Hooks Layer**:
    - `useEditorAutosave`: 800ms debounced saving with Convex mutations
    - `useEditorSync`: Content loading, title sync, and block lifecycle management
    - `useSimulationMode`: Snapshot management for preview/signing modes
    - `usePdfExport`: In-browser PDF generation with smart block value injection
  - **Extensions**:
    - `FontSizeExtension` / `FontWeightExtension`: CSS-based text styling
    - `VariableMention`: `{{variable}}` syntax with input rules and paste support
    - `TabToVariable`: Quick conversion of trigger words (e.g., "today" + Tab)
    - `SmartBlockExtension`: Svelte-rendered interactive components within Tiptap
  - **Sync & Export**:
    - `tiptap-sync.ts`: Pure JS utility to extract block data from Tiptap JSON
    - `export-tiptap.ts`: pdf-lib integration for document export
- **Editor UI**:
  - Enhanced `EditorPage` with real-time save status indicator
  - Editable document titles synced with Convex
  - Manual save triggers and document lifecycle state management (Draft/Sealed)
- **Smart Block System**:
  - Auto-discovery block registry (zero manual imports)
  - Svelte 5 rune-based blocks with $state/$derived reactivity
  - Lazy-loaded components for optimal code splitting
  - Type-safe block definitions with Zod validation
  - Builder & Consumer views for edit/signing modes
  - Context-based state management (no Zustand)
  - **Refactored (v2.0)**: Standardized on Svelte 5 $bindable runes and Bits UI v2 primitives.
- **Landing Pages**:
  - High-fidelity Astro-to-Svelte 5 migration.
  - **GSAP ScrollTrigger**: Pinned rotation and card switching for the bento showcase.
  - **Polar SDK Integration**: Live product fetching and checkout flows via SvelteKit API.
  - **HyperSign.**: Quick signing landing page with functional PDF dropzone.
  - **Design System**: Global UnoCSS theme with responsive, high-speed animations.
- **API Routes** (migrated from Next.js):
  - `/api/ai/generate-stream`: SSE streaming with Gemini function calling
  - `/api/ai/inline-edit`: Multi-provider (Gemini/OpenRouter) text editing
  - `/api/hyprsign/analyze`: PDF field detection + Gemini Vision fallback
  - `/api/hyprsign/finalize`: Signature embedding + AES-256 encryption
  - `/api/documents/[id]/pdf`: Puppeteer PDF generation with signatures
- **RUNED Runes** (`$lib/runes/`):
  - `createAIGeneration`: Streaming state + command queue for AI doc generation
  - `createInlineAIEdit`: Selection handling + text replacement
  - `createHyprSign`: Full PDF signing workflow (upload → analyze → fill → download)
  - `createPDFExport`: Progress tracking + blob download
  - `createTiptapCollab`: Tiptap collaboration setup
  - `usePresence`: Real-time presence tracking

## January 2026: Slash Menu + Smart Block Architecture

### Slash Menu System (Svelte 5 + RUNED)

**Architecture Pattern**: Singleton state + Global portal (no Tiptap `mount`/`unmount` issues)

| File | Lines | Purpose |
|------|-------|---------|
| `SlashMenuState.svelte.ts` | 260 | Singleton class with `$state` runes, native commands, smart block registry integration, keyboard nav |
| `SlashMenuPortal.svelte` | 90 | Global UI component, RUNED `useEventListener` for keyboard (↑↓⏎⎋), auto-cleanup |
| `slash-command/extension.ts` | 95 | Minimal Tiptap extension, updates `slashMenuState` on lifecycle events |

**Features**:
- ✅ Dynamic block loading from `blockRegistry` (18 smart blocks)
- ✅ Native Tiptap commands (Heading, List, Quote, Code)
- ✅ Keyboard navigation with RUNED auto-cleanup
- ✅ Filtering by name/description
- ✅ Block insertion with UUID generation

**Data Flow**:
```
User types "/" → SlashMenuState.open()
              → SlashMenuPortal renders menu
              → User selects block
              → Tiptap inserts node with attrs
              → SmartBlock mounts via extension.options
```

### Smart Block Robust Architecture (Extension Options Pattern)

**Problem**: Tiptap's `SvelteNodeViewRenderer` mounts outside Svelte context tree → `getContext()` fails.

**Solution**: Use Tiptap's **official extension options pattern** (no fallbacks, no hacks):

```typescript
// 1. Extension declares documentStore in options
SmartBlockExtension.addOptions() {
  return {
    documentStore: null as DocumentStore | null
  }
}

// 2. Page configures extension with store instance
SmartBlockExtension.configure({
  documentStore: documentStoreInstance
})

// 3. SmartBlock NodeView reads from extension.options
const { extension } = $props();
const documentStore = extension.options.documentStore;
```

**Files Modified**:
- `smart-block-extension.ts`: Added `documentStore` to options
- `smart-block.svelte`: Receives `extension` prop, reads `extension.options.documentStore`
- `+page.svelte`: Configures `SmartBlockExtension.configure({ documentStore })`
- `document-store.svelte.ts`: Removed singleton fallback (clean architecture)

**Why This Is Robust**:
- ✅ Uses documented Tiptap API (NodeView receives `extension` prop)
- ✅ Type-safe dependency injection
- ✅ Works with SSR
- ✅ No global state or fallbacks
- ✅ Follows Svelte 5 best practices

### Auto-Registration System

SmartBlock components auto-register in `documentStore.blocks` on mount:

```typescript
$effect(() => {
  if (!documentStore) return;
  const id = node.attrs.id;
  if (id && !documentStore.blocks[id]) {
    documentStore.addBlock({ id, type, label, ... });
    console.log(`✅ Auto-registered block: ${id}`);
  }
});
```

**Result**: Blocks inserted via slash menu automatically sync to global state.

### Pending
- Envelope sending workflow (Convex + Polar/WorkOS integration)
- Audit log & Track changes migration
- Advanced PDF AcroForm fields (Acrobat compatibility enhancement)
- Global variables & Glossary terms integration

## Development

```sh
bun install
bun run dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start dev server |
| `bun run build` | Production build |
| `bun run check` | TypeScript check |
| `bun run lint` | Lint code (find issues) |
| `bun run lint:fix` | Fix auto-fixable linting issues |
| `bun run format` | Format code |
| `bun run validate` | **Deep Check**: Parallel Strict TypeScript + Svelte + Biome Linter |
| `bunx convex dev` | Start Convex dev |

## Linting & Formatting

This project uses **Biome** (v2.3+) with experimental Svelte/Astro support for unified linting and formatting.

```sh
# Run everything at once (Fix + Svelte Check)
bun run fix

# Lint code (find issues)
bun run lint

# Format code
bun run format

# Fix all auto-fixable issues (lint + format)
bun run lint:fix

# 🚀 ULTRATHINK VALIDATION (Run this before committing)
# Runs Svelte Check and Biome in parallel, strict mode
bun run validate
```

## 🧩 Creating Smart Blocks

To add a new interactive block (e.g., "YouTube Embed", "Stock Ticker"), follow this 3-step process.

**Location**: `src/lib/components/editor/smart-blocks/blocks/`

### 1. Create the File
Create a new file named `[name].block.svelte`. The `.block.svelte` extension is **required** for auto-discovery.

### 2. Define Schema & Metadata (Module Script)
In the `<script module>` block, export the `schema` and `definition`.

```typescript
<script module lang="ts">
import { z } from 'zod';
import { BaseBlockSchema } from '../core/base-schema';

// 1. Extend Base Schema
export const schema = BaseBlockSchema.extend({
    type: z.literal('my-block'),
    customProp: z.string().default('default value')
});

// 2. Export Definition
export const definition = {
    type: 'my-block',           // Unique ID
    label: 'My Block',          // Display Name
    category: 'media',          // 'essentials' | 'media' | 'data'
    description: 'Description', // Tooltip
    icon: 'lucide:box',        // Iconify key
    schema,                     // Zod schema
    // Generate defaults
    defaults: schema.parse({ id: '', type: 'my-block' }),
    // Lazy load component
    component: () => import('./my-block.block.svelte')
};
</script>
```

### 3. Build the Component
Use `SmartField` for the layout and `getBlockContext` to sync with Tiptap.

```svelte
<script lang="ts">
import { getBlockContext } from '../core/block-context.svelte';
import SmartField from '../core/SmartField.svelte';

interface Props {
    data: z.infer<typeof schema>;
    value: any;
}

const { data, value }: Props = $props();
const ctx = getBlockContext(); // Access Tiptap state

// Reactive local state
const localValue = $derived(value ?? '');
</script>

<SmartField
    label={data.label}
    required={data.required}
    slotColor={ctx.slotColor} <!-- Matches assigned user color -->
>
    <!-- Your Custom UI -->
    <input 
        value={localValue}
        oninput={(e) => ctx.onChange(e.currentTarget.value)}
        disabled={ctx.isDisabled} <!-- Handle "Consumer" mode -->
    />
</SmartField>
```

### Auto-Registration
The `block-registry.svelte.ts` automatically scans for `*.block.svelte` files. **Restart the dev server** to pick up new blocks.


## January 2026: Editor Toolbar Enhancements

### Toolbar Relocation & Refinement (Antigravity)

**Changes implemented on 2026-01-11**:

1.  **Top Positioning**:
    *   The editor formatting toolbar (`EditorFormattingBar.svelte`) has been relocated from the bottom of the screen to the top (fixed position below the top bar).
2.  **Smart Floating Behavior**:
    *   **Text Selection**: When the user selects text (and it's not a block node), the toolbar dynamically floats just above the selection for immediate access to formatting controls.
    *   **Smart Selection Logic**: The floating behavior specifically checks `!('node' in selection)` to ignore NodeSelections (like Smart Blocks). This ensures that selecting a block wrapper keeps the toolbar stable at the top, preventing visual jumping.
    *   **Boundary Detection**: Logic added to prevent the toolbar from floating under the header; it clamps or flips position if the selection is too high up.
3.  **Layout Reorganization**:
    *   **Size & Weight Controls**: Moved to the far right of the toolbar to prioritize common formatting actions (Bold, Italic, lists) on the left.
    *   **Animations**: Added smooth transitions for position changes (`transition: all 0.2s cubic-bezier...`).

**Files Modified**:
*   `src/lib/components/editor/EditorFormattingBar.svelte`: Implemented `$effect` for selection monitoring and style updates.
