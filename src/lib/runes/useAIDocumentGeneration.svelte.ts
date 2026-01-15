import type { Editor } from "@tiptap/core";
import {
  clearPartyCache,
  executeCommand,
  isValidCommand,
} from "$lib/ai/command-executor";
import { getErrorMessage } from "$lib/utils/error-utils";

interface UseAIDocumentGenerationOptions {
  editor: Editor | null;
  onCommandExecuted?: (commandName: string, commandCount: number) => void;
  onComplete?: (commandCount: number) => void;
  onError?: (error: Error) => void;
}

interface AIGenerationState {
  isGenerating: boolean;
  commandCount: number;
  lastCommand: string | null;
  error: string | null;
  mode: "document" | "edit";
}

export function createAIDocumentGeneration(
  options: UseAIDocumentGenerationOptions
) {
  const state = $state<AIGenerationState>({
    isGenerating: false,
    commandCount: 0,
    lastCommand: null,
    error: null,
    mode: "document",
  });

  let abortController: AbortController | null = null;

  async function generate(
    prompt: string,
    genOptions: {
      genre?: string;
      category?: string;
      mode?: "document" | "edit";
      slots?: any[];
    } = {}
  ) {
    const { genre, category, mode = "document", slots } = genOptions;

    if (!options.editor || state.isGenerating) {
      console.warn("[AI Generation] Editor not ready or already generating");
      return;
    }

    // Clear slot cache for fresh generation session
    clearPartyCache();

    // Reset state
    state.isGenerating = true;
    state.commandCount = 0;
    state.lastCommand = null;
    state.error = null;
    state.mode = mode;

    try {
      const response = await fetch("/api/ai/generate-stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          genre,
          category,
          slots,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      abortController = new AbortController();

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            continue;
          }
          if (!line.startsWith("data: ")) {
            continue;
          }

          try {
            const dataStr = line.substring(6);
            if (!dataStr) {
              continue;
            }
            const data = JSON.parse(dataStr);

            if (data.name) {
              const { name, args } = data;
              if (isValidCommand(name)) {
                const success = await executeCommand(
                  options.editor,
                  name,
                  args,
                  {
                    atCursor: mode === "edit",
                  }
                );
                if (success) {
                  state.commandCount++;
                  state.lastCommand = name;
                  options.onCommandExecuted?.(name, state.commandCount);
                }
              }
            }

            // Handle "done" event
            if (data.success && data.commandCount !== undefined) {
              state.isGenerating = false;
              options.onComplete?.(data.commandCount);
            }

            // Handle "error" event
            if (data.message && !data.success) {
              throw new Error(data.message);
            }
          } catch (err: unknown) {
            state.error = getErrorMessage(err);
          }
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to start generation";
      state.isGenerating = false;
      state.error = errorMessage;
      options.onError?.(new Error(errorMessage));
    }
  }

  function stop() {
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
    state.isGenerating = false;
  }

  function clearError() {
    state.error = null;
  }

  return {
    get isGenerating() {
      return state.isGenerating;
    },
    get commandCount() {
      return state.commandCount;
    },
    get lastCommand() {
      return state.lastCommand;
    },
    get error() {
      return state.error;
    },
    generate,
    stop,
    clearError,
  };
}
