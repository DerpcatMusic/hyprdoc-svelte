/**
 * Editor State Store
 * 
 * Module-level reactive state for editor properties that need to be
 * accessed by Tiptap node views (which are mounted outside Svelte's tree).
 */

import type { Editor } from "@tiptap/core";

export type EditorMode = "edit" | "sign";

class EditorStateStore {
  /** Current editor mode */
  mode = $state<EditorMode>("edit");
  
  /** Is preview (non-persistent sign mode) */
  isPreview = $state(false);
  
  /** Current editor instance (for node views that need it) */
  editor = $state<Editor | null>(null);

  setMode(mode: EditorMode): void {
    this.mode = mode;
  }

  setEditor(editor: Editor | null): void {
    this.editor = editor;
  }

  setPreview(isPreview: boolean): void {
    this.isPreview = isPreview;
  }
}

/** Global editor state singleton */
export const editorState = new EditorStateStore();
