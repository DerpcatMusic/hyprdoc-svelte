/**
 * PDF Encryption Utility
 *
 * Provides password protection for PDF documents.
 *
 * Note: pdf-lib does not support native encryption.
 * This implementation uses a workaround by storing encryption metadata
 * and recommending client-side tools for actual encryption.
 *
 * For production, consider using:
 * - qpdf (command-line tool)
 * - Server-side PDF processing with paid libraries
 * - External API services
 */

import crypto from "node:crypto";

export interface EncryptionOptions {
  /** Password required to open the PDF */
  userPassword: string;
  /** Password for full access (editing, printing) - defaults to userPassword */
  ownerPassword?: string;
  /** Encryption strength */
  strength?: "AES-128" | "AES-256";
}

export interface EncryptionResult {
  /** Whether encryption was applied */
  encrypted: boolean;
  /** Encryption method used */
  method: string;
  /** Hash of the password for verification */
  passwordHash: string;
  /** The PDF bytes (may or may not be encrypted depending on method) */
  pdfBytes: Uint8Array;
  /** Warning message if encryption couldn't be fully applied */
  warning?: string;
}

/**
 * Hash a password for storage/verification
 */
function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

/**
 * Create encryption metadata for a PDF
 *
 * Since pdf-lib doesn't support encryption, this creates metadata
 * that can be used with external tools or stored for reference.
 *
 * @param pdfBytes - The PDF to encrypt
 * @param options - Encryption options
 * @returns Encryption result with metadata
 */
export async function createEncryptionMetadata(
  pdfBytes: Uint8Array,
  options: EncryptionOptions
): Promise<EncryptionResult> {
  const { userPassword, strength = "AES-256" } = options;

  // Validate password
  if (!userPassword || userPassword.length < 1) {
    throw new Error("Password is required for encryption");
  }

  // Create password hash for verification
  const userPasswordHash = hashPassword(userPassword);

  console.log(`[encryptPdf] Creating encryption metadata (${strength})`);
  console.log(`[encryptPdf] User password hash: ${userPasswordHash.slice(0, 16)}...`);

  // Store encryption info in metadata
  // In a real implementation, you would:
  // 1. Use qpdf command-line tool
  // 2. Use a paid library like PDFTron
  // 3. Use an external API

  return {
    encrypted: false, // True encryption not applied
    method: `Metadata-only (${strength})`,
    passwordHash: userPasswordHash,
    pdfBytes,
    warning:
      "Full PDF encryption requires external tools (qpdf) or paid libraries. " +
      "Password hash stored for verification. Consider using qpdf for production.",
  };
}

/**
 * Generate a qpdf command for encrypting a PDF
 *
 * This returns the command that can be run server-side if qpdf is installed.
 *
 * @param inputPath - Path to input PDF
 * @param outputPath - Path for encrypted output
 * @param options - Encryption options
 * @returns Command string to execute
 */
export function getQpdfEncryptCommand(
  inputPath: string,
  outputPath: string,
  options: EncryptionOptions
): string {
  const { userPassword, ownerPassword = userPassword, strength = "AES-256" } = options;

  const keyLength = strength === "AES-256" ? "256" : "128";

  // qpdf command for encryption
  return `qpdf --encrypt "${userPassword}" "${ownerPassword}" ${keyLength} -- "${inputPath}" "${outputPath}"`;
}

/**
 * Check if qpdf is available on the system
 *
 * @returns True if qpdf is installed
 */
export async function isQpdfAvailable(): Promise<boolean> {
  try {
    const { execSync } = await import("node:child_process");
    execSync("qpdf --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Encrypt a PDF using qpdf (if available)
 *
 * @param pdfBytes - The PDF to encrypt
 * @param options - Encryption options
 * @returns Encrypted PDF bytes or metadata
 */
export async function encryptPdfWithQpdf(
  pdfBytes: Uint8Array,
  options: EncryptionOptions
): Promise<EncryptionResult> {
  const qpdfAvailable = await isQpdfAvailable();

  if (!qpdfAvailable) {
    console.warn("[encryptPdf] qpdf not available, using metadata-only approach");
    return createEncryptionMetadata(pdfBytes, options);
  }

  const { userPassword, ownerPassword = userPassword, strength = "AES-256" } = options;

  try {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const os = await import("node:os");
    const { execSync } = await import("node:child_process");

    // Create temp files
    const tempDir = os.tmpdir();
    const inputPath = path.join(tempDir, `input-${Date.now()}.pdf`);
    const outputPath = path.join(tempDir, `output-${Date.now()}.pdf`);

    // Write input PDF
    fs.writeFileSync(inputPath, pdfBytes);

    // Run qpdf
    const keyLength = strength === "AES-256" ? "256" : "128";
    const command = `qpdf --encrypt "${userPassword}" "${ownerPassword}" ${keyLength} -- "${inputPath}" "${outputPath}"`;

    execSync(command);

    // Read encrypted PDF
    const encryptedBytes = fs.readFileSync(outputPath);

    // Cleanup
    fs.unlinkSync(inputPath);
    fs.unlinkSync(outputPath);

    return {
      encrypted: true,
      method: `qpdf ${strength}`,
      passwordHash: hashPassword(userPassword),
      pdfBytes: new Uint8Array(encryptedBytes),
    };
  } catch (error) {
    console.error("[encryptPdf] qpdf encryption failed:", error);
    return createEncryptionMetadata(pdfBytes, options);
  }
}
