import { Polar } from "@polar-sh/sdk";
import { POLAR_ACCESS_TOKEN, POLAR_SERVER } from "$env/static/private";

export const getPolarClient = () => {
  if (!POLAR_ACCESS_TOKEN) {
    throw new Error("POLAR_ACCESS_TOKEN not configured");
  }

  // Auto-detect environment from token prefix if not explicitly set
  // Sandbox tokens start with "polar_sat_" (Sandbox Access Token) implies sandbox
  const isSandboxToken = POLAR_ACCESS_TOKEN.startsWith("polar_sat_");

  const server =
    (POLAR_SERVER as "production" | "sandbox") ||
    (isSandboxToken ? "sandbox" : "production");

  if (server === "sandbox") {
    console.log("[Polar] 🧪 Sandbox Environment Detected");
  }

  return new Polar({
    accessToken: POLAR_ACCESS_TOKEN,
    server,
  });
};
