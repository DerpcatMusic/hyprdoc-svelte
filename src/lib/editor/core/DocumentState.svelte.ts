/**
 * DocumentState - Central Document State Hub
 *
 * Manages document metadata, blocks, slots, and settings.
 * Uses Svelte 5 runes for fine-grained reactivity.
 *
 * @module lib/editor/core/DocumentState.svelte.ts
 */

import type { Id, Doc } from '@/convex/_generated/dataModel';
import { PersistedState, Debounced } from 'runed';
import { browser } from '$app/environment';
import { type EditorModeState, getEditorModeState } from './EditorModeState.svelte';
import type { Slot, SmartBlockData, FieldValue, DocumentSettings } from '$lib/types';

// ━━━ TYPES ━━━
// We use the unified types from $lib/types
export type { Slot, SmartBlockData, FieldValue, DocumentSettings };
export type BlockData = SmartBlockData;

export interface VisibilityCondition {
	enabled: boolean;
	sourceBlockId: string;
	operator: 'equals' | 'not_equals' | 'greater_than' | 'greater_or_equal' | 'less_than' | 'less_or_equal' | 'contains' | 'not_contains' | 'is_empty' | 'is_not_empty';
	compareValue?: FieldValue;
}

type DocumentData = Doc<'documents'>;

// ━━━ DEFAULT SETTINGS ━━━
const DEFAULT_SETTINGS: DocumentSettings = {
	fontBody: 'Inter',
	fontHeading: 'Inter',
	fontSize: 16,
	lineHeight: 1.6,
	paperColor: '#ffffff',
	pageWidth: 794,
	pageHeight: 1123,
	marginHorizontal: 80,
	marginVertical: 100,
	showMargins: false,
	mirrorMargins: false,
	timeFormat: '24h',
	measurementUnit: 'px',
	realTimeEnabled: false,
	paperTexture: 'none',
	paperTextureOpacity: 0.1,
	paperTextureScale: 1,
	paperTextureMonochromatic: false
};

export class DocumentState {
	// ━━━ DOCUMENT METADATA ━━━
	documentId = $state<Id<'documents'> | null>(null);
	title = $state('Untitled');
	kind = $state<'document' | 'template'>('document');
	status = $state<'idle' | 'loading' | 'saving' | 'waiting' | 'error'>('idle');
	lastSavedAt = $state<number | null>(null);

	// ━━━ BLOCKS STATE ━━━
	#blocksInternal = $state<Map<string, SmartBlockData>>(new Map());

	get blocks(): SmartBlockData[] {
		return Array.from(this.#blocksInternal.values());
	}

	get blocksMap(): Map<string, SmartBlockData> {
		return this.#blocksInternal;
	}

	get blocksSnapshot(): Record<string, SmartBlockData> {
		const snapshot: Record<string, SmartBlockData> = {};
		for (const [id, block] of this.#blocksInternal) {
			snapshot[id] = block;
		}
		return snapshot;
	}

	// ━━━ SLOTS/SIGNERS ━━━
	slots = $state<Slot[]>([]);
	activeSlotId = $state<string | null>(null);

	// ━━━ SELECTION ━━━
	selectedBlockId = $state<string | null>(null);

	// ━━━ MODES (Delegated to EditorModeState FSM) ━━━
	get modeState(): EditorModeState {
		return getEditorModeState();
	}

	get isSimulationMode(): boolean {
		return this.modeState.isConsumer;
	}

	// ━━━ SETTINGS (Persisted to localStorage) ━━━
	documentSettings: PersistedState<DocumentSettings>;

	// ━━━ CONTENT TRACKING ━━━
	#hasLoadedContent = false;
	#lastSyncedContent = '';

	// ━━━ DERIVED STATE ━━━
	visibleBlocks = $derived(this.blocks.filter((b) => this.#isBlockVisible(b)));

	requiredBlocks = $derived(this.blocks.filter((b) => b.required));

	isValid = $derived(this.requiredBlocks.every((b) => b.value != null && b.value !== ''));

	constructor() {
		// Initialize persisted settings - only on client
		this.documentSettings = new PersistedState<DocumentSettings>(
			'hyprdoc-settings',
			DEFAULT_SETTINGS,
			{ storage: browser ? 'local' : undefined }
		);
	}

	// ━━━ SYNC FROM SERVER ━━━
	sync(document: DocumentData | null | undefined): void {
		if (!document) return;

		// Sync Metadata (always safe)
		this.title = document.title;
		this.kind = document.kind as 'document' | 'template';

		if (!this.documentId) {
			this.documentId = document._id;
		}

		// Sync Blocks (Infrastructure Winner: Source of Truth Alignment)
		if (document.blocks) {
			const blocksMap = new Map<string, SmartBlockData>();
			document.blocks.forEach((block: any) => {
				blocksMap.set(block.id, block);
			});
			this.#blocksInternal = blocksMap;
		}

		// Sync Settings (Robustness: multi-device consistency)
		if (document.settings) {
			this.documentSettings.current = { 
				...DEFAULT_SETTINGS, 
				...document.settings 
			} as DocumentSettings;
		}
	}

	// ━━━ BLOCK ACTIONS ━━━
	addBlock(block: SmartBlockData): void {
		this.#blocksInternal.set(block.id, block);
	}

	updateBlock(id: string, updates: Partial<SmartBlockData>): void {
		const block = this.#blocksInternal.get(id);
		if (block) {
			this.#blocksInternal.set(id, { ...block, ...updates } as SmartBlockData);
		}
	}

	removeBlock(id: string): void {
		this.#blocksInternal.delete(id);
	}

	// Batch updates (transactional)
	updateBlocks(updates: Record<string, Partial<SmartBlockData>>): void {
		for (const [id, data] of Object.entries(updates)) {
			this.updateBlock(id, data);
		}
	}

	// Snapshot restoration
	setBlocks(blocks: Record<string, SmartBlockData>): void {
		this.#blocksInternal = new Map(Object.entries(blocks));
	}

	// ━━━ SLOT ACTIONS ━━━
	addSlot(slot: Slot): void {
		this.slots.push(slot);
	}

	removeSlot(id: string): void {
		this.slots = this.slots.filter(s => s.id !== id);
		if (this.activeSlotId === id) this.activeSlotId = null;
	}

	updateSlot(id: string, updates: Partial<Slot>): void {
		const index = this.slots.findIndex(s => s.id === id);
		if (index !== -1) {
			this.slots[index] = { ...this.slots[index], ...updates };
		}
	}

	setActiveSlot(slotId: string | null): void {
		this.activeSlotId = slotId;
	}

	// ━━━ MODE ACTIONS ━━━
	toggleSimulationMode(): void {
		if (this.isSimulationMode) {
			this.modeState.exit();
		} else {
			this.modeState.enterPreview({}); // Empty snapshot for now if not used here
		}
	}

	/** Alias for updateBlock to maintain parity with legacy store */
	updateBlockData(id: string, data: Partial<SmartBlockData>): void {
		this.updateBlock(id, data);
	}

	updateSettings(updates: Partial<DocumentSettings>): void {
		this.documentSettings.current = {
			...this.documentSettings.current,
			...updates
		};
	}

	// ━━━ RESET ━━━
	reset(): void {
		this.documentId = null;
		this.title = 'Untitled';
		this.kind = 'document';
		this.status = 'idle';
		this.#blocksInternal = new Map();
		this.slots = [];
		this.activeSlotId = null;
		this.selectedBlockId = null;
		this.modeState.exit();
		this.#hasLoadedContent = false;
		this.#lastSyncedContent = '';
	}

	// ━━━ PRIVATE HELPERS ━━━
	#isBlockVisible(block: SmartBlockData): boolean {
		if (!block.visibilityCondition?.enabled) return true;

		const { sourceBlockId, operator, compareValue } = block.visibilityCondition;
		if (!sourceBlockId) return true;
		const sourceBlock = this.#blocksInternal.get(sourceBlockId);

		if (!sourceBlock) return false;

		switch (operator) {
			case 'equals':
				return sourceBlock.value === compareValue;
			case 'not_equals':
				return sourceBlock.value !== compareValue;
			case 'greater_than':
				return Number(sourceBlock.value) > Number(compareValue);
			case 'greater_or_equal':
				return Number(sourceBlock.value) >= Number(compareValue);
			case 'less_than':
				return Number(sourceBlock.value) < Number(compareValue);
			case 'less_or_equal':
				return Number(sourceBlock.value) <= Number(compareValue);
			case 'contains':
				return String(sourceBlock.value).includes(String(compareValue));
			case 'not_contains':
				return !String(sourceBlock.value).includes(String(compareValue));
			case 'is_empty':
				return sourceBlock.value == null || sourceBlock.value === '';
			case 'is_not_empty':
				return sourceBlock.value != null && sourceBlock.value !== '';
			default:
				return true;
		}
	}
}
