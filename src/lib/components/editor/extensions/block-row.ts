import { mergeAttributes, Node } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { SvelteNodeViewRenderer } from 'svelte-tiptap';
import BlockRowComponent from '$lib/components/editor/extensions/BlockRowComponent.svelte';

// Maximum number of blocks per row (hardcoded, change here to adjust)
export const MAX_BLOCKS_PER_ROW = 3;

// Minimum children required for a valid blockRow (matches content expression)
const MIN_BLOCKS_PER_ROW = 2;

/**
 * BlockRow Extension
 *
 * An invisible wrapper node that enables side-by-side SmartBlock layout.
 * Key characteristics:
 * - Renders as a plain flex container with no visible styling
 * - Contains 2-3 SmartBlock nodes
 * - Stores column widths as percentages
 * - Auto-unwraps when reduced to single child (via appendTransaction)
 */
export const BlockRow = Node.create({
  name: "blockRow",
  group: "block",
  // Content: 2-3 smartBlock nodes only
  content: "smartBlock smartBlock smartBlock?",
  draggable: false,
  selectable: false,
  isolating: true,

  addAttributes() {
    return {
      // Unique ID for this row
      id: {
        default: null,
        parseHTML: (element: HTMLElement) => element.dataset.rowId ?? null,
        renderHTML: (attributes: { id?: string | null }) => {
          if (!attributes.id) { return {}; }
          return { "data-row-id": attributes.id };
        },
      },
      // Column widths as percentages, e.g. [50, 50] or [33, 33, 34]
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
            "data-column-widths": JSON.stringify(attributes.columnWidths),
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="blockRow"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "blockRow",
        class: "block-row",
      }),
      0, // Content slot
    ];
  },

	addNodeView() {
		return SvelteNodeViewRenderer(BlockRowComponent);
	},

  /**
   * Auto-unwrap blockRows with fewer than MIN_BLOCKS_PER_ROW children.
   *
   * This runs after every transaction to catch cases where:
   * - A block is dragged OUT of a row (leaving 1 child)
   * - A block is deleted from a row
   * - Document content is pasted/loaded with invalid structure
   *
   * Without this, ProseMirror tries to satisfy the schema by copying nodes,
   * causing duplication bugs.
   */
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("blockRowAutoUnwrap"),
        appendTransaction: (transactions, _oldState, newState) => {
          // Skip if no document changes occurred
          const hasDocChanges = transactions.some((tr) => tr.docChanged);
          if (!hasDocChanges) { return null; }

          const { tr } = newState;
          let modified = false;

          // Collect invalid blockRows (iterate backwards to handle position shifts)
          const invalidRows: Array<{
            pos: number;
            node: any;
          }> = [];

          newState.doc.descendants((node, pos) => {
            if (node.type.name === "blockRow" && node.childCount < MIN_BLOCKS_PER_ROW) {
              invalidRows.push({ pos, node });
            }
            return true; // Continue traversing
          });

          // Process from end to start (prevents position invalidation)
          for (let i = invalidRows.length - 1; i >= 0; i--) {
            const { pos, node } = invalidRows[i];

            if (node.childCount === 1) {
              // Unwrap: replace the blockRow with its single child
              const child = node.child(0);
              tr.replaceWith(pos, pos + node.nodeSize, child);
              modified = true;
            } else if (node.childCount === 0) {
              // Delete empty blockRow entirely
              tr.delete(pos, pos + node.nodeSize);
              modified = true;
            }
          }

          return modified ? tr : null;
        },
      }),
    ];
  },
});
