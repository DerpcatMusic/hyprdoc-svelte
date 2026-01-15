import { Polar } from "@polar-sh/sdk";

export const getPolarClient = () => {
  const accessToken = process.env.POLAR_ACCESS_TOKEN;

  if (!accessToken) {
    throw new Error("POLAR_ACCESS_TOKEN not configured");
  }

  // Auto-detect environment from token prefix if not explicitly set
  // Sandbox tokens start with "polar_sat_" (Sandbox Access Token) implies sandbox
  const isSandboxToken = accessToken.startsWith("polar_sat_");

  const server =
    (process.env.POLAR_SERVER as "production" | "sandbox") ||
    (isSandboxToken ? "sandbox" : "production");

  if (server === "sandbox") {
    console.log("[Polar] 🧪 Sandbox Environment Detected");
  }

  return new Polar({
    accessToken,
    server,
  });
};
