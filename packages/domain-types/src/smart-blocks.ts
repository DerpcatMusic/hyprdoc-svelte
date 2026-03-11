export interface CanonicalSmartBlock {
  id: string;
  blockType: string;
  partyId: string | null;
  required: boolean;
  conditional: boolean;
  conditionExpr: string | null;
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
