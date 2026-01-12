/**
 * FontWeight Extension
 *
 * Adds font-weight support to Tiptap editor including variable fonts.
 * Works with TextStyle extension.
 *
 * @module lib/components/editor/extensions/font-weight.ts
 */

import { Extension } from '@tiptap/core';

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		fontWeight: {
			setFontWeight: (weight: string) => ReturnType;
			unsetFontWeight: () => ReturnType;
		};
	}
}

export const FontWeightExtension = Extension.create({
	name: 'fontWeight',

	addOptions() {
		return {
			types: ['textStyle']
		};
	},

	addGlobalAttributes() {
		return [
			{
				types: this.options.types,
				attributes: {
					fontWeight: {
						default: null,
						parseHTML: (element: HTMLElement) =>
							element.style.fontWeight || element.style.fontVariationSettings,
						renderHTML: (attributes: Record<string, string>) => {
							if (!attributes.fontWeight) {
								return {};
							}
							// Support both standard weight and variable font settings
							return {
								style: `font-weight: ${attributes.fontWeight}; font-variation-settings: 'wght' ${attributes.fontWeight}`
							};
						}
					}
				}
			}
		];
	},

	addCommands() {
		return {
			setFontWeight:
				(fontWeight: string) =>
				({ chain }) => {
					return chain().setMark('textStyle', { fontWeight }).run();
				},
			unsetFontWeight:
				() =>
				({ chain }) => {
					return chain()
						.setMark('textStyle', { fontWeight: null })
						.removeEmptyTextStyle()
						.run();
				}
		};
	}
});
