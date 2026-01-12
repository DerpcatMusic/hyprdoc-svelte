/**
 * EditorModeState - Finite State Machine for Editor Modes
 * 
 * SINGLE SOURCE OF TRUTH for editor mode. Uses RUNED FiniteStateMachine
 * to enforce valid state transitions and prevent inconsistent state.
 * 
 * States:
 * - builder: Template editing mode (default)
 * - preview: Test mode - changes don't persist, snapshot restored on exit
 * - signing: Actual signing - changes persist
 * - sealed: Immutable, document is locked
 * 
 * @module lib/editor/core/EditorModeState.svelte.ts
 */
import { FiniteStateMachine } from 'runed';
import type { JSONContent } from '@tiptap/core';
import type { SmartBlockData } from '$lib/types';

// ━━━ STATE TYPES ━━━
export type EditorMode = 'builder' | 'preview' | 'signing' | 'sealed';
export type EditorModeEvent = 'PREVIEW' | 'SIGN' | 'EXIT' | 'SEAL';

export interface SlotContext {
	id: string;
	name: string;
	color: string;
	email?: string;
}

/**
 * Snapshot of all block data
 */
export type BlockSnapshot = Record<string, SmartBlockData>;

/**
 * EditorModeState
 * 
 * Manages editor mode transitions with:
 * - FSM for valid state transitions
 * - Automatic snapshot for preview mode
 * - Slot context for signing mode
 * - Derived boolean helpers for backward compat
 */
export class EditorModeState {
	// ━━━ CORE FSM ━━━
	readonly #fsm = new FiniteStateMachine<EditorMode, EditorModeEvent>('builder', {
		builder: {
			PREVIEW: 'preview',
			SIGN: 'signing',
			SEAL: 'sealed'
		},
		preview: {
			EXIT: 'builder',
			SIGN: 'signing' // Can switch directly from preview to signing
		},
		signing: {
			EXIT: 'builder'
		},
		sealed: {
			// Terminal state - no exits
		}
	});

	// ━━━ SNAPSHOT (for preview mode) ━━━
	// Using $state.raw for performance - snapshot is immutable once created
	#snapshot = $state.raw<BlockSnapshot | null>(null);
	#documentSnapshot = $state.raw<JSONContent | null>(null);

	get blockSnapshot(): BlockSnapshot | null {
		return this.#snapshot;
	}

	get contentSnapshot(): JSONContent | null {
		return this.#documentSnapshot;
	}

	// ━━━ ACTIVE SLOT (for signing mode) ━━━
	#activeSlot = $state<SlotContext | null>(null);

	// ━━━ DERIVED STATE ━━━
	// These replace the scattered booleans in DocumentStore
	
	/** Current mode as string */
	get mode(): EditorMode {
		return this.#fsm.current;
	}

	/** True when editing template */
	get isBuilder(): boolean {
		return this.#fsm.current === 'builder';
	}

	/** True when previewing as consumer */
	get isPreview(): boolean {
		return this.#fsm.current === 'preview';
	}

	/** True when actually signing */
	get isSigning(): boolean {
		return this.#fsm.current === 'signing';
	}

	/** True when document is sealed/immutable */
	get isSealed(): boolean {
		return this.#fsm.current === 'sealed';
	}

	/** True when in any consumer mode (preview OR signing) */
	get isConsumer(): boolean {
		return this.isPreview || this.isSigning;
	}

	/** True when editor should be read-only (sealed) */
	get isReadOnly(): boolean {
		return this.isSealed;
	}

	/** Whether blocks should show interactive fields (vs builder chrome) */
	get showInteractiveFields(): boolean {
		return this.isConsumer;
	}

	/** Whether blocks should show builder chrome (toolbars, handles) */
	get showBuilderChrome(): boolean {
		return this.isBuilder;
	}

	/** Current active slot for signing (null in builder/preview) */
	get activeSlot(): SlotContext | null {
		return this.#activeSlot;
	}

	/** Active slot ID shorthand */
	get activeSlotId(): string | null {
		return this.#activeSlot?.id ?? null;
	}

	// ━━━ TRANSITION METHODS ━━━

	/**
	 * Enter preview mode - snapshot block values for restore on exit
	 * @param blockValues Current block values to snapshot
	 * @param documentLayout Optional Tiptap JSON snapshot to restore layout
	 */
	enterPreview(blockValues: BlockSnapshot, documentLayout?: JSONContent): void {
		if (this.#fsm.current !== 'builder' && this.#fsm.current !== 'preview') {
			console.warn(`[EditorMode] Cannot enter preview from ${this.#fsm.current}`);
			return;
		}

		// Create immutable snapshot using structuredClone (better than JSON.parse/stringify)
		this.#snapshot = structuredClone($state.snapshot(blockValues));
		if (documentLayout) {
			this.#documentSnapshot = structuredClone($state.snapshot(documentLayout));
		}
		
		this.#fsm.send('PREVIEW');
		
		console.log('[EditorMode] Entered preview mode, snapshot created');
	}

	/**
	 * Exit preview mode - returns snapshot for restoration
	 * @returns Object containing block values and document layout to restore
	 */
	exitPreview(): { blocks: BlockSnapshot | null; layout: JSONContent | null } | null {
		if (this.#fsm.current !== 'preview') {
			console.warn(`[EditorMode] Cannot exit preview from ${this.#fsm.current}`);
			return null;
		}

		const snapshot = this.#snapshot;
		const layout = this.#documentSnapshot;
		
		this.#snapshot = null;
		this.#documentSnapshot = null;
		this.#activeSlot = null;
		this.#fsm.send('EXIT');
		
		console.log('[EditorMode] Exited preview mode, returning snapshot');
		return { blocks: snapshot, layout };
	}

	/**
	 * Enter signing mode - changes persist
	 * @param slot The signer's slot context
	 * @param blockValues Optional block values to snapshot (if entering from builder)
	 * @param documentLayout Optional layout to snapshot (if entering from builder)
	 */
	enterSigning(slot: SlotContext, blockValues?: BlockSnapshot, documentLayout?: JSONContent): void {
		if (this.#fsm.current !== 'builder' && this.#fsm.current !== 'preview') {
			console.warn(`[EditorMode] Cannot enter signing from ${this.#fsm.current}`);
			return;
		}

		// If coming from builder, take snapshot
		if (this.#fsm.current === 'builder' && blockValues) {
			this.#snapshot = structuredClone($state.snapshot(blockValues));
			if (documentLayout) {
				this.#documentSnapshot = structuredClone($state.snapshot(documentLayout));
			}
		} 
		// If coming from preview, PRESERVE existing snapshot (don't clear it)
		
		this.#activeSlot = slot;
		this.#fsm.send('SIGN');
		
		console.log(`[EditorMode] Entered signing mode for slot: ${slot.name}`);
	}

	/**
	 * Exit signing mode - changes are kept (unless we have a snapshot to restore)
	 * @returns Object containing block values and document layout to restore (if they exist)
	 */
	exitSigning(): { blocks: BlockSnapshot | null; layout: JSONContent | null } | null {
		if (this.#fsm.current !== 'signing') {
			console.warn(`[EditorMode] Cannot exit signing from ${this.#fsm.current}`);
			return null;
		}

		// Return snapshot if we have one (was simulating)
		const snapshot = this.#snapshot;
		const layout = this.#documentSnapshot;

		this.#snapshot = null;
		this.#documentSnapshot = null;
		this.#activeSlot = null;
		this.#fsm.send('EXIT');
		
		console.log('[EditorMode] Exited signing mode');
		return { blocks: snapshot, layout };
	}

	/**
	 * Seal the document - terminal state, document becomes immutable
	 */
	seal(): void {
		if (this.#fsm.current !== 'builder') {
			console.warn(`[EditorMode] Can only seal from builder mode`);
			return;
		}

		this.#fsm.send('SEAL');
		console.log('[EditorMode] Document sealed');
	}

	/**
	 * Exit current consumer mode (preview or signing)
	 * Convenience method that calls the appropriate exit
	 */
	exit(): { blocks: BlockSnapshot | null; layout: JSONContent | null } | null {
		if (this.isPreview) {
			return this.exitPreview();
		}
		if (this.isSigning) {
			this.exitSigning();
		}
		return null;
	}

	/**
	 * Set active slot without changing mode
	 * Used when switching between signers in multi-signer flow
	 */
	setActiveSlot(slot: SlotContext | null): void {
		if (!this.isConsumer) {
			console.warn('[EditorMode] Can only set active slot in consumer mode');
			return;
		}
		this.#activeSlot = slot;
	}

	/**
	 * Check if a specific block is interactive for current signer
	 * In builder mode: all blocks interactive
	 * In consumer mode: only blocks assigned to active slot (or unassigned)
	 */
	isBlockInteractive(blockSlotId: string | null): boolean {
		// Builder mode - everything is interactive (for editing config)
		if (this.isBuilder) return true;
		
		// Sealed - nothing interactive
		if (this.isSealed) return false;
		
		// Consumer mode - check slot assignment
		// Unassigned blocks (null slotId) are interactive for everyone
		if (!blockSlotId) return true;
		
		// Active slot matches block slot
		return blockSlotId === this.activeSlotId;
	}
}

// ━━━ SINGLETON INSTANCE ━━━
// Single instance shared across entire editor session
let _instance: EditorModeState | null = null;

export function getEditorModeState(): EditorModeState {
	if (!_instance) {
		_instance = new EditorModeState();
	}
	return _instance;
}

export function resetEditorModeState(): void {
	_instance = null;
}
