/**
 * PDF Signing Utilities
 *
 * Functions for embedding signature images and digitally signing PDFs.
 * Uses pdf-lib for manipulation and node-signpdf for cryptographic signing.
 */

import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

// node-signpdf v3 uses default export
// eslint-disable-next-line @typescript-eslint/no-require-imports
const signpdf = require("node-signpdf").default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { plainAddPlaceholder } = require("node-signpdf/dist/helpers");

export interface SignatureLocation {
  signatureData: string; // Base64 PNG data URL
  pdfPage: number; // Page number (0-indexed)
  pdfX: number; // X position (0-1 normalized)
  pdfY: number; // Y position (0-1 normalized)
  pdfWidth?: number; // Width in points (optional)
  pdfHeight?: number; // Height in points (optional)
  signedAsName?: string;
}

/**
 * Embed signature images into a PDF at specified coordinates
 *
 * @param pdfBytes - Original PDF as Uint8Array
 * @param signatures - Array of signature locations with image data
 * @returns Modified PDF with embedded signature images
 */
export async function embedSignatureImages(
  pdfBytes: Uint8Array,
  signatures: SignatureLocation[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();

  for (const sig of signatures) {
    // Validate page index
    if (sig.pdfPage < 0 || sig.pdfPage >= pages.length) {
      console.warn(`[embedSignatureImages] Invalid page ${sig.pdfPage}, skipping`);
      continue;
    }

    const page = pages[sig.pdfPage];
    const { width: pageWidth, height: pageHeight } = page.getSize();

    try {
      // Extract base64 image data
      const imageData = sig.signatureData.replace(/^data:image\/\w+;base64,/, "");
      const imageBytes = Buffer.from(imageData, "base64");

      // Embed image (try PNG first, then JPEG)
      let image: any;
      if (sig.signatureData.includes("image/png")) {
        image = await pdfDoc.embedPng(new Uint8Array(imageBytes));
      } else {
        image = await pdfDoc.embedJpg(new Uint8Array(imageBytes));
      }

      // Calculate dimensions
      const sigWidth = sig.pdfWidth || 150;
      const sigHeight = sig.pdfHeight || 50;

      // Convert normalized coordinates to absolute
      const x = sig.pdfX * pageWidth;
      // PDF Y origin is bottom-left, so flip Y coordinate
      const y = pageHeight - sig.pdfY * pageHeight - sigHeight;

      // Draw image
      page.drawImage(image, {
        x,
        y,
        width: sigWidth,
        height: sigHeight,
      });

      // Optionally add signer name below signature
      if (sig.signedAsName) {
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        page.drawText(sig.signedAsName, {
          x,
          y: y - 12,
          size: 8,
          font,
          color: rgb(0.3, 0.3, 0.3),
        });
      }
    } catch (error) {
      console.error("[embedSignatureImages] Failed to embed signature:", error);
    }
  }

  return pdfDoc.save();
}

/**
 * Add document ID footer to each page of a PDF
 *
 * @param pdfBytes - PDF as Uint8Array
 * @param documentId - Document ID to display
 * @returns Modified PDF with footer on each page
 */
export async function addDocumentFooter(
  pdfBytes: Uint8Array,
  documentId: string
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();

  const footerText = `Document ID: ${documentId.toUpperCase()}`;

  for (const page of pages) {
    page.drawText(footerText, {
      x: 20,
      y: 15,
      size: 8,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });
  }

  return pdfDoc.save();
}

/**
 * Digitally sign a PDF using a PKCS12 certificate (PAdES-compatible)
 *
 * @param pdfBuffer - PDF as Buffer
 * @param p12Buffer - PKCS12 certificate as Buffer
 * @param password - Password for the PKCS12 file
 * @param options - Signing options
 * @returns Signed PDF as Buffer
 */
export async function signPdf(
  pdfBuffer: Buffer,
  p12Buffer: Buffer,
  password = "",
  options: {
    /** Use PAdES SubFilter for eIDAS compliance */
    pades?: boolean;
    /** Signer name */
    signerName?: string;
    /** Signing reason */
    reason?: string;
  } = {}
): Promise<Buffer> {
  const {
    pades = true, // Default to PAdES for compliance
    signerName = "HyprDoc Digital Signature",
    reason = "Document digitally signed by HyprDoc",
  } = options;

  try {
    // Add signature placeholder with PAdES SubFilter for eIDAS compliance
    const placeholderOptions: Record<string, unknown> = {
      pdfBuffer,
      reason,
      contactInfo: "https://hyprdoc.app",
      name: signerName,
      location: "Cloud",
    };

    // Use ETSI.CAdES.detached for PAdES-LTV compliance if requested
    if (pades) {
      placeholderOptions.subFilter = "ETSI.CAdES.detached";
    }

    const pdfWithPlaceholder = plainAddPlaceholder(placeholderOptions);

    // Sign using node-signpdf v3 API
    const signedPdf = signpdf.sign(pdfWithPlaceholder, p12Buffer, {
      passphrase: password,
    });

    return signedPdf;
  } catch (error) {
    console.error("[signPdf] Failed to sign PDF:", error);
    throw new Error(`PDF signing failed: ${error}`);
  }
}

/**
 * Compute SHA-256 hash of a buffer
 *
 * @param buffer - Data to hash
 * @returns Hex-encoded hash string
 */
export function computeHash(buffer: Buffer | Uint8Array): string {
  const crypto = require("node:crypto");
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

// Security utility imports
import { type EncryptionResult, encryptPdfWithQpdf } from "./encrypt-pdf";
import { flattenPdf } from "./flatten-pdf";
import { getTimestamp, type TimestampResult } from "./timestamp-service";

export interface CompletePdfSigningOptions {
  /** Add RFC 3161 timestamp after signing */
  timestamp?: boolean;
  /** Flatten form fields after signing */
  flatten?: boolean;
  /** Encrypt PDF after signing */
  encrypt?: {
    userPassword: string;
    ownerPassword?: string;
  };
  /** Signer display name */
  signerName?: string;
}

export interface CompletePdfSigningResult {
  signedPdf: Buffer;
  hash: string;
  timestamp?: TimestampResult;
  flattened?: boolean;
  encrypted?: boolean;
}

/**
 * Complete PDF signing pipeline with security options:
 * 1. Embed signature images
 * 2. Add document footer
 * 3. Digitally sign (PAdES-compliant)
 * 4. Optionally add RFC 3161 timestamp
 * 5. Optionally flatten form fields
 * 6. Optionally encrypt with password
 *
 * @param pdfBytes - Original PDF
 * @param signatures - Signature locations
 * @param documentId - Document ID for footer
 * @param p12Base64 - Base64-encoded PKCS12 certificate
 * @param password - PKCS12 password
 * @param options - Security options (timestamp, flatten, encrypt)
 * @returns Signed PDF buffer, hash, and metadata
 */
export async function completePdfSigning(
  pdfBytes: Uint8Array,
  signatures: SignatureLocation[],
  documentId: string,
  p12Base64: string,
  password = "",
  options: CompletePdfSigningOptions = {}
): Promise<CompletePdfSigningResult> {
  console.log("[completePdfSigning] Starting signing pipeline");
  console.log("[completePdfSigning] Options:", {
    timestamp: options.timestamp,
    flatten: options.flatten,
    encrypt: !!options.encrypt,
  });

  // Step 1: Embed signature images
  let modifiedPdf = await embedSignatureImages(pdfBytes, signatures);
  console.log(`[completePdfSigning] Embedded ${signatures.length} signatures`);

  // Step 2: Add document footer
  modifiedPdf = await addDocumentFooter(modifiedPdf, documentId);
  console.log("[completePdfSigning] Added document footer");

  // Step 3: Digitally sign with PAdES
  const p12Buffer = Buffer.from(p12Base64, "base64");
  let signedPdf = await signPdf(Buffer.from(modifiedPdf), p12Buffer, password, {
    pades: true,
    signerName: options.signerName,
  });
  console.log("[completePdfSigning] PDF digitally signed (PAdES)");

  // Step 4: RFC 3161 Timestamp
  let timestampResult: TimestampResult | undefined;
  if (options.timestamp) {
    try {
      console.log("[completePdfSigning] Getting RFC 3161 timestamp...");
      timestampResult = await getTimestamp(new Uint8Array(signedPdf));
      console.log(`[completePdfSigning] Timestamp from ${timestampResult.provider}`);
    } catch (error) {
      console.error("[completePdfSigning] Timestamp failed:", error);
    }
  }

  // Step 5: Flatten form fields
  let wasFlattened = false;
  if (options.flatten) {
    try {
      console.log("[completePdfSigning] Flattening form fields...");
      const flattenedBytes = await flattenPdf(new Uint8Array(signedPdf));
      signedPdf = Buffer.from(flattenedBytes);
      wasFlattened = true;
      console.log("[completePdfSigning] Flattening complete");
    } catch (error) {
      console.error("[completePdfSigning] Flatten failed:", error);
    }
  }

  // Step 6: Encrypt with password
  let wasEncrypted = false;
  if (options.encrypt) {
    try {
      console.log("[completePdfSigning] Encrypting PDF...");
      const encryptResult = await encryptPdfWithQpdf(new Uint8Array(signedPdf), {
        userPassword: options.encrypt.userPassword,
        ownerPassword: options.encrypt.ownerPassword,
      });
      signedPdf = Buffer.from(encryptResult.pdfBytes);
      wasEncrypted = encryptResult.encrypted;
      console.log(`[completePdfSigning] Encryption: ${encryptResult.method}`);
    } catch (error) {
      console.error("[completePdfSigning] Encryption failed:", error);
    }
  }

  // Step 7: Compute final hash
  const hash = computeHash(signedPdf);
  console.log(`[completePdfSigning] Complete. Hash: ${hash.slice(0, 16)}...`);

  return {
    signedPdf,
    hash,
    timestamp: timestampResult,
    flattened: wasFlattened,
    encrypted: wasEncrypted,
  };
}

/**
 * Enhanced PDF export with timestamping, flattening, and encryption
 */
export async function enhancedPdfExport(
  pdfBytes: Uint8Array,
  options: EnhancedExportOptions = {}
): Promise<EnhancedExportResult> {
  let currentPdf = pdfBytes;
  let timestampResult: TimestampResult | undefined;
  let encryptionResult: EncryptionResult | undefined;
  let wasFlattened = false;

  console.log("[enhancedPdfExport] Starting enhanced export pipeline");

  // Step 1: Get RFC 3161 timestamp (before any modifications)
  if (options.timestamp) {
    try {
      console.log("[enhancedPdfExport] Getting RFC 3161 timestamp...");
      timestampResult = await getTimestamp(currentPdf);
      console.log(`[enhancedPdfExport] Timestamp obtained from ${timestampResult.provider}`);
    } catch (error) {
      console.error("[enhancedPdfExport] Timestamp failed:", error);
    }
  }

  // Step 2: Flatten form fields
  if (options.flatten) {
    try {
      console.log("[enhancedPdfExport] Flattening form fields...");
      currentPdf = await flattenPdf(currentPdf);
      wasFlattened = true;
      console.log("[enhancedPdfExport] Flattening complete");
    } catch (error) {
      console.error("[enhancedPdfExport] Flattening failed:", error);
    }
  }

  // Step 3: Encrypt with password
  if (options.encrypt) {
    try {
      console.log("[enhancedPdfExport] Encrypting PDF...");
      encryptionResult = await encryptPdfWithQpdf(currentPdf, {
        userPassword: options.encrypt.userPassword,
        ownerPassword: options.encrypt.ownerPassword,
      });
      currentPdf = encryptionResult.pdfBytes;
      console.log(`[enhancedPdfExport] Encryption: ${encryptionResult.method}`);
    } catch (error) {
      console.error("[enhancedPdfExport] Encryption failed:", error);
    }
  }

  // Step 4: Compute final hash
  const hash = computeHash(Buffer.from(currentPdf));

  console.log("[enhancedPdfExport] Export complete");

  return {
    pdfBytes: currentPdf,
    hash,
    timestamp: timestampResult,
    flattened: wasFlattened,
    encryption: encryptionResult,
  };
}

export interface EnhancedExportOptions {
  timestamp?: boolean;
  flatten?: boolean;
  encrypt?: {
    userPassword: string;
    ownerPassword?: string;
  };
}

export interface EnhancedExportResult {
  pdfBytes: Uint8Array;
  hash: string;
  timestamp?: TimestampResult;
  flattened: boolean;
  encryption?: EncryptionResult;
}
