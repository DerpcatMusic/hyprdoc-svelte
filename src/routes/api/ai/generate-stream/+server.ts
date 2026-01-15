/**
 * AI Document Generation Stream API
 *
 * Streams AI-generated editor commands to the frontend via Server-Sent Events (SSE).
 * Uses Gemini function calling to let the AI "operate" the editor.
 *
 * SvelteKit implementation with WorkOS auth.
 */

import { FunctionCallingMode, GoogleGenerativeAI } from "@google/generative-ai";
import { json, type RequestHandler } from "@sveltejs/kit";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { env } from "$env/dynamic/private";
import { PUBLIC_CONVEX_URL } from "$env/static/public";
import {
  DOCUMENT_GENERATION_SYSTEM_PROMPT,
  EDITOR_TOOLS,
} from "$lib/ai/editor-tools";

// Initialize clients
// Initializers
const getGenAI = () => new GoogleGenerativeAI(env.GEMINI_API_KEY || "");
const getConvex = () => new ConvexHttpClient(PUBLIC_CONVEX_URL);

export const POST: RequestHandler = async ({ request, locals }) => {
  // 1. Authenticate via WorkOS AuthKit SDK
  const auth = locals.auth;
  const convex = getConvex();
  if (!auth?.user) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse request
  const body = await request.json();
  const { prompt, genre, category, slots } = body;

  if (!prompt) {
    return json({ error: "Missing prompt" }, { status: 400 });
  }

  // 3. RAG: Search for relevant templates
  let ragContext = "";
  try {
    console.log(`[RAG] Searching for context: "${prompt}"...`);

    // Authenticate Convex with access token
    if (auth.accessToken) {
      convex.setAuth(auth.accessToken);
    }

    const templates = await convex.action(api.ai.templates.searchTemplates, {
      query: prompt,
      genre,
      category,
      limit: 2,
    });

    // 4. Check Quota & Decrement
    try {
      const quotaResult = await convex.mutation(
        api.ai.mutations.incrementGeneration,
        {}
      );
      if (!quotaResult.success) {
        return json(
          {
            error: "Quota Exceeded",
            message:
              "You have reached your free generation limit for this month.",
          },
          { status: 403 }
        );
      }
    } catch (error) {
      console.error("[AI Quota] Failed to check quota:", error);
      return json({ error: "Failed to verify AI quota" }, { status: 500 });
    }

    if (templates && templates.length > 0) {
      ragContext =
        "\n\n### LEGAL PRECEDENTS (STRICTLY ADHERE TO THESE CLAUSES):\n" +
        templates
          .map(
            (t: { title: string; content: string }) =>
              `#### SOURCE: ${t.title}\n${t.content}`
          )
          .join("\n\n");
      console.log(`[RAG] Found ${templates.length} templates.`);
    }
  } catch (error) {
    console.error("[RAG] Failed to retrieve templates:", error);
    // Continue without context rather than failing
  }

  // 5. Build the full prompt
  let context = `Genre: ${genre || "general"}\nDocument Type: ${category || "document"}\n`;

  // Inject Party Context
  if (slots && Array.isArray(slots) && slots.length > 0) {
    const slotList = slots
      .map((p: { name: string; id: string }) => `- "${p.name}" (ID: ${p.id})`)
      .join("\n");
    context += `\nAvailable Parties (Assign these precise names to blocks):\n${slotList}\n`;
  }

  // Inject RAG Context
  if (ragContext) {
    context += ragContext;
  }

  const userPrompt = `
${context}

User Request:
${prompt}

Generate the document now by calling the appropriate tools.
`;

  // 6. Create SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const genAI = getGenAI();
        // Initialize model with function calling
        const model = genAI.getGenerativeModel({
          model: "gemini-2.0-flash",
          tools: [{ functionDeclarations: EDITOR_TOOLS }],
          toolConfig: {
            functionCallingConfig: {
              mode: FunctionCallingMode.AUTO,
            },
          },
        });

        // Generate with streaming
        const result = await model.generateContentStream({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `${DOCUMENT_GENERATION_SYSTEM_PROMPT}\n\n${userPrompt}`,
                },
              ],
            },
          ],
        });

        let commandCount = 0;

        // Process streaming response
        for await (const chunk of result.stream) {
          const candidate = chunk.candidates?.[0];
          if (!candidate?.content?.parts) {
            continue;
          }

          for (const part of candidate.content.parts) {
            // Check for function calls
            if (part.functionCall) {
              const { name, args } = part.functionCall;

              // Emit SSE command event
              const event = `event: command\ndata: ${JSON.stringify({ name, args })}\n\n`;
              controller.enqueue(encoder.encode(event));
              commandCount++;
            }

            // Check for text (might happen if AI explains something)
            if (part.text) {
              console.log("[AI Text]:", part.text.substring(0, 100));
            }
          }
        }

        // Emit done event
        const doneEvent = `event: done\ndata: ${JSON.stringify({ success: true, commandCount })}\n\n`;
        controller.enqueue(encoder.encode(doneEvent));
        controller.close();
      } catch (error) {
        console.error("[AI Stream Error]:", error);
        const errorEvent = `event: error\ndata: ${JSON.stringify({
          message: error instanceof Error ? error.message : "Generation failed",
        })}\n\n`;
        controller.enqueue(encoder.encode(errorEvent));
        controller.close();
      }
    },
  });

  // 7. Return SSE response
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
};

// GET handler for EventSource (browsers use GET for SSE)
export const GET: RequestHandler = async ({ url, locals, request }) => {
  const prompt = url.searchParams.get("prompt");
  const genre = url.searchParams.get("genre");
  const category = url.searchParams.get("category");

  if (!prompt) {
    return json({ error: "Missing prompt" }, { status: 400 });
  }

  // Create a new request with the POST body
  const postRequest = new Request(request.url, {
    method: "POST",
    headers: request.headers,
    body: JSON.stringify({ prompt, genre, category }),
  });

  // Manually call POST handler logic
  return POST({
    request: postRequest,
    locals,
    url,
    params: {},
    cookies: {} as any,
    fetch,
    getClientAddress: () => "",
    isDataRequest: false,
    isSubRequest: false,
    platform: undefined,
    route: { id: "" },
    setHeaders: () => {},
  } as any);
};
