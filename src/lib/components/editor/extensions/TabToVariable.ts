/**
 * TabToVariable.ts - Dynamic Variable Autocomplete Extension
 * ════════════════════════════════════════════════════════════════════════════
 * Detects words matching variable names from the database and shows a "⇥ Tab"
 * hint. Pressing Tab converts the word to a GlobalVariable node.
 * 
 * Now dynamically matches against variables passed from the editor context,
 * rather than using hardcoded trigger words.
 */

import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { EditorState } from "@tiptap/pm/state";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface VariableDefinition {
	name: string;
	displayName?: string;
	value?: string | number | boolean | null;
	type?: string;
}

export interface TabToVariableOptions {
	/** 
	 * Variables from database - matched against typed words.
	 * Each variable's name and displayName become valid triggers.
	 */
	variables: VariableDefinition[];
}

interface TriggerMatch {
	word: string;
	from: number;
	to: number;
	variableName: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// TRIGGER MAP BUILDER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build a lowercase trigger map from variables.
 * Maps trigger words to their canonical variable names.
 */
function buildTriggerMap(variables: VariableDefinition[]): Map<string, string> {
	const triggers = new Map<string, string>();
	
	for (const v of variables) {
		if (!v.name) continue;
		
		// Primary: exact variable name (e.g., "signer_name" -> "signer_name")
		triggers.set(v.name.toLowerCase(), v.name);
		
		// Also match underscore-to-space version (e.g., "signer name" -> "signer_name")
		if (v.name.includes("_")) {
			triggers.set(v.name.replace(/_/g, " ").toLowerCase(), v.name);
		}
		
		// Alias: displayName if different (e.g., "Signer Name" -> "signer_name")
		if (v.displayName && v.displayName.toLowerCase() !== v.name.toLowerCase()) {
			triggers.set(v.displayName.toLowerCase(), v.name);
		}
	}
	
	return triggers;
}

/**
 * Get sorted trigger words (longest first for multi-word matching)
 */
function getSortedTriggers(triggerMap: Map<string, string>): string[] {
	return [...triggerMap.keys()].sort((a, b) => b.length - a.length);
}

// ═══════════════════════════════════════════════════════════════════════════
// TRIGGER DETECTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Find if the word before cursor matches a trigger word
 */
function findTriggerWord(
	state: EditorState,
	triggerMap: Map<string, string>,
	sortedTriggers: string[]
): TriggerMatch | null {
	const { selection } = state;
	const { $from } = selection;

	// Only work with empty selection (cursor, not range)
	if (!selection.empty) return null;

	// Get the text before cursor in the current text block
	const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);
	if (!textBefore) return null;

	// Try matching different word lengths (longest first for multi-word triggers)
	for (const trigger of sortedTriggers) {
		const lowerText = textBefore.toLowerCase();
		if (lowerText.endsWith(trigger)) {
			// Check that it's at a word boundary (space before or start of text)
			const charBefore = textBefore.charAt(textBefore.length - trigger.length - 1);
			if (charBefore === "" || charBefore === " " || charBefore === "\n" || charBefore === "\t") {
				const from = $from.pos - trigger.length;
				const to = $from.pos;
				const variableName = triggerMap.get(trigger);
				if (variableName) {
					return {
						word: trigger,
						from,
						to,
						variableName,
					};
				}
			}
		}
	}

	return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB HINT WIDGET
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Creates the "⇥ Tab" hint widget element
 */
function createTabHintWidget(): HTMLElement {
	const span = document.createElement("span");
	span.className = "tab-variable-hint";
	span.textContent = " ⇥ Tab";
	span.style.cssText = `
		font-size: 10px;
		color: var(--primary);
		background: var(--primary-foreground);
		padding: 1px 6px;
		border-radius: 4px;
		margin-left: 4px;
		opacity: 0.9;
		pointer-events: none;
		font-family: system-ui, sans-serif;
		font-weight: 600;
		border: 1px solid var(--primary);
	`;
	return span;
}

// ═══════════════════════════════════════════════════════════════════════════
// EXTENSION
// ═══════════════════════════════════════════════════════════════════════════

const tabVariablePluginKey = new PluginKey("tabVariable");

export const TabToVariable = Extension.create<TabToVariableOptions>({
	name: "tabToVariable",

	addOptions() {
		return {
			variables: [],
		};
	},

	addProseMirrorPlugins() {
		const options = this.options;
		
		// Build trigger map from variables (rebuilt when extension is reconfigured)
		const triggerMap = buildTriggerMap(options.variables);
		const sortedTriggers = getSortedTriggers(triggerMap);
		
		return [
			new Plugin({
				key: tabVariablePluginKey,
				props: {
					/**
					 * Handle Tab key to convert trigger word to variable
					 */
					handleKeyDown(view, event) {
						if (event.key !== "Tab") return false;

						const match = findTriggerWord(view.state, triggerMap, sortedTriggers);
						if (!match) return false;

						// Prevent default tab behavior
						event.preventDefault();

						// Get the globalVariable node type
						const { schema, tr } = view.state;
						const globalVariableType = schema.nodes.globalVariable;
						if (!globalVariableType) {
							console.warn("[TabToVariable] globalVariable node type not found");
							return false;
						}

						// Create the variable node
						const variableNode = globalVariableType.create({
							name: match.variableName,
							type: "text",
							value: null, // Will be resolved at runtime
						});

						// Replace the trigger word with the variable node
						tr.replaceWith(match.from, match.to, variableNode);
						view.dispatch(tr);

						return true;
					},

					/**
					 * Show hint decoration when trigger word is detected
					 */
					decorations(state) {
						const match = findTriggerWord(state, triggerMap, sortedTriggers);
						if (!match) return DecorationSet.empty;

						// Create an inline decoration widget at the end of the word
						const widget = Decoration.widget(
							match.to,
							() => createTabHintWidget(),
							{ side: 1 }
						);

						return DecorationSet.create(state.doc, [widget]);
					},
				},
			}),
		];
	},
});

export default TabToVariable;

