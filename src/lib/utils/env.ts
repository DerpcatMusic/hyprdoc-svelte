export const getEnv = (key: string): string | undefined => {
  // For Next.js, use process.env
  if (typeof process !== "undefined" && process.env) {
    return process.env[key];
  }
  // Fallback for Vite or other environments
  try {
    if (import.meta && (import.meta as any).env) {
      return (import.meta as any).env[key];
    }
  } catch {
    // Ignore errors in sandboxed environments
    return undefined;
  }
  return undefined;
};

export const IS_CONVEX_ACTIVE = !!process.env.NEXT_PUBLIC_CONVEX_URL;
