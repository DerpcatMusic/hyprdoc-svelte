# HyprDoc Architecture

A comprehensive guide to the HyprDoc project structure, patterns, and conventions.

## Project Overview

HyprDoc is a modern SaaS platform for creating, managing, and signing dynamic contracts with AI assistance. Built with SvelteKit 5, Convex, and Tiptap v3.

### Core Features
- **Live Contract Editor**: Tiptap-based rich text editor with smart blocks
- **Real-time Collaboration**: Multi-user editing with presence tracking
- **AI Assistant**: Document generation and inline editing with Gemini
- **Smart Block System**: Dynamic, interactive components within documents
- **HyperSign**: Quick PDF signing with field detection
- **Contract Lifecycle**: Reminders, payments, and Airtable integration

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | SvelteKit 5 (Svelte 5 Runes) |
| **Backend** | Convex (serverless) |
| **Auth** | WorkOS AuthKit |
| **Editor** | Tiptap v3 |
| **Styling** | UnoCSS + shadcn-svelte tokens |
| **UI Components** | Bits UI v2.15.4 |
| **State** | RUNED + Svelte 5 Runes |
| **Validation** | Zod v4 |
| **Package Manager** | Bun |
| **Linting/Formatting** | Biome v2.3+ |

## Directory Structure

```
hyprdoc-svelte/
├── src/
│   ├── lib/                    # Shared library code
│   │   ├── ai/                 # AI integration (Gemini, OpenRouter)
│   │   ├── auth/               # WorkOS authentication
│   │   ├── blocks/             # Smart block utilities
│   │   ├── certificates/       # Contract certificate generation
│   │   ├── components/         # Svelte components
│   │   │   ├── dashboard/      # Dashboard-specific components
│   │   │   ├── editor/         # Editor UI and extensions
│   │   │   │   ├── extensions/ # Tiptap extensions
│   │   │   │   ├── properties/ # Document properties panel
│   │   │   │   ├── sidebar/    # Editor sidebar panels
│   │   │   │   └── slash-command/ # Slash menu system
│   │   │   └── ui/             # shadcn-svelte components
│   │   ├── constants/          # App-wide constants
│   │   ├── convex/             # Convex client utilities
│   │   ├── editor/             # Core editor logic
│   │   ├── export/             # PDF export utilities
│   │   ├── formula/            # Formula/calculation engine
│   │   ├── hooks/              # Svelte composition hooks
│   │   ├── hyprsign/           # PDF signing utilities
│   │   ├── import/             # Document import handlers
│   │   ├── pdf/                # PDF manipulation (pdf-lib)
│   │   ├── runes/              # RUNED composables
│   │   ├── server/             # Server-side utilities
│   │   ├── services/           # Business logic services
│   │   ├── stores/             # Svelte 5 state stores
│   │   ├── templates/          # Document templates
│   │   ├── types/              # TypeScript type definitions
│   │   └── utils/              # Utility functions
│   ├── routes/                 # SvelteKit routes
│   │   ├── (protected)/        # Auth-protected routes
│   │   │   ├── dashboard/      # Main dashboard
│   │   │   ├── documents/      # Document list/management
│   │   │   ├── editor/         # Document editor
│   │   │   └── envelopes/      # Envelope management
│   │   ├── api/                # API endpoints
│   │   │   ├── ai/             # AI endpoints (generate, edit)
│   │   │   ├── documents/      # Document operations
│   │   │   └── hyprsign/       # Signing endpoints
│   │   ├── auth/               # Auth callbacks
│   │   ├── login/              # Login page
│   │   └── sign/               # Public signing page
│   ├── app.css                 # Global styles
│   ├── app.html                # HTML template
│   └── hooks.server.ts         # SvelteKit server hooks
├── convex/                     # Convex backend
│   ├── _generated/             # Auto-generated (gitignored)
│   ├── schema.ts               # Database schema
│   ├── documents.ts            # Document mutations/queries
│   ├── envelopes.ts            # Envelope operations
│   └── users.ts                # User management
├── static/                     # Static assets
└── tests/                      # Test files
```

## Architecture Patterns

### State Management

**Svelte 5 Runes** - Zero dependency, production-ready state:

#### Core Stores
- **DocumentStore** (`stores/document-store.svelte.ts`)
  - Document editor state (blocks, slots, settings)
  - Simulation mode for preview/signing
  - Block registry and lifecycle

- **SigningStore** (`stores/signing-store.svelte.ts`)
  - Signing wizard orchestration
  - Field management and validation
  - Progress tracking

- **UiStore** (`stores/ui-store.svelte.ts`)
  - Global UI preferences
  - Theme (light/dark, violet/cyan)
  - Corporate mode toggle

#### Store Principles
- Use `$state` for reactivity
- Use `$derived` for computed values
- Use context API for scoping
- Inject stores via Tiptap extension options (not global singletons)

### Smart Block System

**Auto-discovery architecture** with zero manual imports:

#### Components
1. **Block Registry** (`components/editor/smart-blocks/core/block-registry.svelte.ts`)
   - Auto-scans for `*.block.svelte` files
   - Lazy loads components on demand
   - Type-safe with Zod validation

2. **Block Definition** (in each `*.block.svelte`)
   ```typescript
   <script module lang="ts">
   export const schema = BaseBlockSchema.extend({
     type: z.literal('block-name'),
     customProp: z.string()
   });
   
   export const definition = {
     type: 'block-name',
     label: 'Display Name',
     category: 'essentials' | 'media' | 'data',
     icon: 'lucide:icon-name',
     schema,
     defaults: schema.parse({ id: '', type: 'block-name' }),
     component: () => import('./block-name.block.svelte')
   };
   </script>
   ```

3. **Block Context** (`components/editor/smart-blocks/core/block-context.svelte.ts`)
   - Provides Tiptap integration
   - Handles value changes
   - Manages disabled state (consumer mode)

#### Extension Options Pattern
Instead of global state or context, blocks receive DocumentStore via Tiptap extension options:

```typescript
// Extension configuration
SmartBlockExtension.configure({
  documentStore: documentStoreInstance
})

// Block component access
const { extension } = $props();
const documentStore = extension.options.documentStore;
```

**Benefits:**
- ✅ Type-safe dependency injection
- ✅ Works with SSR
- ✅ No global state
- ✅ Follows documented Tiptap API

### Slash Menu System

**Singleton state + Global portal** pattern (avoids Tiptap mount/unmount issues):

#### Components
1. **SlashMenuState** (`editor/slash-command/SlashMenuState.svelte.ts`)
   - Singleton class with `$state` runes
   - Native Tiptap commands + smart block registry
   - Keyboard navigation

2. **SlashMenuPortal** (`editor/slash-command/SlashMenuPortal.svelte`)
   - Global UI component
   - RUNED `useEventListener` for keyboard (↑↓⏎⎋)
   - Auto-cleanup

3. **Extension** (`editor/slash-command/extension.ts`)
   - Minimal Tiptap extension
   - Updates `slashMenuState` on lifecycle events

### Editor Hooks

Composable editor functionality using Svelte 5 runes:

- **useEditorAutosave**: 800ms debounced saving with Convex
- **useEditorSync**: Content loading, title sync, block lifecycle
- **useSimulationMode**: Snapshot management for preview/signing
- **usePdfExport**: In-browser PDF generation

### RUNED Composables

Located in `src/lib/runes/`:

- **createAIGeneration**: Streaming state + command queue
- **createInlineAIEdit**: Selection handling + text replacement
- **createHyprSign**: Full PDF signing workflow
- **createPDFExport**: Progress tracking + blob download
- **createTiptapCollab**: Tiptap collaboration setup
- **usePresence**: Real-time presence tracking

## Routing Strategy

### Protected Routes
Routes in `(protected)` group require authentication via WorkOS.

**Layout**: `routes/(protected)/+layout.server.ts`
- Session hydration
- User data fetching
- Redirect to `/login` if unauthenticated

### API Routes
All API routes follow REST-like conventions:

- **POST** for creation/mutation
- **GET** for queries (with proper caching)
- **Streaming** for AI responses (SSE)

## Styling System

### UnoCSS Configuration
- **Preset**: UNO (Tailwind-like utilities)
- **Icons**: Iconify (Lucide icons)
- **Animations**: `unocss-preset-animations`
- **Theme**: shadcn tokens via `unocss-preset-shadcn`

### CSS Architecture
1. **Global styles**: `app.css` (CSS variables, resets)
2. **Component styles**: Scoped `<style>` blocks
3. **Utility classes**: UnoCSS on-demand
4. **Theme variables**: CSS custom properties in `:root`

### Theme System
- Light/Dark mode via `mode-watcher`
- Corporate mode (professional green theme)
- Color palette: violet (default), cyan, green (corporate)

## Convex Backend

### Schema Design
Convex uses code-as-schema with Zod-like validators:

```typescript
// convex/schema.ts
export default defineSchema({
  documents: defineTable({
    title: v.string(),
    content: v.any(), // Tiptap JSON
    ownerId: v.id('users'),
    status: v.union(v.literal('draft'), v.literal('sealed')),
    // ... more fields
  })
    .index('by_owner', ['ownerId'])
    .index('by_status', ['status'])
})
```

### Mutation/Query Patterns
- **Mutations**: Use for writes, return updated data
- **Queries**: Use for reads, automatically cached
- **Actions**: Use for external API calls (Gemini, Resend, etc.)

## Type Safety

### Zod Schemas
- **Runtime validation** for external data
- **Type inference** for TypeScript
- **Schema composition** for reusable types

Example:
```typescript
const BlockSchema = z.object({
  id: z.string().uuid(),
  type: z.string(),
  label: z.string()
});

type Block = z.infer<typeof BlockSchema>;
```

### TypeScript Patterns
- **Strict mode** enabled
- **No implicit any**
- **Explicit return types** for public functions
- **Branded types** for IDs (`UserId`, `DocumentId`)

## Development Workflow

### Scripts
```bash
bun run dev          # Start dev server
bun run build        # Production build
bun run check        # TypeScript check
bun run lint         # Biome linting
bun run lint:fix     # Auto-fix issues
bun run validate     # Deep check (parallel)
bunx convex dev      # Start Convex dev
```

### Code Quality
1. **Pre-commit**: Run `bun run validate`
2. **TypeScript**: Must pass `svelte-check`
3. **Linting**: Must pass Biome checks
4. **Formatting**: Auto-format with Biome

### Git Workflow
1. Create feature branch: `git checkout -b feature/name`
2. Make changes and commit frequently
3. Run validation: `bun run validate`
4. Push and create PR
5. Merge to `master` after review

## File Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| **Components** | PascalCase.svelte | `EditorTopBar.svelte` |
| **Routes** | +page.svelte | `+page.svelte` |
| **Layouts** | +layout.svelte | `+layout.svelte` |
| **Stores** | kebab-case.svelte.ts | `document-store.svelte.ts` |
| **Utils** | kebab-case.ts | `tiptap-sync.ts` |
| **Types** | kebab-case.ts | `editor-types.ts` |
| **Smart Blocks** | kebab-case.block.svelte | `signature.block.svelte` |
| **API Routes** | +server.ts | `+server.ts` |

## Best Practices

### Svelte 5 Patterns
1. **Prefer runes over stores**
   ```svelte
   let count = $state(0); // ✅
   const count = writable(0); // ❌ (old pattern)
   ```

2. **Use $derived for computed values**
   ```svelte
   const doubled = $derived(count * 2);
   ```

3. **Use $effect for side effects**
   ```svelte
   $effect(() => {
     console.log('count changed:', count);
   });
   ```

4. **Use $bindable for two-way binding**
   ```svelte
   interface Props {
     value: string;
     onchange?: (value: string) => void;
   }
   
   let { value = $bindable(), onchange }: Props = $props();
   ```

### Component Composition
- **Keep components small** (<200 lines)
- **Extract reusable logic** to composables (RUNED)
- **Use slots** for flexible layouts
- **Prop drilling**: Avoid deep nesting, use context API

### Performance
- **Lazy load** smart blocks (via dynamic import)
- **Code split** routes (automatic with SvelteKit)
- **Debounce** expensive operations (autosave, search)
- **Memoize** complex computations with `$derived`

### Security
- **Validate all inputs** with Zod
- **Sanitize user content** before rendering
- **Use WorkOS** for authentication (no custom auth)
- **Environment variables** for secrets (never commit)

## Integration Points

### Convex
- Real-time database queries
- Serverless mutations/actions
- Automatic WebSocket subscriptions

### WorkOS
- Authentication flows
- User management
- Session handling

### Tiptap
- Rich text editing
- Custom extensions
- Collaboration (Yjs)

### AI (Gemini)
- Document generation
- Inline text editing
- PDF field detection (Vision)

### Resend
- Contract reminder emails
- Notification system
- Transactional emails

### Airtable
- Contract data sync
- Custom integrations
- Webhook handlers

## Future Architecture

### Planned Features
- Astro integration for marketing pages
- Contract reminder system (Resend)
- Airtable bi-directional sync
- Payment integrations (Polar)
- Advanced PDF AcroForm support
- Audit log & track changes

### Scalability Considerations
- **Convex limits**: Plan for pagination/sharding
- **Editor performance**: Virtual scrolling for large docs
- **Collaboration**: Optimize Yjs CRDT for large teams
- **AI rate limits**: Queue system for batch operations

## Contributing

### Adding New Features
1. Check `README.md` for current status
2. Create plan in Linear (if using project management)
3. Follow existing patterns (see examples in codebase)
4. Add tests for new functionality
5. Update documentation (this file + README)

### Creating Smart Blocks
See `README.md` section "🧩 Creating Smart Blocks" for detailed guide.

## Resources

- [SvelteKit Docs](https://kit.svelte.dev/)
- [Svelte 5 Runes](https://svelte-5-preview.vercel.app/)
- [Convex Docs](https://docs.convex.dev/)
- [Tiptap Guide](https://tiptap.dev/)
- [UnoCSS](https://unocss.dev/)
- [Bits UI](https://bits-ui.com/)
- [RUNED](https://runed.dev/)
