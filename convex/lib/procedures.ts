import { mutation, query, type MutationCtx, type QueryCtx } from "../_generated/server";
import { type Infer, type Validator } from "convex/values";
import { requireAuth } from "./auth";


type AuthenticatedMutationCtx = MutationCtx & { user: Awaited<ReturnType<typeof requireAuth>> };
type AuthenticatedQueryCtx = QueryCtx & { user: Awaited<ReturnType<typeof requireAuth>> };

/**
 * Validated and Authenticated Mutation Wrapper.
 */
export function authenticatedMutation<Args extends Record<string, any>, Return>(config: {
  args: Args;
  handler: (
    ctx: AuthenticatedMutationCtx,
    args: any
  ) => Promise<Return>;
}) {
  return mutation({
    args: config.args,
    handler: async (ctx: MutationCtx, args: any): Promise<Return> => {
      const user = await requireAuth(ctx);
      return config.handler({ ...ctx, user }, args);
    }
  });
}

/**
 * Validated and Authenticated Query Wrapper.
 */
export function authenticatedQuery<Args extends Record<string, any>, Return>(config: {
  args: Args;
  handler: (
    ctx: AuthenticatedQueryCtx,
    args: any
  ) => Promise<Return>;
}) {
  return query({
    args: config.args,
    handler: async (ctx: QueryCtx, args: any): Promise<Return> => {
      const user = await requireAuth(ctx);
      return config.handler({ ...ctx, user }, args);
    }
  });
}
