// components/hyprsign/types.ts

export interface DetectedField {
  id: string;
  label: string;
  type: "text" | "date" | "signature" | "checkbox" | "initials" | "radio";
  value: string | boolean | null;
  confidence: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
    page: number;
  };
  autoFilled: boolean;
  required: boolean;
  matchedProfileKey?: string;
}

export interface UserProfile {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  phoneCountryCode?: string;
  physicalAddress?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  companyName?: string;
  jobTitle?: string;
  dateOfBirth?: string;
}

export type HyprSignStep =
  | "upload"
  | "processing"
  | "editing"
  | "signing"
  | "complete"
  | "limit-reached";
