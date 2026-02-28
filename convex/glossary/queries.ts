// convex/glossary/queries.ts
import { zQuery, z } from "../lib/core";

export const checkIfSeeded = zQuery({
  args: {},
  handler: async (ctx) => {
    const first = await ctx.db
      .query("glossaryTerms")
      .withIndex("by_term")
      .first();
    return !!first;
  },
});

// Main query to get terms (used by the editor extension)
export const listTerms = zQuery({
  args: {
    limit: z.number().optional(),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 1000;
    // For now, return all or a large subset.
    // Optimization: In a real app we might only need terms, not definitions for the highlighter regex
    return await ctx.db.query("glossaryTerms").take(limit);
  },
});

/**
 * OPTIMIZED QUERY: Lightweight Index
 * Returns only the terms, minimizing payload size for initial load.
 */
export const listTermsIndex = zQuery({
  args: {
    limit: z.number().optional(),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 2000;
    const terms = await ctx.db.query("glossaryTerms").take(limit);
    // Explicitly map to just strings to save bandwidth
    return terms.map((t) => t.term);
  },
});

/**
 * OPTIMIZED QUERY: Detail on Demand
 * Fetches the full definition only when needed (e.g., hover).
 */
export const getTerm = zQuery({
  args: {
    term: z.string(),
  },
  handler: async (ctx, args) => {
    // Exact match lookup via index
    const term = await ctx.db
      .query("glossaryTerms")
      .withIndex("by_term", (q) => q.eq("term", args.term)) // Requires exact case match currently
      .first();

    // Fallback: Try case-insensitive scan if exact match fails?
    // Doing a scan is expensive. For now, strict match.
    // If we wanted case-insensitive, we'd store a normalized `search_term` field.
    return term;
  },
});

// Search for the Sidebar - Optimized with index
export const search = zQuery({
  args: {
    query: z.string(),
  },
  handler: async (ctx, args) => {
    if (!args.query) {
      // No search query - return first 50 terms
      return await ctx.db.query("glossaryTerms").take(50);
    }

    const queryLower = args.query.toLowerCase();

    // Use indexed prefix search on termLower field
    // This is O(log n) instead of O(n) full table scan
    const results = await ctx.db
      .query("glossaryTerms")
      .withIndex("by_term_lower", (q) => q.gte("termLower", queryLower))
      .take(200); // Take a reasonable batch to filter

    // Filter for actual matches (prefix or contains)
    return results
      .filter(
        (t) =>
          t.termLower?.includes(queryLower) ||
          t.term.toLowerCase().includes(queryLower)
      )
      .slice(0, 50);
  },
});
