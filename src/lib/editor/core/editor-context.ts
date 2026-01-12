/**
 * Editor Context - Svelte Context Injection Utilities
 *
 * Provides context-based dependency injection for editor state classes.
 * Ensures proper scoping and type-safe access to editor internals.
 *
 * @module lib/editor/core/editor-context.ts
 */

import { getContext, setContext } from 'svelte';
import { EditorEngine } from './EditorEngine.svelte';
import { DocumentState } from './DocumentState.svelte';
import { EditorModeState, getEditorModeState } from './EditorModeState.svelte';
import { CollaborationState } from './CollaborationState.svelte';

// ━━━ CONTEXT KEYS ━━━
const EDITOR_KEY = Symbol('EDITOR_ENGINE');
const DOCUMENT_KEY = Symbol('DOCUMENT_STATE');
const MODE_KEY = Symbol('EDITOR_MODE_STATE');
const COLLABORATION_KEY = Symbol('COLLABORATION_STATE');


// ━━━ EDITOR ENGINE CONTEXT ━━━

/**
 * Creates and provides an EditorEngine instance to the component tree.
 * Call this in the top-level editor component.
 */
export function setEditorEngine(engine?: EditorEngine): EditorEngine {
	const instance = engine ?? new EditorEngine();
	setContext(EDITOR_KEY, instance);
	return instance;
}

/**
 * Retrieves the EditorEngine from context.
 * Must be called within a component that has setEditorEngine in its ancestor tree.
 */
export function useEditor(): EditorEngine {
	const engine = getContext<EditorEngine>(EDITOR_KEY);
	if (!engine) {
		throw new Error('useEditor must be used within a component that provides EditorEngine context');
	}
	return engine;
}

// ━━━ DOCUMENT STATE CONTEXT ━━━

/**
 * Creates and provides a DocumentState instance to the component tree.
 * Call this in the top-level editor component.
 */
export function setDocumentState(state?: DocumentState): DocumentState {
	const instance = state ?? new DocumentState();
	setContext(DOCUMENT_KEY, instance);
	return instance;
}

/**
 * Retrieves the DocumentState from context.
 * Must be called within a component that has setDocumentState in its ancestor tree.
 */
export function useDocument(): DocumentState {
	const state = getContext<DocumentState>(DOCUMENT_KEY);
	if (!state) {
		throw new Error(
			'useDocument must be used within a component that provides DocumentState context'
		);
	}
	return state;
}

// ━━━ COLLABORATION STATE CONTEXT ━━━

/**
 * Creates and provides a CollaborationState instance to the component tree.
 * Call this in the top-level editor component.
 */
export function setCollaborationState(state: CollaborationState): CollaborationState {
	setContext(COLLABORATION_KEY, state);
	return state;
}

/**
 * Retrieves the CollaborationState from context.
 */
export function useCollaboration(): CollaborationState {
	const state = getContext<CollaborationState>(COLLABORATION_KEY);
	if (!state) {
		throw new Error(
			'useCollaboration must be used within a component that provides CollaborationState context'
		);
	}
	return state;
}

// ━━━ EDITOR MODE STATE CONTEXT ━━━

/**
 * Creates and provides the EditorModeState to the component tree.
 * Uses singleton to ensure consistent mode state across Tiptap NodeViews.
 */
export function setModeState(state?: EditorModeState): EditorModeState {
	const instance = state ?? getEditorModeState();
	setContext(MODE_KEY, instance);
	return instance;
}

/**
 * Retrieves the EditorModeState from context.
 * Falls back to singleton if context unavailable (e.g., Tiptap NodeViews).
 */
export function useModeState(): EditorModeState {
	const state = getContext<EditorModeState>(MODE_KEY);
	// Fallback to singleton for Tiptap NodeViews
	return state ?? getEditorModeState();
}

// ━━━ COMBINED INITIALIZATION ━━━

/**
 * Initializes all core editor contexts.
 * CollaborationState must be initialized separately due to dependencies.
 * 
 * @returns Object with engine, documentState, and modeState instances
 */
export function initEditorContext(): { 
	engine: EditorEngine; 
	documentState: DocumentState;
	modeState: EditorModeState;
} {
	const engine = setEditorEngine();
	const documentState = setDocumentState();
	const modeState = setModeState();
	return { engine, documentState, modeState };
}

// ━━━ BACKWARD COMPATIBILITY ━━━
export const useDocumentStore = useDocument;
export const setDocumentStore = setDocumentState;
