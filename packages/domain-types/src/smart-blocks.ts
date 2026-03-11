export interface CanonicalSmartBlock {
  id: string;
  blockType: string;
  partyId: string | null;
  required: boolean;
  conditional: boolean;
  conditionExpr: string | null;
  runtimePolicy: {
    mode: "sealed" | "live_append_only" | "live_replaceable";
    allowedPaths: string[];
    condition?: {
      field: string;
      operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "in" | "exists";
      value?: unknown;
    };
  } | null;
  integrationBinding: {
    integration: string;
    externalObjectType: string;
    externalObjectIdPath: string;
    idempotencyKeyPath?: string;
  } | null;
  data: Record<string, unknown>;
  label: string;
  variableName: string | null;
  value: unknown;
}

interface ContentNode {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: ContentNode[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizeData(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

export function normalizeSmartBlock(value: unknown): CanonicalSmartBlock | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== "string" || value.id.trim().length === 0) return null;
  if (typeof value.blockType !== "string" || value.blockType.trim().length === 0) return null;

  const data = normalizeData(value.data);
  const rawLabel = data.label;
  const rawVariableName = data.variableName;
  const rawRuntimePolicy = isRecord(value.runtimePolicy) ? value.runtimePolicy : null;
  const rawIntegrationBinding = isRecord(value.integrationBinding)
    ? value.integrationBinding
    : null;
  const runtimeMode = rawRuntimePolicy?.mode;
  const runtimeAllowedPaths = Array.isArray(rawRuntimePolicy?.allowedPaths)
    ? rawRuntimePolicy.allowedPaths.filter(
        (entry): entry is string => typeof entry === "string"
      )
    : [];
  const runtimeCondition = isRecord(rawRuntimePolicy?.condition)
    ? rawRuntimePolicy.condition
    : null;
  const integrationBinding =
    rawIntegrationBinding &&
    typeof rawIntegrationBinding.integration === "string" &&
    typeof rawIntegrationBinding.externalObjectType === "string" &&
    typeof rawIntegrationBinding.externalObjectIdPath === "string"
      ? {
          integration: rawIntegrationBinding.integration,
          externalObjectType: rawIntegrationBinding.externalObjectType,
          externalObjectIdPath: rawIntegrationBinding.externalObjectIdPath,
          idempotencyKeyPath:
            typeof rawIntegrationBinding.idempotencyKeyPath === "string"
              ? rawIntegrationBinding.idempotencyKeyPath
              : undefined,
        }
      : null;

  return {
    id: value.id,
    blockType: value.blockType,
    partyId: typeof value.partyId === "string" && value.partyId.length > 0 ? value.partyId : null,
    required: value.required === true,
    conditional: value.conditional === true,
    conditionExpr:
      typeof value.conditionExpr === "string" && value.conditionExpr.length > 0
        ? value.conditionExpr
        : null,
    runtimePolicy:
      runtimeMode === "sealed" ||
      runtimeMode === "live_append_only" ||
      runtimeMode === "live_replaceable"
        ? {
            mode: runtimeMode,
            allowedPaths: runtimeAllowedPaths,
            condition:
              runtimeCondition &&
              typeof runtimeCondition.field === "string" &&
              typeof runtimeCondition.operator === "string"
                ? {
                    field: runtimeCondition.field,
                    operator: runtimeCondition.operator as
                      | "eq"
                      | "neq"
                      | "gt"
                      | "gte"
                      | "lt"
                      | "lte"
                      | "in"
                      | "exists",
                    value: runtimeCondition.value,
                  }
                : undefined,
          }
        : null,
    integrationBinding,
    data,
    label:
      typeof rawLabel === "string" && rawLabel.trim().length > 0
        ? rawLabel.trim()
        : value.blockType,
    variableName:
      typeof rawVariableName === "string" && rawVariableName.trim().length > 0
        ? rawVariableName.trim()
        : null,
    value: data.value,
  };
}

export function normalizeSmartBlockSnapshot(blocks: unknown): CanonicalSmartBlock[] {
  if (!Array.isArray(blocks)) return [];

  const normalized: CanonicalSmartBlock[] = [];
  for (const block of blocks) {
    const next = normalizeSmartBlock(block);
    if (next) normalized.push(next);
  }
  return normalized;
}

function collectBlocks(node: ContentNode | null | undefined, output: CanonicalSmartBlock[]) {
  if (!node) return;

  if (node.type === "hyprDocBlock") {
    const next = normalizeSmartBlock(node.attrs);
    if (next) output.push(next);
  }

  if (Array.isArray(node.content)) {
    for (const child of node.content) {
      collectBlocks(child, output);
    }
  }
}

export function extractSmartBlocksFromContent(
  rawContent: string | ContentNode | null | undefined
): CanonicalSmartBlock[] {
  if (!rawContent) return [];

  let parsed: ContentNode | null = null;

  if (typeof rawContent === "string") {
    try {
      parsed = JSON.parse(rawContent) as ContentNode;
    } catch {
      return [];
    }
  } else {
    parsed = rawContent;
  }

  const blocks: CanonicalSmartBlock[] = [];
  collectBlocks(parsed, blocks);
  return blocks;
}
