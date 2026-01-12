# HyprDoc Project Structure

Visual overview of the project organization.

## Root Directory

```
hyprdoc-svelte/
├── 📁 src/                   # Source code
├── 📁 convex/                # Backend (Convex)
├── 📁 static/                # Static assets
├── 📁 node_modules/          # Dependencies (gitignored)
├── 📁 .svelte-kit/           # Build cache (gitignored)
├── 📄 package.json           # Dependencies & scripts
├── 📄 svelte.config.js       # SvelteKit config
├── 📄 vite.config.ts         # Vite config
├── 📄 tsconfig.json          # TypeScript config
├── 📄 uno.config.ts          # UnoCSS config
├── 📄 biome.json             # Biome linter/formatter
├── 📄 .env.local             # Environment variables (gitignored)
├── 📄 .env.example           # Environment template
├── 📄 .gitignore             # Git ignore rules
└── 📚 Documentation/
    ├── README.md             # Project overview
    ├── ARCHITECTURE.md       # Architecture guide
    ├── CONTRIBUTING.md       # Contribution guide
    ├── GIT_GUIDE.md          # Git workflow
    ├── STYLING.md            # Styling guide
    ├── AGENTS.md             # AI agents guide
    └── CLAUDE.md             # Claude-specific docs
```

## Source (`src/`)

### Core Files
```
src/
├── app.html              # HTML template
├── app.css               # Global styles
├── app.d.ts              # App type definitions
├── env.d.ts              # Environment types
└── hooks.server.ts       # Server hooks (auth, etc.)
```

### Routes (`src/routes/`)
```
routes/
├── +layout.svelte                    # Root layout
├── +layout.server.ts                 # Root layout server
├── +page.svelte                      # Landing page
├── (protected)/                      # 🔒 Auth-required routes
│   ├── +layout.server.ts             # Auth check & session
│   ├── +layout.svelte                # Protected layout
│   ├── dashboard/                    # Main dashboard
│   │   └── +page.svelte
│   ├── documents/                    # Document management
│   │   ├── +page.svelte              # Document list
│   │   └── [id]/                     # Single document
│   ├── editor/                       # Document editor
│   │   └── [id]/
│   │       └── +page.svelte
│   └── envelopes/                    # Envelope management
│       ├── +page.svelte
│       └── [id]/
├── api/                              # API endpoints
│   ├── ai/
│   │   ├── generate-stream/          # AI doc generation
│   │   └── inline-edit/              # AI text editing
│   ├── documents/
│   │   └── [id]/
│   │       └── pdf/                  # PDF generation
│   └── hyprsign/
│       ├── analyze/                  # PDF field detection
│       └── finalize/                 # Signature embedding
├── auth/                             # Auth callbacks
│   ├── callback/                     # WorkOS callback
│   └── logout/
├── login/                            # Login page
│   └── +page.svelte
└── sign/                             # Public signing
    └── [token]/
        └── +page.svelte
```

### Library (`src/lib/`)

#### Components (`src/lib/components/`)
```
components/
├── ui/                               # Base UI components (shadcn)
│   ├── button/
│   ├── input/
│   ├── dialog/
│   ├── dropdown-menu/
│   └── ... (30+ components)
├── dashboard/                        # Dashboard components
│   ├── DashboardHUD.svelte
│   ├── DocumentsList.svelte
│   ├── DocumentStack.svelte
│   └── EnvelopeTable.svelte
├── editor/                           # Editor components
│   ├── EditorTopBar.svelte
│   ├── EditorFormattingBar.svelte
│   ├── EditorBubbleMenu.svelte
│   ├── CollaboratorAvatars.svelte
│   ├── extensions/                   # Tiptap extensions
│   │   ├── smart-block-extension.ts
│   │   ├── variable-mention.ts
│   │   ├── font-size.ts
│   │   ├── font-weight.ts
│   │   └── collaboration-cursor.ts
│   ├── properties/                   # Properties panel
│   │   ├── PropertiesPanel.svelte
│   │   └── panels/
│   │       ├── DocumentSettingsTab.svelte
│   │       └── BlockSettingsTab.svelte
│   ├── sidebar/                      # Editor sidebar
│   │   ├── EditorSidebar.svelte
│   │   └── panels/
│   │       ├── AiAssistantPanel.svelte
│   │       ├── BlockPalette.svelte
│   │       ├── GlobalVariablesPanel.svelte
│   │       └── GlossaryPanel.svelte
│   ├── slash-command/                # Slash menu
│   │   ├── SlashMenuState.svelte.ts
│   │   ├── SlashMenuPortal.svelte
│   │   └── extension.ts
│   └── smart-blocks/                 # Smart block system
│       ├── core/
│       │   ├── block-registry.svelte.ts
│       │   ├── block-context.svelte.ts
│       │   ├── SmartField.svelte
│       │   └── base-schema.ts
│       └── blocks/                   # Block components
│           ├── signature.block.svelte
│           ├── date-picker.block.svelte
│           ├── checkbox.block.svelte
│           ├── text-input.block.svelte
│           └── ... (18 total blocks)
├── theme-toggle.svelte
└── UserSync.svelte
```

#### Core Library (`src/lib/`)
```
lib/
├── ai/                               # AI integration
│   ├── command-executor.ts           # AI command runner
│   ├── editor-tools.ts               # Editor AI tools
│   └── inline-ai-config.ts
├── auth/                             # Authentication
│   ├── client.server.ts              # WorkOS client
│   ├── session.server.ts             # Session management
│   ├── index.ts
│   └── types.ts
├── blocks/                           # Block utilities
│   └── zod-to-convex.ts
├── certificates/                     # Certificate generation
│   └── generate.ts
├── constants/                        # App constants
├── convex/                           # Convex client
├── editor/                           # Core editor logic
├── export/                           # Export utilities
├── formula/                          # Formula engine
├── hooks/                            # Composition hooks
│   ├── useEditorAutosave.ts
│   ├── useEditorSync.ts
│   ├── useSimulationMode.ts
│   └── usePdfExport.ts
├── hyprsign/                         # PDF signing
├── import/                           # Import handlers
├── pdf/                              # PDF manipulation
├── runes/                            # RUNED composables
│   ├── createAIGeneration.ts
│   ├── createInlineAIEdit.ts
│   ├── createHyprSign.ts
│   ├── createPDFExport.ts
│   ├── createTiptapCollab.ts
│   └── usePresence.ts
├── server/                           # Server utilities
├── services/                         # Business logic
├── stores/                           # Svelte 5 stores
│   ├── document-store.svelte.ts
│   ├── signing-store.svelte.ts
│   └── ui-store.svelte.ts
├── templates/                        # Document templates
├── types/                            # TypeScript types
└── utils/                            # Utility functions
    ├── cn.ts                         # Class name helper
    ├── tiptap-sync.ts                # Tiptap sync utils
    └── export-tiptap.ts              # PDF export utils
```

## Backend (`convex/`)

```
convex/
├── _generated/                       # Auto-generated (gitignored)
├── schema.ts                         # Database schema
├── documents.ts                      # Document operations
├── envelopes.ts                      # Envelope operations
├── users.ts                          # User management
├── ai/
│   ├── mutations.ts
│   └── queries.ts
└── lib/
    └── validators.ts
```

## Static Assets (`static/`)

```
static/
├── favicon.png
├── logo.svg
├── images/
└── fonts/
```

## Configuration Files

### Package Management
- `package.json` - Dependencies, scripts, project metadata
- `bun.lock` - Bun lockfile (gitignored)

### Build Tools
- `vite.config.ts` - Vite bundler config
- `svelte.config.js` - SvelteKit config
- `tsconfig.json` - TypeScript compiler config

### Styling
- `uno.config.ts` - UnoCSS utility classes
- `components.json` - shadcn component config
- `postcss.config.js.disabled` - PostCSS (disabled, using UnoCSS)

### Linting/Formatting
- `biome.json` - Biome configuration

### Environment
- `.env.local` - Local environment variables (gitignored)
- `.env.example` - Environment template (committed)

### Version Control
- `.gitignore` - Git ignore patterns
- `GIT_GUIDE.md` - Git workflow guide

## Key File Types

### Svelte Components (`.svelte`)
- Reactive UI components
- Use Svelte 5 runes (`$state`, `$derived`, `$effect`)
- Scoped styles with `<style>` blocks

### TypeScript (`.ts`)
- Type definitions
- Utility functions
- Business logic

### Svelte TypeScript (`.svelte.ts`)
- Svelte 5 state stores
- Rune-based reactive state
- Context providers

### SvelteKit Routes
- `+page.svelte` - Page component
- `+page.server.ts` - Server-side page logic
- `+layout.svelte` - Layout component
- `+layout.server.ts` - Server-side layout logic
- `+server.ts` - API endpoint

### Smart Blocks (`.block.svelte`)
- Special extension for auto-discovery
- Must export `schema` and `definition`
- Located in `src/lib/components/editor/smart-blocks/blocks/`

## Size Guidelines

### Component Size Limits
- **Small components**: < 100 lines
- **Medium components**: 100-200 lines
- **Large components**: 200-300 lines
- **Too large**: > 300 lines (consider splitting)

### Module Organization
- One component per file
- Group related components in directories
- Extract shared logic to utilities/hooks
- Use composition over inheritance

## Import Path Aliases

Configured in `svelte.config.js`:

```typescript
$lib             → src/lib
$lib/components  → src/lib/components
$lib/utils       → src/lib/utils
$lib/stores      → src/lib/stores
$app/*           → SvelteKit built-ins
```

## Development Files (Ignored)

These exist during development but are gitignored:

```
.svelte-kit/              # SvelteKit cache
node_modules/             # Dependencies
convex/_generated/        # Convex codegen
*.log                     # Log files
check*.txt                # Validation outputs
build_diagnostic*.txt     # Build diagnostics
.vscode/                  # VS Code settings
.idea/                    # JetBrains IDEs
.zed/                     # Zed editor
```

## Quick Navigation

### Working on UI?
→ `src/lib/components/ui/` or `src/lib/components/dashboard/`

### Working on editor?
→ `src/lib/components/editor/`

### Creating a smart block?
→ `src/lib/components/editor/smart-blocks/blocks/`

### Adding an API endpoint?
→ `src/routes/api/`

### Working on backend?
→ `convex/`

### Updating state management?
→ `src/lib/stores/` or `src/lib/runes/`

### Adding utilities?
→ `src/lib/utils/`

### Configuring build?
→ Root config files (`vite.config.ts`, `svelte.config.js`)

## Documentation Quick Links

- **Getting Started**: `README.md`
- **Architecture Details**: `ARCHITECTURE.md`
- **Contributing Guide**: `CONTRIBUTING.md`
- **Git Workflow**: `GIT_GUIDE.md`
- **Styling System**: `STYLING.md`
- **AI Agents**: `AGENTS.md`

## Useful Commands

```bash
# List all files in a directory
ls src/lib

# Find a specific file
ls -Recurse -Filter "*.block.svelte"

# Count files
(ls -Recurse -Filter "*.svelte").Count

# Search for code
grep -r "functionName" src/

# Tree view (limited depth)
tree src -L 2
```

---

**Last Updated**: January 2026  
**Maintainer**: HyprDoc Team
