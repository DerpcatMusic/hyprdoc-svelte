/**
 * Export Module
 *
 * Barrel export for .hdoc template export/import functionality.
 */

export { downloadHdoc, exportTemplateToHdoc, type TemplateExportData } from "./hdoc-export";
export {
  type HdocImportData,
  prepareHdocForImport,
  readHdocFile,
  validateHdocFile,
} from "./hdoc-import";
export type {
  HdocDocument,
  HdocFile,
  HdocSettings,
  HdocSlot,
  HdocValidationResult,
  HdocVariable,
} from "./hdoc-types";
export { HDOC_FORMAT_VERSION } from "./hdoc-types";
