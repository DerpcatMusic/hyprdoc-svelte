/**
 * FontSize Extension
 *
 * Adds font-size support to Tiptap editor.
 * Works with TextStyle extension.
 *
 * @module lib/components/editor/extensions/font-size.ts
 */

import { Extension } from '@tiptap/core';

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		fontSize: {
			setFontSize: (size: string) => ReturnType;
			unsetFontSize: () => ReturnType;
		};
	}
}

export const FontSizeExtension = Extension.create({
	name: 'fontSize',

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
					fontSize: {
						default: null,
						parseHTML: (element: HTMLElement) => element.style.fontSize.replace('px', ''),
						renderHTML: (attributes: Record<string, string>) => {
							if (!attributes.fontSize) {
								return {};
							}
							return {
								style: `font-size: ${attributes.fontSize}px`
							};
						}
					}
				}
			}
		];
	},

	addCommands() {
		return {
			setFontSize:
				(fontSize: string) =>
				({ chain }) => {
					return chain().setMark('textStyle', { fontSize }).run();
				},
			unsetFontSize:
				() =>
				({ chain }) => {
					return chain()
						.setMark('textStyle', { fontSize: null })
						.removeEmptyTextStyle()
						.run();
				}
		};
	}
});
