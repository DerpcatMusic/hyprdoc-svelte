/**
 * Enhanced Audit Trail PDF Generator - eIDAS 2.0 Compliant
 *
 * Generates a comprehensive audit trail PDF with:
 * - Document overview and integrity hashes
 * - Signer verification chain
 * - **Complete field history table** (what was filled, when, by whom, with what IP)
 * - Cryptographic integrity summary
 * - Hash chain verification status
 * - QR code linking to verification endpoint
 *
 * This is designed to be appended as pages to the sealed document PDF.
 */

import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, type PDFPage, rgb, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";
import type {
  AuditLogEntry,
  EnhancedAuditTrailData,
  FieldChangeRecord,
} from "@/convex/auditLogs/fieldChangeTypes";
import { formatValueForAudit } from "@/convex/auditLogs/fieldChangeTypes";

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

const PAGE_WIDTH = 612; // US Letter
const PAGE_HEIGHT = 792;
const MARGIN = 50;
const LINE_HEIGHT = 14;
const TABLE_ROW_HEIGHT = 18;

// Colors
const PRIMARY_COLOR = rgb(0.13, 0.15, 0.21); // slate-900
const SECONDARY_COLOR = rgb(0.4, 0.45, 0.5); // muted
const ACCENT_COLOR = rgb(0.16, 0.35, 0.65); // blue-600
const BORDER_COLOR = rgb(0.85, 0.87, 0.9); // grey border
const SUCCESS_COLOR = rgb(0.13, 0.55, 0.13); // green
const HEADER_BG = rgb(0.95, 0.96, 0.97); // light grey

// ═══════════════════════════════════════════════════════════════════════════
// Enhanced PDF Generator
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate enhanced audit trail PDF with eIDAS 2 compliant field history
 *
 * @param data - Enhanced audit trail data with field changes
 * @returns PDF as Uint8Array
 */
export async function generateEnhancedAuditTrailPdf(
  data: EnhancedAuditTrailData
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  // Embed fonts
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const monoFont = await pdfDoc.embedFont(StandardFonts.Courier);

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;
  const usableWidth = PAGE_WIDTH - MARGIN * 2;

  // ─────────────────────────────────────────────────────────────────────────
  // Helper Functions
  // ─────────────────────────────────────────────────────────────────────────

  const ensureSpace = (needed: number): PDFPage => {
    if (y < MARGIN + needed) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }
    return page;
  };

  const drawText = (
    text: string,
    options: {
      x?: number;
      size?: number;
      fontType?: "regular" | "bold" | "mono";
      color?: ReturnType<typeof rgb>;
      maxWidth?: number;
    } = {}
  ) => {
    const {
      x = MARGIN,
      size = 10,
      fontType = "regular",
      color = PRIMARY_COLOR,
      maxWidth = usableWidth,
    } = options;
    const usedFont = fontType === "bold" ? boldFont : fontType === "mono" ? monoFont : font;

    // Simple word wrap
    const words = text.split(" ");
    let line = "";
    const lines: string[] = [];

    for (const word of words) {
      const testLine = line ? `${line} ${word}` : word;
      const testWidth = usedFont.widthOfTextAtSize(testLine, size);
      if (testWidth > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = testLine;
      }
    }
    if (line) { lines.push(line); }

    for (const l of lines) {
      ensureSpace(LINE_HEIGHT);
      page.drawText(l, { x, y, size, font: usedFont, color });
      y -= LINE_HEIGHT;
    }
  };

  const drawSectionHeader = (title: string) => {
    ensureSpace(35);
    y -= 15;

    // Draw line
    page.drawLine({
      start: { x: MARGIN, y: y + 10 },
      end: { x: PAGE_WIDTH - MARGIN, y: y + 10 },
      thickness: 0.5,
      color: BORDER_COLOR,
    });

    drawText(title, { size: 12, fontType: "bold", color: ACCENT_COLOR });
    y -= 5;
  };

  const formatTimestamp = (ts: number): string => {
    return `${new Date(ts).toISOString().replace("T", " ").slice(0, 19)} UTC`;
  };

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 1: Document Header
  // ─────────────────────────────────────────────────────────────────────────

  // Title
  page.drawRectangle({
    x: MARGIN,
    y: y - 25,
    width: usableWidth,
    height: 30,
    color: ACCENT_COLOR,
  });

  page.drawText("CERTIFICATE OF COMPLETION", {
    x: MARGIN + 15,
    y: y - 18,
    size: 14,
    font: boldFont,
    color: rgb(1, 1, 1),
  });
  y -= 40;

  // Subtitle
  drawText("eIDAS 2.0 Compliant Electronic Signature Audit Trail", {
    size: 10,
    color: SECONDARY_COLOR,
  });
  y -= 10;

  // Document Info
  drawText(`Document: ${data.documentTitle}`, { size: 11, fontType: "bold" });
  drawText(`Envelope ID: ${data.documentId}`, {
    size: 9,
    color: SECONDARY_COLOR,
    fontType: "mono",
  });
  y -= 5;

  // Timeline
  const created = formatTimestamp(data.createdAt);
  drawText(`Created: ${created}`, { size: 9, color: SECONDARY_COLOR });

  if (data.sealedAt) {
    const sealed = formatTimestamp(data.sealedAt);
    drawText(`Sealed: ${sealed}`, { size: 9, color: SECONDARY_COLOR });
  }

  if (data.completedAt) {
    const completed = formatTimestamp(data.completedAt);
    drawText(`Completed: ${completed}`, { size: 9, color: SUCCESS_COLOR, fontType: "bold" });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 2: Document Integrity
  // ─────────────────────────────────────────────────────────────────────────

  drawSectionHeader("Document Integrity Verification");

  if (data.contentHash) {
    drawText("Original Document SHA-256:", { size: 9, fontType: "bold" });
    drawText(data.contentHash, { size: 8, fontType: "mono", color: SECONDARY_COLOR });
    y -= 3;
  }

  if (data.completedHash) {
    drawText("Final Document SHA-256:", { size: 9, fontType: "bold" });
    drawText(data.completedHash, { size: 8, fontType: "mono", color: SECONDARY_COLOR });
    y -= 3;
  }

  const chainStatus = data.hashChainValid ? "✓ VALID" : "✗ INVALID";
  const chainColor = data.hashChainValid ? SUCCESS_COLOR : rgb(0.8, 0.1, 0.1);
  drawText(`Hash Chain Integrity: ${chainStatus}`, {
    size: 9,
    fontType: "bold",
    color: chainColor,
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 3: Signer Verification Chain
  // ─────────────────────────────────────────────────────────────────────────

  if (data.signers.length > 0) {
    drawSectionHeader("Signer Verification Chain");

    for (const signer of data.signers) {
      ensureSpace(80);

      // Signer name and role
      drawText(`${signer.legalName}`, { size: 10, fontType: "bold" });
      drawText(`Email: ${signer.email}`, { x: MARGIN + 10, size: 9 });
      if (signer.phone) {
        drawText(`Phone: ${signer.phone}`, { x: MARGIN + 10, size: 9 });
      }
      if (signer.role) {
        drawText(`Role: ${signer.role}`, { x: MARGIN + 10, size: 9, color: SECONDARY_COLOR });
      }

      // Verification chain
      if (signer.emailVerifiedAt) {
        const ts = formatTimestamp(signer.emailVerifiedAt);
        drawText(`✓ Email Verified: ${ts}`, { x: MARGIN + 10, size: 8, color: SUCCESS_COLOR });
      }

      if (signer.phoneVerifiedAt) {
        const ts = formatTimestamp(signer.phoneVerifiedAt);
        drawText(`✓ Phone Verified: ${ts}`, { x: MARGIN + 10, size: 8, color: SUCCESS_COLOR });
      }

      if (signer.consentGivenAt) {
        const ts = formatTimestamp(signer.consentGivenAt);
        drawText(`✓ Consent Given: ${ts}`, { x: MARGIN + 10, size: 8, color: SUCCESS_COLOR });
      }

      if (signer.signedAt) {
        const ts = formatTimestamp(signer.signedAt);
        drawText(`✓ Signed: ${ts}`, {
          x: MARGIN + 10,
          size: 8,
          fontType: "bold",
          color: SUCCESS_COLOR,
        });
      }

      // IP/Device
      if (signer.consentIpAddress) {
        drawText(`IP Address: ${signer.consentIpAddress}`, {
          x: MARGIN + 10,
          size: 7,
          color: SECONDARY_COLOR,
        });
      }

      y -= 10;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 4: Complete Field History Table (Core eIDAS 2 Requirement)
  // ─────────────────────────────────────────────────────────────────────────

  if (data.fieldChanges.length > 0) {
    drawSectionHeader("Complete Field Change History");

    drawText(
      "The following table provides an irrefutable record of every field filled during the signing process:",
      { size: 8, color: SECONDARY_COLOR }
    );
    y -= 8;

    // Table Header
    const colWidths = [100, 60, 80, 100, 80, 92]; // Label, Type, Signer, Value, IP, Time
    const headerLabels = ["Field Label", "Type", "Signer", "Value", "IP Address", "Timestamp"];

    ensureSpace(TABLE_ROW_HEIGHT * 2);

    // Draw header background
    page.drawRectangle({
      x: MARGIN,
      y: y - TABLE_ROW_HEIGHT + 4,
      width: usableWidth,
      height: TABLE_ROW_HEIGHT,
      color: HEADER_BG,
    });

    // Draw header text
    let headerX = MARGIN + 3;
    for (let i = 0; i < headerLabels.length; i++) {
      page.drawText(headerLabels[i], {
        x: headerX,
        y: y - 10,
        size: 7,
        font: boldFont,
        color: PRIMARY_COLOR,
      });
      headerX += colWidths[i];
    }
    y -= TABLE_ROW_HEIGHT;

    // Table Rows
    for (const change of data.fieldChanges) {
      ensureSpace(TABLE_ROW_HEIGHT + 5);

      // Draw row border
      page.drawLine({
        start: { x: MARGIN, y: y + 4 },
        end: { x: PAGE_WIDTH - MARGIN, y: y + 4 },
        thickness: 0.25,
        color: BORDER_COLOR,
      });

      let rowX = MARGIN + 3;

      // Label (truncate if too long)
      const label = change.label.slice(0, 18) + (change.label.length > 18 ? "..." : "");
      page.drawText(label, { x: rowX, y: y - 8, size: 7, font, color: PRIMARY_COLOR });
      rowX += colWidths[0];

      // Block Type
      const blockType = change.blockType.replace(/_/g, " ");
      page.drawText(blockType, { x: rowX, y: y - 8, size: 7, font, color: SECONDARY_COLOR });
      rowX += colWidths[1];

      // Signer
      const signerName = change.changedBy.signerName.slice(0, 14);
      page.drawText(signerName, { x: rowX, y: y - 8, size: 7, font, color: PRIMARY_COLOR });
      rowX += colWidths[2];

      // Value (with hash for sensitive)
      const displayValue = formatValueForAudit(
        change.newValue,
        change.isSensitive ?? false,
        change.valueHash
      );
      const truncatedValue = displayValue.slice(0, 18) + (displayValue.length > 18 ? "..." : "");
      page.drawText(truncatedValue, { x: rowX, y: y - 8, size: 7, font, color: PRIMARY_COLOR });
      rowX += colWidths[3];

      // IP Address
      const ip = change.context.ipAddress || "—";
      page.drawText(ip.slice(0, 15), {
        x: rowX,
        y: y - 8,
        size: 6,
        font: monoFont,
        color: SECONDARY_COLOR,
      });
      rowX += colWidths[4];

      // Timestamp
      const ts = new Date(change.changedAt).toISOString().slice(0, 19).replace("T", " ");
      page.drawText(ts, { x: rowX, y: y - 8, size: 6, font: monoFont, color: SECONDARY_COLOR });

      y -= TABLE_ROW_HEIGHT;
    }

    y -= 5;

    // Value Hash Legend
    drawText(
      "* Signature and initial values are cryptographically hashed. Hash prefix shown for verification.",
      {
        size: 6,
        color: SECONDARY_COLOR,
      }
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 5: Event Timeline
  // ─────────────────────────────────────────────────────────────────────────

  if (data.auditLogs.length > 0) {
    drawSectionHeader("Event Timeline");

    const sortedLogs = [...data.auditLogs].sort((a, b) => a.timestamp - b.timestamp);
    const displayLogs = sortedLogs.slice(0, 30); // Limit to 30 for space

    for (const log of displayLogs) {
      ensureSpace(LINE_HEIGHT);

      const ts = formatTimestamp(log.timestamp);
      const action = log.action.replace(/\./g, " ").replace(/_/g, " ");

      drawText(`${ts}  ${action}`, {
        size: 8,
        color: log.level === "security" ? ACCENT_COLOR : SECONDARY_COLOR,
      });
    }

    if (sortedLogs.length > 30) {
      drawText(`... and ${sortedLogs.length - 30} more events`, {
        size: 8,
        color: SECONDARY_COLOR,
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 6: Verification Link & QR Code Placeholder
  // ─────────────────────────────────────────────────────────────────────────

  if (data.verificationUrl) {
    drawSectionHeader("Verification");

    drawText("Verify this document at:", { size: 9, fontType: "bold" });
    drawText(data.verificationUrl, { size: 9, fontType: "mono", color: ACCENT_COLOR });
    y -= 10;

    // Generate real QR Code
    try {
      const qrDataUrl = await QRCode.toDataURL(data.verificationUrl, {
        width: 120,
        margin: 1,
        color: { dark: "#000000", light: "#ffffff" },
      });

      // Convert data URL to bytes
      const base64Data = qrDataUrl.split(",")[1];
      const qrImageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

      // Embed the QR code image
      const qrImage = await pdfDoc.embedPng(qrImageBytes);
      const qrSize = 60;

      page.drawImage(qrImage, {
        x: MARGIN,
        y: y - qrSize,
        width: qrSize,
        height: qrSize,
      });

      // Add instruction text next to QR code
      page.drawText("Scan to verify document integrity", {
        x: MARGIN + qrSize + 10,
        y: y - 30,
        size: 8,
        font,
        color: SECONDARY_COLOR,
      });

      y -= qrSize + 10;
    } catch (qrError) {
      // Fallback to placeholder if QR generation fails
      console.warn("QR code generation failed:", qrError);
      page.drawRectangle({
        x: MARGIN,
        y: y - 60,
        width: 60,
        height: 60,
        borderColor: BORDER_COLOR,
        borderWidth: 1,
      });
      page.drawText("QR", {
        x: MARGIN + 23,
        y: y - 35,
        size: 12,
        font: boldFont,
        color: SECONDARY_COLOR,
      });
      y -= 70;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FOOTER on all pages
  // ─────────────────────────────────────────────────────────────────────────

  const pages = pdfDoc.getPages();
  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    p.drawLine({
      start: { x: MARGIN, y: 35 },
      end: { x: PAGE_WIDTH - MARGIN, y: 35 },
      thickness: 0.5,
      color: BORDER_COLOR,
    });
    p.drawText(`Audit Trail | Page ${i + 1} of ${pages.length} | Generated by HyprDoc`, {
      x: MARGIN,
      y: 20,
      size: 8,
      font,
      color: SECONDARY_COLOR,
    });
    p.drawText(`Envelope: ${data.documentId.slice(0, 20)}...`, {
      x: PAGE_WIDTH - MARGIN - 130,
      y: 20,
      size: 8,
      font: monoFont,
      color: SECONDARY_COLOR,
    });
  }

  return pdfDoc.save();
}

// ═══════════════════════════════════════════════════════════════════════════
// Page Generator (for appending to existing PDF)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate audit trail and append to an existing PDF document
 *
 * @param documentPdf - The existing document PDF bytes
 * @param auditData - Enhanced audit trail data
 * @returns Combined PDF with audit trail appended
 */
export async function appendAuditTrailToDocument(
  documentPdf: Uint8Array,
  auditData: EnhancedAuditTrailData
): Promise<Uint8Array> {
  // Generate standalone audit trail PDF
  const auditPdfBytes = await generateEnhancedAuditTrailPdf(auditData);

  // Load both PDFs
  const mainDoc = await PDFDocument.load(documentPdf);
  const auditDoc = await PDFDocument.load(auditPdfBytes);

  // Copy audit trail pages to main document
  const auditPages = await mainDoc.copyPages(auditDoc, auditDoc.getPageIndices());
  for (const auditPage of auditPages) {
    mainDoc.addPage(auditPage);
  }

  return mainDoc.save();
}

// ═══════════════════════════════════════════════════════════════════════════
// Helper: Build field changes from audit logs
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Extract field changes from raw audit logs
 * This is used when legacy audit logs don't have the new structure
 */
export function extractFieldChangesFromAuditLogs(
  auditLogs: AuditLogEntry[],
  _signerMap: Map<string, { name: string; email: string; role?: string }>
): FieldChangeRecord[] {
  const fieldChanges: FieldChangeRecord[] = [];

  for (const log of auditLogs) {
    // Look for field update actions
    if (log.action.includes("field.") && log.metadata?.fieldChange) {
      const fc = log.metadata.fieldChange as any;
      const signerInfo = fc.signer || log.metadata?.signer;

      fieldChanges.push({
        blockId: fc.blockId || "",
        blockType: fc.blockType || "unknown",
        label: fc.label || "Field",
        previousValue: fc.previousValue,
        newValue: fc.newValue,
        valueHash: fc.valueHash || "",
        fieldPosition: fc.fieldPosition,
        isRequired: fc.isRequired,
        isSensitive: fc.isSensitive,
        changedAt: log.timestamp,
        changedBy: {
          signerId: signerInfo?.signerId || "",
          signerName: signerInfo?.signerName || "Unknown",
          signerEmail: signerInfo?.signerEmail || "",
          signerRole: signerInfo?.signerRole,
        },
        context: {
          ipAddress: log.ipAddress,
          userAgent: log.userAgent,
          geoLocation: log.geoLocation,
        },
      });
    }
  }

  return fieldChanges.sort((a, b) => a.changedAt - b.changedAt);
}
