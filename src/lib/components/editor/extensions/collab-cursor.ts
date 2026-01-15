/**
 * Collaborative Cursor Extension for Tiptap
 * Renders remote user cursors and selections in the editor
 *
 * @module components/editor/extensions/CollabCursorExtension
 */
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export interface RemoteUser {
  id: string;
  name: string;
  color: string;
  cursor?: {
    position: number;
    selection?: { from: number; to: number };
  };
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    collabCursors: {
      /**
       * Update the list of remote users and their cursor positions
       */
      updateRemoteUsers: (users: RemoteUser[]) => ReturnType;
    };
  }
}

export interface CollabCursorOptions {
  /** Initial list of remote users */
  users: RemoteUser[];
  /** Current user's ID to exclude from rendering */
  currentUserId: string;
}

const PLUGIN_KEY = new PluginKey("collabCursors");

export const CollabCursorExtension = Extension.create<CollabCursorOptions>({
  name: "collabCursors",

  addOptions() {
    return {
      users: [],
      currentUserId: "",
    };
  },

  addStorage() {
    return {
      users: [] as RemoteUser[],
    };
  },

  addCommands() {
    return {
      updateRemoteUsers:
        (users: RemoteUser[]) =>
        ({ editor }) => {
          // Store users in extension storage
          this.storage.users = users;
          // Force a state update to re-render decorations
          editor.view.dispatch(editor.state.tr.setMeta(PLUGIN_KEY, { users }));
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const extension = this;

    return [
      new Plugin({
        key: PLUGIN_KEY,

        state: {
          init: () => extension.options.users,
          apply(tr, value) {
            const meta = tr.getMeta(PLUGIN_KEY);
            if (meta?.users) {
              return meta.users;
            }
            return value;
          },
        },

        props: {
          decorations(state) {
            const users = this.getState(state) as RemoteUser[];
            if (!users || users.length === 0) {
              return DecorationSet.empty;
            }

            const { currentUserId } = extension.options;
            const decorations: Decoration[] = [];
            const docSize = state.doc.content.size;

            for (const user of users) {
              // Skip current user
              if (user.id === currentUserId || !user.cursor) {
                continue;
              }

              // Validate cursor position is within document bounds
              const cursorPos = Math.min(
                Math.max(0, user.cursor.position),
                docSize
              );

              // Create cursor caret widget
              const cursorWidget = document.createElement("span");
              cursorWidget.className = "collab-cursor";
              cursorWidget.style.setProperty("--cursor-color", user.color);
              cursorWidget.setAttribute("data-user-id", user.id);

              // Create name label
              const label = document.createElement("span");
              label.className = "collab-cursor-label";
              label.style.backgroundColor = user.color;
              label.textContent = user.name.split(" ")[0]; // First name only
              cursorWidget.appendChild(label);

              try {
                decorations.push(
                  Decoration.widget(cursorPos, cursorWidget, {
                    side: 1,
                    key: `cursor-${user.id}`,
                  })
                );
              } catch {
                // Skip invalid positions
              }

              // Render selection highlight if present
              if (user.cursor.selection) {
                const { from, to } = user.cursor.selection;
                const selFrom = Math.min(Math.max(0, from), docSize);
                const selTo = Math.min(Math.max(0, to), docSize);

                if (selFrom < selTo) {
                  try {
                    decorations.push(
                      Decoration.inline(selFrom, selTo, {
                        class: "collab-selection",
                        style: `--selection-color: ${user.color}`,
                      })
                    );
                  } catch {
                    // Skip invalid selections
                  }
                }
              }
            }

            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});
