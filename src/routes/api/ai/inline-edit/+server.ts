/**
 * Inline AI Text Editing API
 *
 * Multi-provider support for inline text editing:
 * - Google Gemini (default)
 * - OpenRouter (many free models)
 *
 * SvelteKit implementation with WorkOS auth.
 */

import { json, type RequestHandler } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { FunctionCallingMode, GoogleGenerativeAI } from '@google/generative-ai';
import { getInlineAIConfig, INLINE_EDIT_PROMPT } from '$lib/ai/inline-ai-config';
import { EDITOR_TOOLS, DOCUMENT_GENERATION_SYSTEM_PROMPT } from '$lib/ai/editor-tools';

export const POST: RequestHandler = async ({ request, locals }) => {
	// 1. Authenticate via WorkOS session
	const session = locals.session;
	if (!session?.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	// 2. Parse request
	const body = await request.json();
	const { selectedText, instruction, slots } = body;

	if (!(selectedText && instruction)) {
		return json({ error: 'Missing selectedText or instruction' }, { status: 400 });
	}

	// Inject Party Context for Inline Mode
	let slotContext = '';
	if (slots && Array.isArray(slots) && slots.length > 0) {
		const slotList = slots.map((p: { name: string; id: string }) => `- "${p.name}" (ID: ${p.id})`).join('\n');
		slotContext = `\nAVAILABLE PARTIES:\n${slotList}\n(User reference to 'client' or 'landlord' should map to these IDs)\n`;
	}

	const userPrompt = `Text To Edit/Context: "${selectedText}"
Instruction: ${instruction}
${slotContext}`;

	// 3. Get provider configuration
	let config = getInlineAIConfig();

	// Force OpenRouter if key is present (safety override)
	if (env.OPENROUTER_API_KEY && config.provider !== 'openrouter') {
		console.log('[Inline AI] Overriding provider to OpenRouter because API key is present');
		config = {
			provider: 'openrouter',
			apiKey: env.OPENROUTER_API_KEY.split('#')[0].trim(),
			model: env.OPENROUTER_MODEL || 'xiaomi/mimo-v2-flash:free'
		};
	} else if (config.provider === 'openrouter' && config.apiKey) {
		config.apiKey = config.apiKey.split('#')[0].trim();
	}

	// 4. Create streaming response based on provider
	const encoder = new TextEncoder();

	if (config.provider === 'openrouter') {
		console.log('[Inline AI] Executing handleOpenRouter...');
		return handleOpenRouter(config, userPrompt, encoder);
	}

	console.log('[Inline AI] Executing handleGemini...');
	return handleGemini(config, userPrompt, encoder);
};

/**
 * Handle Gemini provider streaming
 */
async function handleGemini(
	config: { apiKey: string; model: string },
	userPrompt: string,
	encoder: TextEncoder
) {
	const genAI = new GoogleGenerativeAI(config.apiKey);

	const stream = new ReadableStream({
		async start(controller) {
			try {
				const model = genAI.getGenerativeModel({
					model: config.model,
					tools: [{ functionDeclarations: EDITOR_TOOLS }],
					toolConfig: {
						functionCallingConfig: {
							mode: FunctionCallingMode.AUTO
						}
					}
				});

				const result = await model.generateContentStream({
					contents: [
						{
							role: 'user',
							parts: [
								{
									text: `${DOCUMENT_GENERATION_SYSTEM_PROMPT}\n\n${userPrompt}\n\nCRITICAL INSTRUCTION: If the user asks to "insert", "add", "create", or "replace with" a field/block (like signature, date, input), YOU MUST CALL THE 'insertSmartBlock' TOOL. Do not just describe it in text.`
								}
							]
						}
					]
				});

				for await (const chunk of result.stream) {
					const candidate = chunk.candidates?.[0];
					if (!candidate?.content?.parts) { continue; }

					for (const part of candidate.content.parts) {
						// Check for function calls
						if (part.functionCall) {
							const { name, args } = part.functionCall;
							const event = `event: command\ndata: ${JSON.stringify({ name, args })}\n\n`;
							controller.enqueue(encoder.encode(event));
						}

						// Check for text
						if (part.text) {
							const event = `event: text\ndata: ${JSON.stringify({ text: part.text })}\n\n`;
							controller.enqueue(encoder.encode(event));
						}
					}
				}

				const doneEvent = `event: done\ndata: ${JSON.stringify({ success: true })}\n\n`;
				controller.enqueue(encoder.encode(doneEvent));
				controller.close();
			} catch (error) {
				console.error('[Inline Edit Gemini Error]:', error);
				const errorEvent = `event: error\ndata: ${JSON.stringify({
					message: error instanceof Error ? error.message : 'Edit failed'
				})}\n\n`;
				controller.enqueue(encoder.encode(errorEvent));
				controller.close();
			}
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive'
		}
	});
}

/**
 * Handle OpenRouter provider streaming (OpenAI-compatible)
 */
async function handleOpenRouter(
	config: { apiKey: string; model: string },
	userPrompt: string,
	encoder: TextEncoder
) {
	const stream = new ReadableStream({
		async start(controller) {
			try {
				const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
					method: 'POST',
					headers: {
						Authorization: `Bearer ${config.apiKey}`,
						'Content-Type': 'application/json',
						'HTTP-Referer': 'https://hyprdoc.app',
						'X-Title': 'HyprDoc Inline Editor'
					},
					body: JSON.stringify({
						model: config.model,
						messages: [
							{ role: 'system', content: INLINE_EDIT_PROMPT },
							{ role: 'user', content: userPrompt }
						],
						stream: true,
						max_tokens: 1000
					})
				});

				if (!response.ok) {
					throw new Error(`OpenRouter error: ${response.status}`);
				}

				const reader = response.body?.getReader();
				if (!reader) { throw new Error('No response body'); }

				const decoder = new TextDecoder();
				let buffer = '';

				while (true) {
					const { done, value } = await reader.read();
					if (done) { break; }

					buffer += decoder.decode(value, { stream: true });
					const lines = buffer.split('\n');
					buffer = lines.pop() || '';

					for (const line of lines) {
						if (line.startsWith('data: ') && line !== 'data: [DONE]') {
							try {
								const data = JSON.parse(line.substring(6));
								const text = data.choices?.[0]?.delta?.content;
								if (text) {
									const event = `event: text\ndata: ${JSON.stringify({ text })}\n\n`;
									controller.enqueue(encoder.encode(event));
								}
							} catch {
								// Skip malformed JSON
							}
						}
					}
				}

				const doneEvent = `event: done\ndata: ${JSON.stringify({ success: true })}\n\n`;
				controller.enqueue(encoder.encode(doneEvent));
				controller.close();
			} catch (error) {
				console.error('[Inline Edit OpenRouter Error]:', error);
				const errorEvent = `event: error\ndata: ${JSON.stringify({
					message: error instanceof Error ? error.message : 'Edit failed'
				})}\n\n`;
				controller.enqueue(encoder.encode(errorEvent));
				controller.close();
			}
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive'
		}
	});
}
