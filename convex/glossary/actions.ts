// convex/glossary/actions.ts
import { api } from "../_generated/api";
import { zAction } from "../lib/core";

// Seed action to populate Black's Law Dictionary
export const seedBlacksLawDictionary = zAction({
  args: {},
  handler: async (ctx) => {
    try {
      // Check if already seeded to avoid duplicates
      const existing = await ctx.runQuery(
        api.glossary.queries.checkIfSeeded,
        {}
      );
      if (existing) {
        console.log("Dictionary already seeded.");
        return { success: true, message: "Already seeded" };
      }

      console.log("Fetching dictionary...");
      const response = await fetch(
        "https://gist.githubusercontent.com/medelman17/55bf480caafbfcc6e9f9d22c273cf2c4/raw/blacks-dictionary.jsonl"
      );

      if (!response.ok) {
        throw new Error("Failed to fetch dictionary");
      }

      const text = await response.text();
      const lines = text.split("\n").filter((line) => line.trim() !== "");

      console.log(`Found ${lines.length} terms. Inserting...`);

      // Batch insert to avoid hitting limits
      const BATCH_SIZE = 100;
      let batch = [];

      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          // JSONL structure: { "term": "ABET", "definition": "..." }
          if (entry.term && entry.definition) {
            batch.push({
              term: entry.term,
              termLower: entry.term.toLowerCase(), // Normalized for efficient search
              definition: entry.definition,
              category: "Legal",
              source: "Black's Law Dictionary",
            });
          }
        } catch {
          console.warn("Skipping invalid line:", line);
        }

        if (batch.length >= BATCH_SIZE) {
          await ctx.runMutation(api.glossary.mutations.insertBatch, {
            terms: batch,
          });
          batch = [];
        }
      }

      if (batch.length > 0) {
        await ctx.runMutation(api.glossary.mutations.insertBatch, {
          terms: batch,
        });
      }

      return { success: true, count: lines.length };
    } catch (error: any) {
      console.error("Seeding failed:", error);
      return { success: false, error: error.message };
    }
  },
});
