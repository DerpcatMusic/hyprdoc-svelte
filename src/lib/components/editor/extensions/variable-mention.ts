/**
 * Variable Mention Extension
 *
 * Provides {{variableName}} syntax for dynamic variable insertion.
 * Uses Svelte for the node view rendering.
 *
 * @module lib/components/editor/extensions/variable-mention.ts
 */

import { Extension, InputRule, mergeAttributes, Node } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

// ═══════════════════════════════════════════════════════════════
// Variable Mention Node (The inline {{variable}} element)
// ═══════════════════════════════════════════════════════════════

// Regex to match {{variableName}} pattern
const VARIABLE_PATTERN = /{{([A-Za-z]\w*)}}/g;
const VARIABLE_INPUT_RULE_PATTERN = /{{([A-Za-z]\w*)}}$/;

export const VariableMentionNode = Node.create({
	name: 'variableMention',
	group: 'inline',
	inline: true,
	selectable: true,
	atom: true,

	addAttributes() {
		return {
			variableId: { default: null },
			variableName: { default: '' },
			variableType: { default: 'text' }
		};
	},

	parseHTML() {
		return [
			{
				tag: 'span[data-variable-mention]'
			}
		];
	},

	renderHTML({ node, HTMLAttributes }) {
		return [
			'span',
			mergeAttributes(HTMLAttributes, {
				'data-variable-mention': '',
				'data-variable-name': node.attrs.variableName,
				class: 'variable-mention'
			}),
			`{{${node.attrs.variableName}}}`
		];
	},

	renderText({ node }) {
		return `{{${node.attrs.variableName}}}`;
	},

	// Convert typed {{variableName}} to variable node
	addInputRules() {
		return [
			new InputRule({
				find: VARIABLE_INPUT_RULE_PATTERN,
				handler: ({ state, range, match }) => {
					const variableName = match[1];
					if (!variableName) { return; }

					const { tr } = state;
					const node = this.type.create({
						variableName,
						variableType: 'text'
					});

					tr.replaceWith(range.from, range.to, node);
				}
			})
		];
	},

	// Handle paste: convert {{variableName}} patterns in pasted text
	addProseMirrorPlugins() {
		const nodeType = this.type;

		return [
			new Plugin({
				key: new PluginKey('variableMentionPaste'),
				props: {
					handlePaste(view, event) {
						const text = event.clipboardData?.getData('text/plain') || '';

						// Check if the pasted text contains variable patterns
						if (!VARIABLE_PATTERN.test(text)) {
							return false;
						}

						// Reset regex lastIndex
						VARIABLE_PATTERN.lastIndex = 0;

						// Build content with variable nodes
						const { tr, schema } = view.state;
						const nodes: any[] = [];
						let lastIndex = 0;
						let match = VARIABLE_PATTERN.exec(text);

						while (match !== null) {
							// Add text before the match
							if (match.index > lastIndex) {
								const textBefore = text.slice(lastIndex, match.index);
								nodes.push(schema.text(textBefore));
							}

							// Add variable node
							const variableName = match[1];
							const variableNode = nodeType.create({
								variableName,
								variableType: 'text'
							});
							nodes.push(variableNode);

							lastIndex = match.index + match[0].length;
							match = VARIABLE_PATTERN.exec(text);
						}

						// Add remaining text after last match
						if (lastIndex < text.length) {
							const textAfter = text.slice(lastIndex);
							nodes.push(schema.text(textAfter));
						}

						// Insert all nodes
						if (nodes.length > 0) {
							const { from, to } = view.state.selection;
							tr.replaceWith(from, to, nodes);
							view.dispatch(tr);
							return true;
						}

						return false;
					}
				}
			})
		];
	}
});

// ═══════════════════════════════════════════════════════════════
// Tab-to-Variable Extension (Auto-detect words and convert with Tab)
// ═══════════════════════════════════════════════════════════════

// Map of trigger words (lowercase) to their variable names
const TAB_VARIABLE_TRIGGERS: Record<string, string> = {
	today: 'today',
	now: 'now',
	'document title': 'document_title',
	document: 'document_title',
	'signer name': 'signer_name',
	'signer email': 'signer_email',
	'signer role': 'signer_role',
	signer: 'signer_name',
	email: 'signer_email',
	role: 'signer_role',
	created: 'document_created',
	date: 'today'
};

// Find if the word before cursor matches a trigger
function findTriggerWord(
	state: any
): { word: string; from: number; to: number; variableName: string } | null {
	const { selection } = state;
	const { $from } = selection;

	const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);

	// Try matching different word lengths (longest first for multi-word triggers)
	for (const trigger of Object.keys(TAB_VARIABLE_TRIGGERS).sort((a, b) => b.length - a.length)) {
		const lowerText = textBefore.toLowerCase();
		if (lowerText.endsWith(trigger)) {
			const charBefore = textBefore.at(trigger.length +1);
			if (charBefore === '' || charBefore === ' ' || charBefore === '\n') {
				const from = $from.pos - trigger.length;
				const to = $from.pos;
				return {
					word: trigger,
					from,
					to,
					variableName: TAB_VARIABLE_TRIGGERS[trigger]
				};
			}
		}
	}

	return null;
}

const tabVariablePluginKey = new PluginKey('tabVariable');

export const TabToVariable = Extension.create({
	name: 'tabToVariable',

	addProseMirrorPlugins() {
		return [
			new Plugin({
				key: tabVariablePluginKey,
				props: {
					handleKeyDown(view, event) {
						if (event.key !== 'Tab') { return false; }

						const match = findTriggerWord(view.state);
						if (!match) { return false; }

						event.preventDefault();

						const { schema, tr } = view.state;
						const variableMentionType = schema.nodes.variableMention;
						if (!variableMentionType) { return false; }

						const variableNode = variableMentionType.create({
							variableName: match.variableName,
							variableType: 'text'
						});

						tr.replaceWith(match.from, match.to, variableNode);
						view.dispatch(tr);

						return true;
					}
				}
			})
		];
	}
});

// ═══════════════════════════════════════════════════════════════
// Combined Export
// ═══════════════════════════════════════════════════════════════

export { VariableMentionNode as VariableMention };
