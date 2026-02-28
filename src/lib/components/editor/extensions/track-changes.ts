/**
 * Track Changes Extension for TipTap
 *
 * Implements collaborative redlining with "Suggest" mode.
 * Users can suggest insertions and deletions that the document owner can accept or reject.
 *
 * Based on open-source tiptap-track-change-extension patterns but customized for HyprDoc.
 *
 * Features:
 * - Insertion mark: green underlined text
 * - Deletion mark: red strikethrough text
 * - Author attribution with colors
 * - Accept/Reject commands
 * - Toggle between direct edit and suggest mode
 */

import { Extension, Mark, mergeAttributes } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { TRACK_CHANGE_COLORS } from "$lib/styles/ui-palette";

// ═══════════════════════════════════════════════════════════════════════════
// Marks for tracking changes
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Insertion Mark - highlights newly added text
 */
export const InsertionMark = Mark.create({
  name: "insertion",

  addAttributes() {
    return {
      authorId: {
        default: null,
      },
      authorName: {
        default: null,
      },
      authorColor: {
        default: TRACK_CHANGE_COLORS.insertion,
      },
      timestamp: {
        default: null,
      },
      changeId: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [{ tag: "ins" }, { tag: "span[data-insertion]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-insertion": "",
        class: "track-change-insertion",
        style: `color: ${HTMLAttributes.authorColor || TRACK_CHANGE_COLORS.insertion}; text-decoration: underline;`,
        title: `Added by ${HTMLAttributes.authorName || "Unknown"}`,
      }),
      0,
    ];
  },
});

/**
 * Deletion Mark - highlights text marked for deletion
 */
export const DeletionMark = Mark.create({
  name: "deletion",

  addAttributes() {
    return {
      authorId: {
        default: null,
      },
      authorName: {
        default: null,
      },
      authorColor: {
        default: TRACK_CHANGE_COLORS.deletion,
      },
      timestamp: {
        default: null,
      },
      changeId: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [{ tag: "del" }, { tag: "span[data-deletion]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-deletion": "",
        class: "track-change-deletion",
        style: `color: ${HTMLAttributes.authorColor || TRACK_CHANGE_COLORS.deletion}; text-decoration: line-through;`,
        title: `Deleted by ${HTMLAttributes.authorName || "Unknown"}`,
      }),
      0,
    ];
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// Main Track Changes Extension
// ═══════════════════════════════════════════════════════════════════════════

export interface TrackChangesOptions {
  /** Whether suggest mode is enabled */
  enabled: boolean;
  /** Current author's ID */
  authorId?: string;
  /** Current author's display name */
  authorName?: string;
  /** Current author's color */
  authorColor?: string;
  /** Callback when track changes status changes */
  onStatusChange?: (enabled: boolean) => void;
  /** Callback when a change is created */
  onChangeCreated?: (change: {
    changeType: "insertion" | "deletion" | "replacement";
    changeId: string;
    originalContent?: string;
    newContent?: string;
    position: number;
    authorName: string;
    authorColor: string;
  }) => void;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    trackChanges: {
      /** Enable suggest mode */
      enableSuggestMode: () => ReturnType;
      /** Disable suggest mode */
      disableSuggestMode: () => ReturnType;
      /** Toggle suggest mode */
      toggleSuggestMode: () => ReturnType;
      /** Accept change at cursor position or by ID */
      acceptChange: (changeId?: string) => ReturnType;
      /** Reject change at cursor position or by ID */
      rejectChange: (changeId?: string) => ReturnType;
      /** Accept all pending changes */
      acceptAllChanges: () => ReturnType;
      /** Reject all pending changes */
      rejectAllChanges: () => ReturnType;
    };
  }
}

export const TrackChangesExtension = Extension.create<TrackChangesOptions>({
  name: "trackChanges",

  addOptions() {
    return {
      enabled: false,
      authorId: undefined,
      authorName: "Assistant",
      authorColor: TRACK_CHANGE_COLORS.author,
      onStatusChange: undefined,
      onChangeCreated: undefined,
    };
  },

  addExtensions() {
    return [InsertionMark, DeletionMark];
  },

  addCommands() {
    return {
      enableSuggestMode: () => () => {
        this.options.enabled = true;
        this.options.onStatusChange?.(true);
        return true;
      },

      disableSuggestMode: () => () => {
        this.options.enabled = false;
        this.options.onStatusChange?.(false);
        return true;
      },

      toggleSuggestMode: () => () => {
        this.options.enabled = !this.options.enabled;
        this.options.onStatusChange?.(this.options.enabled);
        return true;
      },

      acceptChange:
        (changeId?: string) =>
        ({ state, tr, dispatch }) => {
          let foundRange: { from: number; to: number; mark: any } | null = null;

          if (changeId) {
            // Find by ID
            state.doc.descendants((node, pos) => {
              const mark = node.marks.find(
                (m) =>
                  (m.type.name === "insertion" || m.type.name === "deletion") &&
                  m.attrs.changeId === changeId
              );
              if (mark) {
                foundRange = { from: pos, to: pos + node.nodeSize, mark };
                return false;
              }
              return true;
            });
          } else {
            // Use selection
            const { from, to } = state.selection;
            const $pos = state.doc.resolve(from);
            const mark = $pos
              .marks()
              .find(
                (m) => m.type.name === "insertion" || m.type.name === "deletion"
              );
            if (mark) {
              foundRange = { from, to, mark };
            }
          }

          if (foundRange && dispatch) {
            const { from, to, mark } = foundRange;
            if (mark.type.name === "insertion") {
              tr.removeMark(from, to, mark.type);
            } else if (mark.type.name === "deletion") {
              tr.delete(from, to);
            }
            dispatch(tr);
            return true;
          }

          return false;
        },

      rejectChange:
        (changeId?: string) =>
        ({ state, tr, dispatch }) => {
          let foundRange: { from: number; to: number; mark: any } | null = null;

          if (changeId) {
            // Find by ID
            state.doc.descendants((node, pos) => {
              const mark = node.marks.find(
                (m) =>
                  (m.type.name === "insertion" || m.type.name === "deletion") &&
                  m.attrs.changeId === changeId
              );
              if (mark) {
                foundRange = { from: pos, to: pos + node.nodeSize, mark };
                return false;
              }
              return true;
            });
          } else {
            // Use selection
            const { from, to } = state.selection;
            const $pos = state.doc.resolve(from);
            const mark = $pos
              .marks()
              .find(
                (m) => m.type.name === "insertion" || m.type.name === "deletion"
              );
            if (mark) {
              foundRange = { from, to, mark };
            }
          }

          if (foundRange && dispatch) {
            const { from, to, mark } = foundRange;
            if (mark.type.name === "insertion") {
              tr.delete(from, to);
            } else if (mark.type.name === "deletion") {
              tr.removeMark(from, to, mark.type);
            }
            dispatch(tr);
            return true;
          }

          return false;
        },

      acceptAllChanges:
        () =>
        ({ state, tr, dispatch }) => {
          let hasChanged = false;

          // 1. Remove all insertion marks (accepting the content)
          const insertionType = state.schema.marks.insertion;
          if (insertionType) {
            tr.removeMark(0, state.doc.content.size, insertionType);
            hasChanged = true;
          }

          // 2. Delete all text with deletion marks (finishing the deletion)
          const deletionType = state.schema.marks.deletion;
          if (deletionType) {
            const rangesToDelete: { from: number; to: number }[] = [];
            state.doc.descendants((node, pos) => {
              if (node.marks.some((m) => m.type === deletionType)) {
                rangesToDelete.push({ from: pos, to: pos + node.nodeSize });
              }
              return true;
            });

            // Delete from end to start to maintain positions
            for (let i = rangesToDelete.length - 1; i >= 0; i--) {
              const { from, to } = rangesToDelete[i];
              tr.delete(from, to);
              hasChanged = true;
            }
          }

          if (hasChanged && dispatch) {
            dispatch(tr);
            return true;
          }

          return false;
        },

      rejectAllChanges:
        () =>
        ({ state, tr, dispatch }) => {
          let hasChanged = false;

          // 1. Remove all deletion marks (keeping the original content)
          const deletionType = state.schema.marks.deletion;
          if (deletionType) {
            tr.removeMark(0, state.doc.content.size, deletionType);
            hasChanged = true;
          }

          // 2. Delete all text with insertion marks (removing the suggested content)
          const insertionType = state.schema.marks.insertion;
          if (insertionType) {
            const rangesToDelete: { from: number; to: number }[] = [];
            state.doc.descendants((node, pos) => {
              if (node.marks.some((m) => m.type === insertionType)) {
                rangesToDelete.push({ from: pos, to: pos + node.nodeSize });
              }
              return true;
            });

            // Delete from end to start to maintain positions
            for (let i = rangesToDelete.length - 1; i >= 0; i--) {
              const { from, to } = rangesToDelete[i];
              tr.delete(from, to);
              hasChanged = true;
            }
          }

          if (hasChanged && dispatch) {
            dispatch(tr);
            return true;
          }

          return false;
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("trackChanges"),
        appendTransaction: (transactions, oldState, newState) => {
          if (!this.options.enabled) {
            return null;
          }

          const tr = transactions.find((t) => t.docChanged);
          if (!tr || tr.getMeta("trackChangesProcessed")) {
            return null;
          }

          const newTr = newState.tr;
          newTr.setMeta("trackChangesProcessed", true);

          const { authorName, authorColor, onChangeCreated } = this.options;

          tr.steps.forEach((step) => {
            const stepMap = step.getMap();
            stepMap.forEach((oldStart, oldEnd, newStart, newEnd) => {
              const changeId = Math.random().toString(36).substring(2, 9);
              const timestamp = Date.now();

              // INSERTION
              if (newEnd > newStart && oldEnd <= oldStart) {
                const content = newState.doc.textBetween(newStart, newEnd);

                newTr.addMark(
                  newStart,
                  newEnd,
                  newState.schema.marks.insertion.create({
                    changeId,
                    authorName,
                    authorColor,
                    timestamp,
                  })
                );

                onChangeCreated?.({
                  changeType: "insertion",
                  changeId,
                  newContent: content,
                  position: newStart,
                  authorName: authorName ?? "Unknown",
                  authorColor: authorColor ?? TRACK_CHANGE_COLORS.author,
                });
              }

              // DELETION
              if (oldEnd > oldStart && newEnd <= newStart) {
                const originalContent = oldState.doc.textBetween(
                  oldStart,
                  oldEnd
                );

                onChangeCreated?.({
                  changeType: "deletion",
                  changeId,
                  originalContent,
                  position: oldStart,
                  authorName: authorName ?? "Unknown",
                  authorColor: authorColor ?? TRACK_CHANGE_COLORS.author,
                });
              }
            });
          });

          return newTr.docChanged ? newTr : null;
        },
      }),
    ];
  },
});

export default TrackChangesExtension;
