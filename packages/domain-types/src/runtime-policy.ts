import type { CanonicalSmartBlock } from "./smart-blocks";
import type {
  LiveBlockCondition,
  LiveBlockIntegrationBinding,
  LiveBlockPolicy,
  LiveBlockPolicyMode,
} from "./runtime";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asMode(value: unknown): LiveBlockPolicyMode | null {
  return value === "sealed" ||
    value === "live_append_only" ||
    value === "live_replaceable"
    ? value
    : null;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

function normalizeCondition(value: unknown): LiveBlockCondition | undefined {
  const record = asRecord(value);
  if (!record || typeof record.field !== "string" || typeof record.operator !== "string") {
    return undefined;
  }

  if (
    !["eq", "neq", "gt", "gte", "lt", "lte", "in", "exists"].includes(record.operator)
  ) {
    return undefined;
  }

  return {
    field: record.field,
    operator: record.operator as LiveBlockCondition["operator"],
    value: record.value,
  };
}

function normalizeIntegration(value: unknown): LiveBlockIntegrationBinding | undefined {
  const record = asRecord(value);
  if (
    !record ||
    typeof record.integration !== "string" ||
    typeof record.externalObjectType !== "string" ||
    typeof record.externalObjectIdPath !== "string"
  ) {
    return undefined;
  }

  return {
    integration: record.integration,
    externalObjectType: record.externalObjectType,
    externalObjectIdPath: record.externalObjectIdPath,
    idempotencyKeyPath:
      typeof record.idempotencyKeyPath === "string" ? record.idempotencyKeyPath : undefined,
  };
}

export function deriveLiveBlockPolicy(block: CanonicalSmartBlock): LiveBlockPolicy {
  const metadata = asRecord(block.data.livePolicy) ?? asRecord(block.data.runtimePolicy);
  const explicitRuntimePolicy = block.runtimePolicy;
  const metadataMode = asMode(metadata?.mode);
  const explicitMode = asMode(block.data.liveMode) ?? asMode(block.data.postSealMode);
  const explicitAllowedPaths = asStringArray(block.data.livePaths);
  const metadataAllowedPaths = asStringArray(metadata?.allowedPaths);
  const mode =
    explicitRuntimePolicy?.mode ??
    explicitMode ??
    metadataMode ??
    (block.blockType === "signature" ? "sealed" : "sealed");

  const allowedPaths =
    explicitRuntimePolicy && explicitRuntimePolicy.allowedPaths.length > 0
      ? explicitRuntimePolicy.allowedPaths
      : explicitAllowedPaths.length > 0
        ? explicitAllowedPaths
        : metadataAllowedPaths;

  return {
    blockId: block.id,
    blockType: block.blockType,
    mode,
    allowedPaths:
      allowedPaths.length > 0
        ? allowedPaths
        : mode === "sealed"
          ? []
          : ["data.value"],
    condition:
      explicitRuntimePolicy?.condition ??
      normalizeCondition(block.data.liveCondition) ??
      normalizeCondition(metadata?.condition),
    integration:
      block.integrationBinding ??
      normalizeIntegration(block.data.integrationBinding) ??
      normalizeIntegration(metadata?.integration),
    metadata: metadata ?? undefined,
  };
}
