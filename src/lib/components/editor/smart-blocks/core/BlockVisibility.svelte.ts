/**
 * Block Visibility Logic - Svelte 5 Reactive Helper
 * 
 * IMPORTANT: This helper accepts documentStore as a parameter instead of using
 * context, because it's used inside Tiptap NodeViews which mount outside the
 * Svelte component tree where getContext() doesn't work.
 */
import type { DocumentState, BlockData } from '$lib/editor/core/DocumentState.svelte';

export function createBlockVisibility(
	getData: () => BlockData,
	isConsumerMode: () => boolean,
	documentState: DocumentState | null
) {
	return {
		get isVisible() {
			const data = getData();
			const condition = data.visibilityCondition;

			// Always visible in builder mode
			if (!isConsumerMode()) { return true; }

			// If no condition or not enabled, it's visible
			if (!(condition?.enabled && condition.sourceBlockId)) { return true; }

			// If no documentState, can't evaluate - default visible
			if (!documentState) { return true; }

			// Defensive block retrieval using DocumentState's Map
			const sourceBlock = documentState.blocksMap.get(condition.sourceBlockId);

			if (!sourceBlock) { return true; }

			const sourceValue = sourceBlock.value;
			const compareValue = condition.compareValue;

			switch (condition.operator) {
				case 'equals':
					return String(sourceValue) === String(compareValue);
				case 'not_equals':
					return String(sourceValue) !== String(compareValue);
				case 'is_empty':
					return !sourceValue || sourceValue === '';
				case 'is_not_empty':
					return !!(sourceValue && sourceValue !== '');
				default:
					return true;
			}
		}
	};
}
