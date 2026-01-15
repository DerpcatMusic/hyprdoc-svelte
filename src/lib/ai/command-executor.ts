/**
 * Command Executor for AI-generated editor commands
 */

import type { Editor } from "@tiptap/core";
import { v4 as uuidv4 } from "uuid";

export async function executeCommand(
  editor: Editor,
  commandName: string,
  args: Record<string, unknown>,
  options: { atCursor?: boolean } = {}
): Promise<boolean> {
  const { atCursor = false } = options;

  try {
    switch (commandName) {
      case "insertHeading": {
        const { level, text } = args as any;
        const pos = atCursor ? editor.state.selection.from : editor.state.doc.content.size;
        editor.chain().insertContentAt(pos, {
          type: "heading",
          attrs: { level },
          content: [{ type: "text", text }],
        }).run();
        return true;
      }

      case "insertParagraph": {
        const { text } = args as any;
        const pos = atCursor ? editor.state.selection.from : editor.state.doc.content.size;
        editor.chain().insertContentAt(pos, {
          type: "paragraph",
          content: [{ type: "text", text }],
        }).run();
        return true;
      }


      case "insertList": {
        const { listType, items } = args as any;
        const type = listType === "bullet" ? "bulletList" : "orderedList";
        const pos = atCursor ? editor.state.selection.from : editor.state.doc.content.size;
        editor.chain().insertContentAt(pos, {
          type,
          content: items.map((item: string) => ({
            type: "listItem",
            content: [{ type: "paragraph", content: [{ type: "text", text: item }] }],
          })),
        }).run();
        return true;
      }

      default:
        return false;
    }
  } catch (error) {
    console.error(`[AI Command] Failed to execute ${commandName}:`, error);
    return false;
  }
}

export function isValidCommand(commandName: string): boolean {
  return ["insertHeading", "insertParagraph", "insertList"].includes(commandName);
}

/**
 * Placeholder for clearing party cache - used by AI generation handlers.
 */
export function clearPartyCache() {
  console.log("[AI Command] Clearing party cache...");
}
