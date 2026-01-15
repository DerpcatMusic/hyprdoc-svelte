/**
 * Content transformation utilities.
 * Resolves dynamic content and converting to static values.
 */

interface ContentNode {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: ContentNode[];
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
  text?: string;
}

const SYSTEM_VARIABLES: Record<string, () => string> = {
  today: () => new Date().toLocaleDateString(),
  now: () => new Date().toLocaleTimeString(),
  document_created: () => new Date().toLocaleDateString(),
};

export interface ResolveVariablesOptions {
  blocks: Array<{
    id: string;
    variableName?: string;
    label?: string;
    value?: string | number | boolean | null;
  }>;
  documentSettings?: {
    title?: string;
  };
}

function resolveVariableValue(
  variableName: string,
  options: ResolveVariablesOptions
): string | null {
  // 1. System variables
  if (SYSTEM_VARIABLES[variableName]) {
    return SYSTEM_VARIABLES[variableName]();
  }

  // 2. Document title
  if (variableName === "document_title") {
    return options.documentSettings?.title || "Untitled Document";
  }

  // 3. Block variables
  const block = options.blocks.find((b) => b.variableName === variableName);
  if (block) {
    if (
      block.value !== null &&
      block.value !== undefined &&
      block.value !== ""
    ) {
      return String(block.value);
    }
    return `[${block.label || variableName}]`;
  }

  return null;
}

export function resolveVariableMentions(
  content: ContentNode,
  options: ResolveVariablesOptions
): ContentNode {
  if (!content) {
    return content;
  }

  if (content.type === "variableMention") {
    const variableName = content.attrs?.variableName as string | undefined;
    const resolvedValue =
      resolveVariableValue(variableName || "", options) ||
      `{{${variableName}}}`;

    return {
      type: "text",
      text: resolvedValue,
      ...(content.marks && { marks: content.marks }),
    };
  }

  if (content.content && Array.isArray(content.content)) {
    return {
      ...content,
      content: content.content.map((child) =>
        resolveVariableMentions(child, options)
      ),
    };
  }

  return content;
}

export function resolveDocumentVariables(
  contentString: string,
  options: ResolveVariablesOptions
): string {
  try {
    const contentJson = JSON.parse(contentString);
    const resolvedContent = resolveVariableMentions(contentJson, options);
    return JSON.stringify(resolvedContent);
  } catch (e) {
    console.error("Failed to resolve variables in document content:", e);
    return contentString;
  }
}
