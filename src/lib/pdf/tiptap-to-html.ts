/**
 * Tiptap JSON to HTML Converter
 *
 * Server-side converter that transforms Tiptap JSON content into HTML
 * suitable for PDF generation via Puppeteer.
 *
 * Features:
 * - Renders all standard Tiptap nodes (paragraphs, headings, lists, etc.)
 * - Renders SmartBlocks with their current values
 * - Applies document settings (fonts, colors, margins)
 * - Generates complete HTML document with embedded styles
 */

export interface DocumentSettings {
  paperColor?: string;
  fontBody?: string;
  fontHeading?: string;
  marginHorizontal?: number;
  marginVertical?: number;
  [key: string]: unknown;
}

export interface BlockData {
  id: string;
  type: string;
  label?: string;
  value?: unknown;
  signatureData?: string;
  required?: boolean;
  options?: string[] | Array<{ label: string; value: string }>;
  [key: string]: unknown;
}

interface TiptapNode {
  type: string;
  attrs?: Record<string, unknown>;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
  content?: TiptapNode[];
  text?: string;
}

/**
 * Escape HTML special characters to prevent XSS
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Get contrast color (black or white) based on background brightness
 */
function getContrastColor(hexColor: string): string {
  const hex = hexColor.replace("#", "");
  const r = Number.parseInt(hex.substring(0, 2), 16);
  const g = Number.parseInt(hex.substring(2, 4), 16);
  const b = Number.parseInt(hex.substring(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? "#0f172a" : "#ffffff";
}

/**
 * Check if text is predominantly RTL (Hebrew, Arabic, Persian, etc.)
 */
function isPredominantlyRTL(text: string): boolean {
  // Hebrew: U+0590–U+05FF, Arabic: U+0600–U+06FF, U+0750–U+077F
  const rtlChars = (text.match(/[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F]/g) || []).length;
  const ltrChars = (text.match(/[a-zA-Z]/g) || []).length;
  return rtlChars > ltrChars;
}

/**
 * Render text marks (bold, italic, etc.) as HTML
 */
function renderMarks(text: string, marks?: TiptapNode["marks"]): string {
  if (!marks || marks.length === 0) {
    return escapeHtml(text);
  }

  let result = escapeHtml(text);

  for (const mark of marks) {
    switch (mark.type) {
      case "bold":
        result = `<strong>${result}</strong>`;
        break;
      case "italic":
        result = `<em>${result}</em>`;
        break;
      case "underline":
        result = `<u>${result}</u>`;
        break;
      case "strike":
        result = `<s>${result}</s>`;
        break;
      case "code":
        result = `<code class="inline-code">${result}</code>`;
        break;
      case "link":
        result = `<a href="${escapeHtml(String(mark.attrs?.href || ""))}" target="_blank" rel="noopener">${result}</a>`;
        break;
      case "highlight":
        result = `<mark style="background-color: ${mark.attrs?.color || "#ffeb3b"}">${result}</mark>`;
        break;
      case "textStyle":
        if (mark.attrs?.color) {
          result = `<span style="color: ${mark.attrs.color}">${result}</span>`;
        }
        break;
      case "subscript":
        result = `<sub>${result}</sub>`;
        break;
      case "superscript":
        result = `<sup>${result}</sup>`;
        break;
    }
  }

  return result;
}

/**
 * Render a SmartBlock with its current value
 */
function renderSmartBlock(node: TiptapNode, blocksMap: Record<string, BlockData>): string {
  const attrs = node.attrs || {};
  const blockId = String(attrs.id || "");
  const blockType = String(attrs.type || "text");
  const label = String(attrs.label || "Field");

  // Get block data from the blocks map (contains current values)
  // Use a default object if block not found
  const defaultBlock: BlockData = { id: blockId, type: blockType };
  const blockData: BlockData = blocksMap[blockId] || defaultBlock;
  const value = blockData.value ?? attrs.value ?? "";

  // Render based on block type
  switch (blockType) {
    // ===== SIGNATURE =====
    case "signature": {
      const signatureData = String(blockData.signatureData || value || "");
      if (signatureData?.startsWith("data:image")) {
        return `
          <div class="smart-block signature-block" data-block-id="${escapeHtml(blockId)}">
            <img src="${signatureData}" alt="Signature" class="signature-image" />
          </div>
        `;
      }
      return `
        <div class="smart-block signature-block empty" data-block-id="${escapeHtml(blockId)}">
          <span class="signature-placeholder">${escapeHtml(label)}</span>
        </div>
      `;
    }

    // ===== DATE =====
    case "date": {
      const dateValue = value
        ? new Date(String(value)).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : "";
      return `
        <span class="smart-block date-block" data-block-id="${escapeHtml(blockId)}">
          ${dateValue || `[${escapeHtml(label)}]`}
        </span>
      `;
    }

    // ===== CHECKBOX (with multi-select support) =====
    case "checkbox": {
      const options = (attrs.options as string[]) || [];

      // Multi-select mode: show all options with check marks
      if (options.length > 0) {
        const selectedValues = Array.isArray(value) ? value : value ? [value] : [];
        const optionsHtml = options
          .map((opt) => {
            const isChecked = selectedValues.includes(opt);
            return `<span class="checkbox-option">${isChecked ? "☑" : "☐"} ${escapeHtml(opt)}</span>`;
          })
          .join(" ");
        return `
          <div class="smart-block checkbox-block multi" data-block-id="${escapeHtml(blockId)}">
            ${optionsHtml}
          </div>
        `;
      }

      // Single checkbox mode
      const checked = value === true || value === "true";
      const placeholder = String(attrs.placeholder || label || "I agree");
      return `
        <span class="smart-block checkbox-block" data-block-id="${escapeHtml(blockId)}">
          ${checked ? "☑" : "☐"} ${escapeHtml(placeholder)}
        </span>
      `;
    }

    // ===== SELECT =====
    case "select": {
      const options = (attrs.options as string[]) || [];
      const selectedOption = options.find((o) => o === value);
      return `
        <span class="smart-block select-block" data-block-id="${escapeHtml(blockId)}">
          ${selectedOption ? escapeHtml(selectedOption) : `[${escapeHtml(label)}]`}
        </span>
      `;
    }

    // ===== RADIO (show all options with selection indicator) =====
    case "radio": {
      const options = (attrs.options as string[]) || [];

      if (options.length > 0) {
        const optionsHtml = options
          .map((opt) => {
            const isSelected = opt === value;
            return `<span class="radio-option">${isSelected ? "●" : "○"} ${escapeHtml(opt)}</span>`;
          })
          .join(" ");
        return `
          <div class="smart-block radio-block" data-block-id="${escapeHtml(blockId)}">
            ${optionsHtml}
          </div>
        `;
      }

      return `
        <span class="smart-block radio-block" data-block-id="${escapeHtml(blockId)}">
          [${escapeHtml(label)}]
        </span>
      `;
    }

    // ===== NUMBER & CURRENCY =====
    case "number":
    case "currency_conversion": {
      return `
        <span class="smart-block number-block" data-block-id="${escapeHtml(blockId)}">
          ${value !== "" && value !== null && value !== undefined ? String(value) : `[${escapeHtml(label)}]`}
        </span>
      `;
    }

    // ===== RATING =====
    case "rating": {
      const ratingMax = Number(attrs.ratingMax) || 5;
      const ratingValue = Number(value) || 0;
      const iconType = String(attrs.iconType || "star");
      let filled: string;
      let empty: string;
      switch (iconType) {
        case "heart":
          filled = "♥";
          empty = "♡";
          break;
        case "circle":
          filled = "●";
          empty = "○";
          break;
        default:
          filled = "★";
          empty = "☆";
      }
      const icons = filled.repeat(ratingValue) + empty.repeat(ratingMax - ratingValue);
      return `
        <span class="smart-block rating-block" data-block-id="${escapeHtml(blockId)}">
          ${icons}
        </span>
      `;
    }

    // ===== TEXTAREA / LONG TEXT =====
    case "textarea": {
      const textValue = String(value || "");
      if (textValue) {
        // Preserve line breaks by converting to <br>
        const formattedText = escapeHtml(textValue).replace(/\n/g, "<br>");
        return `
          <div class="smart-block textarea-block" data-block-id="${escapeHtml(blockId)}">
            ${formattedText}
          </div>
        `;
      }
      return `
        <div class="smart-block textarea-block empty" data-block-id="${escapeHtml(blockId)}">
          [${escapeHtml(label)}]
        </div>
      `;
    }

    // ===== EMAIL =====
    case "email": {
      const emailValue = String(value || "");
      return `
        <span class="smart-block email-block" data-block-id="${escapeHtml(blockId)}">
          ${emailValue ? escapeHtml(emailValue) : `[${escapeHtml(label)}]`}
        </span>
      `;
    }

    // ===== FILE UPLOAD =====
    case "file":
    case "image": {
      const fileName = String(value || "");
      if (fileName) {
        return `
          <span class="smart-block file-block" data-block-id="${escapeHtml(blockId)}">
            📎 ${escapeHtml(fileName)}
          </span>
        `;
      }
      return `
        <span class="smart-block file-block empty" data-block-id="${escapeHtml(blockId)}">
          [${escapeHtml(label)}]
        </span>
      `;
    }

    // ===== FORMULA =====
    case "formula": {
      const result = value !== "" && value !== null && value !== undefined ? String(value) : "";
      return `
        <span class="smart-block formula-block" data-block-id="${escapeHtml(blockId)}">
          ${result || `[${escapeHtml(label)}]`}
        </span>
      `;
    }

    // ===== SECTION HEADER =====
    case "section_header": {
      const headerLabel = String(attrs.label || attrs.placeholder || "Section");
      const variant = String(attrs.variant || "default");
      const align = String(attrs.align || "left");
      return `
        <div class="smart-block section-header-block ${variant}" data-block-id="${escapeHtml(blockId)}" style="text-align: ${align};">
          <span class="section-header-text">${escapeHtml(headerLabel)}</span>
        </div>
      `;
    }

    // ===== DIVIDER =====
    case "divider": {
      const height = Number(attrs.dividerHeight) || 2;
      return `<hr class="smart-block divider-block" style="border-top-width: ${height}px;" />`;
    }

    // ===== CALLOUT =====
    case "callout": {
      const calloutVariant = String(attrs.variant || "note");
      const calloutContent = String(attrs.placeholder || value || "");
      const icons: Record<string, string> = {
        note: "📝",
        info: "ℹ️",
        success: "✅",
        warning: "⚠️",
        error: "❌",
      };
      const icon = icons[calloutVariant] || "📝";
      return `
        <div class="smart-block callout-block ${calloutVariant}" data-block-id="${escapeHtml(blockId)}">
          <span class="callout-icon">${icon}</span>
          <span class="callout-content">${escapeHtml(calloutContent) || `[${escapeHtml(label)}]`}</span>
        </div>
      `;
    }

    // ===== CONDITIONAL REMOVED =====
    // Visibility conditions are now a global block property, evaluated at runtime

    // ===== DEFAULT (text, url, phone, etc.) =====
    default: {
      const textValue = String(value || "");
      return `
        <span class="smart-block text-block" data-block-id="${escapeHtml(blockId)}">
          ${textValue || `[${escapeHtml(label)}]`}
        </span>
      `;
    }
  }
}

/**
 * Render a Tiptap node to HTML recursively
 */
function renderNode(
  node: TiptapNode,
  blocksMap: Record<string, BlockData>,
  fontBody: string,
  fontHeading: string
): string {
  if (!node) { return ""; }

  // Handle text nodes
  if (node.type === "text") {
    return renderMarks(node.text || "", node.marks);
  }

  // Render children recursively
  const children = node.content
    ? node.content.map((child) => renderNode(child, blocksMap, fontBody, fontHeading)).join("")
    : "";

  const attrs = node.attrs || {};

  switch (node.type) {
    case "doc":
      return children;

    case "paragraph": {
      const align = attrs.textAlign ? `text-align: ${attrs.textAlign};` : "";
      // Detect RTL text and add direction style
      const textContent = children.replace(/<[^>]*>/g, ""); // Strip HTML tags for detection
      const rtlStyle = isPredominantlyRTL(textContent) ? "direction: rtl; text-align: right;" : "";
      return `<p style="font-family: ${fontBody}, 'Noto Sans Hebrew', sans-serif; ${align}${rtlStyle}">${children || "<br/>"}</p>`;
    }

    case "heading": {
      const level = Number(attrs.level) || 1;
      const align = attrs.textAlign ? `text-align: ${attrs.textAlign};` : "";
      // Detect RTL text and add direction style
      const textContent = children.replace(/<[^>]*>/g, "");
      const rtlStyle = isPredominantlyRTL(textContent) ? "direction: rtl; text-align: right;" : "";
      return `<h${level} style="font-family: ${fontHeading}, 'Noto Sans Hebrew', sans-serif; ${align}${rtlStyle}">${children}</h${level}>`;
    }

    case "bulletList":
      return `<ul class="bullet-list">${children}</ul>`;

    case "orderedList":
      return `<ol class="ordered-list" start="${attrs.start || 1}">${children}</ol>`;

    case "listItem":
      return `<li>${children}</li>`;

    case "blockquote":
      return `<blockquote class="blockquote">${children}</blockquote>`;

    case "codeBlock":
      return `<pre class="code-block"><code>${children}</code></pre>`;

    case "horizontalRule":
      return `<hr class="horizontal-rule" />`;

    case "hardBreak":
      return "<br/>";

    case "table":
      return `<table class="tiptap-table">${children}</table>`;

    case "tableRow":
      return `<tr>${children}</tr>`;

    case "tableHeader":
      return `<th>${children}</th>`;

    case "tableCell":
      return `<td>${children}</td>`;

    case "smartBlock":
      return renderSmartBlock(node, blocksMap);

    case "blockRow":
      // Render as a flex container for side-by-side blocks
      return `<div class="block-row">${children}</div>`;

    case "variableMention": {
      const varName = String(attrs.name || attrs.id || "variable");
      return `<span class="variable-mention">{{${escapeHtml(varName)}}}</span>`;
    }

    default:
      // Unknown node type - render children or skip
      return children;
  }
}

/**
 * Generate complete HTML document from Tiptap JSON content
 */
export function tiptapToHtml(
  content: string | TiptapNode,
  settings: DocumentSettings = {},
  blocks: BlockData[] = []
): string {
  // Parse content if string
  let parsedContent: TiptapNode;
  if (typeof content === "string") {
    try {
      parsedContent = JSON.parse(content);
    } catch {
      // Return simple text document if JSON parse fails
      return `<!DOCTYPE html><html><body><p>${escapeHtml(content)}</p></body></html>`;
    }
  } else {
    parsedContent = content;
  }

  // Build blocks map for quick lookup
  const blocksMap: Record<string, BlockData> = {};
  for (const block of blocks) {
    blocksMap[block.id] = block;
  }

  // Settings with defaults
  const paperColor = settings.paperColor || "#ffffff";
  const fontBody = settings.fontBody || "Inter";
  const fontHeading = settings.fontHeading || "Inter";
  const marginH = settings.marginHorizontal ?? 72;
  const marginV = settings.marginVertical ?? 72;

  const isDefaultPaper =
    !settings.paperColor ||
    settings.paperColor === "#fdfdfd" ||
    settings.paperColor === "#ffffff" ||
    settings.paperColor === "#fcfcfc";

  const textColor = isDefaultPaper ? "#0f172a" : getContrastColor(paperColor);

  // Render content
  const bodyHtml = renderNode(parsedContent, blocksMap, fontBody, fontHeading);

  // Generate complete HTML document
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontBody)}:wght@400;500;600;700&family=${encodeURIComponent(fontHeading)}:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: '${fontBody}', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 12pt;
      line-height: 1.6;
      color: ${textColor};
      background: ${paperColor};
      padding: ${marginV}px ${marginH}px;
    }

    /* Typography */
    h1 { font-size: 28pt; font-weight: 800; margin: 24pt 0 12pt; line-height: 1.2; }
    h2 { font-size: 22pt; font-weight: 700; margin: 20pt 0 10pt; line-height: 1.3; }
    h3 { font-size: 16pt; font-weight: 600; margin: 16pt 0 8pt; line-height: 1.4; }
    h1, h2, h3 { font-family: '${fontHeading}', sans-serif; }

    p { margin: 8pt 0; }

    /* Lists */
    .bullet-list, .ordered-list {
      margin: 8pt 0;
      padding-left: 24pt;
    }
    .bullet-list { list-style-type: disc; }
    .ordered-list { list-style-type: decimal; }
    li { margin: 4pt 0; }

    /* Blockquote */
    .blockquote {
      border-left: 3pt solid #e0e0e0;
      padding-left: 16pt;
      margin: 12pt 0;
      font-style: italic;
      color: ${isDefaultPaper ? "#64748b" : textColor};
    }

    /* Code */
    .code-block {
      background: ${isDefaultPaper ? "#f1f5f9" : "rgba(0,0,0,0.1)"};
      padding: 12pt;
      border-radius: 4pt;
      font-family: 'Fira Code', 'Monaco', monospace;
      font-size: 10pt;
      overflow-x: auto;
      margin: 12pt 0;
    }
    .inline-code {
      background: ${isDefaultPaper ? "#f1f5f9" : "rgba(0,0,0,0.1)"};
      padding: 2pt 4pt;
      border-radius: 2pt;
      font-family: 'Fira Code', 'Monaco', monospace;
      font-size: 10pt;
    }

    /* Horizontal Rule */
    .horizontal-rule {
      border: none;
      border-top: 1pt solid #e0e0e0;
      margin: 16pt 0;
    }

    /* Tables */
    .tiptap-table {
      width: 100%;
      border-collapse: collapse;
      margin: 12pt 0;
    }
    .tiptap-table th, .tiptap-table td {
      border: 1pt solid #e0e0e0;
      padding: 8pt 12pt;
      text-align: left;
    }
    .tiptap-table th {
      background: ${isDefaultPaper ? "#f8fafc" : "rgba(0,0,0,0.05)"};
      font-weight: 600;
    }

    /* Links */
    a {
      color: #3b82f6;
      text-decoration: underline;
    }

    /* SmartBlocks */
    .smart-block {
      display: inline-block;
    }
    .text-block, .number-block, .date-block, .select-block {
      background: ${isDefaultPaper ? "#f1f5f9" : "rgba(0,0,0,0.05)"};
      padding: 2pt 6pt;
      border-radius: 3pt;
      min-width: 80pt;
    }
    .signature-block {
      display: block;
      min-height: 50pt;
      min-width: 200pt;
      border-bottom: 1pt solid #333;
      margin: 8pt 0;
      padding: 4pt;
    }
    .signature-block.empty {
      display: flex;
      align-items: flex-end;
      padding-bottom: 8pt;
    }
    .signature-placeholder {
      color: #9ca3af;
      font-style: italic;
      font-size: 10pt;
    }
    .signature-image {
      max-height: 60pt;
      max-width: 200pt;
      object-fit: contain;
    }
    .checkbox-block {
      font-family: 'Segoe UI Symbol', sans-serif;
    }
    .rating-block {
      color: #f59e0b;
      letter-spacing: 2pt;
    }
    .divider-block {
      border: none;
      border-top: 2pt solid #e0e0e0;
      margin: 16pt 0;
    }

    /* Textarea / Long Text */
    .textarea-block {
      background: ${isDefaultPaper ? "#f1f5f9" : "rgba(0,0,0,0.05)"};
      padding: 8pt 10pt;
      border-radius: 3pt;
      min-width: 200pt;
      display: block;
      margin: 4pt 0;
    }
    .textarea-block.empty {
      color: #9ca3af;
      font-style: italic;
    }

    /* Email */
    .email-block {
      background: ${isDefaultPaper ? "#f1f5f9" : "rgba(0,0,0,0.05)"};
      padding: 2pt 6pt;
      border-radius: 3pt;
    }

    /* File Upload */
    .file-block {
      background: ${isDefaultPaper ? "#f1f5f9" : "rgba(0,0,0,0.05)"};
      padding: 2pt 6pt;
      border-radius: 3pt;
    }
    .file-block.empty {
      color: #9ca3af;
      font-style: italic;
    }

    /* Formula */
    .formula-block {
      background: ${isDefaultPaper ? "#e0f2fe" : "rgba(59,130,246,0.1)"};
      padding: 2pt 6pt;
      border-radius: 3pt;
      font-family: 'Fira Code', 'Monaco', monospace;
      font-size: 11pt;
    }

    /* Radio Options */
    .radio-block {
      font-family: 'Segoe UI Symbol', sans-serif;
    }
    .radio-option, .checkbox-option {
      margin-right: 12pt;
      white-space: nowrap;
    }

    /* Section Header */
    .section-header-block {
      margin: 16pt 0 8pt;
      padding: 8pt 12pt;
      font-weight: 700;
      font-size: 14pt;
    }
    .section-header-block.default {
      background: ${isDefaultPaper ? "#f1f5f9" : "rgba(0,0,0,0.05)"};
      border-radius: 4pt;
    }
    .section-header-block.underline {
      background: transparent;
      border-bottom: 2pt solid #e0e0e0;
      padding-left: 0;
      border-radius: 0;
    }
    .section-header-block.minimal {
      background: transparent;
      padding: 0;
      margin-bottom: 4pt;
    }

    /* Callout */
    .callout-block {
      display: flex;
      gap: 8pt;
      padding: 12pt;
      border-radius: 4pt;
      margin: 8pt 0;
    }
    .callout-block.note {
      background: ${isDefaultPaper ? "#f1f5f9" : "rgba(0,0,0,0.05)"};
      border-left: 3pt solid #64748b;
    }
    .callout-block.info {
      background: ${isDefaultPaper ? "#dbeafe" : "rgba(59,130,246,0.1)"};
      border-left: 3pt solid #3b82f6;
    }
    .callout-block.success {
      background: ${isDefaultPaper ? "#dcfce7" : "rgba(34,197,94,0.1)"};
      border-left: 3pt solid #22c55e;
    }
    .callout-block.warning {
      background: ${isDefaultPaper ? "#fef3c7" : "rgba(245,158,11,0.1)"};
      border-left: 3pt solid #f59e0b;
    }
    .callout-block.error {
      background: ${isDefaultPaper ? "#fee2e2" : "rgba(239,68,68,0.1)"};
      border-left: 3pt solid #ef4444;
    }
    .callout-icon {
      font-size: 14pt;
    }
    .callout-content {
      flex: 1;
    }

    .variable-mention {
      background: #dbeafe;
      padding: 1pt 4pt;
      border-radius: 2pt;
      font-size: 10pt;
      color: #1d4ed8;
    }

    /* Block Row (side-by-side layout) */
    .block-row {
      display: flex;
      gap: 16pt;
      margin: 8pt 0;
    }
    .block-row > * {
      flex: 1;
    }

    /* Print styles */
    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  ${bodyHtml}
</body>
</html>`;
}

/**
 * Alternative: Generate just the body HTML without the full document wrapper
 * Useful for embedding in templates or email
 */
export function tiptapToHtmlBody(
  content: string | TiptapNode,
  settings: DocumentSettings = {},
  blocks: BlockData[] = []
): string {
  let parsedContent: TiptapNode;
  if (typeof content === "string") {
    try {
      parsedContent = JSON.parse(content);
    } catch {
      return `<p>${escapeHtml(content)}</p>`;
    }
  } else {
    parsedContent = content;
  }

  const blocksMap: Record<string, BlockData> = {};
  for (const block of blocks) {
    blocksMap[block.id] = block;
  }

  const fontBody = settings.fontBody || "Inter";
  const fontHeading = settings.fontHeading || "Inter";

  return renderNode(parsedContent, blocksMap, fontBody, fontHeading);
}
