import { redirect } from "@sveltejs/kit";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { PUBLIC_CONVEX_URL } from "$env/static/public";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ locals, url }) => {
  if (!locals.auth?.user) {
    throw redirect(302, "/auth/login");
  }

  const convex = new ConvexHttpClient(PUBLIC_CONVEX_URL);

  // Set auth token for Convex calls
  if (locals.auth.accessToken) {
    convex.setAuth(locals.auth.accessToken);
  }

  // CRITICAL: Call store mutation FIRST to ensure user record exists in Convex
  // This mutation is idempotent - it creates or updates the user based on WorkOS identity
  let onboardingCompleted = false;
  try {
    await convex.mutation(api.users.mutations.store, {});
    
    // NOW fetch user to check onboarding status (user is guaranteed to exist)
    const user = await convex.query(api.users.queries.me, {});
    onboardingCompleted = user?.onboardingCompleted ?? false;
  } catch (err) {
    console.error("[Layout] User sync/check failed:", err);
    // Don't throw - let the page load but assume onboarding is needed
  }

  // Redirect to onboarding if not done and not already there
  if (!onboardingCompleted && !url.pathname.startsWith("/onboarding")) {
    throw redirect(302, "/onboarding");
  }

  return {
    user: locals.auth.user,
    sessionId: locals.auth.sessionId,
    accessToken: locals.auth.accessToken,
  };
};
