/**
 * Access Service
 *
 * Centralized logic for document access control and permission checking.
 * Handles role-based access control (RBAC) for documents.
 */

export type AccessRole = "owner" | "editor" | "viewer";

export interface AccessContext {
  workosId?: string;
  documentOwnerId: string;
  memberRole?: AccessRole;
  guestToken?: string;
  signerAccessToken?: string;
}

export interface AccessResult {
  allowed: boolean;
  role: AccessRole;
  reason?: string;
}

/**
 * Role hierarchy: owner > editor > viewer
 */
const ROLE_HIERARCHY: Record<AccessRole, number> = {
  owner: 3,
  editor: 2,
  viewer: 1,
};

/**
 * Check if a user has sufficient access level.
 */
export function hasAccess(
  context: AccessContext,
  requiredRole: AccessRole
): AccessResult {
  // Owner always has full access
  if (context.workosId && context.workosId === context.documentOwnerId) {
    return { allowed: true, role: "owner" };
  }

  // Check member role
  if (context.memberRole) {
    const userLevel = ROLE_HIERARCHY[context.memberRole];
    const requiredLevel = ROLE_HIERARCHY[requiredRole];

    if (userLevel >= requiredLevel) {
      return { allowed: true, role: context.memberRole };
    }

    return {
      allowed: false,
      role: context.memberRole,
      reason: `Requires ${requiredRole} access, user has ${context.memberRole}`,
    };
  }

  // Signer access (limited to viewing their signing session)
  if (context.signerAccessToken) {
    if (requiredRole === "viewer") {
      return { allowed: true, role: "viewer" };
    }
    return {
      allowed: false,
      role: "viewer",
      reason: "Signers have view-only access",
    };
  }

  // No access
  return {
    allowed: false,
    role: "viewer",
    reason: "No access to this document",
  };
}

/**
 * Check if a user can modify a sealed document.
 * Sealed documents are immutable except for specific operations.
 */
export function canModifySealed(operation: string, isSealed: boolean): boolean {
  if (!isSealed) {
    return true;
  }

  // Operations allowed on sealed documents
  const allowedOnSealed = [
    "void", // Voiding is always allowed
    "addSignature", // Signatures are expected on sealed docs
    "updateSignerStatus", // Status updates during signing
    "logAudit", // Audit logging
  ];

  return allowedOnSealed.includes(operation);
}

/**
 * Determine if a document should be visible to a user in the dashboard.
 */
export function isVisibleInDashboard(context: {
  documentOwnerId: string;
  currentworkosId: string;
  memberRole?: AccessRole;
  kind?: "template" | "envelope";
  isPublic?: boolean;
}): boolean {
  // Owner always sees their documents
  if (context.currentworkosId === context.documentOwnerId) {
    return true;
  }

  // Members with any role can see the document
  if (context.memberRole) {
    return true;
  }

  // Public templates are visible to all
  if (context.kind === "template" && context.isPublic) {
    return true;
  }

  return false;
}

/**
 * Get the effective role for a user on a document.
 */
export function getEffectiveRole(context: {
  documentOwnerId: string;
  currentworkosId: string;
  memberRole?: AccessRole;
}): AccessRole {
  if (context.currentworkosId === context.documentOwnerId) {
    return "owner";
  }

  return context.memberRole || "viewer";
}
