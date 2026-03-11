export type EnvelopeTone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger";

export interface EnvelopeMetaItem {
  hint?: string;
  label: string;
  mono?: boolean;
  tone?: EnvelopeTone;
  value: string;
}

export interface EnvelopeTrustMetric {
  detail?: string;
  label: string;
  mono?: boolean;
  tone?: EnvelopeTone;
  value: string;
}

export interface EnvelopeEvidenceItem {
  detail?: string;
  href?: string;
  label: string;
  mono?: boolean;
  tone?: EnvelopeTone;
  value: string;
}

export type EnvelopeSignerStatus =
  | "completed"
  | "active"
  | "pending"
  | "blocked";

export interface EnvelopeSignerStep {
  detail?: string;
  email?: string;
  id: string;
  name: string;
  note?: string;
  role?: string;
  status?: EnvelopeSignerStatus;
  timestamp?: number;
}

export interface EnvelopeAuditMetaItem {
  label: string;
  mono?: boolean;
  value: string;
}

export interface EnvelopeAuditEvent {
  action: string;
  actor: string;
  detail?: string;
  hash?: string;
  id: string;
  metadata?: EnvelopeAuditMetaItem[];
  timestamp?: number;
  tone?: EnvelopeTone;
}

export type EnvelopeBlockState =
  | "live"
  | "updated"
  | "syncing"
  | "queued"
  | "sealed"
  | "warning"
  | "error";

export interface EnvelopeBlockStatus {
  blockType?: string;
  detail?: string;
  evidence?: string;
  hash?: string;
  id: string;
  label: string;
  pulse?: boolean;
  slot?: string;
  staleAfterMs?: number;
  state: EnvelopeBlockState;
  updatedAt?: number;
}
