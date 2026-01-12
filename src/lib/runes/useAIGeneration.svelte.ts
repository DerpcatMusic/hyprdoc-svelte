/**
 * useAIGeneration - RUNED-powered AI Document Generation
 *
 * Manages SSE streaming state for AI document generation with:
 * - Reactive command queue using $state
 * - Connection lifecycle management
 * - Progress tracking with Debounced updates
 * - Error handling and retry logic
 */

import { IsMounted, Debounced } from 'runed';
import type { Editor } from '@tiptap/core';

export interface AICommand {
	name: string;
	args: Record<string, unknown>;
}

export interface AIGenerationOptions {
	prompt: string;
	genre?: string;
	category?: string;
	slots?: Array<{ id: string; name: string; color?: string }>;
}

export interface AIGenerationState {
	isGenerating: boolean;
	isConnected: boolean;
	commandCount: number;
	error: string | null;
	progress: number;
}

/**
 * Creates AI generation state and controls
 */
export function createAIGeneration(getEditor: () => Editor | null) {
	// Reactive state
	let isGenerating = $state(false);
	let isConnected = $state(false);
	let commandCount = $state(0);
	let error = $state<string | null>(null);
	let commandQueue = $state<AICommand[]>([]);

	// Track mount state for cleanup
	const mounted = new IsMounted();

	// Debounced progress for smooth UI updates
	const debouncedCommandCount = new Debounced(() => commandCount, 100);

	// EventSource reference for cleanup
	let eventSource: EventSource | null = null;

	/**
	 * Execute a single AI command on the editor
	 */
	function executeCommand(command: AICommand) {
		const editor = getEditor();
		if (!editor) {
			console.warn('[AI] No editor available for command:', command.name);
			return;
		}

		const { name, args } = command;

		switch (name) {
			case 'addParty':
				// Emit custom event for party management
				editor.commands.focus('end');
				window.dispatchEvent(
					new CustomEvent('ai:addParty', { detail: args })
				);
				break;

			case 'setPartyColor':
				window.dispatchEvent(
					new CustomEvent('ai:setPartyColor', { detail: args })
				);
				break;

			case 'insertHeading':
				editor
					.chain()
					.focus('end')
					.insertContent({
						type: 'heading',
						attrs: { level: args.level as number },
						content: [{ type: 'text', text: args.text as string }]
					})
					.insertContent({ type: 'paragraph' })
					.run();
				break;

			case 'insertParagraph':
				editor
					.chain()
					.focus('end')
					.insertContent({
						type: 'paragraph',
						content: [{ type: 'text', text: args.text as string }]
					})
					.run();
				break;

			case 'insertSmartBlock':
				editor
					.chain()
					.focus('end')
					.insertContent({
						type: 'smartBlock',
						attrs: {
							type: args.type,
							label: args.label,
							variableName: args.variableName,
							required: args.required ?? false,
							placeholder: args.placeholder,
							options: args.options,
							slotName: args.slotName
						}
					})
					.insertContent({ type: 'paragraph' })
					.run();
				break;

			case 'insertList': {
				const listType = args.listType === 'ordered' ? 'orderedList' : 'bulletList';
				const items = (args.items as string[]).map((item) => ({
					type: 'listItem',
					content: [{ type: 'paragraph', content: [{ type: 'text', text: item }] }]
				}));
				editor
					.chain()
					.focus('end')
					.insertContent({ type: listType, content: items })
					.insertContent({ type: 'paragraph' })
					.run();
				break;
			}

			case 'insertDivider':
				editor.chain().focus('end').setHorizontalRule().run();
				break;

			case 'insertBlockquote':
				editor
					.chain()
					.focus('end')
					.insertContent({
						type: 'blockquote',
						content: [
							{ type: 'paragraph', content: [{ type: 'text', text: args.text as string }] }
						]
					})
					.insertContent({ type: 'paragraph' })
					.run();
				break;

			case 'insertTable': {
				const headers = args.headers as string[];
				const rows = args.rows as string[][];
				const tableRows = [
					{
						type: 'tableRow',
						content: headers.map((h) => ({
							type: 'tableHeader',
							content: [{ type: 'paragraph', content: [{ type: 'text', text: h }] }]
						}))
					},
					...rows.map((row) => ({
						type: 'tableRow',
						content: row.map((cell) => ({
							type: 'tableCell',
							content: [{ type: 'paragraph', content: [{ type: 'text', text: cell }] }]
						}))
					}))
				];
				editor
					.chain()
					.focus('end')
					.insertContent({ type: 'table', content: tableRows })
					.insertContent({ type: 'paragraph' })
					.run();
				break;
			}

			default:
				console.warn('[AI] Unknown command:', name);
		}
	}

	/**
	 * Process command queue with slight delay for visual feedback
	 */
	async function processQueue() {
		for (const command of commandQueue) {
			if (!mounted.current) { break; }
			executeCommand(command);
			// Small delay for visual feedback
			await new Promise((resolve) => setTimeout(resolve, 50));
		}
		commandQueue = [];
	}

	/**
	 * Start AI generation with SSE streaming
	 */
	async function generate(options: AIGenerationOptions): Promise<boolean> {
		if (isGenerating) {
			console.warn('[AI] Generation already in progress');
			return false;
		}

		// Reset state
		isGenerating = true;
		isConnected = false;
		commandCount = 0;
		error = null;
		commandQueue = [];

		try {
			// Use POST with fetch for better control
			const response = await fetch('/api/ai/generate-stream', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(options)
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.error || `HTTP ${response.status}`);
			}

			if (!response.body) {
				throw new Error('No response body');
			}

			isConnected = true;

			// Process SSE stream
			const reader = response.body.getReader();
			const decoder = new TextDecoder();
			let buffer = '';

			while (true) {
				const { done, value } = await reader.read();
				if (done) { break; }

				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split('\n');
				buffer = lines.pop() || '';

				for (const line of lines) {
					if (line.startsWith('event: ')) {
						const _eventType = line.slice(7);
						continue;
					}
					if (line.startsWith('data: ')) {
						const data = JSON.parse(line.slice(6));

						// Handle different event types based on last seen event
						if (data.name && data.args) {
							// Command event
							commandQueue = [...commandQueue, data];
							commandCount++;
						} else if (data.success !== undefined) {
							// Done event
							console.log(`[AI] Generation complete: ${data.commandCount} commands`);
						} else if (data.message) {
							// Error event
							error = data.message;
						}
					}
				}
			}

			// Process all queued commands
			await processQueue();

			return true;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Generation failed';
			console.error('[AI] Generation error:', err);
			return false;
		} finally {
			isGenerating = false;
			isConnected = false;
		}
	}

	/**
	 * Cancel ongoing generation
	 */
	function cancel() {
		if (eventSource) {
			eventSource.close();
			eventSource = null;
		}
		isGenerating = false;
		isConnected = false;
	}

	/**
	 * Reset state
	 */
	function reset() {
		cancel();
		commandCount = 0;
		error = null;
		commandQueue = [];
	}

	return {
		// State getters
		get isGenerating() { return isGenerating; },
		get isConnected() { return isConnected; },
		get commandCount() { return debouncedCommandCount.current; },
		get error() { return error; },
		get progress() { return commandCount; },

		// Actions
		generate,
		cancel,
		reset
	};
}

export type AIGenerationController = ReturnType<typeof createAIGeneration>;
