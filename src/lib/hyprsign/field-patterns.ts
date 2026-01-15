/**
 * Field Recognition Patterns
 *
 * Centralized patterns and logic for identifying document fields
 * through visual and textual cues. Supports detection of:
 * - Underscore fill lines (Name: ____)
 * - Dash fill lines (Date: ----)
 * - Unicode checkboxes (□, ☐)
 * - Bracket patterns ([ ], ( ))
 * - Colon-terminated labels (Signature:)
 * - Signature markers (X____, /s/)
 */

import type { DetectedField } from "./types";

/**
 * Pattern definitions for field recognition.
 * Each pattern includes the regex and the typical field types it represents.
 */
export const FIELD_PATTERNS = {
  // ═══════════════════════════════════════════════════════════════════════════
  // Fill Line Patterns (underscore, dash, dot)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Underscore fill patterns: "Name: ____", "Date _______", "Signature:___"
   * Requires at least 3 consecutive underscores
   */
  underscore: /([A-Za-z][A-Za-z0-9\s'()-]*):?\s*_{3,}/g,

  /**
   * Dash fill patterns: "Name: ----", "Address -------"
   * Requires at least 4 consecutive dashes to avoid matching hyphens
   */
  dashLine: /([A-Za-z][A-Za-z0-9\s'()-]*):?\s*-{4,}/g,

  /**
   * Dot leader patterns: "Name ........", "Title............"
   * Common in formal documents with dot leaders
   */
  dotLine: /([A-Za-z][A-Za-z0-9\s'()-]*):?\s*\.{4,}/g,

  // ═══════════════════════════════════════════════════════════════════════════
  // Checkbox and Selection Patterns
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Unicode checkbox squares: □, ☐, 🔲, or ☑
   * Matches the square followed by optional label text
   */
  unicodeCheckbox: /[□☐🔲☑]\s*([A-Za-z0-9\s()+-]*)?/gu,

  /**
   * ASCII bracket checkboxes: [ ] or (  )
   */
  bracketCheckbox: /\[\s*\]\s*([A-Za-z0-9\s()+-]*)?/g,
  parenCheckbox: /\(\s*\)\s*([A-Za-z0-9\s()+-]*)?/g,

  // ═══════════════════════════════════════════════════════════════════════════
  // Signature Patterns
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Signature X marker: "X____", "X ________"
   */
  signatureX: /[Xx]\s*[_-]{3,}/g,

  /**
   * Slash-S notation: "/s/", "/ s /" (legal signature placeholder)
   */
  slashS: /\/\s*s\s*\//gi,

  // ═══════════════════════════════════════════════════════════════════════════
  // Label-Only Patterns (colon followed by blank space - common in signature blocks)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Signature block markers at the end of a line or followed by space
   * Signature:____  Name:____  Date:____
   */
  signatureBlock:
    /(Signature|Name|Date|Title|Position|Initial|Initials|Witness|Print Name|Printed Name):?\s*[_\-\s]*$/gim,

  /**
   * Flexible colon labels anywhere in text
   */
  colonLabelFlexible: /(Signature|Name|Date|Title|Initial|Initials):/gi,

  // ═══════════════════════════════════════════════════════════════════════════
  // Date Format Patterns
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Date placeholder patterns: __/__/____, MM/DD/YYYY
   */
  dateSlash:
    /(_+\s*\/\s*_+\s*\/\s*_+)|([Mm]{2}\s*\/\s*[Dd]{2}\s*\/\s*[Yy]{2,4})/g,
};

/**
 * Keywords used to infer field types from labels.
 * Order matters: more specific matches should come first.
 */
const TYPE_MAPPINGS: Array<{
  keywords: string[];
  type: DetectedField["type"];
}> = [
  // Signature patterns (most specific first)
  {
    keywords: ["signature", "sign here", "signed by", "authorized signature"],
    type: "signature",
  },
  { keywords: ["initial", "initials"], type: "initials" },

  // Date patterns
  {
    keywords: ["date of birth", "dob", "birth date", "birthdate"],
    type: "date",
  },
  { keywords: ["date signed", "effective date", "as of date"], type: "date" },
  { keywords: ["date"], type: "date" },

  // Checkbox/selection patterns
  {
    keywords: [
      "single",
      "ep",
      "album",
      "agree",
      "accept",
      "confirm",
      "yes",
      "no",
    ],
    type: "checkbox",
  },

  // Standard text fields (fallback)
  { keywords: ["email", "e-mail"], type: "text" },
  { keywords: ["phone", "tel", "mobile", "cell", "fax"], type: "text" },
  {
    keywords: ["address", "street", "city", "state", "zip", "postal"],
    type: "text",
  },
  {
    keywords: ["name", "title", "company", "organization", "position"],
    type: "text",
  },
];

/**
 * Profile mapping keys for auto-fill enrichment.
 * Maps common field labels to UserProfile property names.
 */
export const PROFILE_LABEL_MAPPINGS: Record<string, string | null> = {
  // ═══════════════════════════════════════════════════════════════════════════
  // Name Variations
  // ═══════════════════════════════════════════════════════════════════════════
  "first name": "firstName",
  "given name": "firstName",
  "last name": "lastName",
  surname: "lastName",
  "family name": "lastName",
  name: "fullName",
  "full name": "fullName",
  "print name": "fullName",
  "printed name": "fullName",
  "type name": "fullName",
  "type or print name": "fullName",
  "artist name": "fullName",

  // ═══════════════════════════════════════════════════════════════════════════
  // Contact Information
  // ═══════════════════════════════════════════════════════════════════════════
  email: "email",
  "e-mail": "email",
  "email address": "email",
  phone: "phoneNumber",
  "phone number": "phoneNumber",
  telephone: "phoneNumber",
  tel: "phoneNumber",
  cell: "phoneNumber",
  mobile: "phoneNumber",

  // ═══════════════════════════════════════════════════════════════════════════
  // Address Components
  // ═══════════════════════════════════════════════════════════════════════════
  address: "physicalAddress",
  "street address": "physicalAddress",
  "mailing address": "physicalAddress",
  "billing address": "physicalAddress",
  street: "physicalAddress",
  "address line": "physicalAddress",
  city: "city",
  state: "state",
  province: "state",
  zip: "zipCode",
  "zip code": "zipCode",
  zipcode: "zipCode",
  postcode: "zipCode",
  "postal code": "zipCode",
  country: "country",

  // ═══════════════════════════════════════════════════════════════════════════
  // Professional Information
  // ═══════════════════════════════════════════════════════════════════════════
  company: "companyName",
  organization: "companyName",
  "company name": "companyName",
  employer: "companyName",
  title: "jobTitle",
  "job title": "jobTitle",
  position: "jobTitle",
  role: "jobTitle",

  // ═══════════════════════════════════════════════════════════════════════════
  // Sensitive Fields (detected but NOT auto-filled)
  // ═══════════════════════════════════════════════════════════════════════════
  ssn: null,
  "social security": null,
  "social security number": null,
  license: null,
  "license number": null,
  "id number": null,
  "driver's license": null,

  // ═══════════════════════════════════════════════════════════════════════════
  // Date Fields (context-dependent, not auto-filled by default)
  // ═══════════════════════════════════════════════════════════════════════════
  "date signed": null,
  "effective date": null,
  date: null,
  "as of": null,
};

/**
 * Infers the field type based on its label using keyword matching.
 * Uses ordered matching so more specific patterns take precedence.
 */
export function inferFieldType(label: string): DetectedField["type"] {
  const normalized = label.toLowerCase().trim();

  for (const mapping of TYPE_MAPPINGS) {
    for (const keyword of mapping.keywords) {
      if (normalized.includes(keyword)) {
        return mapping.type;
      }
    }
  }

  return "text";
}

/**
 * Finds a matching profile key for a given label.
 * Returns null if the field should be detected but not auto-filled.
 */
export function findProfileMatch(label: string): string | null {
  const normalized = label.toLowerCase().trim();

  // Check exact matches first, then partial matches
  for (const [key, profileKey] of Object.entries(PROFILE_LABEL_MAPPINGS)) {
    if (normalized === key) {
      return profileKey;
    }
  }

  // Partial matching for compound labels
  for (const [key, profileKey] of Object.entries(PROFILE_LABEL_MAPPINGS)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return profileKey;
    }
  }

  return null;
}

/**
 * Detects if a line contains a potential field pattern.
 * Returns the pattern type and captured groups if matched.
 */
export interface PatternMatch {
  patternType: keyof typeof FIELD_PATTERNS;
  label: string;
  matchStart: number;
  matchEnd: number;
  fullMatch: string;
}

/**
 * Scan a line of text for all field patterns.
 * Returns array of matches sorted by position.
 */
export function scanLineForPatterns(lineText: string): PatternMatch[] {
  const matches: PatternMatch[] = [];

  for (const [patternType, regex] of Object.entries(FIELD_PATTERNS)) {
    // Reset regex state
    const pattern = new RegExp(regex.source, regex.flags);
    let match: RegExpExecArray | null = pattern.exec(lineText);

    while (match !== null) {
      const label =
        match[1]?.trim() || extractLabelFromContext(lineText, match.index);

      matches.push({
        patternType: patternType as keyof typeof FIELD_PATTERNS,
        label,
        matchStart: match.index,
        matchEnd: match.index + match[0].length,
        fullMatch: match[0],
      });

      match = pattern.exec(lineText);
    }
  }

  // Sort by position in line
  return matches.sort((a, b) => a.matchStart - b.matchStart);
}

/**
 * Extract a label from surrounding context when not captured by regex.
 */
function extractLabelFromContext(lineText: string, matchIndex: number): string {
  // Look for preceding text that could be a label
  const precedingText = lineText.slice(0, matchIndex).trim();

  // Common label patterns: ends with colon, or is a capitalized word
  const colonMatch = precedingText.match(/([A-Za-z][A-Za-z\s'()-]*):?\s*$/);
  if (colonMatch) {
    return colonMatch[1].trim();
  }

  // Check for checkbox context (label follows the checkbox)
  const followingText = lineText.slice(matchIndex).trim();
  const labelAfter = followingText.match(
    /^[□☐[\]()]\s*([A-Za-z][A-Za-z0-9\s()+-]*)/
  );
  if (labelAfter) {
    return labelAfter[1].trim();
  }

  return "Field";
}
