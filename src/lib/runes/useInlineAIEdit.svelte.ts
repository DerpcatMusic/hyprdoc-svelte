/**
 * useInlineAIEdit - RUNED-powered Inline AI Text Editing
 *
 * Manages SSE streaming for contextual AI text editing with:
 * - Selection-based editing
 * - Command and text stream handling
 * - Progress tracking with Debounced updates
 */

import type { Editor } from "@tiptap/core";
import { Debounced, IsMounted } from "runed";

export interface InlineEditOptions {
  selectedText: string;
  instruction: string;
  slots?: Array<{ id: string; name: string }>;
}

export interface InlineEditResult {
  type: "text" | "command";
  content: string;
  command?: { name: string; args: Record<string, unknown> };
}

/**
 * Creates inline AI edit state and controls
 */
export function createInlineAIEdit(getEditor: () => Editor | null) {
  // Reactive state
  let isEditing = $state(false);
  let isStreaming = $state(false);
  let streamedText = $state("");
  let error = $state<string | null>(null);
  let results = $state<InlineEditResult[]>([]);

  // Track mount state for cleanup
  const _mounted = new IsMounted();

  // Debounced streamed text for smooth UI updates
  const debouncedText = new Debounced(() => streamedText, 50);

  /**
   * Get currently selected text from editor
   */
  function getSelectedText(): string {
    const editor = getEditor();
    if (!editor) {
      return "";
    }

    const { from, to } = editor.state.selection;
    return editor.state.doc.textBetween(from, to, " ");
  }

  /**
   * Replace selected text with new content
   */
  function replaceSelection(newText: string) {
    const editor = getEditor();
    if (!editor) {
      return;
    }

    editor.chain().focus().deleteSelection().insertContent(newText).run();
  }

  /**
   * Execute a command from the AI
   */
  function executeCommand(command: {
    name: string;
    args: Record<string, unknown>;
  }) {
    const editor = getEditor();
    if (!editor) {
      return;
    }

    const { name, args } = command;

    switch (name) {
      case "insertHeading":
        editor
          .chain()
          .focus()
          .deleteSelection()
          .insertContent({
            type: "heading",
            attrs: { level: args.level as number },
            content: [{ type: "text", text: args.text as string }],
          })
          .run();
        break;

      case "insertParagraph":
        editor
          .chain()
          .focus()
          .deleteSelection()
          .insertContent({
            type: "paragraph",
            content: [{ type: "text", text: args.text as string }],
          })
          .run();
        break;

      default:
        // Unknown command - will be ignored
        break;
    }
  }

  /**
   * Start inline AI editing
   */
  async function edit(options: InlineEditOptions): Promise<boolean> {
    if (isEditing) {
      // Edit already in progress
      return false;
    }

    // Reset state
    isEditing = true;
    isStreaming = false;
    streamedText = "";
    error = null;
    results = [];

    try {
      const response = await fetch("/api/ai/inline-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(options),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      isStreaming = true;

      // Process SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let hasCommand = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        let currentEventType = "";

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            currentEventType = line.slice(7);
            continue;
          }
          if (line.startsWith("data: ")) {
            const data = JSON.parse(line.slice(6));

            if (currentEventType === "command" || (data.name && data.args)) {
              // Command event
              hasCommand = true;
              results = [
                ...results,
                {
                  type: "command",
                  content: data.name,
                  command: data,
                },
              ];
              executeCommand(data);
            } else if (currentEventType === "text" || data.text) {
              // Text streaming event
              const text = data.text || "";
              streamedText += text;
              results = [
                ...results,
                {
                  type: "text",
                  content: text,
                },
              ];
            } else if (data.success !== undefined) {
              // Done event - apply text if no commands were executed
              if (!hasCommand && streamedText) {
                replaceSelection(streamedText);
              }
            } else if (data.message) {
              // Error event
              error = data.message;
            }
          }
        }
      }

      return true;
    } catch (err) {
      error = err instanceof Error ? err.message : "Edit failed";
      console.error("[InlineAI] Edit error:", err);
      return false;
    } finally {
      isEditing = false;
      isStreaming = false;
    }
  }

  /**
   * Quick edit with current selection
   */
  async function editSelection(
    instruction: string,
    slots?: Array<{ id: string; name: string }>
  ): Promise<boolean> {
    const selectedText = getSelectedText();
    if (!selectedText) {
      error = "No text selected";
      return false;
    }

    return edit({ selectedText, instruction, slots });
  }

  /**
   * Cancel ongoing edit
   */
  function cancel() {
    isEditing = false;
    isStreaming = false;
  }

  /**
   * Reset state
   */
  function reset() {
    cancel();
    streamedText = "";
    error = null;
    results = [];
  }

  return {
    // State getters
    get isEditing() {
      return isEditing;
    },
    get isStreaming() {
      return isStreaming;
    },
    get streamedText() {
      return debouncedText.current;
    },
    get error() {
      return error;
    },
    get results() {
      return results;
    },

    // Actions
    edit,
    editSelection,
    getSelectedText,
    cancel,
    reset,
  };
}

export type InlineAIEditController = ReturnType<typeof createInlineAIEdit>;
