/**
 * Audit Trail PDF Generator
 *
 * Generates a comprehensive audit trail PDF documenting:
 * - Document metadata
 * - Integrity checksums
 * - Signer verification details
 * - Complete event log
 */

import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export interface SignerInfo {
  legalName: string;
  email: string;
  phone?: string;
  role?: string;
  emailVerifiedAt?: number;
  phoneVerifiedAt?: number;
  consentGivenAt?: number;
  signedAt?: number;
  consentIpAddress?: string;
  consentUserAgent?: string;
}

export interface AuditLogEntry {
  timestamp: number;
  action: string;
  level?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditTrailData {
  documentId: string;
  documentTitle: string;
  createdAt: number;
  sealedAt?: number;
  completedAt?: number;
  contentHash?: string;
  completedHash?: string;
  signers: SignerInfo[];
  auditLogs: AuditLogEntry[];
}

/**
 * Generate an audit trail PDF
 *
 * @param data - Audit trail data including document info, signers, and logs
 * @returns PDF as Uint8Array
 */
export async function generateAuditTrailPdf(data: AuditTrailData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  // Embed fonts
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Page dimensions (US Letter)
  const pageWidth = 612;
  const pageHeight = 792;
  const margin = 50;
  const lineHeight = 14;

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  // Helper to add new page if needed
  const ensureSpace = (needed: number) => {
    if (y < margin + needed) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
  };

  // Helper to draw text
  const drawText = (
    text: string,
    {
      x = margin,
      size = 10,
      isBold = false,
      color = rgb(0, 0, 0),
      maxWidth = pageWidth - margin * 2,
    }: {
      x?: number;
      size?: number;
      isBold?: boolean;
      color?: ReturnType<typeof rgb>;
      maxWidth?: number;
    } = {}
  ) => {
    const usedFont = isBold ? boldFont : font;

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
      ensureSpace(lineHeight);
      page.drawText(l, { x, y, size, font: usedFont, color });
      y -= lineHeight;
    }
  };

  // Helper for section headers
  const drawSectionHeader = (title: string) => {
    ensureSpace(30);
    y -= 10;
    drawText(title, { size: 12, isBold: true });
    y -= 5;
  };

  // ═══════════════════════════════════════════════════════════════
  // HEADER
  // ═══════════════════════════════════════════════════════════════
  drawText("AUDIT LOG", { size: 18, isBold: true });
  y -= 10;

  drawText(`Document: ${data.documentTitle}`, { size: 12, isBold: true });
  drawText(`Envelope ID: ${data.documentId}`, { size: 10, color: rgb(0.3, 0.3, 0.3) });

  const createdDate = new Date(data.createdAt).toISOString();
  drawText(`Created: ${createdDate}`, { size: 9, color: rgb(0.4, 0.4, 0.4) });

  if (data.sealedAt) {
    const sealedDate = new Date(data.sealedAt).toISOString();
    drawText(`Sealed: ${sealedDate}`, { size: 9, color: rgb(0.4, 0.4, 0.4) });
  }

  if (data.completedAt) {
    const completedDate = new Date(data.completedAt).toISOString();
    drawText(`Completed: ${completedDate}`, { size: 9, color: rgb(0.4, 0.4, 0.4) });
  }

  // ═══════════════════════════════════════════════════════════════
  // DOCUMENT INTEGRITY
  // ═══════════════════════════════════════════════════════════════
  if (data.contentHash || data.completedHash) {
    drawSectionHeader("Document Integrity");

    if (data.contentHash) {
      drawText(`Original SHA-256: ${data.contentHash}`, { size: 8, color: rgb(0.3, 0.3, 0.3) });
    }
    if (data.completedHash) {
      drawText(`Final SHA-256: ${data.completedHash}`, { size: 8, color: rgb(0.3, 0.3, 0.3) });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // SIGNERS
  // ═══════════════════════════════════════════════════════════════
  if (data.signers.length > 0) {
    drawSectionHeader("Signers");

    for (const signer of data.signers) {
      ensureSpace(80);

      drawText(`• ${signer.legalName}`, { x: margin + 10, size: 10, isBold: true });
      drawText(`Email: ${signer.email}`, { x: margin + 20, size: 9 });

      if (signer.phone) {
        drawText(`Phone: ${signer.phone}`, { x: margin + 20, size: 9 });
      }

      if (signer.role) {
        drawText(`Role: ${signer.role}`, { x: margin + 20, size: 9 });
      }

      // Verification status
      const emailVerified = signer.emailVerifiedAt
        ? `✓ ${new Date(signer.emailVerifiedAt).toISOString()}`
        : "✗ Not verified";
      drawText(`Email Verification: ${emailVerified}`, {
        x: margin + 20,
        size: 8,
        color: signer.emailVerifiedAt ? rgb(0, 0.5, 0) : rgb(0.5, 0, 0),
      });

      if (signer.phone) {
        const phoneVerified = signer.phoneVerifiedAt
          ? `✓ ${new Date(signer.phoneVerifiedAt).toISOString()}`
          : "✗ Not verified";
        drawText(`Phone Verification: ${phoneVerified}`, {
          x: margin + 20,
          size: 8,
          color: signer.phoneVerifiedAt ? rgb(0, 0.5, 0) : rgb(0.5, 0, 0),
        });
      }

      // Consent record
      if (signer.consentGivenAt) {
        drawText(`Consent Given: ${new Date(signer.consentGivenAt).toISOString()}`, {
          x: margin + 20,
          size: 8,
        });
      }

      if (signer.signedAt) {
        drawText(`Signed: ${new Date(signer.signedAt).toISOString()}`, {
          x: margin + 20,
          size: 8,
          color: rgb(0, 0.5, 0),
        });
      }

      if (signer.consentIpAddress) {
        drawText(`IP Address: ${signer.consentIpAddress}`, {
          x: margin + 20,
          size: 8,
          color: rgb(0.4, 0.4, 0.4),
        });
      }

      if (signer.consentUserAgent) {
        const ua =
          signer.consentUserAgent.slice(0, 80) + (signer.consentUserAgent.length > 80 ? "..." : "");
        drawText(`User Agent: ${ua}`, {
          x: margin + 20,
          size: 7,
          color: rgb(0.4, 0.4, 0.4),
        });
      }

      y -= 10; // Space between signers
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // EVENT LOG
  // ═══════════════════════════════════════════════════════════════
  if (data.auditLogs.length > 0) {
    drawSectionHeader("Event Log");

    // Sort by timestamp
    const sortedLogs = [...data.auditLogs].sort((a, b) => a.timestamp - b.timestamp);

    for (const log of sortedLogs) {
      ensureSpace(30);

      const timestamp = new Date(log.timestamp).toISOString();
      const levelColor =
        log.level === "error"
          ? rgb(0.8, 0, 0)
          : log.level === "security"
            ? rgb(0.8, 0.4, 0)
            : rgb(0, 0, 0);

      drawText(`${timestamp}`, { size: 8, color: rgb(0.4, 0.4, 0.4) });
      drawText(`  ${log.action}`, { size: 9, color: levelColor });

      if (log.ipAddress) {
        drawText(`  IP: ${log.ipAddress}`, { size: 7, color: rgb(0.5, 0.5, 0.5) });
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // FOOTER
  // ═══════════════════════════════════════════════════════════════
  const pages = pdfDoc.getPages();
  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    p.drawText(`Page ${i + 1} of ${pages.length} | Generated by HyprDoc`, {
      x: margin,
      y: 20,
      size: 8,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });
    p.drawText(`Audit Trail ID: ${data.documentId}`, {
      x: pageWidth - margin - 150,
      y: 20,
      size: 8,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });
  }

  return pdfDoc.save();
}
