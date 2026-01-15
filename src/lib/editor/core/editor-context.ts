/**
 * Compatibility Layer for Editor Context
 * Maps old hooks to the new unified EditorBrain.
 */
import { useEditorBrain, initEditorBrain } from "./EditorBrain.svelte";

export function useEditor() { return useEditorBrain(); }
export function useDocument() { return useEditorBrain(); }
export function useModeState() { return useEditorBrain(); }
export function useCollaboration() { return useEditorBrain(); }

export function initEditorContext(initialDoc?: any) {
  const brain = initEditorBrain(initialDoc);
  return {
    engine: brain,
    documentState: brain,
    modeState: brain,
    brain
  };
}

// Re-exports for older imports
export { useEditorBrain as useEditorContext, initEditorBrain };
