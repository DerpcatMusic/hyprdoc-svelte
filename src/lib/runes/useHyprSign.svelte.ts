/**
 * useHyprSign - RUNED-powered PDF Signing Flow
 *
 * Manages the complete HyprSign workflow with:
 * - PDF upload and analysis state
 * - Field detection with progress tracking
 * - Form field management
 * - Finalization with encryption support
 */

import { IsMounted, PersistedState } from "runed";
import type { DetectedField } from "$lib/hyprsign/types";

export type HyprSignStage =
  | "idle"
  | "uploading"
  | "analyzing"
  | "editing"
  | "finalizing"
  | "complete"
  | "error";

export interface HyprSignState {
  stage: HyprSignStage;
  pdfFile: File | null;
  pdfBase64: string | null;
  fields: DetectedField[];
  error: string | null;
  progress: number;
}

/**
 * Creates HyprSign state and controls
 */
export function createHyprSign() {
  // Reactive state
  let stage = $state<HyprSignStage>("idle");
  let pdfFile = $state<File | null>(null);
  let pdfBase64 = $state<string | null>(null);
  let fields = $state<DetectedField[]>([]);
  let error = $state<string | null>(null);
  let progress = $state(0);
  let finalizedPdfUrl = $state<string | null>(null);

  // Track mount state
  const _mounted = new IsMounted();

  // Persist signer name across sessions
  const signerName = new PersistedState<string>("hyprsign-signer-name", "");

  /**
   * Helper to convert File to Base64
   */
  async function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Upload and analyze a PDF file
   */
  async function uploadAndAnalyze(file: File): Promise<boolean> {
    if (stage !== "idle" && stage !== "error") {
      console.warn("[HyprSign] Upload already in progress");
      return false;
    }

    // Reset state
    pdfFile = file;
    pdfBase64 = null;
    fields = [];
    error = null;
    progress = 0;
    stage = "uploading";

    try {
      // Convert to Base64 for later use
      progress = 20;
      pdfBase64 = await fileToBase64(file);
      progress = 40;

      // Upload for analysis
      stage = "analyzing";
      const formData = new FormData();
      formData.append("pdf", file);

      const response = await fetch("/api/hyprsign/analyze", {
        method: "POST",
        body: formData,
      });

      progress = 80;

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Analysis failed: ${response.status}`
        );
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Analysis failed");
      }

      fields = result.fields || [];
      progress = 100;
      stage = "editing";

      return true;
    } catch (err) {
      error = err instanceof Error ? err.message : "Upload failed";
      stage = "error";
      console.error("[HyprSign] Upload error:", err);
      return false;
    }
  }

  /**
   * Update a field value
   */
  function updateField(fieldId: string, value: DetectedField["value"]) {
    fields = fields.map((f) =>
      f.id === fieldId ? { ...f, value, autoFilled: false } : f
    );
  }

  /**
   * Get field by ID
   */
  function getField(fieldId: string): DetectedField | undefined {
    return fields.find((f) => f.id === fieldId);
  }

  /**
   * Check if all required fields are filled
   */
  function areRequiredFieldsFilled(): boolean {
    return fields
      .filter((f) => f.required)
      .every(
        (f) => f.value !== undefined && f.value !== null && f.value !== ""
      );
  }

  /**
   * Finalize the signed PDF
   */
  async function finalize(options?: {
    encrypt?: boolean;
    password?: string;
  }): Promise<string | null> {
    if (stage !== "editing" || !pdfBase64) {
      console.warn(
        "[HyprSign] Cannot finalize: not in editing stage or no PDF"
      );
      return null;
    }

    stage = "finalizing";
    progress = 0;

    try {
      progress = 30;

      const response = await fetch("/api/hyprsign/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pdfBase64,
          fields,
          encryptPassword: options?.encrypt ? options.password : undefined,
          signerName: signerName.current || undefined,
        }),
      });

      progress = 70;

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Finalization failed: ${response.status}`
        );
      }

      // Create blob URL for download
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      finalizedPdfUrl = url;

      progress = 100;
      stage = "complete";

      return url;
    } catch (err) {
      error = err instanceof Error ? err.message : "Finalization failed";
      stage = "error";
      console.error("[HyprSign] Finalization error:", err);
      return null;
    }
  }

  /**
   * Download the finalized PDF
   */
  function download(filename?: string) {
    if (!finalizedPdfUrl) {
      console.warn("[HyprSign] No finalized PDF to download");
      return;
    }

    const a = document.createElement("a");
    a.href = finalizedPdfUrl;
    a.download = filename || `signed-${pdfFile?.name || "document"}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  /**
   * Reset to initial state
   */
  function reset() {
    stage = "idle";
    pdfFile = null;
    pdfBase64 = null;
    fields = [];
    error = null;
    progress = 0;

    if (finalizedPdfUrl) {
      URL.revokeObjectURL(finalizedPdfUrl);
      finalizedPdfUrl = null;
    }
  }

  return {
    // State getters
    get stage() {
      return stage;
    },
    get pdfFile() {
      return pdfFile;
    },
    get fields() {
      return fields;
    },
    get error() {
      return error;
    },
    get progress() {
      return progress;
    },
    get signerName() {
      return signerName.current;
    },
    set signerName(value: string) {
      signerName.current = value;
    },
    get isComplete() {
      return stage === "complete";
    },
    get canFinalize() {
      return stage === "editing" && areRequiredFieldsFilled();
    },
    get fieldCount() {
      return fields.length;
    },
    get filledCount() {
      return fields.filter((f) => f.value).length;
    },
    get requiredCount() {
      return fields.filter((f) => f.required).length;
    },

    // Actions
    uploadAndAnalyze,
    updateField,
    getField,
    areRequiredFieldsFilled,
    finalize,
    download,
    reset,
  };
}

export type HyprSignController = ReturnType<typeof createHyprSign>;
