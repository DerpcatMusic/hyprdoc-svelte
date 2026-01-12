/**
 * PDF Export Utility
 *
 * Client-side PDF export using pdf-lib (replacing deprecated html2pdf.js).
 * Uses the export-tiptap module for fillable form generation.
 */

/**
 * @deprecated Use downloadTiptapAsPdf instead for Tiptap documents.
 * This function is kept for backwards compatibility but will be removed.
 */
export const exportToPdf = async (_elementId: string, filename = "document.pdf") => {
  console.warn(
    "[DEPRECATED] exportToPdf using html2pdf.js is deprecated. " +
      "Use downloadTiptapAsPdf from $lib/pdf/export-tiptap instead."
  );

  // Return a no-op for backwards compatibility
  // The proper migration is to use downloadTiptapAsPdf with Tiptap JSON content
  console.error("Cannot export element to PDF. Use downloadTiptapAsPdf with Tiptap content.");
  console.log(`Attempted filename: ${filename}`);
};

// Re-export the new API for convenience
export { downloadTiptapAsPdf } from "$lib/pdf/export-tiptap";
