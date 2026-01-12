/**
 * SlashMenuState - Singleton state class for slash menu
 *
 * Uses Svelte 5 $state runes for reactivity.
 * Shared between Tiptap extension and SlashMenuPortal component.
 */
import { blockRegistry } from '$lib/components/editor/smart-blocks/core/block-registry.svelte';
import type { BlockDefinition } from '$lib/components/editor/smart-blocks/core/types';

// ━━━ TYPES ━━━
export interface CommandItem {
	type: string;
	title: string;
	description: string;
	icon: string;
	category?: string;
	isSmartBlock?: boolean;
	attrs?: Record<string, any>;
	defaults?: Record<string, any>;
	command?: (editor: any, range: any) => void;
}

export interface MenuPosition {
	x: number;
	y: number;
	placement: 'above' | 'below';
}

// ━━━ NATIVE EDITOR COMMANDS ━━━
const NATIVE_COMMANDS: CommandItem[] = [
	{
		type: 'heading',
		title: 'Heading 1',
		description: 'Big section heading',
		icon: 'i-lucide-heading-1',
		attrs: { level: 1 },
		command: (editor, range) => {
			editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run();
		}
	},
	{
		type: 'heading',
		title: 'Heading 2',
		description: 'Medium section heading',
		icon: 'i-lucide-heading-2',
		attrs: { level: 2 },
		command: (editor, range) => {
			editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run();
		}
	},
	{
		type: 'heading',
		title: 'Heading 3',
		description: 'Small section heading',
		icon: 'i-lucide-heading-3',
		attrs: { level: 3 },
		command: (editor, range) => {
			editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run();
		}
	},
	{
		type: 'bulletList',
		title: 'Bullet List',
		description: 'Create a simple bulleted list',
		icon: 'i-lucide-list',
		command: (editor, range) => {
			editor.chain().focus().deleteRange(range).toggleBulletList().run();
		}
	},
	{
		type: 'orderedList',
		title: 'Numbered List',
		description: 'Create a numbered list',
		icon: 'i-lucide-list-ordered',
		command: (editor, range) => {
			editor.chain().focus().deleteRange(range).toggleOrderedList().run();
		}
	},
	{
		type: 'blockquote',
		title: 'Quote',
		description: 'Capture a quote',
		icon: 'i-lucide-quote',
		command: (editor, range) => {
			editor.chain().focus().deleteRange(range).setBlockquote().run();
		}
	},
	{
		type: 'horizontalRule',
		title: 'Divider',
		description: 'Visually separate content',
		icon: 'i-lucide-minus',
		command: (editor, range) => {
			editor.chain().focus().deleteRange(range).setHorizontalRule().run();
		}
	}
];

// ━━━ GET SMART BLOCK ITEMS FROM REGISTRY ━━━
function getSmartBlockItems(): CommandItem[] {
	const definitions = blockRegistry.getAll();

	return definitions.map((def: BlockDefinition) => ({
		type: def.type,
		title: def.label,
		description: def.description || `Insert ${def.label.toLowerCase()}`,
		icon: def.icon ? def.icon.replace('lucide:', 'i-lucide-') : 'i-lucide-box',
		category: def.category,
		isSmartBlock: true,
		defaults: def.defaults
	}));
}

// ━━━ STATE CLASS ━━━
export class SlashMenuState {
	// Reactive state using $state runes
	isOpen = $state(false);
	items = $state<CommandItem[]>([]);
	filteredItems = $state<CommandItem[]>([]);
	selectedIndex = $state(0);
	position = $state<MenuPosition>({ x: 0, y: 0, placement: 'below' });
	query = $state('');

	// Private callback reference
	#onCommand: ((item: CommandItem) => void) | null = null;
	#editor: any = null;
	#range: any = null;

	// ━━━ ACTIONS ━━━

	/**
	 * Open the menu with items and position
	 */
	open(
		editor: any,
		range: any,
		onCommand: (item: CommandItem) => void,
		clientRect: (() => DOMRect | null) | null
	) {
		this.#editor = editor;
		this.#range = range;
		this.#onCommand = onCommand;

		// Combine native commands + smart blocks
		this.items = [...NATIVE_COMMANDS, ...getSmartBlockItems()];
		this.filteredItems = this.items;
		this.selectedIndex = 0;
		this.query = '';

		// Calculate position
		if (clientRect) {
			const rect = clientRect();
			if (rect) {
				const MENU_HEIGHT = 320;
				const spaceBelow = window.innerHeight - rect.bottom;

				this.position = {
					x: Math.max(8, rect.left),
					y: spaceBelow < MENU_HEIGHT ? rect.top - 5 : rect.bottom + 5,
					placement: spaceBelow < MENU_HEIGHT ? 'above' : 'below'
				};
			}
		}

		this.isOpen = true;
	}

	/**
	 * Update items based on query filter
	 */
	updateQuery(query: string) {
		this.query = query;
		this.filteredItems = this.items.filter(
			(item) =>
				item.title.toLowerCase().includes(query.toLowerCase()) ||
				item.type.toLowerCase().includes(query.toLowerCase())
		);
		this.selectedIndex = 0;
	}

	/**
	 * Close the menu
	 */
	close() {
		this.isOpen = false;
		this.items = [];
		this.filteredItems = [];
		this.selectedIndex = 0;
		this.#onCommand = null;
		this.#editor = null;
		this.#range = null;
	}

	/**
	 * Move selection up
	 */
	moveUp() {
		if (this.filteredItems.length === 0) return;
		this.selectedIndex =
			(this.selectedIndex - 1 + this.filteredItems.length) % this.filteredItems.length;
	}

	/**
	 * Move selection down
	 */
	moveDown() {
		if (this.filteredItems.length === 0) return;
		this.selectedIndex = (this.selectedIndex + 1) % this.filteredItems.length;
	}

	/**
	 * Select current item
	 */
	selectCurrent() {
		const item = this.filteredItems[this.selectedIndex];
		if (item) {
			this.selectItem(item);
		}
	}

	/**
	 * Select a specific item
	 */
	selectItem(item: CommandItem) {
		if (item.command && this.#editor && this.#range) {
			// Native command
			item.command(this.#editor, this.#range);
		} else if (item.isSmartBlock && this.#editor && this.#range) {
			// Smart block
			const id = crypto.randomUUID();
			const newBlock = {
				id,
				type: item.type,
				label: `New ${item.title}`,
				placeholder: 'Enter value',
				required: false,
				variableName: `${item.type}_${id.slice(0, 4)}`,
				value: null,
				...item.defaults
			};

			this.#editor
				.chain()
				.focus(undefined, { scrollIntoView: false })
				.deleteRange(this.#range)
				.insertContent({
					type: 'smartBlock',
					attrs: newBlock
				})
				.run();
		}

		this.close();
	}

	/**
	 * Handle keyboard event
	 * @returns true if event was handled
	 */
	handleKeyDown(event: KeyboardEvent): boolean {
		if (!this.isOpen) return false;

		switch (event.key) {
			case 'ArrowUp':
				event.preventDefault();
				this.moveUp();
				return true;

			case 'ArrowDown':
				event.preventDefault();
				this.moveDown();
				return true;

			case 'Enter':
				event.preventDefault();
				event.stopPropagation();
				this.selectCurrent();
				return true;

			case 'Escape':
				event.preventDefault();
				this.close();
				return true;

			default:
				return false;
		}
	}
}

// ━━━ SINGLETON INSTANCE ━━━
export const slashMenuState = new SlashMenuState();
