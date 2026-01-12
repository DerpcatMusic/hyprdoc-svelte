/**
 * SlashCommand Extension for Tiptap
 *
 * Minimal extension that triggers slashMenuState updates.
 * All rendering and interaction handled by SlashMenuPortal.
 */
import { Extension } from '@tiptap/core';
import Suggestion, { type SuggestionProps, type SuggestionKeyDownProps } from '@tiptap/suggestion';
import { slashMenuState, type CommandItem } from './SlashMenuState.svelte';

// ━━━ THE EXTENSION ━━━
export const SlashCommand = Extension.create({
	name: 'slashCommand',

	addOptions() {
		return {
			suggestion: {
				char: '/',
				startOfLine: false,
				command: ({ editor, range, props }: { editor: any; range: any; props: CommandItem }) => {
					// This is called when an item is selected via the suggestion plugin
					// But we handle selection in SlashMenuState, so this is a no-op
				}
			}
		};
	},

	addProseMirrorPlugins() {
		return [
			Suggestion({
				editor: this.editor,
				char: '/',
				startOfLine: false,

				items: ({ query }: { query: string }) => {
					// Update query filter in state
					slashMenuState.updateQuery(query);
					// Return filtered items (required by Suggestion plugin)
					return slashMenuState.filteredItems;
				},

				render: () => {
					return {
						onStart: (props: SuggestionProps) => {
							slashMenuState.open(
								props.editor,
								props.range,
								(item: CommandItem) => {
									// Item selection handled internally by state
								},
								props.clientRect ?? null
							);
						},

						onUpdate: (props: SuggestionProps) => {
							// Query is already updated via items() callback
							// Update position if cursor moved
							if (props.clientRect) {
								const rect = props.clientRect();
								if (rect) {
									const MENU_HEIGHT = 320;
									const spaceBelow = window.innerHeight - rect.bottom;
									slashMenuState.position = {
										x: Math.max(8, rect.left),
										y: spaceBelow < MENU_HEIGHT ? rect.top - 5 : rect.bottom + 5,
										placement: spaceBelow < MENU_HEIGHT ? 'above' : 'below'
									};
								}
							}
						},

						onKeyDown: (props: SuggestionKeyDownProps) => {
							// Let SlashMenuPortal handle keyboard via RUNED useEventListener
							// We just need to tell Suggestion whether we handled it
							if (props.event.key === 'Escape') {
								slashMenuState.close();
								return true;
							}
							if (
								props.event.key === 'ArrowUp' ||
								props.event.key === 'ArrowDown' ||
								props.event.key === 'Enter'
							) {
								// These are handled by SlashMenuPortal's keydown listener
								return true;
							}
							return false;
						},

						onExit: () => {
							slashMenuState.close();
						}
					};
				}
			})
		];
	}
});

// Re-export types for convenience
export type { CommandItem } from './SlashMenuState.svelte';
