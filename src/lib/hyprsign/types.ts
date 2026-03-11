/**
 * HyprSign Types
 * 
 * Shared types for PDF field detection and user profiling.
 */

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
}

export type FieldType = "text" | "signature" | "initials" | "checkbox" | "date" | "radio";

export interface DetectedField {
  id: string;
  label: string;
  type: FieldType;
  value: string | boolean | null;
  confidence: number;
  boundingBox: BoundingBox;
  autoFilled: boolean;
  matchedProfileKey?: string;
  required: boolean;
}

export interface UserProfile {
  fullName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  physicalAddress?: string;
  jobTitle?: string;
  companyName?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}
