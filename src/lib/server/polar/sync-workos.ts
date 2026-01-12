import { WorkOS } from "@workos-inc/node";
import { WORKOS_API_KEY } from "$env/static/private";

// Redundant definition to avoid deep import guessing in 'convex/lib/tiers'
export type TierId = "free" | "pro" | "enterprise" | "custom";

const workos = new WorkOS(WORKOS_API_KEY);

/**
 * Sync subscription status to WorkOS user metadata.
 *
 * This ensures that when a user's session is created,
 * the latest subscription tier is available.
 *
 * @param workosId - The WorkOS user ID
 * @param tier - The subscription tier
 * @param status - The subscription status from Polar
 * @param expiresAt - Optional expiry timestamp
 * @param polarCustomerId - Optional Polar customer ID for reference
 */
export async function syncSubscriptionToWorkOS(
  workosId: string,
  tier: TierId,
  status: "active" | "canceled" | "past_due" | "trialing" | "incomplete" | "none",
  expiresAt?: number,
  polarCustomerId?: string
): Promise<void> {
  try {
    await workos.userManagement.updateUser({
      userId: workosId,
      metadata: {
        subscriptionTier: tier,
        subscriptionStatus: status,
        subscriptionExpiresAt: expiresAt?.toString() || "",
        polarCustomerId: polarCustomerId || "",
        // Timestamp for debugging/audit
        subscriptionSyncedAt: Date.now().toString(),
      },
    });

    console.log(
      `[Polar] Synced subscription to WorkOS for user ${workosId}: tier=${tier}, status=${status}`
    );
  } catch (error) {
    console.error(`[Polar] Failed to sync subscription to WorkOS for user ${workosId}:`, error);
    throw error;
  }
}

/**
 * Get subscription info from WorkOS user metadata.
 */
export function getSubscriptionFromWorkOSMetadata(metadata: Record<string, any>): {
  tier: TierId;
  status: string;
  expiresAt?: number;
} {
  return {
    tier: (metadata.subscriptionTier as TierId) || "free",
    status: (metadata.subscriptionStatus as string) || "none",
    expiresAt: metadata.subscriptionExpiresAt ? Number(metadata.subscriptionExpiresAt) : undefined,
  };
}
