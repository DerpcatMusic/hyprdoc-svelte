import {
  type CanonicalSmartBlock,
  deriveLiveBlockPolicy,
  extractSmartBlocksFromContent,
  normalizeSmartBlockSnapshot,
} from "@hyprdoc/domain-types";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { z, zid, zProtectedQuery } from "@/convex/lib/core";
import { hashContent } from "@/convex/lib/crypto";
import { getDocumentWithVersions } from "@/convex/lib/relationships";
import { batchLoadUsers } from "@/convex/lib/services/batch_loader";
import {
  isDocumentLocked,
  isDocumentSealed,
} from "@/convex/lib/services/sealing_service";
import { stableStringify } from "@/convex/lib/stable_json";

const DEFAULT_AUDIT_LOG_LIMIT = 12;
const DEFAULT_LIVE_EVENT_LIMIT = 12;
const DEFAULT_LINEAGE_EVENT_LIMIT = 12;
const DEFAULT_VERSION_LIMIT = 10;
const MAX_LIMIT = 50;
const BLOCK_STALE_AFTER_MS = 1000 * 60 * 10;

type AssignmentDoc = Doc<"signerAssignments">;
type SignatureDoc = Doc<"signatures">;
type UserMap = Map<string, Doc<"users">>;

function clampLimit(value: number | undefined, fallback: number) {
  if (value === undefined || Number.isNaN(value)) {
    return fallback;
  }
  return Math.min(Math.max(Math.floor(value), 1), MAX_LIMIT);
}

function asArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function summarizeUser(userId: Id<"users"> | undefined, usersById: UserMap) {
  if (!userId) {
    return null;
  }
  const user = usersById.get(String(userId));
  if (!user) {
    return { id: userId, name: null, email: null };
  }
  return {
    id: user._id,
    name: user.name ?? null,
    email: user.email,
  };
}

function summarizeSignature(signature: SignatureDoc) {
  return {
    id: signature._id,
    blockId: signature.blockId,
    signatureType: signature.signatureType,
    signatureHash: signature.signatureHash,
    signedAsName: signature.signedAsName,
    signedAt: signature.signedAt,
    pdfPlacement:
      signature.pdfPage === undefined
        ? null
        : {
            page: signature.pdfPage,
            x: signature.pdfX ?? null,
            y: signature.pdfY ?? null,
            width: signature.pdfWidth ?? null,
            height: signature.pdfHeight ?? null,
          },
    evidence: {
      ipAddress: signature.ipAddress,
      userAgent: signature.userAgent,
      geoLocation: signature.geoLocation ?? null,
      emailVerificationHash: signature.emailVerificationHash,
      phoneVerificationHash: signature.phoneVerificationHash,
    },
  };
}

function summarizeAssignment(
  assignment: AssignmentDoc,
  slot: Doc<"slots"> | null,
  signatures: SignatureDoc[]
) {
  return {
    id: assignment._id,
    partyId: assignment.partyId ?? null,
    status: assignment.status,
    order: assignment.order,
    email: assignment.email,
    phone: assignment.phone ?? null,
    phoneCountryCode: assignment.phoneCountryCode ?? null,
    legalName: assignment.legalName,
    role: assignment.role,
    color: assignment.color ?? null,
    authMethod: assignment.authMethod,
    emailVerified: assignment.emailVerified,
    phoneVerified: assignment.phoneVerified,
    invitedAt: assignment.invitedAt ?? null,
    viewedAt: assignment.viewedAt ?? null,
    signedAt: assignment.signedAt ?? null,
    declinedAt: assignment.declinedAt ?? null,
    declineReason: assignment.declineReason ?? null,
    signatureMetadata: assignment.signatureMetadata ?? null,
    fieldValues: asRecord(assignment.fieldValues) ?? {},
    fieldValuesUpdatedAt: assignment.fieldValuesUpdatedAt ?? null,
    slot: slot
      ? {
          id: slot._id,
          name: slot.name,
          role: slot.role,
          color: slot.color,
          order: slot.order,
        }
      : null,
    signatureCount: signatures.length,
    signatures: signatures
      .sort((a, b) => b.signedAt - a.signedAt)
      .map(summarizeSignature),
  };
}

function getSignatureAssignmentId(signature: {
  assignmentId?: string;
  signerId?: string;
}) {
  return signature.assignmentId ?? signature.signerId ?? null;
}

function getLiveBlockMatch(
  event: Doc<"liveContractEvents">,
  blockIds: Set<string>
): { blockId: string; matchedBy: string } | null {
  const payload = asRecord(event.payload);
  if (!payload) {
    return null;
  }

  if (typeof payload.blockId === "string" && blockIds.has(payload.blockId)) {
    return { blockId: payload.blockId, matchedBy: "blockId" };
  }
  if (typeof payload.key === "string" && blockIds.has(payload.key)) {
    return { blockId: payload.key, matchedBy: "signalKey" };
  }

  const metadata = asRecord(payload.metadata);
  if (
    metadata &&
    typeof metadata.blockId === "string" &&
    blockIds.has(metadata.blockId)
  ) {
    return { blockId: metadata.blockId, matchedBy: "metadata.blockId" };
  }

  return null;
}

function summarizeCurrentBlock(input: {
  block: CanonicalSmartBlock;
  partyName: string | null;
  lineageEvent: Doc<"blockLineageEvents"> | null;
  signatures: SignatureDoc[];
  fieldValue: string | null;
  liveEvent: Doc<"liveContractEvents"> | null;
  liveMatchType: string | null;
  liveStateUpdatedAt: number | null;
  now: number;
}) {
  const lastSignedAt =
    input.signatures.length > 0
      ? Math.max(...input.signatures.map((signature) => signature.signedAt))
      : null;
  const hasTextValue =
    typeof input.fieldValue === "string" && input.fieldValue.trim().length > 0;
  const lastActivityAt =
    input.liveEvent?.createdAt ??
    lastSignedAt ??
    input.lineageEvent?.createdAt ??
    input.liveStateUpdatedAt ??
    null;
  const pulse =
    lastActivityAt !== null &&
    input.now - lastActivityAt <= BLOCK_STALE_AFTER_MS;
  const stale =
    lastActivityAt !== null &&
    input.now - lastActivityAt > BLOCK_STALE_AFTER_MS;

  let state: "live" | "syncing" | "queued" | "sealed" | "warning" | "error" =
    "sealed";
  if (input.liveEvent) {
    state = "live";
  } else if (input.block.required && !lastSignedAt && !hasTextValue) {
    state = stale ? "warning" : "queued";
  } else if (stale) {
    state = "warning";
  }

  const evidence =
    input.block.blockType === "signature"
      ? `${input.signatures.length} signature${input.signatures.length === 1 ? "" : "s"}`
      : hasTextValue
        ? "value captured"
        : input.block.required
          ? "awaiting value"
          : "optional";

  const detailParts = [
    input.partyName ? `Owner: ${input.partyName}` : null,
    input.liveMatchType ? `Live via ${input.liveMatchType}` : null,
    input.lineageEvent?.changeType
      ? `Lineage: ${input.lineageEvent.changeType}`
      : null,
  ];

  return {
    id: input.block.id,
    label: input.block.label,
    blockType: input.block.blockType,
    partyId: input.block.partyId,
    slotName: input.partyName,
    required: input.block.required,
    lineage: {
      lastChangeType: input.lineageEvent?.changeType ?? null,
      lastChangedAt: input.lineageEvent?.createdAt ?? null,
      lineageHash: input.lineageEvent?.lineageHash ?? null,
      blockHash: input.lineageEvent?.blockHash ?? null,
      parentAnchorHash: input.lineageEvent?.parentAnchorHash ?? null,
    },
    signing: {
      signatureCount: input.signatures.length,
      latestSignedAt: lastSignedAt,
      isSatisfied:
        input.block.blockType === "signature"
          ? input.signatures.length > 0
          : input.block.blockType === "text-input"
            ? hasTextValue
            : !input.block.required,
    },
    live: {
      matchedBy:
        input.liveMatchType ??
        (input.liveStateUpdatedAt ? "documentFallback" : "none"),
      lastEventAt: input.liveEvent?.createdAt ?? null,
      currentEventHash: input.liveEvent?.eventHash ?? null,
      source: input.liveEvent?.source ?? null,
      eventType: input.liveEvent?.eventType ?? null,
      freshness: input.liveStateUpdatedAt
        ? stale
          ? "stale"
          : "fresh"
        : "offline",
      staleAfterMs: BLOCK_STALE_AFTER_MS,
      pulse,
    },
    currentValue: input.fieldValue,
    ui: {
      id: input.block.id,
      label: input.block.label,
      state,
      detail: detailParts.filter(Boolean).join(" • "),
      blockType: input.block.blockType,
      slot: input.partyName ?? undefined,
      evidence,
      hash: input.lineageEvent?.blockHash ?? undefined,
      updatedAt: lastActivityAt ?? undefined,
      staleAfterMs: BLOCK_STALE_AFTER_MS,
      pulse,
    },
  };
}

function getCurrentBlocks(document: Doc<"documents">) {
  const normalized = normalizeSmartBlockSnapshot(document.blocks);
  return normalized.length > 0
    ? normalized
    : extractSmartBlocksFromContent(document.content);
}

async function hashCanonicalBlock(block: CanonicalSmartBlock) {
  return hashContent(stableStringify(block));
}

async function buildRuntimeProjection(input: {
  document: Doc<"documents"> & { kind: "envelope" };
  currentBlocks: CanonicalSmartBlock[];
  liveState: Doc<"liveContractStates"> | null;
  allLiveEvents: Doc<"liveContractEvents">[];
  allLineageEvents: Doc<"blockLineageEvents">[];
  usersById: UserMap;
}) {
  const currentBlockIds = new Set<string>(
    input.currentBlocks.map((block) => block.id)
  );
  const earliestLineageByBlockId = new Map<string, Doc<"blockLineageEvents">>();
  const latestLineageByBlockId = new Map<string, Doc<"blockLineageEvents">>();

  for (const event of input.allLineageEvents) {
    if (!latestLineageByBlockId.has(event.blockId)) {
      latestLineageByBlockId.set(event.blockId, event);
    }
    earliestLineageByBlockId.set(event.blockId, event);
  }

  const anchors = await Promise.all(
    input.currentBlocks.map(async (block) => {
      const earliestEvent = earliestLineageByBlockId.get(block.id);
      return {
        blockId: block.id,
        blockType: block.blockType,
        sealedBlockHash: earliestEvent?.blockHash ?? (await hashCanonicalBlock(block)),
        parentBlockId: earliestEvent?.parentBlockId ?? undefined,
        parentAnchorHash: earliestEvent?.parentAnchorHash ?? undefined,
      };
    })
  );

  const anchorByBlockId = new Map(
    anchors.map((anchor) => [anchor.blockId, anchor] as const)
  );

  const liveEvents = [...input.allLiveEvents]
    .sort((left, right) => left.createdAt - right.createdAt)
    .map((event) => {
      const match = getLiveBlockMatch(event, currentBlockIds);
      return {
        id: String(event._id),
        documentId: String(event.documentId),
        eventType: event.eventType,
        source: event.source,
        payload: event.payload,
        createdAt: event.createdAt,
        eventHash: event.eventHash,
        previousHash: event.previousHash ?? null,
        matchedBlockId: match?.blockId,
        matchedBy: match?.matchedBy,
        createdBy: summarizeUser(event.createdBy, input.usersById),
      };
    });

  const latestLiveEventByBlockId = new Map<
    string,
    (typeof liveEvents)[number]
  >();
  for (const event of liveEvents) {
    if (event.matchedBlockId) {
      latestLiveEventByBlockId.set(event.matchedBlockId, event);
    }
  }

  const lineageEvents = [...input.allLineageEvents]
    .sort((left, right) => left.createdAt - right.createdAt)
    .map((event) => ({
      id: String(event._id),
      documentId: String(event.documentId),
      blockId: event.blockId,
      parentBlockId: event.parentBlockId ?? null,
      changeType: event.changeType,
      reason: event.reason ?? null,
      how: event.how ?? null,
      blockHash: event.blockHash,
      previousBlockHash: event.previousBlockHash ?? null,
      parentAnchorHash: event.parentAnchorHash ?? null,
      lineageHash: event.lineageHash,
      createdAt: event.createdAt,
      createdBy: summarizeUser(event.createdBy, input.usersById),
    }));

  const chainHeads = input.currentBlocks.map((block) => {
    const anchor = anchorByBlockId.get(block.id);
    const latestLiveEvent = latestLiveEventByBlockId.get(block.id);
    const latestLineageEvent = latestLineageByBlockId.get(block.id);

    return {
      documentId: String(input.document._id),
      blockId: block.id,
      baseSealHash:
        input.liveState?.baseSealHash ?? input.document.contentHash ?? "",
      sealedBlockHash:
        anchor?.sealedBlockHash ?? latestLineageEvent?.blockHash ?? "",
      currentEventHash: latestLiveEvent?.eventHash,
      currentStateHash: input.liveState?.stateHash,
      matchedBy: latestLiveEvent?.matchedBy,
      eventType: latestLiveEvent?.eventType,
      source: latestLiveEvent?.source,
      updatedAt:
        latestLiveEvent?.createdAt ??
        latestLineageEvent?.createdAt ??
        input.liveState?.updatedAt ??
        input.document.updatedAt,
    };
  });

  const baseSealHash = input.liveState?.baseSealHash ?? input.document.contentHash ?? "";

  return {
    snapshot: {
      documentId: String(input.document._id),
      documentVersion: input.document.sealedVersion ?? input.document.version,
      sealHash: baseSealHash,
      sealedAt: input.document.sealedAt ?? input.document.createdAt,
    },
    anchors,
    policies: input.currentBlocks.map(deriveLiveBlockPolicy),
    chainHeads,
    liveEvents,
    lineageEvents,
    integrity: {
      baseSealHash,
      currentSealHash: input.document.contentHash ?? null,
      currentStateHash: input.liveState?.stateHash ?? null,
      currentLastEventHash: input.liveState?.lastEventHash ?? null,
      isSealAnchorCurrent: input.liveState
        ? input.liveState.baseSealHash === input.document.contentHash
        : Boolean(input.document.contentHash),
      totalLiveEventCount: input.allLiveEvents.length,
      totalLineageEventCount: input.allLineageEvents.length,
    },
  };
}

export const getDashboard = zProtectedQuery({
  args: {
    documentId: zid("documents"),
    auditLogLimit: z.number().optional(),
    liveEventLimit: z.number().optional(),
    lineageEventLimit: z.number().optional(),
    versionLimit: z.number().optional(),
  },
  handler: async (ctx, args) => {
    const auditLogLimit = clampLimit(
      args.auditLogLimit,
      DEFAULT_AUDIT_LOG_LIMIT
    );
    const liveEventLimit = clampLimit(
      args.liveEventLimit,
      DEFAULT_LIVE_EVENT_LIMIT
    );
    const lineageEventLimit = clampLimit(
      args.lineageEventLimit,
      DEFAULT_LINEAGE_EVENT_LIMIT
    );
    const versionLimit = clampLimit(args.versionLimit, DEFAULT_VERSION_LIMIT);

    const document = await ctx.db.get(args.documentId);
    if (!document) {
      return null;
    }
    if (document.kind !== "envelope") {
      throw new Error("Envelope dashboard is only available for envelopes");
    }

    const [
      sourceTemplate,
      versionResult,
      slots,
      signingSessions,
      signatures,
      liveState,
      allLineageEvents,
      recentAuditLogs,
    ] = await Promise.all([
      document.sourceTemplateId
        ? ctx.db.get(document.sourceTemplateId)
        : Promise.resolve(null),
      getDocumentWithVersions(ctx, document._id),
      ctx.db
        .query("slots")
        .withIndex("by_document", (q) => q.eq("documentId", document._id))
        .collect(),
      ctx.db
        .query("signingSessions")
        .withIndex("by_document", (q) => q.eq("documentId", document._id))
        .collect(),
      ctx.db
        .query("signatures")
        .withIndex("by_document", (q) => q.eq("documentId", document._id))
        .collect(),
      ctx.db
        .query("liveContractStates")
        .withIndex("by_document", (q) => q.eq("documentId", document._id))
        .first(),
      ctx.db
        .query("blockLineageEvents")
        .withIndex("by_document_and_created_at", (q) =>
          q.eq("documentId", document._id)
        )
        .order("desc")
        .collect(),
      ctx.db
        .query("auditLogs")
        .withIndex("by_document_and_timestamp", (q) =>
          q.eq("documentId", document._id)
        )
        .order("desc")
        .take(auditLogLimit),
    ]);

    const latestSession =
      [...signingSessions].sort(
        (a, b) =>
          (b.updatedAt ?? b.initiatedAt ?? b._creationTime) -
          (a.updatedAt ?? a.initiatedAt ?? a._creationTime)
      )[0] ?? null;

    const assignments = latestSession
      ? await ctx.db
          .query("signerAssignments")
          .withIndex("by_session_and_order", (q) =>
            q.eq("sessionId", latestSession._id)
          )
          .collect()
      : [];

    const recentLiveEvents = liveState
      ? await ctx.db
          .query("liveContractEvents")
          .withIndex("by_state_and_created_at", (q) =>
            q.eq("liveStateId", liveState._id)
          )
          .order("desc")
          .take(liveEventLimit)
      : [];

    const allLiveEvents = liveState
      ? await ctx.db
          .query("liveContractEvents")
          .withIndex("by_state_and_created_at", (q) =>
            q.eq("liveStateId", liveState._id)
          )
          .order("desc")
          .collect()
      : [];

    const slotById = new Map(slots.map((slot) => [String(slot._id), slot]));
    const signaturesBySignerId = new Map<string, SignatureDoc[]>();
    const signaturesByBlockId = new Map<string, SignatureDoc[]>();
    for (const signature of signatures) {
      const signatureAssignmentId = getSignatureAssignmentId(signature);
      if (!signatureAssignmentId) continue;

      const bySigner = signaturesBySignerId.get(signatureAssignmentId);
      if (bySigner) {
        bySigner.push(signature);
      } else {
        signaturesBySignerId.set(signatureAssignmentId, [signature]);
      }

      const byBlock = signaturesByBlockId.get(signature.blockId);
      if (byBlock) {
        byBlock.push(signature);
      } else {
        signaturesByBlockId.set(signature.blockId, [signature]);
      }
    }

    const assignmentSummaries = assignments
      .sort((a, b) => a.order - b.order)
      .map((assignment) =>
        summarizeAssignment(
          assignment,
          assignment.slotId
            ? (slotById.get(String(assignment.slotId)) ?? null)
            : null,
          signaturesBySignerId.get(String(assignment._id)) ?? []
        )
      );

    const matchedAssignmentIds = new Set(
      assignments.map((assignment) => String(assignment._id))
    );
    const orphanSignatures = signatures
      .filter(
        (signature) =>
          !matchedAssignmentIds.has(
            String(getSignatureAssignmentId(signature) ?? ""),
          ),
      )
      .sort((a, b) => b.signedAt - a.signedAt)
      .map(summarizeSignature);

    const versions = (versionResult?.versions ?? [])
      .sort((a, b) => b.version - a.version || b.createdAt - a.createdAt)
      .slice(0, versionLimit);

    const lineageEvents = allLineageEvents.slice(0, lineageEventLimit);
    const lineageCounts = allLineageEvents.reduce(
      (counts, event) => {
        counts[event.changeType] += 1;
        return counts;
      },
      { created: 0, updated: 0, deleted: 0 }
    );

    const userIds = new Set<string>();
    userIds.add(String(document.ownerId));
    for (const version of versions) {
      if (version.createdBy) {
        userIds.add(String(version.createdBy));
      }
    }
    for (const event of allLineageEvents) {
      if (event.createdBy) {
        userIds.add(String(event.createdBy));
      }
    }
    for (const event of allLiveEvents) {
      if (event.createdBy) {
        userIds.add(String(event.createdBy));
      }
    }
    for (const log of recentAuditLogs) {
      if (log.workosId) {
        userIds.add(String(log.workosId));
      }
    }

    const usersById =
      userIds.size > 0
        ? await batchLoadUsers(
            ctx.db,
            Array.from(userIds).map((id) => id as Id<"users">)
          )
        : new Map<string, Doc<"users">>();

    const signatureStateCounts = assignmentSummaries.reduce(
      (counts, assignment) => {
        counts.signerCount += 1;
        counts.signatureCount += assignment.signatureCount;
        switch (assignment.status) {
          case "invited":
            counts.invitedCount += 1;
            break;
          case "viewed":
            counts.viewedCount += 1;
            break;
          case "ready":
            counts.readyCount += 1;
            break;
          case "signing":
            counts.signingCount += 1;
            break;
          case "signed":
            counts.signedCount += 1;
            break;
          case "declined":
            counts.declinedCount += 1;
            break;
          default:
            counts.pendingCount += 1;
            break;
        }
        return counts;
      },
      {
        signerCount: 0,
        signatureCount: orphanSignatures.length,
        pendingCount: 0,
        invitedCount: 0,
        viewedCount: 0,
        readyCount: 0,
        signingCount: 0,
        signedCount: 0,
        declinedCount: 0,
      }
    );

    const requirementCount = liveState
      ? asArray(liveState.requirements).length
      : 0;
    const metRequirementCount = liveState
      ? asArray(liveState.requirements).filter(
          (requirement) =>
            typeof requirement === "object" &&
            requirement !== null &&
            "met" in requirement &&
            (requirement as { met?: boolean }).met === true
        ).length
      : 0;
    const pendingActionCount = liveState
      ? asArray(liveState.pendingActions).filter(
          (action) =>
            typeof action === "object" &&
            action !== null &&
            "status" in action &&
            (action as { status?: string }).status === "pending"
        ).length
      : 0;

    const parties = asArray(document.parties).filter(
      (entry): entry is Record<string, unknown> =>
        typeof entry === "object" && entry !== null && !Array.isArray(entry)
    );
    const partyNameById = new Map(
      parties
        .map((party) => {
          const id = typeof party.id === "string" ? party.id : null;
          if (!id) {
            return null;
          }
          return [
            id,
            typeof party.name === "string" ? party.name : id,
          ] as const;
        })
        .filter(Boolean) as Array<readonly [string, string]>
    );
    const currentBlocks: CanonicalSmartBlock[] = getCurrentBlocks(document);
    const currentBlockIds = new Set<string>(
      currentBlocks.map((block: CanonicalSmartBlock) => block.id)
    );
    const latestLineageByBlockId = new Map<string, Doc<"blockLineageEvents">>();
    for (const event of allLineageEvents) {
      if (!latestLineageByBlockId.has(event.blockId)) {
        latestLineageByBlockId.set(event.blockId, event);
      }
    }

    const latestLiveByBlockId = new Map<
      string,
      { event: Doc<"liveContractEvents">; matchedBy: string }
    >();
    for (const event of allLiveEvents) {
      const match = getLiveBlockMatch(event, currentBlockIds);
      if (!match || latestLiveByBlockId.has(match.blockId)) {
        continue;
      }
      latestLiveByBlockId.set(match.blockId, {
        event,
        matchedBy: match.matchedBy,
      });
    }

    const fieldValueByBlockId = new Map<string, string>();
    for (const assignment of assignments) {
      const fieldValues = asRecord(assignment.fieldValues);
      if (!fieldValues) {
        continue;
      }
      for (const [blockId, rawValue] of Object.entries(fieldValues)) {
        if (typeof rawValue === "string" && rawValue.trim().length > 0) {
          fieldValueByBlockId.set(blockId, rawValue);
        }
      }
    }

    const now = Date.now();
    const currentSmartBlocks = currentBlocks.map((block: CanonicalSmartBlock) =>
      summarizeCurrentBlock({
        block,
        partyName: block.partyId
          ? (partyNameById.get(block.partyId) ?? null)
          : null,
        lineageEvent: latestLineageByBlockId.get(block.id) ?? null,
        signatures: signaturesByBlockId.get(block.id) ?? [],
        fieldValue: fieldValueByBlockId.get(block.id) ?? null,
        liveEvent: latestLiveByBlockId.get(block.id)?.event ?? null,
        liveMatchType: latestLiveByBlockId.get(block.id)?.matchedBy ?? null,
        liveStateUpdatedAt: liveState?.updatedAt ?? null,
        now,
      })
    );

    return {
      documentSummary: {
        id: document._id,
        title: document.title,
        kind: document.kind,
        status: document.status,
        version: document.version,
        sourceTemplateId: document.sourceTemplateId ?? null,
        sourceTemplate: sourceTemplate
          ? {
              id: sourceTemplate._id,
              title: sourceTemplate.title,
              version: sourceTemplate.version,
              status: sourceTemplate.status,
            }
          : null,
        instanceNumber: document.instanceNumber ?? null,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
        owner: summarizeUser(document.ownerId, usersById),
        blockCount: currentBlocks.length,
        partyCount: asArray(document.parties).length,
        slotCount: slots.length,
      },
      sealState: {
        isSealed: isDocumentSealed(document),
        isLocked: isDocumentLocked(document),
        contentHash: document.contentHash ?? null,
        sealedAt: document.sealedAt ?? null,
        sealedVersion: document.sealedVersion ?? null,
        completedAt: document.completedAt ?? null,
        completedHash: document.completedHash ?? null,
        sealedVersionSnapshotExists:
          document.sealedVersion === undefined
            ? false
            : (versionResult?.versions ?? []).some(
                (version) => version.version === document.sealedVersion
              ),
      },
      signatureState: {
        sessionId: latestSession?._id ?? null,
        sessionStatus: latestSession?.status ?? null,
        signingOrder: latestSession?.signingOrder ?? null,
        currentSignerIndex: latestSession?.currentSignerIndex ?? null,
        lastSessionUpdatedAt: latestSession?.updatedAt ?? null,
        ...signatureStateCounts,
        orphanSignatureCount: orphanSignatures.length,
        fullySigned:
          document.status === "completed" ||
          (signatureStateCounts.signerCount > 0 &&
            signatureStateCounts.signerCount ===
              signatureStateCounts.signedCount),
      },
      signerAssignments: assignmentSummaries,
      orphanSignatures,
      recentAuditLogs: recentAuditLogs.map((log) => ({
        id: log._id,
        action: log.action,
        level: log.level,
        timestamp: log.timestamp,
        actorType: log.actorType,
        actor: summarizeUser(log.workosId, usersById),
        resourceType: log.resourceType,
        resourceId: log.resourceId,
        sessionId: log.sessionId ?? null,
        ipAddress: log.ipAddress ?? null,
        userAgent: log.userAgent ?? null,
        metadata: log.metadata ?? null,
        entryHash: log.entryHash,
        previousHash: log.previousHash ?? null,
      })),
      liveContractStatus: liveState
        ? {
            id: liveState._id,
            status: liveState.status,
            schemaVersion: liveState.schemaVersion,
            baseSealHash: liveState.baseSealHash,
            stateHash: liveState.stateHash,
            lastEventHash: liveState.lastEventHash ?? null,
            createdAt: liveState.createdAt,
            updatedAt: liveState.updatedAt,
            isSealAnchorCurrent:
              document.contentHash !== undefined &&
              liveState.baseSealHash === document.contentHash,
            variableCount: Object.keys(
              typeof liveState.variables === "object" &&
                liveState.variables !== null
                ? (liveState.variables as Record<string, unknown>)
                : {}
            ).length,
            requirementCount,
            metRequirementCount,
            pendingActionCount,
            totalEventCount: allLiveEvents.length,
            latestEventAt: allLiveEvents[0]?.createdAt ?? null,
          }
        : null,
      recentLiveEvents: recentLiveEvents.map((event) => ({
        id: event._id,
        eventType: event.eventType,
        source: event.source,
        payload: event.payload,
        createdAt: event.createdAt,
        eventHash: event.eventHash,
        previousHash: event.previousHash ?? null,
        createdBy: summarizeUser(event.createdBy, usersById),
      })),
      versions: versions.map((version) => ({
        id: version._id,
        version: version.version,
        createdAt: version.createdAt,
        contentHash: version.contentHash,
        isSealedVersion: version.version === document.sealedVersion,
        blockCount: asArray(version.blocks).length,
        partyCount: asArray(version.parties).length,
        createdBy: summarizeUser(version.createdBy, usersById),
      })),
      blockLineageSummary: {
        totalEvents: allLineageEvents.length,
        trackedBlockCount: new Set(
          allLineageEvents.map((event) => event.blockId)
        ).size,
        latestEventAt: allLineageEvents[0]?.createdAt ?? null,
        counts: lineageCounts,
        recentEvents: lineageEvents.map((event) => ({
          id: event._id,
          blockId: event.blockId,
          parentBlockId: event.parentBlockId ?? null,
          changeType: event.changeType,
          reason: event.reason ?? null,
          how: event.how ?? null,
          blockHash: event.blockHash,
          previousBlockHash: event.previousBlockHash ?? null,
          parentAnchorHash: event.parentAnchorHash ?? null,
          lineageHash: event.lineageHash,
          createdAt: event.createdAt,
          createdBy: summarizeUser(event.createdBy, usersById),
        })),
      },
      currentSmartBlocks,
    };
  },
});

export const getRuntimeProjection = zProtectedQuery({
  args: {
    documentId: zid("documents"),
  },
  handler: async (ctx, args) => {
    const document = await ctx.db.get(args.documentId);
    if (!document) {
      return null;
    }
    if (document.kind !== "envelope") {
      throw new Error("Runtime projection is only available for envelopes");
    }

    const [liveState, allLineageEvents, allLiveEvents] = await Promise.all([
      ctx.db
        .query("liveContractStates")
        .withIndex("by_document", (q) => q.eq("documentId", document._id))
        .first(),
      ctx.db
        .query("blockLineageEvents")
        .withIndex("by_document_and_created_at", (q) =>
          q.eq("documentId", document._id)
        )
        .order("desc")
        .collect(),
      ctx.db
        .query("liveContractEvents")
        .withIndex("by_document_and_created_at", (q) =>
          q.eq("documentId", document._id)
        )
        .order("desc")
        .collect(),
    ]);

    const userIds = new Set<string>();
    for (const event of allLineageEvents) {
      if (event.createdBy) {
        userIds.add(String(event.createdBy));
      }
    }
    for (const event of allLiveEvents) {
      if (event.createdBy) {
        userIds.add(String(event.createdBy));
      }
    }

    const usersById =
      userIds.size > 0
        ? await batchLoadUsers(
            ctx.db,
            Array.from(userIds).map((id) => id as Id<"users">)
          )
        : new Map<string, Doc<"users">>();

    return buildRuntimeProjection({
      document: document as Doc<"documents"> & { kind: "envelope" },
      currentBlocks: getCurrentBlocks(document),
      liveState,
      allLiveEvents,
      allLineageEvents,
      usersById,
    });
  },
});
