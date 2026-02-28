// convex/glossary/mutations.ts
import { zMutation, zProtectedMutation, z, zid } from "../lib/core";

// Helper mutation to batch insert
export const insertBatch = zMutation({
  args: {
    terms: z.array(
      z.object({
        term: z.string(),
        termLower: z.string().optional(),
        definition: z.string(),
        category: z.string(),
        source: z.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    for (const term of args.terms) {
      await ctx.db.insert("glossaryTerms", {
        ...term,
        termLower: term.termLower || term.term.toLowerCase(),
      });
    }
  },
});

export const addTerm = zProtectedMutation({
  args: {
    term: z.string(),
    definition: z.string(),
    category: z.string(),
  },
  handler: async (ctx, args) => {
    // Check for duplicate
    const existing = await ctx.db
      .query("glossaryTerms")
      .withIndex("by_term", (q) => q.eq("term", args.term))
      .first();

    if (existing) {
      throw new Error("Term already exists");
    }

    await ctx.db.insert("glossaryTerms", {
      term: args.term,
      termLower: args.term.toLowerCase(),
      definition: args.definition,
      category: args.category,
      source: "User",
      workosId: ctx.user._id,
    });
  },
});

/**
 * Update an existing glossary term
 */
export const updateTerm = zProtectedMutation({
  args: {
    id: zid("glossaryTerms"),
    term: z.string(),
    definition: z.string(),
  },
  handler: async (ctx, args) => {
    const existingTerm = await ctx.db.get(args.id);
    if (!existingTerm) {
      throw new Error("Term not found");
    }

    // Optional: Check ownership if workosId exists on term
    // For now, any authenticated user can update

    await ctx.db.patch(args.id, {
      term: args.term,
      termLower: args.term.toLowerCase(),
      definition: args.definition,
    });
  },
});

/**
 * Delete a glossary term
 */
export const deleteTerm = zProtectedMutation({
  args: {
    id: zid("glossaryTerms"),
  },
  handler: async (ctx, args) => {
    const existingTerm = await ctx.db.get(args.id);
    if (!existingTerm) {
      throw new Error("Term not found");
    }

    // Optional: Check ownership
    // if (existingTerm.workosId && existingTerm.workosId !== ctx.user._id) throw new Error("Unauthorized");

    await ctx.db.delete(args.id);
  },
});
