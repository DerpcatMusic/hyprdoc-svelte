import { mergeAttributes, Node } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { SvelteNodeViewRenderer } from 'svelte-tiptap';
import BlockRow from './BlockRow.svelte';

export const MAX_BLOCKS_PER_ROW = 3;
const MIN_BLOCKS_PER_ROW = 2;

/**
 * BlockRow Extension
 * 
 * An invisible wrapper node that enables side-by-side SmartBlock layout.
 */
export const BlockRowExtension = Node.create({
	name: 'blockRow',
	group: 'block',
	content: 'smartBlock smartBlock smartBlock?',
	draggable: false,
	selectable: false,
	isolating: true,

	addAttributes() {
		return {
			id: {
				default: null,
				parseHTML: (element: HTMLElement) => element.dataset.rowId ?? null,
				renderHTML: (attributes: { id?: string | null }) => {
					if (!attributes.id) { return {}; }
					return { 'data-row-id': attributes.id };
				}
			},
			columnWidths: {
				default: [50, 50],
				parseHTML: (element: HTMLElement) => {
					const widths = element.dataset.columnWidths;
					if (widths) {
						try {
							return JSON.parse(widths);
						} catch {
							return [50, 50];
						}
					}
					return [50, 50];
				},
				renderHTML: (attributes: { columnWidths?: number[] }) => {
					return {
						'data-column-widths': JSON.stringify(attributes.columnWidths)
					};
				}
			}
		};
	},

	parseHTML() {
		return [
			{
				tag: 'div[data-type="blockRow"]'
			}
		];
	},

	renderHTML({ HTMLAttributes }) {
		return [
			'div',
			mergeAttributes(HTMLAttributes, {
				'data-type': 'blockRow',
				class: 'block-row'
			}),
			0
		];
	},

	addNodeView() {
		return SvelteNodeViewRenderer(BlockRow);
	},

	addProseMirrorPlugins() {
		return [
			new Plugin({
				key: new PluginKey('blockRowAutoUnwrap'),
				appendTransaction: (transactions, _oldState, newState) => {
					const hasDocChanges = transactions.some((tr) => tr.docChanged);
					if (!hasDocChanges) { return null; }

					const { tr } = newState;
					let modified = false;

					const invalidRows: Array<{
						pos: number;
						node: any;
					}> = [];

					newState.doc.descendants((node, pos) => {
						if (node.type.name === 'blockRow' && node.childCount < MIN_BLOCKS_PER_ROW) {
							invalidRows.push({ pos, node });
						}
						return true;
					});

					for (let i = invalidRows.length - 1; i >= 0; i--) {
						const { pos, node } = invalidRows[i];

						if (node.childCount === 1) {
							const child = node.child(0);
							tr.replaceWith(pos, pos + node.nodeSize, child);
							modified = true;
						} else if (node.childCount === 0) {
							tr.delete(pos, pos + node.nodeSize);
							modified = true;
						}
					}

					return modified ? tr : null;
				}
			})
		];
	}
});
