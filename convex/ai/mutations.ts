/**
 * ai/mutations.ts - AI Usage Trackers
 * ════════════════════════════════════════════════════════════════════════════
 */
import { zProtectedMutation } from "../lib/core";

/**
 * Increment AI generation count for the current user.
 */
export const incrementGeneration = zProtectedMutation({
  args: {},
  handler: async (ctx) => {
    const user = await ctx.db.get(ctx.user._id);
    if (!user) throw new Error("User not found");

    const currentCount = user.aiGenerationsThisMonth || 0;
    
    // Limit check (dummy 50 for now)
    if (currentCount >= 50 && user.subscriptionTier === "free") {
      return { success: false, message: "Free limit reached" };
    }

    await ctx.db.patch(ctx.user._id, {
      aiGenerationsThisMonth: currentCount + 1,
    });

    return { success: true };
  },
});
