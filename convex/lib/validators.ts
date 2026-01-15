/**
 * lib/validators.ts - Schema-Linked Validators
 * ════════════════════════════════════════════════════════════════════════════
 * Single source of truth for all validators using typedV.
 * Extracts validators directly from schema.ts to avoid duplication.
 */

import { typedV, doc, partial } from "convex-helpers/validators";
import schema from "../schema";

// ════════════════════════════════════════════════════════════════════════════
// TYPED VALIDATOR INSTANCE
// ════════════════════════════════════════════════════════════════════════════

/**
 * Schema-linked validator builder.
 * Use vv.id("tableName") everywhere for type-safe document IDs.
 * Use vv.doc("tableName") for full document validators with system fields.
 */
export const vv = typedV(schema);

// ════════════════════════════════════════════════════════════════════════════
// DOCUMENT VALIDATORS
// ════════════════════════════════════════════════════════════════════════════

export const documentIdValidator = vv.id("documents");
export const documentDoc = doc(schema, "documents");
export const documentReturnValidator = documentDoc;

// Partial validators for updates
export const partialDocumentFields = partial(
	schema.tables.documents.validator.fields,
);

// ════════════════════════════════════════════════════════════════════════════
// USER VALIDATORS
// ════════════════════════════════════════════════════════════════════════════

export const userIdValidator = vv.id("users");
export const userDoc = doc(schema, "users");

// ════════════════════════════════════════════════════════════════════════════
// SIGNER VALIDATORS
// ════════════════════════════════════════════════════════════════════════════

export const signerIdValidator = vv.id("signers");
export const signerDoc = doc(schema, "signers");

// ════════════════════════════════════════════════════════════════════════════
// SIGNATURE VALIDATORS
// ════════════════════════════════════════════════════════════════════════════

export const signatureIdValidator = vv.id("signatures");
export const signatureDoc = doc(schema, "signatures");

// ════════════════════════════════════════════════════════════════════════════
// SLOT VALIDATORS
// ════════════════════════════════════════════════════════════════════════════

export const slotIdValidator = vv.id("slots");
export const slotDoc = doc(schema, "slots");

// ════════════════════════════════════════════════════════════════════════════
// DOCUMENT MEMBER VALIDATORS
// ════════════════════════════════════════════════════════════════════════════

export const documentMemberIdValidator = vv.id("documentMembers");
export const documentMemberDoc = doc(schema, "documentMembers");

// ════════════════════════════════════════════════════════════════════════════
// AUDIT LOG VALIDATORS
// ════════════════════════════════════════════════════════════════════════════

export const auditLogIdValidator = vv.id("auditLogs");
export const auditLogDoc = doc(schema, "auditLogs");

// ════════════════════════════════════════════════════════════════════════════
// DOCUMENT VERSION VALIDATORS
// ════════════════════════════════════════════════════════════════════════════

export const documentVersionIdValidator = vv.id("documentVersions");
export const documentVersionDoc = doc(schema, "documentVersions");

// ════════════════════════════════════════════════════════════════════════════
// DOCUMENT CHANGE VALIDATORS
// ════════════════════════════════════════════════════════════════════════════

export const documentChangeIdValidator = vv.id("documentChanges");
export const documentChangeDoc = doc(schema, "documentChanges");

// ════════════════════════════════════════════════════════════════════════════
// GLOSSARY VALIDATORS
// ════════════════════════════════════════════════════════════════════════════

export const glossaryTermIdValidator = vv.id("glossaryTerms");
export const glossaryTermDoc = doc(schema, "glossaryTerms");

// ════════════════════════════════════════════════════════════════════════════
// GLOBAL VARIABLE VALIDATORS
// ════════════════════════════════════════════════════════════════════════════

export const globalVariableIdValidator = vv.id("globalVariables");
export const globalVariableDoc = doc(schema, "globalVariables");

// ════════════════════════════════════════════════════════════════════════════
// AI TEMPLATE VALIDATORS
// ════════════════════════════════════════════════════════════════════════════

export const aiTemplateIdValidator = vv.id("aiTemplates");
export const aiTemplateDoc = doc(schema, "aiTemplates");

// ════════════════════════════════════════════════════════════════════════════
// HUBSPOT VALIDATORS
// ════════════════════════════════════════════════════════════════════════════

export const hubspotConnectionIdValidator = vv.id("hubspotConnections");
export const hubspotConnectionDoc = doc(schema, "hubspotConnections");

export const hubspotMappingIdValidator = vv.id("hubspotMappings");
export const hubspotMappingDoc = doc(schema, "hubspotMappings");

// ════════════════════════════════════════════════════════════════════════════
// OTP VALIDATORS
// ════════════════════════════════════════════════════════════════════════════

export const otpCodeIdValidator = vv.id("otpCodes");
export const otpCodeDoc = doc(schema, "otpCodes");

// ════════════════════════════════════════════════════════════════════════════
// COUNTER VALIDATORS
// ════════════════════════════════════════════════════════════════════════════

export const counterIdValidator = vv.id("counters");
export const counterDoc = doc(schema, "counters");
