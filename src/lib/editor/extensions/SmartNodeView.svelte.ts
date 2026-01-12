import { type NodeViewRenderer, type Editor } from '@tiptap/core';
import { mount, unmount, untrack } from 'svelte';
import { useDebounce } from 'runed';
import BlockShell from '../../components/editor/smart-blocks/core/BlockShell.svelte';

/**
 * SmartNodeView
 * 
 * The High-Performance Bridge: Provides a reactive proxy to Svelte components
 * while shielding Tiptap from frequent re-renders through debounced sync.
 */
export class SmartNodeView {
	dom: HTMLElement;
	contentDOM?: HTMLElement;
	node: any;
	view: any;
	getPos: () => number;
	editor: Editor;
	extension: any;
	
	#svelteComponent: any;
	#proxy: any;
	#debouncedSync: ReturnType<typeof useDebounce<[Record<string, any>], void>>;

	constructor(
		node: any,
		view: any,
		getPos: any,
		decorations: any,
		editor: any,
		extension: any
	) {
		this.node = node;
		this.view = view;
		this.getPos = getPos;
		this.editor = editor;
		this.extension = extension;

		// 0. Initialize DOM
		// We manually create the container, bypassing Tiptap's complex component renderer
		this.dom = document.createElement('div');
		this.dom.classList.add('smart-block-wrapper');
		// Mark as content-less for ProseMirror so it doesn't try to manage children unless we say so
		// (For leaf nodes. If non-leaf, we might need contentDOM)
		
		// 1. Setup Debounced Sync back to Tiptap
		this.#debouncedSync = useDebounce((attrs: Record<string, any>) => {
			this.updateAttributes(attrs);
		}, 300);

		// 2. Create Reactive Proxy for Attributes
		this.#proxy = this.#createProxy(node.attrs);
		
		// 3. Mount Svelte Component
		this.mount();
	}

	mount() {
		this.#svelteComponent = mount(BlockShell, {
			target: this.dom,
			props: {
				node: this.node,
				attrs: this.#proxy,
				editor: this.editor,
				extension: this.extension,
				selected: false
			}
		});
	}

	updateAttributes(attributes: Record<string, any>) {
		if (this.editor && typeof this.getPos === 'function') {
			this.editor.commands.updateAttributes(this.getPos(), attributes);
		}
	}

	#createProxy(initialAttrs: any) {
		const self = this;
		// Create a reactive state proxy
		const state = $state({ ...initialAttrs });

		return new Proxy(state, {
			get(target, prop) {
				return (target as any)[prop];
			},
			set(target, prop, value) {
				untrack(() => {
					(target as any)[prop] = value;
					// Trigger sync back to Tiptap - call the debounced function directly
					self.#debouncedSync({ [prop as string]: value });
				});
				return true;
			}
		});
	}

	update(node: any, decorations: any) {
		if (node.type.name !== this.node.type.name) return false;
		
		this.node = node; // Update internal node reference

		// Update proxy values without triggering a write-back
		untrack(() => {
			Object.entries(node.attrs).forEach(([key, val]) => {
				if (this.#proxy[key] !== val) {
					this.#proxy[key] = val;
				}
			});
		});

		return true;
	}

	selectNode() {
		if (this.#svelteComponent) this.#svelteComponent.selected = true;
	}

	deselectNode() {
		if (this.#svelteComponent) this.#svelteComponent.selected = false;
	}

	destroy() {
		if (this.#svelteComponent) {
			unmount(this.#svelteComponent);
		}
		this.#debouncedSync.cancel();
	}
}

export const SmartNodeViewRenderer = (): NodeViewRenderer => (props) => {
	return new SmartNodeView(
		props.node,
		props.view,
		props.getPos,
		props.decorations,
		props.editor,
		props.extension
	) as any;
};
