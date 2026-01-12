import { mergeAttributes, Node } from '@tiptap/core';
import { SmartNodeViewRenderer } from '$lib/editor/extensions/SmartNodeView.svelte';
import { blockRegistry } from '../smart-blocks/core/block-registry.svelte';
import type { EditorMode } from '$lib/editor/core/EditorModeState.svelte';


/**
 * Helper: Convert camelCase to kebab-case for data attributes
 */
const toKebabCase = (str: string) => str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

/**
 * Create attribute config with HTML parsing/rendering
 */
const createAttributeConfig = (key: string, defaultValue: any) => ({
	default: defaultValue,
	parseHTML: (element: HTMLElement) => {
		const attrName = `data-${toKebabCase(key)}`;
		const rawValue = element.getAttribute(attrName);
		if (rawValue === null) { return defaultValue; }
		try {
			return JSON.parse(rawValue);
		} catch {
			return rawValue;
		}
	},
	renderHTML: (attributes: Record<string, any>) => {
		const val = attributes[key];
		if (val === undefined || val === null) { return {}; }

		const storedValue = typeof val === 'object' ? JSON.stringify(val) : val;

		return {
			[`data-${toKebabCase(key)}`]: storedValue
		};
	}
});

/**
 * Core attributes (always required)
 */
const CORE_ATTRIBUTES = {
	id: createAttributeConfig('id', null),
	type: createAttributeConfig('type', 'smart-text'),
	slotId: createAttributeConfig('slotId', null),
	label: createAttributeConfig('label', 'New Field'),
	required: createAttributeConfig('required', false),
	value: createAttributeConfig('value', null),
	variableName: createAttributeConfig('variableName', 'var_name'),
	placeholder: createAttributeConfig('placeholder', ''),
	description: createAttributeConfig('description', ''),
	linkedBlockId: createAttributeConfig('linkedBlockId', null),
	inputType: createAttributeConfig('inputType', undefined),
	visibilityCondition: createAttributeConfig('visibilityCondition', null)
} as const;

/**
 * SmartBlock Tiptap Extension
 *
 * Auto-generates attributes from block registry
 */
export const SmartBlockExtension = Node.create({
	name: 'smartBlock',
	group: 'block',
	draggable: true,
	atom: true,
	isolating: true,

	addOptions() {
		return {
			// [NEW] Unified Service Injection
			services: null as any,

			// [DEPRECATED] Document store instance - passed via configure()
			documentStore: null as any,
			// [DEPRECATED] Convex client for NodeView context restoration
			convexClient: null as any,
			
			// Rendering mode: 'builder' | 'viewer' | 'preview'
			mode: 'builder' as EditorMode,
			// Legacy flags (derived from mode, kept for compatibility)
			isSealed: false,
			isSigningMode: false,
			isSimulationMode: false
		};
	},

	addAttributes() {
		// Get dynamic attributes from block registry
		const dynamicAttributesRaw = blockRegistry.getTiptapAttributes();

		// Convert to full attribute configs
		const dynamicAttributes = Object.entries(dynamicAttributesRaw).reduce(
			(acc, [key, config]) => {
				acc[key] = createAttributeConfig(key, config.default);
				return acc;
			},
			{} as Record<string, any>
		);

		// Merge: dynamic first, then core (core takes precedence)
		return {
			...dynamicAttributes,
			...CORE_ATTRIBUTES
		};
	},

	parseHTML() {
		return [{ tag: 'smart-block' }];
	},

	renderHTML({ HTMLAttributes }) {
		return ['smart-block', mergeAttributes(HTMLAttributes)];
	},

	addNodeView() {
		return SmartNodeViewRenderer();
	}
});
