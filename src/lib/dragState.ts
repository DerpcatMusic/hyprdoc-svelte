/**
 * Global Drag State
 *
 * Module-level state to track what is being dragged.
 * This bypasses the dataTransfer limitation where getData() returns empty
 * on nested elements inside contentEditable (ProseMirror/Tiptap).
 *
 * Supports two drag scenarios:
 * 1. Palette drag: dragging a new block type from the sidebar (type is set, id is null)
 * 2. Existing block drag: dragging an existing block to reorder/split (both type and id are set)
 */

interface DragState {
  /** Block type (e.g., "text_input", "signature") */
  type: string | null;
  /** Block ID for existing blocks being dragged (null for palette drags) */
  id: string | null;
}

let currentDragState: DragState = { type: null, id: null };

/**
 * Set the dragged block type (for palette drags).
 * Call this on dragStart from BlockPalette.
 */
export function setDraggedBlockType(type: string | null): void {
  console.log("[dragState] SET type:", type);
  currentDragState = { type, id: null };
}

/**
 * Set the dragged block (for existing block drags).
 * Call this on dragStart from BaseBlockWrapper.
 */
export function setDraggedBlock(type: string, id: string): void {
  console.log("[dragState] SET block:", { type, id });
  currentDragState = { type, id };
}

/**
 * Get the currently dragged block type.
 */
export function getDraggedBlockType(): string | null {
  console.log("[dragState] GET type:", currentDragState.type);
  return currentDragState.type;
}

/**
 * Get the currently dragged block ID (null if palette drag).
 */
export function getDraggedBlockId(): string | null {
  console.log("[dragState] GET id:", currentDragState.id);
  return currentDragState.id;
}

/**
 * Get the full drag state.
 */
export function getDragState(): DragState {
  return { ...currentDragState };
}

/**
 * Clear the drag state.
 * Call this on drop or dragEnd.
 */
export function clearDraggedBlockType(): void {
  console.log("[dragState] CLEAR");
  currentDragState = { type: null, id: null };
}
