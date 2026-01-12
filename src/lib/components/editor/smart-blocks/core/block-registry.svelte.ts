/**
 * Block Registry - Auto-discovery system for smart blocks
 *
 * Uses Vite's import.meta.glob to automatically discover and register
 * all block definitions without manual imports or codegen.
 *
 * Pattern: *.block.svelte files with `<script module>` exporting `definition`
 */
import type { BlockDefinition } from './types';

export const CATEGORY_CONFIG = [
	{ id: 'content', label: 'Core Content', color: 'blue' },
	{ id: 'inputs', label: 'User Inputs', color: 'violet' },
	{ id: 'assets', label: 'Assets & Media', color: 'fuchsia' },
	{ id: 'logic', label: 'Conditional & Logic', color: 'orange' },
	{ id: 'compliance', label: 'Compliance & Signature', color: 'emerald' },
	{ id: 'layout', label: 'Structure & Layout', color: 'slate' }
] as const;

export const CATEGORY_STYLES: Record<string, string> = {
	blue: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
	violet: 'bg-violet-500/10 text-violet-500 border-violet-500/20',
	fuchsia: 'bg-fuchsia-500/10 text-fuchsia-500 border-fuchsia-500/20',
	orange: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
	emerald: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
	slate: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
	default: 'bg-muted text-muted-foreground border-border'
};

class BlockRegistry {
	private readonly definitions = $state<Map<string, BlockDefinition>>(new Map());
	private initialized = $state(false);

	constructor() {
		this.initialize();
	}

	/**
	 * Auto-discover and register all blocks
	 */
	private async initialize() {
		// Eagerly import all blocks with explicit generic for definition and default component
		const modules = import.meta.glob<{ default: any; definition: BlockDefinition }>(
			'../blocks/*.block.svelte',
			{ eager: true }
		);

		for (const path in modules) {
			const mod = modules[path];
			const def = mod.definition;
			if (!def?.type) {
				console.warn(`[BlockRegistry] No definition export in ${path}`);
				continue;
			}
			
			// Automatically assign the Svelte component from the default export
			def.component = mod.default;
			this.definitions.set(def.type, def);
		}

		this.initialized = true;
		console.log(`✅ BlockRegistry: ${this.definitions.size} blocks registered`);
	}

	get(type: string): BlockDefinition | undefined {
		return this.definitions.get(type);
	}

	getAll(): BlockDefinition[] {
		return Array.from(this.definitions.values());
	}

	get byCategory(): Map<string, BlockDefinition[]> {
		const groups = new Map<string, BlockDefinition[]>();
		for (const def of this.getAll()) {
			const cat = def.category;
			if (!groups.has(cat)) {
				groups.set(cat, []);
			}
			groups.get(cat)?.push(def);
		}
		return groups;
	}

	/**
	 * Sync with Tiptap: Generate attribute schema
	 */
	getTiptapAttributes(): Record<string, { default: any }> {
		const attrs: Record<string, { default: any }> = {};

		// Essential base attributes for all blocks
		const baseAttrs = {
			id: { default: null },
			type: { default: null },
			label: { default: 'New Block' },
			required: { default: false },
			slotId: { default: null },
			value: { default: null },
			visibilityCondition: { default: null }
		};

		Object.assign(attrs, baseAttrs);

		// Merge block-specific defaults
		for (const def of this.getAll()) {
			for (const [key, value] of Object.entries(def.defaults)) {
				if (!(key in attrs)) {
					attrs[key] = { default: value ?? null };
				}
			}
		}

		return attrs;
	}

	get ready(): boolean {
		return this.initialized;
	}
}

export const blockRegistry = new BlockRegistry();
