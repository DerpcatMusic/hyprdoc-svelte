/**
 * Shared Extension Factory
 * 
 * Single source of truth for all Tiptap extensions.
 * Ensures consistent configuration across builder, viewer, and preview modes.
 * 
 * @module lib/editor/core/extensions.ts
 */

import { type Extension, type AnyExtension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Placeholder } from '@tiptap/extension-placeholder';
import { TextAlign } from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { Underline } from '@tiptap/extension-underline';
import { Subscript } from '@tiptap/extension-subscript';
import { Superscript } from '@tiptap/extension-superscript';
import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
import { BubbleMenu } from '@tiptap/extension-bubble-menu';
import { FontSize } from '$lib/components/editor/extensions/FontSize';
import { FontWeight } from '$lib/components/editor/extensions/FontWeight';
import { AISelectionExtension } from '$lib/components/editor/extensions/AISelectionExtension';
import { SmartBlockExtension } from '$lib/components/editor/extensions/smart-block-extension';
import { SlashCommand } from '$lib/components/editor/slash-command/extension';
import { VariableMention } from '$lib/components/editor/extensions/variable-mention';
import { TrackChangesExtension } from '$lib/components/editor/extensions/track-changes';
import { CollaborationCursor } from '$lib/components/editor/extensions/collaboration-cursor';
import { DocumentState } from './DocumentState.svelte';
import { getEditorModeState } from './EditorModeState.svelte';
import type { NodeViewServices } from './types';

/**
 * Editor rendering modes:
 * - builder: Full editing with all interactions (slash menu, AI, etc.)
 * - viewer: Read-only with full fidelity (sealed documents, signing view)
 * - preview: Minimal rendering for thumbnails (dashboard cards)
 */
export type EditorMode = 'builder' | 'viewer' | 'preview';

export interface ExtensionFactoryOptions {
	/** Rendering mode */
	mode: EditorMode;
	/** Document state for SmartBlock context */
	documentState?: DocumentState | null;
	/** Convex client for NodeView services */
	convexClient?: any;
	/** BubbleMenu mount element (builder mode only) */
	bubbleMenuElement?: HTMLElement;
	/** Placeholder text */
	placeholder?: string;
}

/**
 * Create extensions for the given mode
 */
export function createEditorExtensions(options: ExtensionFactoryOptions): AnyExtension[] {
	const { mode, documentState, bubbleMenuElement, placeholder, convexClient } = options;
	
	const isInteractive = mode === 'builder';
	
	// ━━━ BASE EXTENSIONS (all modes) ━━━
	const baseExtensions: AnyExtension[] = [
		StarterKit.configure({
			// Disable history in collab mode? Can be configured per-use
		}),
		TextStyle,
		TextAlign.configure({
			types: ['heading', 'paragraph']
		}),
		Color,
		Highlight.configure({
			multicolor: true
		}),
		// Underline, 
		Subscript,
		Superscript,
		FontSize,
		FontWeight,
		// SmartBlock always included - mode determines rendering behavior
		SmartBlockExtension.configure({
			services: {
				convexClient: convexClient ?? null,
				documentState: documentState ?? null,
				modeState: getEditorModeState()
			} as NodeViewServices,
			
			mode,
			isSealed: mode !== 'builder'
		})
	];
	
	// ━━━ BUILDER-ONLY EXTENSIONS ━━━
	if (isInteractive) {
		baseExtensions.push(
			Placeholder.configure({
				placeholder: placeholder ?? 'Start typing or press "/" for commands...'
			}),
			SlashCommand,
			VariableMention,
			TrackChangesExtension,
			CollaborationCursor,
			AISelectionExtension
		);
		
		// BubbleMenu only if element provided
		if (bubbleMenuElement) {
			baseExtensions.push(
				BubbleMenu.configure({
					element: bubbleMenuElement,
					shouldShow: ({ from, to }) => from !== to
				})
			);
		}
	}
	
	return baseExtensions;
}

/**
 * Get base extensions only (for viewer/preview modes without additional setup)
 */
export function getViewerExtensions(documentState?: DocumentState | null): AnyExtension[] {
	return createEditorExtensions({
		mode: 'viewer',
		documentState
	});
}

/**
 * Get preview extensions (minimal for dashboard thumbnails)
 */
export function getPreviewExtensions(): AnyExtension[] {
	return createEditorExtensions({
		mode: 'preview',
		documentState: null
	});
}
