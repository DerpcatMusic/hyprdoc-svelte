/**
 * EditorEngine - Tiptap Instance Manager
 *
 * Wraps the Tiptap Editor instance and exposes reactive state via getters.
 * Purely focused on the editor instance, not data syncing or UI panels.
 * 
 * IMPORTANT: All extensions should be passed via mount() from extensions.ts factory.
 * This class does NOT add any extensions itself to prevent duplication.
 *
 * @module lib/editor/core/EditorEngine.svelte.ts
 */

import { Editor, type AnyExtension, type JSONContent } from '@tiptap/core';
import type { SetContentOptions } from '@tiptap/core';
import { untrack, onDestroy } from 'svelte';


export class EditorEngine {
	// The Tiptap instance (private backing field)
	#instance = $state<Editor>();

	// ━━━ REACTIVE STATE ━━━
	isReady = $state(false);
	isFocused = $state(false);
	isEditable = $state(true);
	isSealed = $state(false);
	
	// UI State
	activeSidebarTab = $state<'components' | 'ai' | 'glossary' | 'variables' | 'settings' | null>('components');
	isPropertiesOpen = $state(true);

	// Selection state
	#selectionTrigger = $state(0);
	selection = $state({ from: 0, to: 0 });

	// ━━━ DERIVED FORMATTING STATE ━━━
	get isBold(): boolean {
		this.#selectionTrigger; // Touch for reactivity
		return this.#instance?.isActive('bold') ?? false;
	}

	get isItalic(): boolean {
		this.#selectionTrigger;
		return this.#instance?.isActive('italic') ?? false;
	}

	get isUnderline(): boolean {
		this.#selectionTrigger;
		return this.#instance?.isActive('underline') ?? false;
	}

	get isStrike(): boolean {
		this.#selectionTrigger;
		return this.#instance?.isActive('strike') ?? false;
	}

	get headingLevel(): number | null {
		this.#selectionTrigger;
		for (let i = 1; i <= 6; i++) {
			if (this.#instance?.isActive('heading', { level: i })) return i;
		}
		return null;
	}

	get isBulletList(): boolean {
		this.#selectionTrigger;
		return this.#instance?.isActive('bulletList') ?? false;
	}

	get isOrderedList(): boolean {
		this.#selectionTrigger;
		return this.#instance?.isActive('orderedList') ?? false;
	}

	get isBlockquote(): boolean {
		this.#selectionTrigger;
		return this.#instance?.isActive('blockquote') ?? false;
	}

	get isCodeBlock(): boolean {
		this.#selectionTrigger;
		return this.#instance?.isActive('codeBlock') ?? false;
	}

	get isSubscript(): boolean {
		this.#selectionTrigger;
		return this.#instance?.isActive('subscript') ?? false;
	}

	get isSuperscript(): boolean {
		this.#selectionTrigger;
		return this.#instance?.isActive('superscript') ?? false;
	}

	get canUndo(): boolean {
		this.#selectionTrigger;
		return this.#instance?.can().undo() ?? false;
	}

	get canRedo(): boolean {
		this.#selectionTrigger;
		return this.#instance?.can().redo() ?? false;
	}

	// ━━━ STYLE ATTRIBUTES ━━━
	getAttributes(name: string): Record<string, any> {
		this.#selectionTrigger;
		return this.#instance?.getAttributes(name) ?? {};
	}

	get textAlign(): string {
		this.#selectionTrigger;
		return this.#instance?.isActive({ textAlign: 'center' }) ? 'center' :
			this.#instance?.isActive({ textAlign: 'right' }) ? 'right' :
			this.#instance?.isActive({ textAlign: 'justify' }) ? 'justify' : 'left';
	}

	get fontSize(): number | undefined {
		this.#selectionTrigger;
		const attrs = this.#instance?.getAttributes('textStyle');
		return attrs?.fontSize ? parseInt(attrs.fontSize, 10) : undefined;
	}

	get fontWeight(): number | undefined {
		this.#selectionTrigger;
		const attrs = this.#instance?.getAttributes('textStyle');
		return attrs?.fontWeight ? parseInt(attrs.fontWeight, 10) : undefined;
	}

	get highlightColor(): string | undefined {
		this.#selectionTrigger;
		const attrs = this.#instance?.getAttributes('highlight');
		return attrs?.color;
	}

	// ━━━ RAW INSTANCE ACCESS ━━━
	get editor(): Editor | undefined {
		return this.#instance;
	}

	constructor() {
		onDestroy(() => {
			this.destroy();
		});
	}

	// ━━━ LIFECYCLE ━━━
	/**
	 * Mount the Tiptap editor to a DOM element.
	 * 
	 * IMPORTANT: Extensions should come from createEditorExtensions() factory.
	 * This method does NOT add any extensions itself to prevent duplication.
	 * 
	 * @param element - DOM element to mount the editor to
	 * @param extensions - ALL extensions (from extensions.ts factory)
	 * @param initialContent - Initial document content
	 */
	mount(element: HTMLElement, extensions: AnyExtension[] = [], initialContent?: JSONContent): void {
		if (this.#instance) {
			this.#instance.destroy();
		}

		this.#instance = new Editor({
			element,
			extensions, // ALL extensions come from factory - no hardcoded ones here
			content: initialContent,
			editable: this.isEditable,


			onTransaction: ({ transaction }) => {
				untrack(() => {
					// Trigger reactivity for formatting state
					this.#selectionTrigger++;

					this.selection = {
						from: transaction.selection.from,
						to: transaction.selection.to
					};
				});
			},

			onFocus: () => {
				this.isFocused = true;
			},

			onBlur: () => {
				this.isFocused = false;
			}
		});

		this.isReady = true;
	}

	destroy(): void {
		if (this.#instance) {
			this.#instance.destroy();
			this.#instance = undefined;
			this.isReady = false;
		}
	}

	// ━━━ COMMANDS ━━━
	toggleBold(): void {
		this.#instance?.chain().focus().toggleBold().run();
	}

	toggleItalic(): void {
		this.#instance?.chain().focus().toggleItalic().run();
	}

	toggleUnderline(): void {
		this.#instance?.chain().focus().toggleUnderline().run();
	}

	toggleStrike(): void {
		this.#instance?.chain().focus().toggleStrike().run();
	}

	setHeading(level: 1 | 2 | 3 | 4 | 5 | 6): void {
		this.#instance?.chain().focus().setHeading({ level }).run();
	}

	toggleHeading(level: 1 | 2 | 3 | 4 | 5 | 6): void {
		if (this.headingLevel === level) {
			this.#instance?.chain().focus().setParagraph().run();
		} else {
			this.#instance?.chain().focus().setHeading({ level }).run();
		}
	}

	setParagraph(): void {
		this.#instance?.chain().focus().setParagraph().run();
	}

	toggleBulletList(): void {
		this.#instance?.chain().focus().toggleBulletList().run();
	}

	toggleOrderedList(): void {
		this.#instance?.chain().focus().toggleOrderedList().run();
	}

	toggleBlockquote(): void {
		this.#instance?.chain().focus().toggleBlockquote().run();
	}

	toggleCodeBlock(): void {
		this.#instance?.chain().focus().toggleCodeBlock().run();
	}

	toggleSubscript(): void {
		this.#instance?.chain().focus().toggleSubscript().run();
	}

	toggleSuperscript(): void {
		this.#instance?.chain().focus().toggleSuperscript().run();
	}

	setHighlight(color?: string): void {
		if (color) {
			this.#instance?.chain().focus().setHighlight({ color }).run();
		} else {
			this.#instance?.chain().focus().unsetHighlight().run();
		}
	}

	setHorizontalRule(): void {
		this.#instance?.chain().focus().setHorizontalRule().run();
	}

	undo(): void {
		this.#instance?.chain().focus().undo().run();
	}

	redo(): void {
		this.#instance?.chain().focus().redo().run();
	}

	// ━━━ UI COMMANDS ━━━
	toggleSidebarTab(tab: 'components' | 'ai' | 'glossary' | 'variables' | 'settings'): void {
		this.activeSidebarTab = this.activeSidebarTab === tab ? null : tab;
	}

	setPropertiesOpen(open: boolean): void {
		this.isPropertiesOpen = open;
	}

	// ━━━ STYLING COMMANDS ━━━
	setFontSize(size: number): void {
		this.#instance?.commands.setFontSize(size.toString());
	}

	unsetFontSize(): void {
		this.#instance?.commands.unsetFontSize();
	}

	setFontWeight(weight: number): void {
		this.#instance?.commands.setFontWeight(weight.toString());
	}

	unsetFontWeight(): void {
		this.#instance?.commands.unsetFontWeight();
	}

	setTextAlign(align: 'left' | 'center' | 'right' | 'justify'): void {
		this.#instance?.chain().focus().setTextAlign(align).run();
	}

	getJSON(): JSONContent | undefined {
		return this.#instance?.getJSON();
	}

	setContent(content: JSONContent, options: Partial<SetContentOptions> = {}): void {
		this.#instance?.commands.setContent(content, options);
	}

	setEditable(editable: boolean): void {
		this.isEditable = editable;
		this.#instance?.setEditable(editable);
	}

	focus(): void {
		this.#instance?.chain().focus().run();
	}
}
