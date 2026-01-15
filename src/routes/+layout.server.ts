import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ locals }) => {
  // locals.auth is populated by WorkOS AuthKit SDK via authKitHandle()
  return {
    user: locals.user ?? null,
    // session: locals.workosSession ?? null, // This causes serialization error (non-POJO)
    isAuthenticated: !!locals.user,
    accessToken: locals.auth?.accessToken ?? null
  };
};
