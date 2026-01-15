/**
 * usePDFExport - RUNED-powered PDF Export Flow
 *
 * Manages PDF export state with:
 * - Export options (flatten, timestamp, signatures)
 * - Progress tracking
 * - Download handling
 * - Error state
 */

import { Debounced, IsMounted } from "runed";

export type ExportStage = "idle" | "generating" | "complete" | "error";

export interface ExportOptions {
  flatten?: boolean;
  timestamp?: boolean;
  includeSignatures?: boolean;
}

/**
 * Creates PDF export state and controls
 */
export function createPDFExport() {
  // Reactive state
  let stage = $state<ExportStage>("idle");
  let progress = $state(0);
  let error = $state<string | null>(null);
  let pdfUrl = $state<string | null>(null);
  let pdfBlob = $state<Blob | null>(null);

  // Track mount state
  const _mounted = new IsMounted();

  // Debounced progress for smooth UI
  const debouncedProgress = new Debounced(() => progress, 100);

  /**
   * Export a document to PDF
   */
  async function exportDocument(
    documentId: string,
    options: ExportOptions = {}
  ): Promise<string | null> {
    if (stage === "generating") {
      console.warn("[PDFExport] Export already in progress");
      return null;
    }

    // Reset state
    stage = "generating";
    progress = 0;
    error = null;

    // Clean up previous URL
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      pdfUrl = null;
    }
    pdfBlob = null;

    try {
      progress = 20;

      // Build URL with query params
      const url = new URL(
        `/api/documents/${documentId}/pdf`,
        window.location.origin
      );
      if (options.flatten) {
        url.searchParams.set("flat", "true");
      }
      if (options.timestamp) {
        url.searchParams.set("timestamp", "true");
      }

      let response: Response;

      if (options.includeSignatures) {
        // POST with signature data
        response = await fetch(url.toString(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ includeSignatures: true }),
        });
      } else {
        // Simple GET
        response = await fetch(url.toString());
      }

      progress = 70;

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Export failed: ${response.status}`);
      }

      const blob = await response.blob();
      pdfBlob = blob;
      pdfUrl = URL.createObjectURL(blob);

      progress = 100;
      stage = "complete";

      console.log("[PDFExport] Export complete");
      return pdfUrl;
    } catch (err) {
      error = err instanceof Error ? err.message : "Export failed";
      stage = "error";
      console.error("[PDFExport] Export error:", err);
      return null;
    }
  }

  /**
   * Download the exported PDF
   */
  function download(filename?: string) {
    if (!pdfUrl) {
      console.warn("[PDFExport] No PDF to download");
      return;
    }

    const a = document.createElement("a");
    a.href = pdfUrl;
    a.download = filename || "document.pdf";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  /**
   * Export and immediately download
   */
  async function exportAndDownload(
    documentId: string,
    filename: string,
    options: ExportOptions = {}
  ): Promise<boolean> {
    const url = await exportDocument(documentId, options);
    if (url) {
      download(filename);
      return true;
    }
    return false;
  }

  /**
   * Get blob for custom handling
   */
  function getBlob(): Blob | null {
    return pdfBlob;
  }

  /**
   * Reset state
   */
  function reset() {
    stage = "idle";
    progress = 0;
    error = null;

    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      pdfUrl = null;
    }
    pdfBlob = null;
  }

  // Cleanup on unmount
  $effect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  });

  return {
    // State getters
    get stage() {
      return stage;
    },
    get progress() {
      return debouncedProgress.current;
    },
    get error() {
      return error;
    },
    get pdfUrl() {
      return pdfUrl;
    },
    get isGenerating() {
      return stage === "generating";
    },
    get isComplete() {
      return stage === "complete";
    },
    get hasError() {
      return stage === "error";
    },

    // Actions
    exportDocument,
    download,
    exportAndDownload,
    getBlob,
    reset,
  };
}

export type PDFExportController = ReturnType<typeof createPDFExport>;
