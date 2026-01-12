/**
 * Client-side PDF Export
 *
 * Uses html2pdf.js for browser-based PDF generation.
 * This approach works without requiring server-side Puppeteer/Chrome.
 */

import type { BlockData, DocumentSettings } from "./tiptap-to-html";
import { tiptapToHtmlBody } from "./tiptap-to-html";

interface ClientPdfExportOptions {
  title?: string;
  filename?: string;
  settings?: DocumentSettings;
  margin?: number;
  pageFormat?: "a4" | "letter";
  includeTimestamp?: boolean;
}

/**
 * Export Tiptap content to PDF client-side using html2pdf.js
 *
 * @param content - Tiptap JSON content (string or parsed object)
 * @param blocks - Block data with values
 * @param options - Export options
 */
export async function exportToPdfClientSide(
  content: string | object,
  blocks: BlockData[] = [],
  options: ClientPdfExportOptions = {}
): Promise<void> {
  const {
    filename = "document.pdf",
    settings = {},
    margin = 72,
    pageFormat = "letter",
    includeTimestamp = false,
  } = options;

  // Allow UI to update (show loading state) before heavy processing
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

  // Dynamically import html2pdf.js (it's client-side only)
  const html2pdf = (await import("html2pdf.js")).default;

  // Generate HTML body from Tiptap content
  const bodyHtml = tiptapToHtmlBody(content as any, settings, blocks);

  // Settings with defaults
  const paperColor = settings.paperColor || "#ffffff";
  const fontBody = settings.fontBody || "Inter";
  const fontHeading = settings.fontHeading || "Inter";

  // Create a complete HTML document for rendering with RTL support and Hebrew fonts
  const fullHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Hebrew:wght@400;500;600;700&family=${encodeURIComponent(fontBody)}:wght@400;500;600;700&family=${encodeURIComponent(fontHeading)}:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: '${fontBody}', 'Noto Sans Hebrew', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 12pt;
      line-height: 1.6;
      color: #0f172a;
      background: ${paperColor};
    }
    /* RTL support for Hebrew/Arabic text */
    [dir="rtl"], :lang(he), :lang(ar) { direction: rtl; text-align: right; }
    p:has([lang="he"]), p:has([lang="ar"]) { direction: rtl; text-align: right; }
    h1 { font-size: 28pt; font-weight: 800; margin: 24pt 0 12pt; line-height: 1.2; }
    h2 { font-size: 22pt; font-weight: 700; margin: 20pt 0 10pt; line-height: 1.3; }
    h3 { font-size: 16pt; font-weight: 600; margin: 16pt 0 8pt; line-height: 1.4; }
    h1, h2, h3 { font-family: '${fontHeading}', 'Noto Sans Hebrew', sans-serif; }
    p { margin: 8pt 0; }
    .bullet-list, .ordered-list { margin: 8pt 0; padding-left: 24pt; }
    .bullet-list { list-style-type: disc; }
    .ordered-list { list-style-type: decimal; }
    li { margin: 4pt 0; }
    .blockquote {
      border-left: 3pt solid #e0e0e0;
      padding-left: 16pt;
      margin: 12pt 0;
      font-style: italic;
      color: #64748b;
    }
    .code-block {
      background: #f5f5f5;
      padding: 12pt;
      border-radius: 4pt;
      font-family: 'SF Mono', Monaco, monospace;
      font-size: 10pt;
      overflow-x: auto;
    }
    .horizontal-rule {
      border: none;
      border-top: 1pt solid #e0e0e0;
      margin: 16pt 0;
    }
    .smart-block {
      display: inline-block;
      padding: 4pt 8pt;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      border-radius: 4pt;
      margin: 2pt 0;
    }
    .signature-block {
      display: inline-block;
      min-width: 150pt;
      border-bottom: 1pt solid #0f172a;
      margin: 4pt 0;
    }
    .signature-block img {
      max-height: 50pt;
      display: block;
    }
    .tiptap-table {
      width: 100%;
      border-collapse: collapse;
      margin: 12pt 0;
    }
    .tiptap-table td, .tiptap-table th {
      border: 1pt solid #e2e8f0;
      padding: 8pt;
      text-align: left;
    }
    .tiptap-table th {
      background: #f8fafc;
      font-weight: 600;
    }
    .timestamp-footer {
      margin-top: 24pt;
      padding-top: 12pt;
      border-top: 1pt solid #e0e0e0;
      font-size: 9pt;
      color: #64748b;
    }
  </style>
</head>
<body>
  ${bodyHtml}
  ${includeTimestamp ? `<div class="timestamp-footer">Generated: ${new Date().toISOString()}</div>` : ""}
</body>
</html>
  `.trim();

  // Create a temporary container
  const container = document.createElement("div");
  container.innerHTML = fullHtml;
  container.style.cssText = "position: absolute; left: -9999px; top: 0;";
  document.body.appendChild(container);

  // Wait for fonts to load
  await document.fonts.ready;
  await new Promise((resolve) => setTimeout(resolve, 500)); // Extra delay for font rendering

  try {
    // Configure html2pdf options
    const pdfOptions = {
      margin: margin / 72, // Convert points to inches
      filename: filename.endsWith(".pdf") ? filename : `${filename}.pdf`,
      image: { type: "jpeg" as const, quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
        letterRendering: true,
      },
      jsPDF: {
        unit: "in",
        format: pageFormat,
        orientation: "portrait" as const,
      },
    };

    // Generate and download PDF with timeout protection
    const PDF_TIMEOUT = 60_000; // 60 seconds timeout
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("PDF generation timed out after 60 seconds")), PDF_TIMEOUT)
    );

    await Promise.race([html2pdf().set(pdfOptions).from(container).save(), timeoutPromise]);

    console.log("[Client PDF Export] Successfully exported:", filename);
  } finally {
    // Clean up
    document.body.removeChild(container);
  }
}

/**
 * Export Tiptap content to PDF Blob (for programmatic use)
 */
export async function exportToPdfBlob(
  content: string | object,
  blocks: BlockData[] = [],
  options: ClientPdfExportOptions = {}
): Promise<Blob> {
  const html2pdf = (await import("html2pdf.js")).default;

  const bodyHtml = tiptapToHtmlBody(content as any, options.settings || {}, blocks);
  const fontBody = options.settings?.fontBody || "Inter";
  const fontHeading = options.settings?.fontHeading || "Inter";

  const fullHtml = `
<html>
<head>
  <meta charset="UTF-8">
  <link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontBody)}:wght@400;500;600;700&family=${encodeURIComponent(fontHeading)}:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: '${fontBody}', sans-serif;
      font-size: 12pt;
      line-height: 1.6;
      color: #0f172a;
    }
    h1, h2, h3 { font-family: '${fontHeading}', sans-serif; }
    p { margin: 8pt 0; }
    .smart-block { padding: 4pt 8pt; background: #f1f5f9; border-radius: 4pt; }
  </style>
</head>
<body>${bodyHtml}</body>
</html>
  `;

  const container = document.createElement("div");
  container.innerHTML = fullHtml;
  container.style.cssText = "position: absolute; left: -9999px;";
  document.body.appendChild(container);

  await document.fonts.ready;

  try {
    const pdfBlob = await html2pdf()
      .set({
        margin: 1,
        filename: options.filename || "document.pdf",
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "in", format: options.pageFormat || "letter", orientation: "portrait" },
      })
      .from(container)
      .outputPdf("blob");

    return pdfBlob;
  } finally {
    document.body.removeChild(container);
  }
}
