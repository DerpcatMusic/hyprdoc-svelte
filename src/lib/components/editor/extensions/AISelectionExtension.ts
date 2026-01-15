import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    aiSelection: {
      setAISelection: () => ReturnType;
      unsetAISelection: () => ReturnType;
    };
  }
}

export const AISelectionExtension = Extension.create({
  name: "aiSelection",

  addCommands() {
    return {
      setAISelection:
        () =>
        ({ state, dispatch }) => {
          if (dispatch) {
            const { selection } = state;
            // Create a decoration for the current selection
            const tr = state.tr.setMeta("aiSelection", {
              type: "set",
              from: selection.from,
              to: selection.to,
            });
            dispatch(tr);
          }
          return true;
        },
      unsetAISelection:
        () =>
        ({ state, dispatch }) => {
          if (dispatch) {
            const tr = state.tr.setMeta("aiSelection", { type: "unset" });
            dispatch(tr);
          }
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("aiSelection"),
        state: {
          init() {
            return DecorationSet.empty;
          },
          apply(tr, oldSet) {
            // Check for metadata action
            const meta = tr.getMeta("aiSelection");

            if (meta) {
              if (meta.type === "set") {
                const deco = Decoration.inline(meta.from, meta.to, {
                  class: "ai-selection-highlight",
                });
                return DecorationSet.create(tr.doc, [deco]);
              }
              if (meta.type === "unset") {
                return DecorationSet.empty;
              }
            }

            // Map existing decorations if doc changed
            if (tr.docChanged) {
              return oldSet.map(tr.mapping, tr.doc);
            }

            return oldSet;
          },
        },
        props: {
          decorations(state) {
            return (this as any).getState(state);
          },
        },
      }),
    ];
  },
});
