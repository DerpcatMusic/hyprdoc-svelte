import type { Component, Snippet } from 'svelte';
import type { z } from 'zod';
import type { Editor } from '@tiptap/core';

/**
 * Block category definitions
 */
export const BLOCK_CATEGORIES = [
	{ id: 'content', label: 'Core Content', color: 'blue' },
	{ id: 'inputs', label: 'User Inputs', color: 'violet' },
	{ id: 'assets', label: 'Assets & Media', color: 'fuchsia' },
	{ id: 'logic', label: 'Conditional & Logic', color: 'orange' },
	{ id: 'compliance', label: 'Compliance & Signature', color: 'emerald' },
	{ id: 'layout', label: 'Structure & Layout', color: 'slate' }
] as const;

export type BlockCategory = (typeof BLOCK_CATEGORIES)[number]['id'];

/**
 * Render Context for Blocks
 */
export interface RenderContext {
	attrs: any;
	selected: boolean;
	editor: Editor;
	extension: any;
	mode: 'edit' | 'sign' | 'view';
	active?: boolean;
	activeSlotId?: string | null;
}

/**
 * Block definition configuration
 */
export interface BlockDefinition {
	type: string;
	label: string;
	category: BlockCategory;
	description?: string;
	icon: string;
	assignable?: boolean;
	schema: z.ZodType<any>;
	defaults: Record<string, any>;
	component: Component<RenderContext>;
	settings?: Component<any>;
}

/**
 * Block configuration for definition utility
 */
export interface BlockConfig {
	type: string;
	label: string;
	category: BlockCategory | string; // Allow string for flexibility during migration
	description?: string;
	icon: string;
	assignable?: boolean;
	schema: z.ZodType<any>;
	defaults?: Record<string, any>;
	component?: Component<RenderContext>;
	settings?: Component<any>;
}
