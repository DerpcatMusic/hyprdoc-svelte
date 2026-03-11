import type {
  EnvelopeBlockState,
  EnvelopeSignerStatus,
  EnvelopeTone,
} from "./types";

export const envelopeToneSurfaceClasses: Record<EnvelopeTone, string> = {
  neutral: "border-border/70 bg-muted/60 text-muted-foreground",
  info: "border-status-info/15 bg-status-info-soft text-status-info",
  success:
    "border-status-success/15 bg-status-success-soft text-status-success",
  warning:
    "border-status-warning/15 bg-status-warning-soft text-status-warning",
  danger: "border-status-danger/15 bg-status-danger-soft text-status-danger",
};

export const envelopeToneTextClasses: Record<EnvelopeTone, string> = {
  neutral: "text-foreground",
  info: "text-status-info",
  success: "text-status-success",
  warning: "text-status-warning",
  danger: "text-status-danger",
};

export const envelopeToneDotClasses: Record<EnvelopeTone, string> = {
  neutral: "bg-muted-foreground/60",
  info: "bg-status-info",
  success: "bg-status-success",
  warning: "bg-status-warning",
  danger: "bg-status-danger",
};

export const envelopeSignerStatusLabel: Record<EnvelopeSignerStatus, string> = {
  completed: "Signed",
  active: "Current",
  pending: "Queued",
  blocked: "Blocked",
};

export const envelopeSignerStatusTone: Record<
  EnvelopeSignerStatus,
  EnvelopeTone
> = {
  completed: "success",
  active: "info",
  pending: "neutral",
  blocked: "warning",
};

export const envelopeBlockStateLabel: Record<EnvelopeBlockState, string> = {
  live: "Live",
  updated: "Updated",
  syncing: "Syncing",
  queued: "Queued",
  sealed: "Sealed",
  warning: "Warning",
  error: "Error",
};

export const envelopeBlockStateTone: Record<EnvelopeBlockState, EnvelopeTone> =
  {
    live: "success",
    updated: "info",
    syncing: "info",
    queued: "neutral",
    sealed: "success",
    warning: "warning",
    error: "danger",
  };
