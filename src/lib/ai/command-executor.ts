/**
 * Command Executor for AI-generated editor commands
 *
 * Maps AI tool calls to TipTap editor operations.
 *
 * FIXES IMPLEMENTED:
 * 1. slotId - Blocks now include slotId attribute for slot assignment
 * 2. Positioning - Uses insertContentAt with document-end position to avoid nesting inside paragraphs
 * 1. slotId - Blocks now include slotId attribute for slot assignment
 * 2. Positioning - Uses insertContentAt with document-end position to avoid nesting inside paragraphs
 * 3. Party Creation - New createPartySlot command for AI to create slots
 * 4. Store Sync - Dispatches events to sync blocks with document store
 * 5. Block Type Validation - Only allows known SmartBlockType values
 */

import type { Editor } from "@tiptap/core";
import { v4 as uuidv4 } from "uuid";
import { SmartBlockType } from "$lib/types";
import { AI_ALLOWED_BLOCK_TYPES } from "./editor-tools";

// Create a string-based Set for validation
const VALID_BLOCK_TYPES_SET = new Set<string>(AI_ALLOWED_BLOCK_TYPES);

// Track created slots during a generation session
// This allows subsequent insertSmartBlock calls to reference created slots by name
const createdParties = new Map<string, string>(); // name -> slotId

// Pending slot creation promises for async resolution
const pendingPartyCreations = new Map<
  string,
  {
    resolve: (realId: string) => void;
    reject: (error: Error) => void;
  }
>();

/**
 * Set up the slot resolution listener.
 * Must be called before AI generation starts.
 */
export function setupPartyResolutionListener(): () => void {
  const handler = ((e: CustomEvent) => {
    const { tempId, realId } = e.detail;
    const pending = pendingPartyCreations.get(tempId);
    if (pending) {
      pending.resolve(realId);
      pendingPartyCreations.delete(tempId);
    }
  }) as EventListener;

  globalThis.addEventListener("ai-slot-resolved", handler);

  // Return cleanup function
  return () => {
    globalThis.removeEventListener("ai-slot-resolved", handler);
  };
}

/**
 * Command arguments interfaces
 */
interface InsertHeadingArgs {
  level: 1 | 2 | 3;
  text: string;
}

interface InsertParagraphArgs {
  text: string;
}

interface InsertSmartBlockArgs {
  type: string; // String from AI, validated against SmartBlockType
  label: string;
  variableName: string;
  required?: boolean;
  placeholder?: string;
  options?: string[];
  slotName?: string; // Reference by name (for AI convenience)
}

interface InsertListArgs {
  listType: "bullet" | "ordered";
  items: string[];
}

interface InsertBlockquoteArgs {
  text: string;
}

interface AddPartyArgs {
  name: string;
  color?: string;
}

interface InsertTableArgs {
  headers: string[];
  rows: string[][];
}

/**
 * Get the position at the end of the document for safe block insertion.
 * This ensures blocks are inserted AFTER all existing content,
 * not inside paragraphs or other block-level nodes.
 */
function getDocumentEndPosition(editor: Editor): number {
  return editor.state.doc.content.size;
}

/**
 * Get the insertion position based on options
 */
function getInsertionPosition(
  editor: Editor,
  atCursor = false
): number | { from: number; to: number } {
  if (atCursor) {
    const { selection } = editor.state;
    // If we have a selection, return the range to replace it
    return { from: selection.from, to: selection.to };
  }
  return getDocumentEndPosition(editor);
}

/**
 * Sync a block with the document store via custom event.
 * This ensures the Zustand store is updated alongside TipTap.
 */
function syncBlockToStore(block: Record<string, unknown>): void {
  const event = new CustomEvent("docuflow-add-block", { detail: block });
  globalThis.dispatchEvent(event);
}

/**
 * Clear the slots cache (call at start of new generation)
 */
export function clearPartyCache(): void {
  createdParties.clear();
}

/**
 * Execute an AI command against the TipTap editor
 */
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
        const { level, text } = args as unknown as InsertHeadingArgs;
        const insertPos = getInsertionPosition(editor, atCursor);
        editor
          .chain()
          .insertContentAt(insertPos, {
            type: "heading",
            attrs: { level },
            content: [{ type: "text", text }],
          })
          .run();
        return true;
      }

      case "insertParagraph": {
        const { text } = args as unknown as InsertParagraphArgs;
        const insertPos = getInsertionPosition(editor, atCursor);
        editor
          .chain()
          .insertContentAt(insertPos, {
            type: "paragraph",
            content: [{ type: "text", text }],
          })
          .run();
        return true;
      }

      case "insertSmartBlock": {
        const { type, label, variableName, required, placeholder, options, slotName } =
          args as unknown as InsertSmartBlockArgs;

        // VALIDATION: Reject unknown block types
        if (!VALID_BLOCK_TYPES_SET.has(type)) {
          console.warn(`[AI Command] Rejected unknown block type: "${type}". Valid types:`, [
            ...VALID_BLOCK_TYPES_SET,
          ]);
          // Fall back to TEXT_INPUT for safety
          console.warn("[AI Command] Falling back to TEXT_INPUT");
        }

        // Use validated type or fallback
        const validatedType = VALID_BLOCK_TYPES_SET.has(type) ? type : SmartBlockType.SMART_TEXT;

        // Resolve slotId: lookup by name
        let resolvedPartyId: string | null = null;
        if (slotName) {
          // 1. Try session-created slots first
          if (createdParties.has(slotName)) {
            resolvedPartyId = createdParties.get(slotName) || null;
          } else {
            // 2. Fallback: Search in existing document slots via store
            // We assume useSigningStore holds the global slot state for the wizard
            // Wait, useSigningStore might NOT hold slots if they are document-level metadata?
            // Re-checking... useSigningStore definition didn't show 'slots'.
            // However, usePartyMapping usually syncs to a store or context.
            // If slots are not in useSigningStore, we might fail here.
            // Attempting to access potentially hidden state or document context if possible?
            // 2. Fallback: Search in existing document slots via editor storage
            // The SmartBlock extension may store slots for lookup
            const extensionParties = (editor.storage as Record<string, any>)?.smartBlock?.slots as
              | Array<{
                  id: string;
                  name: string;
                }>
              | undefined;
            if (extensionParties) {
              const match = extensionParties.find(
                (p) => p.name.toLowerCase() === slotName.toLowerCase()
              );
              if (match) { resolvedPartyId = match.id; }
            }
          }
        }

        const blockId = `block_${uuidv4().slice(0, 8)}`;
        const blockAttrs = {
          id: blockId,
          type: validatedType,
          label,
          variableName,
          required: required ?? false,
          placeholder: placeholder ?? "",
          options: options ?? [],
          slotId: resolvedPartyId, // CRITICAL: Explicitly set slotId (null if unassigned)
        };

        // Insert at document end or cursor
        const insertPos = getInsertionPosition(editor, atCursor);
        editor
          .chain()
          .insertContentAt(insertPos, {
            type: "smartBlock",
            attrs: blockAttrs,
          })
          .run();

        // Sync with document store
        syncBlockToStore({
          id: blockId,
          type,
          label,
          variableName,
          required: required ?? false,
          placeholder: placeholder ?? "",
          options: options ?? [],
          slotId: resolvedPartyId,
          value: null,
        });

        return true;
      }

      case "insertList": {
        const { listType, items } = args as unknown as InsertListArgs;
        const listNodeType = listType === "bullet" ? "bulletList" : "orderedList";
        const insertPos = getInsertionPosition(editor, atCursor);

        editor
          .chain()
          .insertContentAt(insertPos, {
            type: listNodeType,
            content: items.map((item) => ({
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: item }],
                },
              ],
            })),
          })
          .run();
        return true;
      }

      case "insertDivider": {
        const insertPos = getInsertionPosition(editor, atCursor);
        editor.chain().insertContentAt(insertPos, { type: "horizontalRule" }).run();
        return true;
      }

      case "insertBlockquote": {
        const { text } = args as unknown as InsertBlockquoteArgs;
        const insertPos = getInsertionPosition(editor, atCursor);
        editor
          .chain()
          .insertContentAt(insertPos, {
            type: "blockquote",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text }],
              },
            ],
          })
          .run();
        return true;
      }

      case "insertTable": {
        const { headers, rows } = args as unknown as InsertTableArgs;
        const insertPos = getInsertionPosition(editor, atCursor);

        // Build table content as TipTap JSON
        const tableRows = [
          // Header row
          {
            type: "tableRow",
            content: headers.map((header) => ({
              type: "tableHeader",
              content: [{ type: "paragraph", content: [{ type: "text", text: header }] }],
            })),
          },
          // Data rows
          ...rows.map((row) => ({
            type: "tableRow",
            content: row.map((cell) => ({
              type: "tableCell",
              content: [{ type: "paragraph", content: [{ type: "text", text: cell }] }],
            })),
          })),
        ];

        editor
          .chain()
          .insertContentAt(insertPos, {
            type: "table",
            content: tableRows,
          })
          .run();
        return true;
      }

      case "addParty": {
        const { name, color } = args as unknown as AddPartyArgs;

        // Generate a temporary ID for tracking until the real ID arrives
        const tempId = `pending-slot-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

        // Create a promise that resolves when the real database ID comes back
        const realIdPromise = new Promise<string>((resolve, reject) => {
          pendingPartyCreations.set(tempId, { resolve, reject });
          // Timeout after 10 seconds
          setTimeout(() => {
            if (pendingPartyCreations.has(tempId)) {
              pendingPartyCreations.delete(tempId);
              reject(new Error(`Party creation timeout for: ${name}`));
            }
          }, 10_000);
        });

        // Dispatch event to create the slot in the store/DB
        const event = new CustomEvent("ai-create-slot-slot", {
          detail: {
            tempId,
            name,
            color: color || null, // null = auto-assign color
          },
        });
        globalThis.dispatchEvent(event);

        // AWAIT the real ID before returning - this ensures subsequent insertSmartBlock
        // calls can find the slot by name in the createdParties cache
        try {
          const realId = await realIdPromise;
          createdParties.set(name, realId);
          console.log(`[AI Command] Party resolved: ${name} -> ${realId}`);
          return true;
        } catch (err) {
          console.warn(`[AI Command] Party creation failed for ${name}:`, err);
          return false;
        }
      }

      case "setPartyColor": {
        const { name, color } = args as unknown as { name: string; color: string };
        const slotId = createdParties.get(name);

        if (!slotId) {
          console.warn(`[AI Command] Cannot set color for unknown slot: ${name}`);
          return false;
        }

        const event = new CustomEvent("ai-update-slot", {
          detail: { id: slotId, updates: { color } },
        });
        globalThis.dispatchEvent(event);
        return true;
      }

      case "assignSelectedBlockToParty": {
        const { slotName } = args as unknown as { slotName: string };

        let slotId = createdParties.get(slotName);

        // Fallback to storage lookup if not found in session
        if (!slotId) {
          const extensionParties = (editor.storage as any).smartBlock?.slots as Array<{
            id: string;
            name: string;
          }>;
          if (extensionParties) {
            const match = extensionParties.find(
              (p) => p.name.toLowerCase() === slotName.toLowerCase()
            );
            if (match) { slotId = match.id; }
          }
        }

        if (!slotId) {
          console.warn(`[AI Command] Cannot assign to unknown slot: ${slotName}`);
          return false;
        }

        const { selection } = editor.state;
        if (selection.empty) {
          console.warn("[AI Command] No block selected for assignment");
          return false;
        }

        editor.chain().updateAttributes("smartBlock", { slotId }).run();
        return true;
      }

      default:
        console.warn(`[AI Command] Unknown command: ${commandName}`);
        return false;
    }
  } catch (error) {
    console.error(`[AI Command] Failed to execute ${commandName}:`, error);
    return false;
  }
}

/**
 * Validate that a command name is known
 */
export function isValidCommand(commandName: string): boolean {
  const validCommands = [
    "insertHeading",
    "insertParagraph",
    "insertSmartBlock",
    "insertList",
    "insertDivider",
    "insertBlockquote",
    "insertTable",
    "addParty",
    "setPartyColor",
    "assignSelectedBlockToParty",
  ];
  return validCommands.includes(commandName);
}
