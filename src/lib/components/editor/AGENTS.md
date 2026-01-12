# HyprDoc Editor Agent Guide

Guide for maintaining the HyprDoc Smart Block system and Editor architecture.

## Smart Block Architecture (`*.block.svelte`)
Blocks are self-contained components in `src/lib/components/editor/smart-blocks/blocks/`.

### 1. Structure
- **Module Script**: Must export `definition` (metadata) and `schema` (Zod).
- **Component Script**: Receives `RenderContext` via `$props()`.
- **Template**: Handles mode-specific UI (edit, sign, view).

### 2. Registry Auto-discovery
`BlockRegistry` (`core/block-registry.svelte.ts`) uses Vite's `import.meta.glob` to 
auto-register blocks. No manual imports or codegen required.
- **Pattern**: `../blocks/*.block.svelte`
- **Dynamic Sync**: `getTiptapAttributes()` maps block defaults to Tiptap node attributes.

## Tiptap Extensions (`src/lib/components/editor/extensions/`)
- **SmartBlockExtension**: The primary node for all smart blocks.
- **Dynamic Attributes**: Automatically generated from the `BlockRegistry`.
- **Dependency Injection**: Use `.configure({ services, documentStore })` to inject 
  backend services and state into the Tiptap instance.
- **NodeView**: Renders the Svelte component within the Prosemirror document.

## Mode-based Rendering
Blocks must implement UI for three modes defined in `RenderContext`:
- `edit`: Builder mode with full property access and layout controls.
- `sign`: Interaction mode for signers. Blocks are only interactive if `active`.
- `view`: Static, read-only view for final document presentation.

## Properties Panel (`src/lib/components/editor/properties/`)
- **Contextual Tabs**: Switches between 'Global', 'Block', and 'Slots'.
- **Selection Sync**: `BlockSettingsTab` binds to the currently selected Tiptap node.
- **UI Store**: Uses `uiStore` for panel state (collapsed/expanded) and layout modes.

## Development Rules
- **Schema First**: Update the Zod `schema` in the module script before adding props.
- **Runes Only**: Use Svelte 5 runes (`$state`, `$derived`, `$props`).
- **Isolation**: Blocks should not access global stores directly; use `RenderContext`.
- **Validation**: Run `bun run validate` after creating or modifying blocks.
