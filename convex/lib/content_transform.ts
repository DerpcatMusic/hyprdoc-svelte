/**
 * Content transformation utilities for document sealing.
 * Resolves dynamic content and converts to static values.
 */

// Note: We use a simplified content type here since this runs in Convex
// and can't import @tiptap/core directly
interface ContentNode {
	type?: string;
	attrs?: Record<string, unknown>;
	content?: ContentNode[];
	marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
	text?: string;
}

/**
 * System variables that can be resolved at seal time.
 */
const SYSTEM_VARIABLES: Record<string, () => string> = {
	today: () => new Date().toLocaleDateString(),
	now: () => new Date().toLocaleTimeString(),
	document_created: () => new Date().toLocaleDateString()
};

/**
 * Options for resolving variable mentions.
 */
export interface ResolveVariablesOptions {
	blocks: Array<{
		id: string;
		variableName?: string;
		label?: string;
		value?: string | number | boolean | null;
	}>;
	slots?: Array<{
		name?: string;
		legalName?: string;
		email?: string;
		role?: string;
	}>;
	documentSettings?: {
		title?: string;
	};
}

/**
 * Resolve a single variable name to its value.
 */
function resolveVariableValue(
	variableName: string,
	options: ResolveVariablesOptions
): string | null {
	// 1. System variables
	if (SYSTEM_VARIABLES[variableName]) {
		return SYSTEM_VARIABLES[variableName]();
	}

	// 2. Document title
	if (variableName === 'document_title') {
		return options.documentSettings?.title || 'Untitled Document';
	}

	// 3. Signer variables (signer_XX_field pattern)
	const signerMatch = variableName.match(/^signer_(\d+)_(name|email|role)$/);
	if (signerMatch && options.slots) {
		const signerIndex = Number.parseInt(signerMatch[1], 10) - 1;
		const field = signerMatch[2];
		const signer = options.slots[signerIndex];
		if (signer) {
			switch (field) {
				case 'name':
					return signer.legalName || signer.name || `[Signer ${signerMatch[1]}]`;
				case 'email':
					return signer.email || `[Email ${signerMatch[1]}]`;
				case 'role':
					return signer.role || `[Role ${signerMatch[1]}]`;
			}
		}
		return `[Signer ${signerMatch[1]} ${field}]`;
	}

	// 4. Block variables
	const block = options.blocks.find((b) => b.variableName === variableName);
	if (block) {
		if (block.value !== null && block.value !== undefined && block.value !== '') {
			return String(block.value);
		}
		return `[${block.label || variableName}]`;
	}

	// Unresolved - return as placeholder
	return null;
}

/**
 * Recursively process Tiptap JSON content and resolve all variableMention nodes
 * to plain text nodes with their resolved values.
 *
 * This is used when sealing a document to "bake in" dynamic values.
 */
export function resolveVariableMentions(
	content: ContentNode,
	options: ResolveVariablesOptions
): ContentNode {
	if (!content) { return content; }

	// If this is a variableMention node, convert it to plain text
	if (content.type === 'variableMention') {
		const variableName = content.attrs?.variableName as string | undefined;
		const resolvedValue =
			resolveVariableValue(variableName || '', options) || `{{${variableName}}}`;

		// Replace with a text node containing the resolved value
		return {
			type: 'text',
			text: resolvedValue,
			// Preserve any marks (bold, italic, etc.) if they exist
			...(content.marks && { marks: content.marks })
		};
	}

	// Recursively process content array
	if (content.content && Array.isArray(content.content)) {
		return {
			...content,
			content: content.content.map((child) => resolveVariableMentions(child, options))
		};
	}

	return content;
}

/**
 * Process document content string and resolve all variable mentions.
 * Returns the modified content string ready for sealing.
 */
export function resolveDocumentVariables(
	contentString: string,
	options: ResolveVariablesOptions
): string {
	try {
		const contentJson = JSON.parse(contentString);
		const resolvedContent = resolveVariableMentions(contentJson, options);
		return JSON.stringify(resolvedContent);
	} catch (e) {
		console.error('Failed to resolve variables in document content:', e);
		return contentString; // Return original on error
	}
}
