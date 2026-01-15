/**
 * Inline AI Provider Configuration
 *
 * Supports multiple AI providers for inline text editing:
 * - Google Gemini (default)
 * - OpenRouter (supports many free models)
 *
 * Configure via environment variables:
 * - INLINE_AI_PROVIDER: "gemini" | "openrouter" (default: "gemini")
 * - OPENROUTER_API_KEY: Your OpenRouter API key
 * - OPENROUTER_MODEL: Model to use (default: a free model)
 * - GEMINI_API_KEY: Your Google Gemini API key
 */

import { env } from "$env/dynamic/private";

export type InlineAIProvider = "gemini" | "openrouter";

export interface InlineAIConfig {
  provider: InlineAIProvider;
  model: string;
  apiKey: string;
}

// Free models on OpenRouter - December 2025 (fast, high quota, no "thinking")
// Sorted by speed and quota - best options first
export const FREE_OPENROUTER_MODELS = [
  "xiaomi/mimo-v2-flash:free", // FASTEST - MoE model, no reasoning mode
  "mistralai/devstral-small:free", // Fast, optimized for code/editing
  "deepseek/deepseek-chat:free", // Good general purpose
  "nvidia/nemotron-nano-12b-2-vl:free", // Small, efficient, fast
  "z-ai/glm-4.5-air:free", // Lightweight, agent-focused
  "tng/deepseek-r1t2-chimera:free", // 20% faster than previous gen
  "qwen/qwen3-coder-480b-a35b:free", // Good for text editing
] as const;

// Cheap Gemini models (fast, no thinking)
export const CHEAP_GEMINI_MODELS = [
  "gemini-2.0-flash", // Fast, cheap
  "gemini-1.5-flash", // Very fast, very cheap
] as const;

export function getInlineAIConfig(): InlineAIConfig {
  // Default to OpenRouter with free models (faster, no quota issues)
  const provider = (env.INLINE_AI_PROVIDER || "gemini") as InlineAIProvider;

  if (provider === "openrouter") {
    return {
      provider: "openrouter",
      model: env.OPENROUTER_MODEL || FREE_OPENROUTER_MODELS[0],
      apiKey: env.OPENROUTER_API_KEY || "",
    };
  }

  // Default: Gemini
  return {
    provider: "gemini",
    model: env.GEMINI_INLINE_MODEL || CHEAP_GEMINI_MODELS[0],
    apiKey: env.GEMINI_API_KEY || "",
  };
}

/**
 * System prompt for inline text editing
 * Optimized to be short and direct for fast responses
 */
export const INLINE_EDIT_PROMPT =
  "Edit the text per the instruction. Output ONLY the improved text, no explanations.";
