// Signing System - Core Mutations
// Event-driven signing workflow with OTP authentication

import { v } from "convex/values";
import { mutation, query } from "./lib/core";
import type { Doc, Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import {
  generateSealHash,
  validateForSealing,
} from "./lib/services/sealing_service";
import {
  generateAccessToken,
  generateOtpCode,
  hashContent,
} from "./lib/crypto";
import { stableStringify } from "./lib/stable_json";
import {
  extractSmartBlocksFromContent,
  normalizeSmartBlockSnapshot,
  type CanonicalSmartBlock,
} from "@hyprdoc/domain-types";

type SignatureDoc = Doc<"signatures">;
function getSignatureAssignmentId(signature: {
  assignmentId?: Id<"signerAssignments">;
  signerId?: Id<"signers">;
}) {
  return signature.assignmentId ? String(signature.assignmentId) : signature.signerId ? String(signature.signerId) : null;
}

async function computeCompletionHash(input: {
  documentId: Id<"documents">;
  documentStatus: string;
  documentVersion: number;
  contentHash: string | undefined;
  sealedVersion: number | undefined;
  session: Doc<"signingSessions">;
  assignments: Doc<"signerAssignments">[];
  signatures: SignatureDoc[];
}) {
  const signerSignatures = input.signatures
    .map((signature) => ({
      assignmentId: getSignatureAssignmentId(signature),
      blockId: signature.blockId,
      signatureType: signature.signatureType,
      signatureHash: signature.signatureHash,
      signedAt: signature.signedAt,
      signedAsName: signature.signedAsName,
    }))
    .sort((a, b) =>
      String(a.blockId).localeCompare(String(b.blockId)) ||
      (a.signedAt - b.signedAt),
    );

  const assignmentStates = input.assignments
    .map((assignment) => ({
      assignmentId: String(assignment._id),
      order: assignment.order,
      status: assignment.status,
      signedAt: assignment.signedAt ?? null,
      partyId: assignment.partyId ?? null,
    }))
    .sort((a, b) =>
      a.order - b.order || a.assignmentId.localeCompare(b.assignmentId),
    );

  const payload = {
    type: "envelope_completion_v1",
    documentId: String(input.documentId),
    status: input.documentStatus,
    version: input.documentVersion,
    contentHash: input.contentHash,
    sealedVersion: input.sealedVersion,
    sessionId: String(input.session._id),
    sessionStatus: input.session.status,
    assignments: assignmentStates,
    signatures: signerSignatures,
  };

  return hashContent(stableStringify(payload));
}

type FieldValueMap = Record<string, string>;

function getDocumentSmartBlocks(document: {
  content: string;
  blocks?: unknown;
}): CanonicalSmartBlock[] {
  const normalized = normalizeSmartBlockSnapshot(document.blocks);
  if (normalized.length > 0) return normalized;
  return extractSmartBlocksFromContent(document.content);
}

function getFieldValueMap(value: unknown): FieldValueMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  const fieldValues: FieldValueMap = {};
  for (const [blockId, rawValue] of Object.entries(
    value as Record<string, unknown>,
  )) {
    if (typeof rawValue === "string") {
      fieldValues[blockId] = rawValue;
      continue;
    }
    if (rawValue === null || rawValue === undefined) continue;
    fieldValues[blockId] = String(rawValue);
  }
  return fieldValues;
}

function getAssignmentOwnedBlocks(
  document: { content: string; blocks?: unknown },
  assignment: { partyId?: string },
) {
  const blocks = getDocumentSmartBlocks(document);
  if (!assignment.partyId) {
    return blocks.filter((block) => block.partyId === null);
  }
  return blocks.filter((block) => block.partyId === assignment.partyId);
}

function isFieldValueComplete(
  block: CanonicalSmartBlock,
  fieldValues: FieldValueMap,
) {
  if (block.blockType !== "text-input") return false;
  const value = fieldValues[block.id];
  return typeof value === "string" && value.trim().length > 0;
}

// ============================================================================
// SIGNING SESSION MUTATIONS
// ============================================================================

/**
 * Create a new signing session for a document
 * Called when user clicks "Send for Signing" in the editor
 */
export const createSigningSession = mutation({
  args: {
    documentId: v.id("documents"),
    signingOrder: v.union(v.literal("parallel"), v.literal("sequential")),
    expiresAt: v.optional(v.number()),
    reminderIntervalHours: v.optional(v.number()),
    settings: v.optional(
      v.object({
        allowDecline: v.optional(v.boolean()),
        allowPrintAndSign: v.optional(v.boolean()),
        requireEmailVerification: v.optional(v.boolean()),
        requirePhoneVerification: v.optional(v.boolean()),
        requireBoth: v.optional(v.boolean()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Get the current user
    const user = await ctx.db
      .query("users")
      .withIndex("by_workos_id", (q) => q.eq("workosId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    // Verify document exists and user owns it
    const document = await ctx.db.get(args.documentId);
    if (!document) throw new Error("Document not found");
    if (document.ownerId !== user._id) throw new Error("Not authorized");
    if (document.kind !== "envelope") {
      throw new Error("Signing sessions can only be created for envelopes");
    }
    if (document.status !== "draft") {
      throw new Error("Only draft envelopes can start signing sessions");
    }

    const existingSessions = await ctx.db
      .query("signingSessions")
      .withIndex("by_document", (q) => q.eq("documentId", args.documentId))
      .collect();
    const hasActiveSession = existingSessions.some(
      (session) =>
        session.status !== "completed" &&
        session.status !== "cancelled" &&
        session.status !== "expired",
    );
    if (hasActiveSession) {
      const reusableSession = existingSessions.find(
        (session) =>
          session.status !== "completed" &&
          session.status !== "cancelled" &&
          session.status !== "expired",
      );
      if (reusableSession) {
        return { sessionId: reusableSession._id, reused: true };
      }
    }

    // Create the signing session
    const sessionId = await ctx.db.insert("signingSessions", {
      documentId: args.documentId,
      status: "draft",
      signingOrder: args.signingOrder,
      expiresAt: args.expiresAt,
      reminderIntervalHours: args.reminderIntervalHours ?? 24,
      initiatedBy: user._id,
      initiatedAt: Date.now(),
      updatedAt: Date.now(),
      settings: args.settings ?? {
        allowDecline: true,
        requireEmailVerification: true,
        requirePhoneVerification: false,
        requireBoth: false,
      },
    });

    await ctx.scheduler.runAfter(0, internal.auditLogs.mutations.log, {
      workosId: user._id,
      actorType: "user",
      documentId: args.documentId,
      resourceType: "document",
      resourceId: String(args.documentId),
      action: "envelope.signing_session_created",
      level: "info",
      metadata: {
        sessionId: String(sessionId),
        signingOrder: args.signingOrder,
        expiresAt: args.expiresAt,
      },
    });

    return { sessionId, reused: false };
  },
});

/**
 * Add a signer to a signing session
 * Maps a party/slot to a real person
 */
export const assignSigner = mutation({
  args: {
    sessionId: v.id("signingSessions"),
    slotId: v.optional(v.id("slots")),
    partyId: v.optional(v.string()),
    email: v.string(),
    phone: v.optional(v.string()),
    phoneCountryCode: v.optional(v.string()),
    legalName: v.string(),
    role: v.string(),
    color: v.optional(v.string()),
    order: v.number(),
    authMethod: v.union(
      v.literal("none"),
      v.literal("email"),
      v.literal("phone"),
      v.literal("both"),
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Verify session exists
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");

    const user = await ctx.db
      .query("users")
      .withIndex("by_workos_id", (q) => q.eq("workosId", identity.subject))
      .first();
    if (!user) throw new Error("User not found");

    const document = await ctx.db.get(session.documentId);
    if (!document) throw new Error("Document not found");
    if (document.ownerId !== user._id) throw new Error("Not authorized");
    if (document.kind !== "envelope")
      throw new Error("Signing assignments require envelope documents");

    const existingAssignments = await ctx.db
      .query("signerAssignments")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
    const existingAssignment = existingAssignments.find((assignment) =>
      args.partyId
        ? assignment.partyId === args.partyId
        : args.slotId
          ? assignment.slotId === args.slotId
          : assignment.order === args.order,
    );

    if (existingAssignment) {
      if (session.status !== "draft") {
        return { assignmentId: existingAssignment._id, reused: true };
      }

      await ctx.db.patch(existingAssignment._id, {
        slotId: args.slotId,
        partyId: args.partyId,
        email: args.email,
        phone: args.phone,
        phoneCountryCode: args.phoneCountryCode,
        legalName: args.legalName,
        role: args.role,
        color: args.color,
        order: args.order,
        authMethod: args.authMethod,
      });

      return { assignmentId: existingAssignment._id, reused: true };
    }

    if (session.status !== "draft") {
      throw new Error("Session is not in draft status");
    }

    // Create the signer assignment
    const assignmentId = await ctx.db.insert("signerAssignments", {
      sessionId: args.sessionId,
      documentId: session.documentId,
      slotId: args.slotId,
      partyId: args.partyId,
      email: args.email,
      phone: args.phone,
      phoneCountryCode: args.phoneCountryCode,
      legalName: args.legalName,
      role: args.role,
      color: args.color,
      order: args.order,
      authMethod: args.authMethod,
      emailVerified: false,
      phoneVerified: false,
      status: "pending",
    });

    await ctx.scheduler.runAfter(0, internal.auditLogs.mutations.log, {
      workosId: user._id,
      actorType: "user",
      documentId: session.documentId,
      resourceType: "document",
      resourceId: String(session.documentId),
      action: "envelope.signer_assigned",
      level: "info",
      metadata: {
        sessionId: String(args.sessionId),
        assignmentId: String(assignmentId),
        slotId: args.slotId ? String(args.slotId) : null,
        partyId: args.partyId ?? null,
        order: args.order,
        authMethod: args.authMethod,
      },
    });

    return { assignmentId, reused: false };
  },
});

/**
 * Send invites to all signers and start the signing session
 */
export const startSigningSession = mutation({
  args: {
    sessionId: v.id("signingSessions"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_workos_id", (q) => q.eq("workosId", identity.subject))
      .first();
    if (!user) throw new Error("User not found");

    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");

    if (session.status !== "draft") {
      if (
        session.status === "pending" ||
        session.status === "in_progress" ||
        session.status === "completed"
      ) {
        const existingAssignments = await ctx.db
          .query("signerAssignments")
          .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
          .collect();
        return {
          success: true,
          signerCount: existingAssignments.length,
          alreadyStarted: true,
        };
      }
      throw new Error("Session cannot be started from current status");
    }

    const document = await ctx.db.get(session.documentId);
    if (!document) throw new Error("Document not found");
    if (document.ownerId !== user._id) throw new Error("Not authorized");
    if (document.kind !== "envelope")
      throw new Error("Only envelopes can be sent for signing");

    const sealingError = validateForSealing(document);
    if (sealingError) throw new Error(sealingError);

    // Get all signer assignments
    const assignments = await ctx.db
      .query("signerAssignments")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    if (assignments.length === 0) {
      throw new Error("No signers assigned");
    }

    // Generate access tokens for each signer
    const now = Date.now();
    const tokenExpiry = now + 7 * 24 * 60 * 60 * 1000; // 7 days

    for (const assignment of assignments) {
      // Generate secure random token (web-compatible)
      const token = generateAccessToken();

      await ctx.db.patch(assignment._id, {
        status: "invited",
        invitedAt: now,
        accessToken: token,
        tokenExpiresAt: tokenExpiry,
      });

      // TODO: Schedule email/SMS sending via Convex action
      // await ctx.scheduler.runAfter(0, api.signing.sendInvite, { assignmentId: assignment._id });
    }

    const contentHash = await generateSealHash({
      documentId: String(document._id),
      title: document.title,
      content: document.content,
      blocks: getDocumentSmartBlocks(document),
      settings: document.settings ?? {},
    });

    await ctx.db.insert("documentVersions", {
      documentId: document._id,
      version: document.version,
      content: document.content,
      blocks: getDocumentSmartBlocks(document),
      parties: document.parties,
      contentHash,
      createdAt: now,
      createdBy: user._id,
    });

    await ctx.db.patch(document._id, {
      status: "pending_signatures",
      contentHash,
      sealedAt: now,
      sealedVersion: document.version,
      updatedAt: now,
    });

    // Update session status
    await ctx.db.patch(args.sessionId, {
      status: "pending",
      updatedAt: now,
      currentSignerIndex: session.signingOrder === "sequential" ? 0 : undefined,
    });

    await ctx.scheduler.runAfter(0, internal.auditLogs.mutations.log, {
      workosId: user._id,
      actorType: "user",
      documentId: document._id,
      resourceType: "document",
      resourceId: String(document._id),
      action: "envelope.sealed_for_signing",
      level: "security",
      metadata: {
        sessionId: String(args.sessionId),
        signerCount: assignments.length,
        signingOrder: session.signingOrder,
        sealedVersion: document.version,
        contentHash,
      },
    });

    return {
      success: true,
      signerCount: assignments.length,
      alreadyStarted: false,
    };
  },
});

/**
 * Record when a signer views the document
 * Called when signer opens the signing link
 */
export const recordSignerView = mutation({
  args: {
    accessToken: v.string(),
    metadata: v.object({
      ipAddress: v.string(),
      userAgent: v.string(),
      deviceFingerprint: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    // Find the assignment by access token
    const assignment = await ctx.db
      .query("signerAssignments")
      .withIndex("by_access_token", (q) =>
        q.eq("accessToken", args.accessToken),
      )
      .first();

    if (!assignment) throw new Error("Invalid access token");
    if (assignment.tokenExpiresAt && assignment.tokenExpiresAt < Date.now()) {
      throw new Error("Access token expired");
    }

    const nextStatus = assignment.authMethod === "none" ? "ready" : "viewed";

    // Update signer status if not already viewed
    if (assignment.status === "invited") {
      await ctx.db.patch(assignment._id, {
        status: nextStatus,
        viewedAt: Date.now(),
        signatureMetadata: args.metadata,
      });

      // Update session to in_progress if this is the first view
      const session = await ctx.db.get(assignment.sessionId);
      if (session && session.status === "pending") {
        await ctx.db.patch(assignment.sessionId, {
          status: "in_progress",
          updatedAt: Date.now(),
        });
      }
    }

    return {
      assignmentId: assignment._id,
      documentId: assignment.documentId,
      legalName: assignment.legalName,
      role: assignment.role,
      authMethod: assignment.authMethod,
      needsEmailVerification:
        !assignment.emailVerified &&
        (assignment.authMethod === "email" || assignment.authMethod === "both"),
      needsPhoneVerification:
        !assignment.phoneVerified &&
        (assignment.authMethod === "phone" || assignment.authMethod === "both"),
    };
  },
});

// ============================================================================
// AUTHENTICATION CHALLENGE MUTATIONS
// ============================================================================

/**
 * Send an OTP challenge to verify signer identity
 */
export const sendAuthChallenge = mutation({
  args: {
    accessToken: v.string(),
    type: v.union(v.literal("email"), v.literal("phone")),
  },
  handler: async (ctx, args) => {
    // Find the assignment
    const assignment = await ctx.db
      .query("signerAssignments")
      .withIndex("by_access_token", (q) =>
        q.eq("accessToken", args.accessToken),
      )
      .first();

    if (!assignment) throw new Error("Invalid access token");

    // Generate cryptographically secure 6-digit OTP
    const code = generateOtpCode();

    const now = Date.now();
    const expiresAt = now + 10 * 60 * 1000; // 10 minutes

    // Create the challenge
    const challengeId = await ctx.db.insert("authChallenges", {
      assignmentId: assignment._id,
      type: args.type,
      code,
      sentTo: args.type === "email" ? assignment.email : assignment.phone!,
      sentAt: now,
      expiresAt,
      attempts: 0,
      maxAttempts: 5,
      status: "pending",
    });

    // Update signer status
    await ctx.db.patch(assignment._id, {
      status: "authenticating",
    });

    // TODO: Schedule email/SMS sending via Convex action
    // await ctx.scheduler.runAfter(0, api.signing.sendOTP, {
    //   challengeId,
    //   type: args.type,
    //   to: args.type === 'email' ? assignment.email : assignment.phone!,
    //   code
    // });

    return {
      challengeId,
      sentTo:
        args.type === "email"
          ? maskEmail(assignment.email)
          : maskPhone(assignment.phone!),
      expiresAt,
    };
  },
});

/**
 * Verify an OTP code
 */
export const verifyAuthChallenge = mutation({
  args: {
    accessToken: v.string(),
    challengeId: v.id("authChallenges"),
    code: v.string(),
    metadata: v.optional(
      v.object({
        ipAddress: v.optional(v.string()),
        userAgent: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    // Find the assignment
    const assignment = await ctx.db
      .query("signerAssignments")
      .withIndex("by_access_token", (q) =>
        q.eq("accessToken", args.accessToken),
      )
      .first();

    if (!assignment) throw new Error("Invalid access token");

    // Get the challenge
    const challenge = await ctx.db.get(args.challengeId);
    if (!challenge) throw new Error("Challenge not found");
    if (challenge.assignmentId !== assignment._id)
      throw new Error("Challenge mismatch");
    if (challenge.status !== "pending")
      throw new Error("Challenge already processed");
    if (challenge.expiresAt < Date.now()) {
      await ctx.db.patch(args.challengeId, { status: "expired" });
      throw new Error("Challenge expired");
    }

    // Check attempts
    if (challenge.attempts >= challenge.maxAttempts) {
      await ctx.db.patch(args.challengeId, { status: "failed" });
      throw new Error("Maximum attempts exceeded");
    }

    // Verify code
    if (challenge.code !== args.code) {
      await ctx.db.patch(args.challengeId, {
        attempts: challenge.attempts + 1,
        ipAddress: args.metadata?.ipAddress,
        userAgent: args.metadata?.userAgent,
      });
      throw new Error("Invalid code");
    }

    // Success! Mark as verified
    const now = Date.now();
    await ctx.db.patch(args.challengeId, {
      status: "verified",
      verifiedAt: now,
      ipAddress: args.metadata?.ipAddress,
      userAgent: args.metadata?.userAgent,
    });

    // Update signer verification status
    if (challenge.type === "email") {
      await ctx.db.patch(assignment._id, {
        emailVerified: true,
        emailVerifiedAt: now,
      });
    } else {
      await ctx.db.patch(assignment._id, {
        phoneVerified: true,
        phoneVerifiedAt: now,
      });
    }

    // Check if signer is fully verified
    const updatedAssignment = await ctx.db.get(assignment._id);
    if (!updatedAssignment) throw new Error("Assignment not found");

    const isFullyVerified =
      (updatedAssignment.authMethod === "email" &&
        updatedAssignment.emailVerified) ||
      (updatedAssignment.authMethod === "phone" &&
        updatedAssignment.phoneVerified) ||
      (updatedAssignment.authMethod === "both" &&
        updatedAssignment.emailVerified &&
        updatedAssignment.phoneVerified);

    if (isFullyVerified) {
      await ctx.db.patch(assignment._id, {
        status: "ready",
      });
    }

    return {
      verified: true,
      isFullyVerified,
      needsAdditionalVerification: !isFullyVerified,
    };
  },
});

// ============================================================================
// SIGNATURE RECORDING
// ============================================================================

/**
 * Persist a signer-provided smart-block field value.
 */
export const saveFieldValue = mutation({
  args: {
    accessToken: v.string(),
    blockId: v.string(),
    value: v.string(),
  },
  handler: async (ctx, args) => {
    const assignment = await ctx.db
      .query("signerAssignments")
      .withIndex("by_access_token", (q) =>
        q.eq("accessToken", args.accessToken),
      )
      .first();

    if (!assignment) throw new Error("Invalid access token");
    if (assignment.status !== "ready" && assignment.status !== "signing") {
      throw new Error("Signer is not ready to submit field values");
    }

    const document = await ctx.db.get(assignment.documentId);
    if (!document) throw new Error("Document not found");

    const targetBlock = getAssignmentOwnedBlocks(document, assignment).find(
      (block) => block.id === args.blockId,
    );
    if (!targetBlock) throw new Error("Block is not assigned to this signer");
    if (targetBlock.blockType !== "text-input") {
      throw new Error("Block does not accept text input values");
    }

    const nextFieldValues = {
      ...getFieldValueMap(assignment.fieldValues),
      [args.blockId]: args.value,
    };

    await ctx.db.patch(assignment._id, {
      fieldValues: nextFieldValues,
      fieldValuesUpdatedAt: Date.now(),
    });

    return { blockId: args.blockId, stored: true };
  },
});

/**
 * Record a signature from a verified signer
 */
export const recordSignature = mutation({
  args: {
    accessToken: v.string(),
    blockId: v.string(),
    signatureType: v.union(
      v.literal("draw"),
      v.literal("type"),
      v.literal("upload"),
    ),
    signatureData: v.string(), // Base64 or text
    metadata: v.object({
      ipAddress: v.string(),
      userAgent: v.string(),
      deviceFingerprint: v.optional(v.string()),
      geolocation: v.optional(
        v.object({
          country: v.string(),
          region: v.string(),
          city: v.string(),
        }),
      ),
    }),
  },
  handler: async (ctx, args) => {
    // Find the assignment
    const assignment = await ctx.db
      .query("signerAssignments")
      .withIndex("by_access_token", (q) =>
        q.eq("accessToken", args.accessToken),
      )
      .first();

    if (!assignment) throw new Error("Invalid access token");
    if (assignment.status !== "ready" && assignment.status !== "signing") {
      throw new Error("Signer is not verified or already completed");
    }

    // Get document
    const document = await ctx.db.get(assignment.documentId);
    if (!document) throw new Error("Document not found");
    const targetBlock = getAssignmentOwnedBlocks(document, assignment).find(
      (block) => block.id === args.blockId,
    );
    if (!targetBlock) throw new Error("Block is not assigned to this signer");
    if (targetBlock.blockType !== "signature") {
      throw new Error("Block is not a signature field");
    }

    const existingSignatures = await ctx.db
      .query("signatures")
      .withIndex("by_document", (q) =>
        q.eq("documentId", assignment.documentId),
      )
      .collect();
    const existingSignature = existingSignatures.find(
      (signature) =>
        getSignatureAssignmentId(signature) === String(assignment._id) &&
        signature.blockId === args.blockId,
    );
    if (existingSignature) {
      throw new Error("Signature already recorded for this block");
    }

    // Hash signature payload for deterministic integrity verification
    const signatureHash = await hashContent(
      JSON.stringify({
        signatureData: args.signatureData,
        signerName: assignment.legalName,
        blockId: args.blockId,
      }),
    );

    const now = Date.now();

    // Create signature record
    const signatureId = await ctx.db.insert("signatures", {
      documentId: assignment.documentId,
      assignmentId: assignment._id,
      signerId: undefined,
      blockId: args.blockId,
      signatureType: args.signatureType,
      signatureData: args.signatureData,
      signatureHash,
      signedAsName: assignment.legalName,
      signedAt: now,
      ipAddress: args.metadata.ipAddress,
      userAgent: args.metadata.userAgent,
      geoLocation: args.metadata.geolocation
        ? `${args.metadata.geolocation.city}, ${args.metadata.geolocation.region}, ${args.metadata.geolocation.country}`
        : undefined,
      emailVerificationHash: assignment.emailVerified ? "verified" : "",
      phoneVerificationHash: assignment.phoneVerified ? "verified" : "",
    });

    // Update signer status to signing (for first signature)
    if (assignment.status === "ready") {
      await ctx.db.patch(assignment._id, {
        status: "signing",
        signatureMetadata: args.metadata,
      });
    }

    await ctx.scheduler.runAfter(0, internal.auditLogs.mutations.log, {
      actorType: "member",
      documentId: assignment.documentId,
      resourceType: "document",
      resourceId: String(assignment.documentId),
      action: "signature_placed",
      level: "info",
      ipAddress: args.metadata.ipAddress,
      userAgent: args.metadata.userAgent,
      metadata: {
        assignmentId: String(assignment._id),
        signerName: assignment.legalName,
        blockId: args.blockId,
        signatureType: args.signatureType,
        signatureHash,
        geoLocation: args.metadata.geolocation
          ? `${args.metadata.geolocation.city}, ${args.metadata.geolocation.region}, ${args.metadata.geolocation.country}`
          : undefined,
      },
    });

    return { signatureId };
  },
});

/**
 * Complete signing for a signer (all required blocks signed)
 */
export const completeSignerSession = mutation({
  args: {
    accessToken: v.string(),
  },
  handler: async (ctx, args) => {
    // Find the assignment
    const assignment = await ctx.db
      .query("signerAssignments")
      .withIndex("by_access_token", (q) =>
        q.eq("accessToken", args.accessToken),
      )
      .first();

    if (!assignment) throw new Error("Invalid access token");
    if (assignment.status !== "signing") {
      throw new Error("Signer has not started signing");
    }

    const document = await ctx.db.get(assignment.documentId);
    if (!document) throw new Error("Document not found");
    const requiredBlocks = getAssignmentOwnedBlocks(
      document,
      assignment,
    ).filter((block) => block.required);
    const fieldValues = getFieldValueMap(assignment.fieldValues);
    const signatures = await ctx.db
      .query("signatures")
      .withIndex("by_document", (q) =>
        q.eq("documentId", assignment.documentId),
      )
      .collect();
    const signerSignatureBlockIds = new Set(
      signatures
        .filter(
          (signature) =>
            getSignatureAssignmentId(signature) === String(assignment._id),
        )
        .map((signature) => signature.blockId),
    );

    const missingBlocks = requiredBlocks.filter((block) => {
      if (block.blockType === "signature") {
        return !signerSignatureBlockIds.has(block.id);
      }
      if (block.blockType === "text-input") {
        return !isFieldValueComplete(block, fieldValues);
      }
      return true;
    });

    if (missingBlocks.length > 0) {
      throw new Error(
        `Required smart blocks are incomplete: ${missingBlocks
          .map((block) => block.label)
          .join(", ")}`,
      );
    }

    const now = Date.now();

    // Mark signer as complete
    await ctx.db.patch(assignment._id, {
      status: "signed",
      signedAt: now,
    });

    await ctx.scheduler.runAfter(0, internal.auditLogs.mutations.log, {
      actorType: "member",
      documentId: assignment.documentId,
      resourceType: "document",
      resourceId: String(assignment.documentId),
      action: "envelope.signer_completed",
      level: "info",
      metadata: {
        sessionId: String(assignment.sessionId),
        assignmentId: String(assignment._id),
        signerName: assignment.legalName,
        signedAt: now,
      },
    });

    // Check if all signers are complete
    const session = await ctx.db.get(assignment.sessionId);
    if (!session) throw new Error("Session not found");

    const allAssignments = await ctx.db
      .query("signerAssignments")
      .withIndex("by_session", (q) => q.eq("sessionId", assignment.sessionId))
      .collect();

    if (session.status === "completed") {
      return {
        completed: true,
        sessionStatus: "completed",
      };
    }
    if (session.status === "cancelled" || session.status === "expired") {
      throw new Error("Session is no longer active");
    }

    const assignmentSignatureSet = new Map<string, Doc<"signatures">[]>();
    for (const signature of signatures) {
      const assignmentKey = getSignatureAssignmentId(signature);
      if (!assignmentKey) continue;
      const current = assignmentSignatureSet.get(assignmentKey);
      if (current) {
        current.push(signature);
      } else {
        assignmentSignatureSet.set(assignmentKey, [signature]);
      }
    }

    const allComplete = allAssignments.every((a) =>
      a._id === assignment._id
        ? true
        : a.status === "signed" || a.status === "declined",
    );

    if (allComplete) {
      const completionHash = await computeCompletionHash({
        documentId: assignment.documentId,
        documentStatus: "completed",
        documentVersion: document.version,
        contentHash: document.contentHash,
        sealedVersion: document.sealedVersion,
        session: {
          ...session,
          status: "completed",
        },
        assignments: allAssignments,
        signatures,
      });

      // Complete the session
      await ctx.db.patch(assignment.sessionId, {
        status: "completed",
        completedAt: now,
        updatedAt: now,
        completedHash: completionHash,
      });

      // Update document status
      await ctx.db.patch(assignment.documentId, {
        status: "completed",
        completedAt: now,
        updatedAt: now,
        completedHash: completionHash,
      });

      await ctx.scheduler.runAfter(0, internal.auditLogs.mutations.log, {
        actorType: "system",
        documentId: assignment.documentId,
        resourceType: "document",
        resourceId: String(assignment.documentId),
        action: "envelope.completed",
        level: "security",
        metadata: {
          sessionId: String(assignment.sessionId),
          completedAt: now,
          totalSigners: allAssignments.length,
          completionHash,
          assignmentSignatureCounts: Object.fromEntries(
            allAssignments.map((item) => [
              String(item._id),
              (assignmentSignatureSet.get(String(item._id)) ?? []).length,
            ]),
          ),
        },
      });

      // TODO: Generate certificate of completion
      // await ctx.scheduler.runAfter(0, api.signing.generateCertificate, { sessionId: assignment.sessionId });
    } else if (session.signingOrder === "sequential") {
      // Move to next signer
      const nextIndex = (session.currentSignerIndex ?? 0) + 1;
      await ctx.db.patch(assignment.sessionId, {
        currentSignerIndex: nextIndex,
        updatedAt: now,
      });

      // TODO: Send invite to next signer
      // const nextSigner = allAssignments.find(a => a.order === nextIndex);
      // if (nextSigner) {
      //   await ctx.scheduler.runAfter(0, api.signing.sendInvite, { assignmentId: nextSigner._id });
      // }
    }

    return {
      completed: allComplete,
      sessionStatus: allComplete ? "completed" : session.status,
    };
  },
});

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get signing session status
 */
export const getSigningSession = query({
  args: {
    sessionId: v.id("signingSessions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return null;

    const assignments = await ctx.db
      .query("signerAssignments")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    return {
      ...session,
      signers: assignments.map((a) => ({
        id: a._id,
        legalName: a.legalName,
        email: maskEmail(a.email),
        role: a.role,
        status: a.status,
        signedAt: a.signedAt,
      })),
    };
  },
});

/**
 * Get signer view data (for signing portal)
 */
export const getSignerView = query({
  args: {
    accessToken: v.string(),
  },
  handler: async (ctx, args) => {
    const assignment = await ctx.db
      .query("signerAssignments")
      .withIndex("by_access_token", (q) =>
        q.eq("accessToken", args.accessToken),
      )
      .first();

    if (!assignment) return null;
    if (assignment.tokenExpiresAt && assignment.tokenExpiresAt < Date.now()) {
      return { error: "expired" };
    }

    const document = await ctx.db.get(assignment.documentId);
    if (!document) return null;

    const session = await ctx.db.get(assignment.sessionId);
    if (!session) return null;

    const maskedEmail = maskEmail(assignment.email);
    const maskedPhone = assignment.phone
      ? maskPhone(assignment.phone)
      : undefined;
    const assignedBlocks = getAssignmentOwnedBlocks(document, assignment);
    const fieldValues = getFieldValueMap(assignment.fieldValues);
    const requiresEmailVerification =
      assignment.authMethod === "email" || assignment.authMethod === "both";
    const requiresPhoneVerification =
      assignment.authMethod === "phone" || assignment.authMethod === "both";

    return {
      assignmentId: assignment._id,
      documentId: assignment.documentId,
      documentTitle: document.title,
      documentContent:
        assignment.status === "ready" ||
        assignment.status === "signing" ||
        assignment.status === "viewed"
          ? document.content
          : undefined,
      signerName: assignment.legalName,
      partyName: assignment.role,
      partyColor: assignment.color ?? "#3b82f6",
      status: assignment.status,
      emailVerified: assignment.emailVerified,
      phoneVerified: assignment.phoneVerified,
      maskedEmail,
      maskedPhone,
      assignedBlocks,
      fieldValues,
      settings: {
        requireEmailVerification: requiresEmailVerification,
        requirePhoneVerification: requiresPhoneVerification,
        requireBoth: assignment.authMethod === "both",
      },

      signer: {
        legalName: assignment.legalName,
        role: assignment.role,
        status: assignment.status,
        emailVerified: assignment.emailVerified,
        phoneVerified: assignment.phoneVerified,
        authMethod: assignment.authMethod,
      },
      document: {
        id: document._id,
        title: document.title,
        content:
          assignment.status === "ready" || assignment.status === "signing"
            ? document.content
            : undefined,
      },
      session: {
        status: session.status,
        signingOrder: session.signingOrder,
      },
    };
  },
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local[0]}${"*".repeat(local.length - 2)}${local[local.length - 1]}@${domain}`;
}

function maskPhone(phone: string): string {
  if (phone.length <= 4) return "****";
  return `****${phone.slice(-4)}`;
}
