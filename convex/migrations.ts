import { v } from "convex/values";
import { mutation } from "./_generated/server";

/**
 * Migration: Backfill termLower field for existing glossary terms.
 * Run once to populate the normalized search field.
 *
 * Execute via CLI:
 * npx convex run migrations:backfillGlossaryTermLower
 *
 * Run multiple times until "remaining: 0" is returned.
 */
export const backfillGlossaryTermLower = mutation({
  args: {
    batchSize: v.optional(v.number()),
  },
  returns: v.object({
    updated: v.number(),
    remaining: v.number(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    const batchSize = args.batchSize ?? 500;

    // Find terms without termLower (null or undefined)
    const termsToUpdate = await ctx.db
      .query("glossaryTerms")
      .filter((q) => q.eq(q.field("termLower"), undefined))
      .take(batchSize);

    // Update each term with normalized lowercase
    for (const term of termsToUpdate) {
      await ctx.db.patch(term._id, {
        termLower: term.term.toLowerCase(),
      });
    }

    // Count remaining
    const remaining = await ctx.db
      .query("glossaryTerms")
      .filter((q) => q.eq(q.field("termLower"), undefined))
      .take(1);

    const hasMore = remaining.length > 0;

    return {
      updated: termsToUpdate.length,
      remaining: hasMore ? -1 : 0, // -1 means "more to process", 0 means done
      message: hasMore
        ? `Updated ${termsToUpdate.length} terms. Run again to process more.`
        : `Migration complete! Updated ${termsToUpdate.length} terms.`,
    };
  },
});
