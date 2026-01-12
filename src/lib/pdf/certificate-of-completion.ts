/**
 * Certificate of Completion PDF Generator
 *
 * Generates a professional legal receipt PDF for completed documents.
 * Distinct from the audit trail - this is a formal certificate that serves as
 * irrefutable proof of the signing event.
 *
 * Features:
 * - Sequential certificate number (COC-YYYY-NNNNN)
 * - Professional certificate design with borders
 * - WHO/WHAT/WHEN/HOW/PROOF summary format
 * - Legal disclaimers (ESIGN Act, UETA, eIDAS)
 * - QR code for verification
 * - HyprDoc seal/branding
 */

import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface SignerSummary {
  name: string;
  email: string;
  role: string;
  signedAt: number;
  verificationMethods: ("email" | "phone" | "consent")[];
}

export interface CertificateData {
  // Certificate Identity
  certificateNumber: string; // e.g., "COC-2026-00047"

  // Document Info
  documentId: string;
  documentTitle: string;
  documentType: "envelope" | "template";

  // Timeline
  createdAt: number;
  completedAt: number;

  // Cryptographic Proof
  contentHash: string;
  completedHash: string;

  // Signers
  signers: SignerSummary[];

  // Verification
  verificationUrl?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

const PAGE_WIDTH = 612; // US Letter
const PAGE_HEIGHT = 792;
const MARGIN = 50;
const INNER_MARGIN = 65; // Inside the border
const LINE_HEIGHT = 16;

// Colors - Professional blue/gold theme
const PRIMARY_COLOR = rgb(0.13, 0.22, 0.38); // Dark navy
const SECONDARY_COLOR = rgb(0.4, 0.45, 0.5); // Muted gray
const ACCENT_COLOR = rgb(0.16, 0.35, 0.65); // Professional blue
const GOLD_COLOR = rgb(0.72, 0.53, 0.04); // Certificate gold
const BORDER_COLOR = rgb(0.16, 0.35, 0.65); // Blue border
const SUCCESS_COLOR = rgb(0.13, 0.55, 0.13); // Green for verified

// ═══════════════════════════════════════════════════════════════════════════
// PDF Generator
// ═══════════════════════════════════════════════════════════════════════════

export async function generateCertificateOfCompletion(data: CertificateData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  // Embed fonts
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const monoFont = await pdfDoc.embedFont(StandardFonts.Courier);

  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;
  const _usableWidth = PAGE_WIDTH - INNER_MARGIN * 2;

  // ─────────────────────────────────────────────────────────────────────────
  // Helper Functions
  // ─────────────────────────────────────────────────────────────────────────

  const _drawText = (
    text: string,
    options: {
      x?: number;
      size?: number;
      fontType?: "regular" | "bold" | "mono";
      color?: ReturnType<typeof rgb>;
      align?: "left" | "center";
    } = {}
  ) => {
    const {
      x = INNER_MARGIN,
      size = 10,
      fontType = "regular",
      color = PRIMARY_COLOR,
      align = "left",
    } = options;
    const usedFont = fontType === "bold" ? boldFont : fontType === "mono" ? monoFont : font;

    let drawX = x;
    if (align === "center") {
      const textWidth = usedFont.widthOfTextAtSize(text, size);
      drawX = (PAGE_WIDTH - textWidth) / 2;
    }

    page.drawText(text, { x: drawX, y, size, font: usedFont, color });
    y -= LINE_HEIGHT;
  };

  const formatTimestamp = (ts: number): string => {
    const date = new Date(ts);
    return date.toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZoneName: "short",
    });
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Draw Decorative Border (Double-line frame)
  // ─────────────────────────────────────────────────────────────────────────

  // Outer border
  page.drawRectangle({
    x: MARGIN,
    y: MARGIN,
    width: PAGE_WIDTH - MARGIN * 2,
    height: PAGE_HEIGHT - MARGIN * 2,
    borderColor: BORDER_COLOR,
    borderWidth: 2,
  });

  // Inner border
  page.drawRectangle({
    x: MARGIN + 8,
    y: MARGIN + 8,
    width: PAGE_WIDTH - MARGIN * 2 - 16,
    height: PAGE_HEIGHT - MARGIN * 2 - 16,
    borderColor: BORDER_COLOR,
    borderWidth: 0.5,
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Header: Certificate Title
  // ─────────────────────────────────────────────────────────────────────────

  y = PAGE_HEIGHT - 90;

  // Main title
  page.drawText("CERTIFICATE OF COMPLETION", {
    x: (PAGE_WIDTH - boldFont.widthOfTextAtSize("CERTIFICATE OF COMPLETION", 22)) / 2,
    y,
    size: 22,
    font: boldFont,
    color: PRIMARY_COLOR,
  });
  y -= 28;

  // Decorative line under title
  const lineWidth = 250;
  page.drawLine({
    start: { x: (PAGE_WIDTH - lineWidth) / 2, y: y + 8 },
    end: { x: (PAGE_WIDTH + lineWidth) / 2, y: y + 8 },
    thickness: 1,
    color: GOLD_COLOR,
  });
  y -= 15;

  // Subtitle
  page.drawText("Electronic Signature Legal Receipt", {
    x: (PAGE_WIDTH - font.widthOfTextAtSize("Electronic Signature Legal Receipt", 11)) / 2,
    y,
    size: 11,
    font,
    color: SECONDARY_COLOR,
  });
  y -= 30;

  // Certificate Number (prominent)
  page.drawText(data.certificateNumber, {
    x: (PAGE_WIDTH - monoFont.widthOfTextAtSize(data.certificateNumber, 12)) / 2,
    y,
    size: 12,
    font: monoFont,
    color: ACCENT_COLOR,
  });
  y -= 40;

  // ─────────────────────────────────────────────────────────────────────────
  // Section: WHAT was signed
  // ─────────────────────────────────────────────────────────────────────────

  page.drawText("DOCUMENT", {
    x: INNER_MARGIN,
    y,
    size: 9,
    font: boldFont,
    color: SECONDARY_COLOR,
  });
  y -= 18;

  page.drawText(data.documentTitle, {
    x: INNER_MARGIN,
    y,
    size: 14,
    font: boldFont,
    color: PRIMARY_COLOR,
  });
  y -= 18;

  page.drawText(`ID: ${data.documentId}`, {
    x: INNER_MARGIN,
    y,
    size: 8,
    font: monoFont,
    color: SECONDARY_COLOR,
  });
  y -= 30;

  // ─────────────────────────────────────────────────────────────────────────
  // Section: WHEN completed
  // ─────────────────────────────────────────────────────────────────────────

  page.drawText("COMPLETED", {
    x: INNER_MARGIN,
    y,
    size: 9,
    font: boldFont,
    color: SECONDARY_COLOR,
  });
  y -= 18;

  page.drawText(formatTimestamp(data.completedAt), {
    x: INNER_MARGIN,
    y,
    size: 11,
    font: boldFont,
    color: SUCCESS_COLOR,
  });
  y -= 30;

  // ─────────────────────────────────────────────────────────────────────────
  // Section: WHO signed
  // ─────────────────────────────────────────────────────────────────────────

  page.drawText("SIGNATORIES", {
    x: INNER_MARGIN,
    y,
    size: 9,
    font: boldFont,
    color: SECONDARY_COLOR,
  });
  y -= 20;

  for (const signer of data.signers) {
    // Name and role
    page.drawText(`${signer.name}`, {
      x: INNER_MARGIN + 10,
      y,
      size: 11,
      font: boldFont,
      color: PRIMARY_COLOR,
    });

    page.drawText(`(${signer.role})`, {
      x: INNER_MARGIN + 15 + boldFont.widthOfTextAtSize(signer.name, 11),
      y,
      size: 10,
      font,
      color: SECONDARY_COLOR,
    });
    y -= 16;

    // Email
    page.drawText(signer.email, {
      x: INNER_MARGIN + 10,
      y,
      size: 9,
      font,
      color: SECONDARY_COLOR,
    });
    y -= 14;

    // Verification methods
    const methods = signer.verificationMethods.map((m) => {
      if (m === "email") { return "✓ Email Verified"; }
      if (m === "phone") { return "✓ Phone Verified"; }
      if (m === "consent") { return "✓ Consent Captured"; }
      return m;
    });
    page.drawText(methods.join("  |  "), {
      x: INNER_MARGIN + 10,
      y,
      size: 8,
      font,
      color: SUCCESS_COLOR,
    });
    y -= 14;

    // Signed timestamp
    const signedDate = new Date(signer.signedAt).toISOString().replace("T", " ").slice(0, 19);
    page.drawText(`Signed: ${signedDate} UTC`, {
      x: INNER_MARGIN + 10,
      y,
      size: 8,
      font: monoFont,
      color: SECONDARY_COLOR,
    });
    y -= 22;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Section: PROOF (Cryptographic Integrity)
  // ─────────────────────────────────────────────────────────────────────────

  y -= 10;
  page.drawText("CRYPTOGRAPHIC PROOF", {
    x: INNER_MARGIN,
    y,
    size: 9,
    font: boldFont,
    color: SECONDARY_COLOR,
  });
  y -= 18;

  page.drawText("Original Document Hash (SHA-256):", {
    x: INNER_MARGIN + 10,
    y,
    size: 8,
    font,
    color: SECONDARY_COLOR,
  });
  y -= 12;

  page.drawText(data.contentHash, {
    x: INNER_MARGIN + 10,
    y,
    size: 7,
    font: monoFont,
    color: PRIMARY_COLOR,
  });
  y -= 16;

  page.drawText("Final Document Hash (SHA-256):", {
    x: INNER_MARGIN + 10,
    y,
    size: 8,
    font,
    color: SECONDARY_COLOR,
  });
  y -= 12;

  page.drawText(data.completedHash, {
    x: INNER_MARGIN + 10,
    y,
    size: 7,
    font: monoFont,
    color: PRIMARY_COLOR,
  });
  y -= 25;

  // ─────────────────────────────────────────────────────────────────────────
  // Section: Verification QR Code
  // ─────────────────────────────────────────────────────────────────────────

  if (data.verificationUrl) {
    try {
      const qrDataUrl = await QRCode.toDataURL(data.verificationUrl, {
        width: 100,
        margin: 1,
        color: { dark: "#000000", light: "#ffffff" },
      });

      const base64Data = qrDataUrl.split(",")[1];
      const qrImageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
      const qrImage = await pdfDoc.embedPng(qrImageBytes);
      const qrSize = 60;

      page.drawImage(qrImage, {
        x: PAGE_WIDTH - INNER_MARGIN - qrSize,
        y: y - qrSize + 40,
        width: qrSize,
        height: qrSize,
      });

      page.drawText("Scan to verify", {
        x: PAGE_WIDTH - INNER_MARGIN - qrSize - 5,
        y: y - qrSize + 30,
        size: 7,
        font,
        color: SECONDARY_COLOR,
      });
    } catch {
      // QR generation failed, continue without it
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Legal Disclaimer
  // ─────────────────────────────────────────────────────────────────────────

  y = MARGIN + 120;

  page.drawLine({
    start: { x: INNER_MARGIN, y: y + 10 },
    end: { x: PAGE_WIDTH - INNER_MARGIN, y: y + 10 },
    thickness: 0.5,
    color: BORDER_COLOR,
  });

  y -= 5;

  const disclaimer = `This Certificate of Completion serves as legal evidence that the above-referenced document was 
electronically signed by all listed parties. Electronic signatures on this document are legally binding 
under the U.S. Electronic Signatures in Global and National Commerce Act (ESIGN Act, 15 U.S.C. § 7001), 
the Uniform Electronic Transactions Act (UETA), and the European eIDAS Regulation (EU No 910/2014).`;

  const disclaimerLines = disclaimer.split("\n");
  for (const line of disclaimerLines) {
    page.drawText(line.trim(), {
      x: INNER_MARGIN,
      y,
      size: 7,
      font,
      color: SECONDARY_COLOR,
    });
    y -= 10;
  }

  y -= 8;

  page.drawText(
    "This certificate was generated by HyprDoc and can be independently verified using the document hash above.",
    {
      x: INNER_MARGIN,
      y,
      size: 7,
      font,
      color: SECONDARY_COLOR,
    }
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Footer: HyprDoc Branding
  // ─────────────────────────────────────────────────────────────────────────

  page.drawText("Generated by HyprDoc", {
    x: (PAGE_WIDTH - boldFont.widthOfTextAtSize("Generated by HyprDoc", 9)) / 2,
    y: MARGIN + 25,
    size: 9,
    font: boldFont,
    color: ACCENT_COLOR,
  });

  page.drawText("hyprdoc.app", {
    x: (PAGE_WIDTH - font.widthOfTextAtSize("hyprdoc.app", 8)) / 2,
    y: MARGIN + 12,
    size: 8,
    font,
    color: SECONDARY_COLOR,
  });

  return pdfDoc.save();
}

// ═══════════════════════════════════════════════════════════════════════════
// Certificate Number Generator
// ═══════════════════════════════════════════════════════════════════════════

export function formatCertificateNumber(year: number, sequence: number): string {
  return `COC-${year}-${sequence.toString().padStart(5, "0")}`;
}
