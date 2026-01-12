/**
 * PDF Flattening Utility
 *
 * Converts interactive form fields in a PDF to static content,
 * making them non-editable while preserving their visual appearance.
 *
 * Uses pdf-lib's native flatten() method.
 */

import { PDFDocument } from "pdf-lib";

/**
 * Flatten all form fields in a PDF
 *
 * This converts interactive form elements (text fields, checkboxes, etc.)
 * into static content that cannot be edited.
 *
 * @param pdfBytes - The PDF as Uint8Array
 * @returns Flattened PDF as Uint8Array
 */
export async function flattenPdf(pdfBytes: Uint8Array): Promise<Uint8Array> {
  try {
    const pdfDoc = await PDFDocument.load(pdfBytes, {
      // Allow loading PDFs with missing objects
      ignoreEncryption: true,
    });

    // Get the form (if any)
    const form = pdfDoc.getForm();

    // Get all fields and log them for debugging
    const fields = form.getFields();
    console.log(`[flattenPdf] Found ${fields.length} form fields to flatten`);

    // Flatten all form fields
    // This converts them to static content
    form.flatten();

    // Save the flattened PDF
    const flattenedBytes = await pdfDoc.save();

    console.log(`[flattenPdf] Successfully flattened PDF (${flattenedBytes.length} bytes)`);

    return flattenedBytes;
  } catch (error) {
    console.error("[flattenPdf] Error flattening PDF:", error);

    // If flattening fails (e.g., no form fields), return original
    if (String(error).includes("no form")) {
      console.log("[flattenPdf] No form fields found, returning original PDF");
      return pdfBytes;
    }

    throw error;
  }
}

/**
 * Check if a PDF has form fields that can be flattened
 *
 * @param pdfBytes - The PDF to check
 * @returns Object with field count and field names
 */
export async function getFormFieldInfo(
  pdfBytes: Uint8Array
): Promise<{ fieldCount: number; fieldNames: string[] }> {
  try {
    const pdfDoc = await PDFDocument.load(pdfBytes, {
      ignoreEncryption: true,
    });

    const form = pdfDoc.getForm();
    const fields = form.getFields();

    return {
      fieldCount: fields.length,
      fieldNames: fields.map((f) => f.getName()),
    };
  } catch {
    return { fieldCount: 0, fieldNames: [] };
  }
}
