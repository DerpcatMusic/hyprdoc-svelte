<script lang="ts">
  import type { FunctionReference } from "convex/server";
  import { useQuery } from "convex-svelte";
  import { format, formatDistanceToNow } from "date-fns";
  import { api } from "@/convex/_generated/api";
  import type { Id } from "@/convex/_generated/dataModel";
  import type * as envelopeQueries from "@/convex/envelopes/queries";
  import type {
    LiveContractProjection,
    RuntimeProjectionEnvelope,
    ProjectionVerificationResult,
  } from "@hyprdoc/domain-types";
  import { browser } from "$app/environment";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { getRuntimeProjection, postRuntimeMutation } from "$lib/runtime/client";
  import { verifyRuntimeProjection, verifySealHash } from "../../../../../packages/contract-core/src/index.ts";
  import EnvelopeLiveBlockStatusList from "$lib/components/envelope/EnvelopeLiveBlockStatusList.svelte";
  import type { EnvelopeBlockStatus } from "$lib/components/envelope/types";
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Progress } from "$lib/components/ui/progress";
  import { Separator } from "$lib/components/ui/separator";
  import { Spinner } from "$lib/components/ui/spinner";
  import * as Tabs from "$lib/components/ui/tabs";
  import DocumentViewer from "$lib/editor/ui/DocumentViewer.svelte";
  import { uiStore } from "$lib/stores/ui-store.svelte";
  import { cn } from "$lib/utils";

  const documentId = $derived(page.params.documentId as Id<"documents">);

  const documentQuery = useQuery(api.documents.queries.get.get, () => ({
    documentId,
  }));

  const envelopeDashboardApi = (
    api as typeof api & { "envelopes/queries": typeof envelopeQueries }
  )["envelopes/queries"];
  const getEnvelopeDashboard =
    envelopeDashboardApi.getDashboard as unknown as FunctionReference<"query">;
  const dashboardQuery = useQuery(getEnvelopeDashboard, () => ({
    documentId,
    auditLogLimit: 8,
    liveEventLimit: 8,
    lineageEventLimit: 8,
    versionLimit: 6,
  }));

  const documentData = $derived(documentQuery.data);
  const dashboard = $derived(dashboardQuery.data);
  const runtimeRefreshIntervalMs = 15_000;
  let runtimeEnvelope = $state<RuntimeProjectionEnvelope | null>(null);
  const runtimeProjection = $derived(
    (runtimeEnvelope?.projection as LiveContractProjection | null | undefined) ??
      null
  );
  const isLoading = $derived(
    documentQuery.isLoading ||
      dashboardQuery.isLoading
  );
  const error = $derived(
    documentQuery.error ?? dashboardQuery.error
  );

  const envelope = $derived(
    documentData && documentData.kind === "envelope" ? documentData : null
  );
  const summary = $derived(dashboard?.documentSummary ?? null);
  const sealState = $derived(dashboard?.sealState ?? null);
  const signatureState = $derived(dashboard?.signatureState ?? null);
  const recipients = $derived(dashboard?.signerAssignments ?? []);
  const auditLogs = $derived(dashboard?.recentAuditLogs ?? []);
  const liveStatus = $derived(dashboard?.liveContractStatus ?? null);
  const versions = $derived(dashboard?.versions ?? []);
  const blockLineage = $derived(dashboard?.blockLineageSummary ?? null);
  const orphanSignatures = $derived(dashboard?.orphanSignatures ?? []);
  const currentSmartBlocks = $derived(dashboard?.currentSmartBlocks ?? []);
  const BLOCK_CLOCK_INTERVAL_MS = 15_000;
  const BLOCK_ACK_STORAGE_KEY_PREFIX = "hyprdoc:envelope:block-acks:";
  type Recipient = {
    legalName: string;
    signatures: Array<Record<string, unknown> & { signedAt: number }>;
  };
  type CurrentSmartBlock = {
    id: string;
    label: string;
    blockType: string;
    required: boolean;
    slotName: string | null;
    currentValue: string | number | boolean | null;
    valueSource: "runtime" | "signer" | "none";
    lineage: {
      blockHash: string | null;
      lineageHash: string | null;
      lastChangedAt: number | null;
      lastChangeType: string | null;
      parentAnchorHash: string | null;
    };
    signing: {
      isSatisfied: boolean;
      latestSignedAt: number | null;
      signatureCount: number;
    };
    live: {
      currentEventHash: string | null;
      eventType: string | null;
      freshness: "fresh" | "stale" | "offline";
      lastEventAt: number | null;
      matchedBy: string;
      pulse: boolean;
      source: string | null;
      staleAfterMs: number;
    };
    ui: EnvelopeBlockStatus;
  };
  type SmartBlockStatusRow = CurrentSmartBlock & {
    freshnessLabel: string;
    unseenUpdate: boolean;
    ui: EnvelopeBlockStatus;
  };
  type SealVerificationState =
    | {
        status: "idle" | "checking";
        computedHash: null;
        error: null;
      }
    | {
        status: "verified" | "mismatch";
        computedHash: string;
        error: null;
      }
    | {
        status: "unavailable";
        computedHash: null;
        error: string;
      };
  type SealVerificationResult = {
    computedHash: string;
    matches: boolean;
  };
  type RuntimeVerificationState =
    | {
        status: "idle" | "checking";
        result: null;
        error: null;
      }
    | {
        status: "verified" | "invalid";
        result: ProjectionVerificationResult;
        error: null;
      }
    | {
        status: "unavailable";
        result: null;
        error: string;
      };

  let evidenceTab = $state("audit");
  let renderNow = $state(Date.now());
  let acknowledgedBlockHeads = $state<Record<string, string>>({});
  let ackStorageReady = $state(false);
  let selectedBlockId = $state<string | null>(null);
  let runtimeProjectionRefreshNonce = $state(0);
  let runtimeMutationTargetBlockId = $state<string | null>(null);
  let runtimeMutationValue = $state("");
  let runtimeMutationReason = $state("Manual runtime update");
  let runtimeMutationState = $state<{
    status: "idle" | "submitting" | "success" | "error";
    message: string | null;
  }>({
    status: "idle",
    message: null,
  });
  let runtimeVerification = $state<RuntimeVerificationState>({
    status: "idle",
    result: null,
    error: null,
  });
  let runtimeProjectionError = $state<string | null>(null);
  let sealVerification = $state<SealVerificationState>({
    status: "idle",
    computedHash: null,
    error: null,
  });

  function getBlockAckStorageKey(id: string) {
    return `${BLOCK_ACK_STORAGE_KEY_PREFIX}${id}`;
  }

  $effect(() => {
    if (!browser) {
      return;
    }

    renderNow = Date.now();
    const intervalId = window.setInterval(() => {
      renderNow = Date.now();
    }, BLOCK_CLOCK_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  });

  $effect(() => {
    if (!browser) {
      acknowledgedBlockHeads = {};
      ackStorageReady = true;
      return;
    }

    ackStorageReady = false;
    const rawValue = localStorage.getItem(
      getBlockAckStorageKey(page.params.documentId)
    );
    if (!rawValue) {
      acknowledgedBlockHeads = {};
      ackStorageReady = true;
      return;
    }

    try {
      const parsed = JSON.parse(rawValue);
      acknowledgedBlockHeads =
        parsed && typeof parsed === "object" && !Array.isArray(parsed)
          ? (parsed as Record<string, string>)
          : {};
    } catch {
      acknowledgedBlockHeads = {};
    }

    ackStorageReady = true;
  });

  $effect(() => {
    if (!browser || !ackStorageReady) {
      return;
    }

    localStorage.setItem(
      getBlockAckStorageKey(page.params.documentId),
      JSON.stringify(acknowledgedBlockHeads)
    );
  });

  $effect(() => {
    if (!browser || !envelope || !sealState?.contentHash) {
      sealVerification = {
        status: "idle",
        computedHash: null,
        error: null,
      };
      return;
    }

    let cancelled = false;
    sealVerification = {
      status: "checking",
      computedHash: null,
      error: null,
    };

    void verifySealHash(
      {
        title: envelope.title,
        content: envelope.content,
        blocks: envelope.blocks ?? [],
        settings: envelope.settings ?? {},
      },
      sealState.contentHash
    )
      .then((result: SealVerificationResult) => {
        if (cancelled) {
          return;
        }

        sealVerification = {
          status: result.matches ? "verified" : "mismatch",
          computedHash: result.computedHash,
          error: null,
        };
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }

        sealVerification = {
          status: "unavailable",
          computedHash: null,
          error:
            error instanceof Error ? error.message : "Verification unavailable",
        };
      });

    return () => {
      cancelled = true;
    };
  });

  $effect(() => {
    if (!browser || !documentId) {
      runtimeEnvelope = null;
      runtimeProjectionError = null;
      return;
    }

    runtimeProjectionRefreshNonce;

    let cancelled = false;
    let refreshTimer: ReturnType<typeof window.setTimeout> | null = null;

    const scheduleRefresh = () => {
      if (cancelled) {
        return;
      }

      refreshTimer = window.setTimeout(() => {
        void fetchRuntimeProjection();
      }, runtimeRefreshIntervalMs);
    };

    const fetchRuntimeProjection = async () => {
      try {
        const response = await getRuntimeProjection(documentId);
        if (cancelled) {
          return;
        }

        runtimeEnvelope = response;
        runtimeProjectionError = null;
      } catch (error: unknown) {
        if (cancelled) {
          return;
        }

        runtimeEnvelope = null;
        runtimeProjectionError =
          error instanceof Error ? error.message : "Runtime projection unavailable";
      } finally {
        scheduleRefresh();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible" || cancelled) {
        return;
      }

      if (refreshTimer) {
        window.clearTimeout(refreshTimer);
        refreshTimer = null;
      }

      void fetchRuntimeProjection();
    };

    void fetchRuntimeProjection();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      if (refreshTimer) {
        window.clearTimeout(refreshTimer);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  });

  $effect(() => {
    if (!browser || !runtimeProjection) {
      runtimeVerification = {
        status: "idle",
        result: null,
        error: null,
      };
      return;
    }

    let cancelled = false;
    runtimeVerification = {
      status: "checking",
      result: null,
      error: null,
    };

    void verifyRuntimeProjection(runtimeProjection)
      .then((result) => {
        if (cancelled) {
          return;
        }

        runtimeVerification = {
          status: result.valid ? "verified" : "invalid",
          result,
          error: null,
        };
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }

        runtimeVerification = {
          status: "unavailable",
          result: null,
          error:
            error instanceof Error ? error.message : "Runtime verification unavailable",
        };
      });

    return () => {
      cancelled = true;
    };
  });

  const progressValue = $derived(
    signatureState?.signerCount
      ? Math.round(
          (signatureState.signedCount / signatureState.signerCount) * 100
        )
      : 0
  );

  const recentSignatures = $derived.by(() => {
    const attached = recipients.flatMap((recipient: Recipient) =>
      recipient.signatures.map(
        (signature: Recipient["signatures"][number]) => ({
          ...signature,
          signerName: recipient.legalName,
        })
      )
    );

    return [...attached, ...orphanSignatures]
      .sort((a, b) => b.signedAt - a.signedAt)
      .slice(0, 6);
  });

  const livePulse = $derived(
    (
      runtimeProjection?.liveEvents[runtimeProjection.liveEvents.length - 1]
        ?.createdAt ?? liveStatus?.latestEventAt
    )
      ? renderNow -
          (
            runtimeProjection?.liveEvents[runtimeProjection.liveEvents.length - 1]
              ?.createdAt ??
            liveStatus?.latestEventAt ??
            0
          ) <
          1000 * 60 * 10
      : false
  );
  const sealVerificationTone = $derived.by(() => {
    switch (sealVerification.status) {
      case "verified":
        return "border-status-success/20 bg-status-success-soft text-status-success";
      case "mismatch":
        return "border-status-danger/20 bg-status-danger-soft text-status-danger";
      case "unavailable":
        return "border-status-warning/20 bg-status-warning-soft text-status-warning";
      default:
        return "border-border bg-muted text-muted-foreground";
    }
  });
  const sealVerificationLabel = $derived.by(() => {
    switch (sealVerification.status) {
      case "verified":
        return "Rust proof verified";
      case "mismatch":
        return "Seal mismatch";
      case "unavailable":
        return "Verifier unavailable";
      case "checking":
        return "Checking seal";
      default:
        return "Seal unchecked";
    }
  });
  const runtimeVerificationTone = $derived.by(() => {
    switch (runtimeVerification.status) {
      case "verified":
        return "border-status-success/20 bg-status-success-soft text-status-success";
      case "invalid":
        return "border-status-danger/20 bg-status-danger-soft text-status-danger";
      case "unavailable":
        return "border-status-warning/20 bg-status-warning-soft text-status-warning";
      default:
        return "border-border bg-muted text-muted-foreground";
    }
  });
  const runtimeVerificationLabel = $derived.by(() => {
    switch (runtimeVerification.status) {
      case "verified":
        return "Runtime chain verified";
      case "invalid":
        return "Runtime proof mismatch";
      case "unavailable":
        return "Runtime verifier unavailable";
      case "checking":
        return "Checking runtime";
      default:
        return "Runtime unchecked";
    }
  });
  const runtimeVerificationIssue = $derived(
    runtimeVerification.result?.issues[0] ??
      runtimeVerification.error ??
      runtimeProjectionError ??
      null
  );
  const runtimeProviderLabel = $derived.by(() => {
    switch (runtimeEnvelope?.provider) {
      case "phoenix":
        return "Phoenix runtime";
      case "convex":
        return "Convex fallback";
      default:
        return "Runtime pending";
    }
  });
  const runtimeFetchedAtLabel = $derived.by(() => {
    if (runtimeEnvelope?.fetchedAt) {
      return formatRelative(runtimeEnvelope.fetchedAt);
    }

    return runtimeProjectionError ? "Unavailable" : "Pending";
  });
  const runtimeRecentLiveEvents = $derived.by(() =>
    [...(runtimeProjection?.liveEvents ?? [])]
      .sort((left, right) => right.createdAt - left.createdAt)
      .slice(0, 8)
  );
  const runtimeRecentLineageEvents = $derived.by(() =>
    [...(runtimeProjection?.lineageEvents ?? [])]
      .sort((left, right) => right.createdAt - left.createdAt)
      .slice(0, 8)
  );
  const runtimeLiveSummary = $derived.by(() => {
    if (!runtimeProjection) {
      return null;
    }

    const latestEventAt = runtimeRecentLiveEvents[0]?.createdAt ?? null;
    const hasEvents = runtimeProjection.liveEvents.length > 0;

    return {
      status:
        runtimeVerification.status === "invalid"
          ? "degraded"
          : hasEvents
            ? "active"
            : "sealed",
      stateHash:
        runtimeProjection.integrity.currentStateHash ??
        runtimeProjection.integrity.baseSealHash,
      latestEventAt,
      isSealAnchorCurrent: runtimeProjection.integrity.isSealAnchorCurrent,
      totalLiveEventCount: runtimeProjection.integrity.totalLiveEventCount,
      totalLineageEventCount: runtimeProjection.integrity.totalLineageEventCount,
    };
  });
  const runtimeResolvedBlockById = $derived.by(
    () =>
      new Map(
        (runtimeProjection?.resolvedBlocks ?? []).map((block) => [
          block.blockId,
          block,
        ])
      )
  );

  const smartBlockRows = $derived.by(() =>
    currentSmartBlocks.map((block: CurrentSmartBlock) => {
      const resolvedRuntimeBlock = runtimeResolvedBlockById.get(block.id) ?? null;
      const resolvedUpdatedAt =
        resolvedRuntimeBlock?.updatedAt ?? block.live.lastEventAt;
      const resolvedFreshness =
        resolvedUpdatedAt !== null && resolvedUpdatedAt !== undefined
          ? renderNow - resolvedUpdatedAt > block.live.staleAfterMs
            ? "stale"
            : "fresh"
          : block.live.freshness;
      const unseenUpdate = Boolean(
        (resolvedRuntimeBlock?.eventHash ?? block.live.currentEventHash) &&
          acknowledgedBlockHeads[block.id] !==
            (resolvedRuntimeBlock?.eventHash ?? block.live.currentEventHash)
      );

      const freshnessLabel =
        resolvedFreshness === "fresh"
          ? unseenUpdate
            ? "Update unseen"
            : "Current"
          : resolvedFreshness === "stale"
            ? "Viewer behind live head"
            : "No live feed";

      const detailParts = [block.ui.detail, freshnessLabel].filter(
        (value): value is string => Boolean(value)
      );

      return {
        ...block,
        freshnessLabel,
        unseenUpdate,
        ui: {
          ...block.ui,
          state: unseenUpdate ? "updated" : block.ui.state,
          detail: detailParts.join(" • "),
          pulse: unseenUpdate || block.ui.pulse,
          staleAfterMs: block.live.staleAfterMs,
          updatedAt:
            resolvedUpdatedAt ??
            block.signing.latestSignedAt ??
            block.ui.updatedAt,
        },
        currentValue: resolvedRuntimeBlock?.value ?? block.currentValue,
        valueSource: resolvedRuntimeBlock ? "runtime" : block.valueSource,
        live: {
          ...block.live,
          currentEventHash:
            resolvedRuntimeBlock?.eventHash ?? block.live.currentEventHash,
          lastEventAt: resolvedUpdatedAt ?? null,
          source:
            resolvedRuntimeBlock?.source === "sealed"
              ? block.live.source
              : (resolvedRuntimeBlock?.source ?? block.live.source),
          freshness: resolvedFreshness,
        },
      } satisfies SmartBlockStatusRow;
    })
  );

  const selectedSmartBlock = $derived.by(() => {
    if (smartBlockRows.length === 0) {
      return null;
    }

    return (
      smartBlockRows.find(
        (block: SmartBlockStatusRow) => block.id === selectedBlockId
      ) ??
      smartBlockRows.find((block: SmartBlockStatusRow) => block.unseenUpdate) ??
      smartBlockRows[0]
    );
  });
  const selectedRuntimePolicy = $derived.by(() => {
    if (!selectedSmartBlock || !runtimeProjection) {
      return null;
    }

    return (
      runtimeProjection.policies.find(
        (policy) => policy.blockId === selectedSmartBlock.id
      ) ?? null
    );
  });
  const canManuallyMutateSelectedBlock = $derived(
    Boolean(
      selectedSmartBlock &&
        selectedSmartBlock.blockType === "live-value" &&
        selectedRuntimePolicy &&
        selectedRuntimePolicy.mode !== "sealed"
    )
  );

  $effect(() => {
    if (smartBlockRows.length === 0) {
      selectedBlockId = null;
      return;
    }

    if (
      selectedBlockId &&
      smartBlockRows.some(
        (block: SmartBlockStatusRow) => block.id === selectedBlockId
      )
    ) {
      return;
    }

    selectedBlockId =
      smartBlockRows.find((block: SmartBlockStatusRow) => block.unseenUpdate)
        ?.id ??
      smartBlockRows[0]?.id ??
      null;
  });

  $effect(() => {
    if (!selectedSmartBlock) {
      runtimeMutationTargetBlockId = null;
      runtimeMutationValue = "";
      runtimeMutationState = {
        status: "idle",
        message: null,
      };
      return;
    }

    if (runtimeMutationTargetBlockId === selectedSmartBlock.id) {
      return;
    }

    runtimeMutationTargetBlockId = selectedSmartBlock.id;
    const nextValue = formatBlockValue(selectedSmartBlock.currentValue) ?? "";
    runtimeMutationValue = nextValue;
    runtimeMutationState = {
      status: "idle",
      message: null,
    };
  });

  const statusConfig = {
    draft: {
      label: "Draft envelope",
      tone: "bg-muted text-muted-foreground border-border",
      iconClass: "i-lucide-file-text",
    },
    pending_signatures: {
      label: "Awaiting signatures",
      tone: "bg-status-info-soft text-status-info border-status-info/20",
      iconClass: "i-lucide-clock-3",
    },
    completed: {
      label: "Completed",
      tone: "bg-status-success-soft text-status-success border-status-success/20",
      iconClass: "i-lucide-badge-check",
    },
    expired: {
      label: "Expired",
      tone: "bg-status-warning-soft text-status-warning border-status-warning/20",
      iconClass: "i-lucide-timer-off",
    },
    voided: {
      label: "Voided",
      tone: "bg-status-danger-soft text-status-danger border-status-danger/20",
      iconClass: "i-lucide-ban",
    },
  } as const;

  const levelConfig = {
    info: "bg-primary/10 text-primary border-primary/15",
    warn: "bg-status-warning-soft text-status-warning border-status-warning/20",
    error: "bg-status-danger-soft text-status-danger border-status-danger/20",
    security:
      "bg-status-success-soft text-status-success border-status-success/20",
  } as const;

  function openDashboard() {
    uiStore.setDashboardView("envelopes");
    void goto("/dashboard?view=envelopes");
  }

  function formatTimestamp(value?: number | null) {
    if (!value) {
      return "Not yet";
    }
    return format(value, "MMM d, yyyy 'at' HH:mm");
  }

  function formatRelative(value?: number | null) {
    if (!value) {
      return "Not yet";
    }
    return formatDistanceToNow(value, { addSuffix: true });
  }

  function shortHash(value?: string | null) {
    if (!value) {
      return "Unavailable";
    }
    if (value.length <= 18) {
      return value;
    }
    return `${value.slice(0, 10)}...${value.slice(-8)}`;
  }

  function metadataSummary(metadata: unknown) {
    if (!metadata || typeof metadata !== "object") {
      return null;
    }

    const entries = Object.entries(metadata as Record<string, unknown>)
      .filter(
        ([, value]) => value !== null && value !== undefined && value !== ""
      )
      .slice(0, 3)
      .map(([key, value]) => `${key}: ${String(value)}`);

    return entries.length > 0 ? entries.join(" • ") : null;
  }

  function formatBlockValue(value: string | number | boolean | null) {
    if (typeof value === "string") {
      return value.trim().length > 0 ? value : null;
    }
    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
    return null;
  }

  function coerceRuntimeMutationValue(
    rawValue: string,
    currentValue: string | number | boolean | null
  ) {
    if (typeof currentValue === "number") {
      const parsedNumber = Number(rawValue);
      if (Number.isNaN(parsedNumber)) {
        throw new Error("Runtime value must be a valid number");
      }
      return parsedNumber;
    }

    if (typeof currentValue === "boolean") {
      if (rawValue === "true") {
        return true;
      }
      if (rawValue === "false") {
        return false;
      }
      throw new Error('Runtime value must be "true" or "false"');
    }

    return rawValue;
  }

  async function applySelectedRuntimeMutation() {
    if (!selectedSmartBlock || !canManuallyMutateSelectedBlock) {
      return;
    }

    runtimeMutationState = {
      status: "submitting",
      message: null,
    };

    try {
      const nextValue = coerceRuntimeMutationValue(
        runtimeMutationValue,
        selectedSmartBlock.currentValue
      );

      await postRuntimeMutation(documentId, {
        blockId: selectedSmartBlock.id,
        path: "data.value",
        op: "replace",
        source: "owner",
        value: nextValue,
        reason: runtimeMutationReason.trim() || "Manual runtime update",
      });

      runtimeMutationValue = formatBlockValue(nextValue) ?? "";
      runtimeProjectionRefreshNonce += 1;
      runtimeMutationState = {
        status: "success",
        message: "Runtime update appended to the live contract chain.",
      };
    } catch (error: unknown) {
      runtimeMutationState = {
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Runtime mutation failed",
      };
    }
  }

  function recipientInitials(name?: string | null) {
    return (
      name
        ?.split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("") ?? "??"
    );
  }

  function acknowledgeSmartBlock(blockId: string) {
    const block = smartBlockRows.find(
      (candidate: SmartBlockStatusRow) => candidate.id === blockId
    );
    const currentHeadHash = block?.live.currentEventHash;

    if (!currentHeadHash) {
      return;
    }

    acknowledgedBlockHeads = {
      ...acknowledgedBlockHeads,
      [blockId]: currentHeadHash,
    };
  }

  function selectSmartBlock(blockId: string) {
    selectedBlockId = blockId;
    acknowledgeSmartBlock(blockId);
  }
</script>

<svelte:head>
  <title>{envelope?.title ?? "Envelope"} | HyprDoc</title>
</svelte:head>

<div
  class="relative flex min-h-screen flex-col bg-background text-foreground lg:h-screen lg:overflow-hidden"
>
  <div class="pointer-events-none absolute inset-0 z-0">
    <div
      class="absolute left-[8%] top-0 h-64 w-64 rounded-full bg-primary/8 blur-3xl"
    ></div>
    <div
      class="absolute bottom-10 right-[12%] h-72 w-72 rounded-full bg-secondary/10 blur-3xl"
    ></div>
    <div
      class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.05),transparent_32%),linear-gradient(180deg,transparent,rgba(127,127,127,0.05))]"
    ></div>
  </div>

  <header
    class="relative z-10 border-b border-border/60 bg-background/80 px-4 py-4 backdrop-blur-xl xl:px-6"
  >
    <div class="flex flex-col gap-4">
      <div
        class="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between"
      >
        <div class="flex flex-col gap-3">
          <div class="flex items-center gap-2 text-xs text-muted-foreground">
            <button
              type="button"
              class="inline-flex items-center gap-1 rounded-full px-2 py-1 transition-colors hover:bg-muted hover:text-foreground"
              onclick={openDashboard}
            >
              <span class="i-lucide-arrow-left h-3.5 w-3.5"></span>
              Envelope queue
            </button>
            <span>/</span>
            <span class="font-mono text-[11px]">{page.params.documentId}</span>
          </div>

          <div class="flex flex-wrap items-center gap-3">
            <h1 class="max-w-4xl text-2xl font-bold tracking-tight xl:text-3xl">
              {envelope?.title ?? summary?.title ?? "Envelope dashboard"}
            </h1>

            {#if envelope}
              {@const config = statusConfig[envelope.status as keyof typeof statusConfig] ?? statusConfig.draft}
              <div
                class={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em]",
                  config.tone
                )}
              >
                <span class={cn(config.iconClass, "h-3.5 w-3.5")}></span>
                {config.label}
              </div>
            {/if}
          </div>

          <div
            class="flex flex-wrap items-center gap-2 text-sm text-muted-foreground"
          >
            {#if summary?.sourceTemplate}
              <button
                type="button"
                class="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/80 px-3 py-1.5 transition-colors hover:border-primary/20 hover:text-foreground"
                onclick={() => goto(`/editor/${summary.sourceTemplate.id}`)}
              >
                <span class="i-lucide-file-stack h-3.5 w-3.5"></span>
                Source: {summary.sourceTemplate.title}
              </button>
            {/if}

            {#if summary?.instanceNumber}
              <span
                class="rounded-full border border-border/70 bg-card/70 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em]"
              >
                Envelope #{summary.instanceNumber}
              </span>
            {/if}
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            class="gap-2 rounded-xl"
            onclick={() => goto(`/editor/${page.params.documentId}`)}
          >
            <span class="i-lucide-file-pen-line h-4 w-4"></span>
            Open editor
          </Button>
        </div>
      </div>

      <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div class="rounded-2xl border border-border/70 bg-card/80 p-4">
          <div class="mb-2 flex items-center justify-between">
            <span
              class="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground"
            >
              Signature progress
            </span>
            <span class="font-mono text-xs text-muted-foreground">
              {signatureState?.signedCount ?? 0}/{signatureState?.signerCount ?? 0}
            </span>
          </div>
          <div class="mb-3 flex items-end justify-between">
            <span class="text-2xl font-bold tracking-tight"
              >{progressValue}%</span
            >
            <span class="text-xs text-muted-foreground">
              {signatureState?.readyCount ?? 0}
              ready
            </span>
          </div>
          <Progress value={progressValue} class="h-2.5 bg-primary/12" />
        </div>

        <div class="rounded-2xl border border-border/70 bg-card/80 p-4">
          <div
            class="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground"
          >
            Seal status
          </div>
          <div class="mb-1 flex items-center gap-2">
            <span
              class={cn(
                "h-2.5 w-2.5 rounded-full",
                sealState?.isSealed
                  ? "bg-status-success shadow-[0_0_14px_var(--status-success)]"
                  : "bg-status-warning"
              )}
            ></span>
            <span class="font-semibold">
              {sealState?.isSealed ? "Sealed and immutable" : "Still editable"}
            </span>
          </div>
          <div class="text-xs text-muted-foreground">
            {sealState?.sealedAt
              ? formatRelative(sealState.sealedAt)
              : "Envelope has not been sent for signing yet."}
          </div>
        </div>

        <div class="rounded-2xl border border-border/70 bg-card/80 p-4">
          <div
            class="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground"
          >
            Live contract
          </div>
          <div class="mb-1 flex items-center gap-2">
            <span
              class={cn(
                "h-2.5 w-2.5 rounded-full",
                liveStatus?.status === "active" &&
                  "bg-status-success shadow-[0_0_14px_var(--status-success)]",
                liveStatus?.status === "paused" && "bg-status-warning",
                !liveStatus && "bg-muted-foreground/40"
              )}
            ></span>
            <span class="font-semibold capitalize">
              {liveStatus?.status ?? "Offline"}
            </span>
            {#if livePulse}
              <span
                class="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary"
              >
                live
              </span>
            {/if}
          </div>
          <div class="text-xs text-muted-foreground">
            {#if liveStatus}
              {liveStatus.metRequirementCount}/{liveStatus.requirementCount}
              requirements satisfied
            {:else}
              No live state initialized for this envelope.
            {/if}
          </div>
        </div>

        <div class="rounded-2xl border border-border/70 bg-card/80 p-4">
          <div
            class="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground"
          >
            Block lineage
          </div>
          <div class="mb-1 flex items-center gap-2">
            <span class="font-semibold">
              {blockLineage?.trackedBlockCount ?? 0}
              tracked blocks
            </span>
          </div>
          <div class="text-xs text-muted-foreground">
            {blockLineage?.counts.updated ?? 0}
            updates • {blockLineage?.counts.created ?? 0} created
          </div>
        </div>
      </div>
    </div>
  </header>

  {#if isLoading}
    <div class="relative z-10 flex flex-1 items-center justify-center">
      <Spinner size="lg" />
    </div>
  {:else if error}
    <div class="relative z-10 flex flex-1 items-center justify-center px-6">
      <div
        class="max-w-lg rounded-3xl border border-status-danger/20 bg-status-danger-soft/40 p-6 text-center"
      >
        <div class="mb-3 text-lg font-semibold">
          Envelope dashboard failed to load
        </div>
        <p class="text-sm text-muted-foreground">{error.message}</p>
      </div>
    </div>
  {:else if !dashboard || !envelope}
    <div class="relative z-10 flex flex-1 items-center justify-center px-6">
      <div
        class="max-w-lg rounded-3xl border border-border bg-card p-6 text-center"
      >
        <div class="mb-3 text-lg font-semibold">Envelope not found</div>
        <p class="text-sm text-muted-foreground">
          This route only renders existing protected envelope documents.
        </p>
      </div>
    </div>
  {:else}
    <div class="relative z-10 flex-1 lg:min-h-0">
      <div
        class="grid h-full lg:grid-cols-[minmax(0,1.45fr)_minmax(360px,430px)]"
      >
        <section class="min-h-0 overflow-y-auto px-4 py-4 xl:px-6 xl:py-5">
          <div
            class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card/60 px-4 py-3 backdrop-blur"
          >
            <div>
              <div
                class="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground"
              >
                Immutable document surface
              </div>
              <div class="mt-1 text-sm text-muted-foreground">
                Scroll the sealed envelope on the left while the trust rail
                stays live on the right.
              </div>
            </div>

            <div
              class="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"
            >
              <span class="rounded-full border border-border/70 px-3 py-1.5">
                Version {summary?.version ?? envelope.version}
              </span>
              <span class="rounded-full border border-border/70 px-3 py-1.5">
                Created
                {formatRelative(summary?.createdAt ?? envelope.createdAt)}
              </span>
              {#if sealState?.sealedVersion}
                <span class="rounded-full border border-border/70 px-3 py-1.5">
                  Sealed on v{sealState.sealedVersion}
                </span>
              {/if}
            </div>
          </div>

          <div
            class="rounded-[28px] border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),transparent),var(--color-card)] p-3 shadow-[0_24px_90px_rgba(0,0,0,0.10)] sm:p-5"
          >
            <div
              class="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/75 px-4 py-3 backdrop-blur-sm"
            >
              <div class="min-w-0">
                <div
                  class="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground"
                >
                  Envelope artifact
                </div>
                <div class="truncate text-sm font-medium">{envelope.title}</div>
              </div>

              <div
                class="flex items-center gap-2 text-xs text-muted-foreground"
              >
                <span class="font-mono"
                  >{shortHash(sealState?.contentHash)}</span
                >
                <span
                  class={cn(
                    "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em]",
                    sealVerificationTone
                  )}
                >
                  {sealVerificationLabel}
                </span>
                <span
                  class={cn(
                    "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em]",
                    runtimeVerificationTone
                  )}
                >
                  {runtimeVerificationLabel}
                </span>
              </div>
            </div>

            <div
              class="overflow-hidden rounded-[24px] border border-border/60 bg-muted/20 p-2 sm:p-4"
            >
              <div class="mx-auto w-full max-w-[920px]">
                <DocumentViewer
                  content={envelope.content}
                  mode="view"
                  settings={envelope.settings ?? {}}
                  showBadge={!!sealState?.isSealed}
                  class="shadow-[0_18px_55px_rgba(0,0,0,0.12)]"
                />
              </div>
            </div>
          </div>
        </section>

        <aside
          class="min-h-0 overflow-y-auto border-t border-border/60 bg-card/45 px-4 py-4 backdrop-blur-xl lg:border-l lg:border-t-0 xl:px-5 xl:py-5"
        >
          <div class="space-y-4">
            <div
              class="rounded-3xl border border-border/70 bg-card/85 p-4 shadow-sm"
            >
              <div class="mb-4 flex items-center justify-between">
                <div>
                  <div
                    class="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground"
                  >
                    Envelope posture
                  </div>
                  <div class="mt-1 text-base font-semibold">
                    Operational snapshot
                  </div>
                </div>
                <Badge
                  variant="outline"
                  class="rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.2em]"
                >
                  Audit-ready
                </Badge>
              </div>

              <div class="space-y-3 text-sm">
                <div class="flex items-start justify-between gap-4">
                  <span class="text-muted-foreground">Signing session</span>
                  <span class="text-right font-medium capitalize">
                    {signatureState?.sessionStatus ?? "Not started"}
                  </span>
                </div>
                <div class="flex items-start justify-between gap-4">
                  <span class="text-muted-foreground">Created</span>
                  <span class="text-right font-medium">
                    {formatTimestamp(summary?.createdAt ?? envelope.createdAt)}
                  </span>
                </div>
                <div class="flex items-start justify-between gap-4">
                  <span class="text-muted-foreground">Sealed</span>
                  <span class="text-right font-medium"
                    >{formatTimestamp(sealState?.sealedAt)}</span
                  >
                </div>
                <div class="flex items-start justify-between gap-4">
                  <span class="text-muted-foreground">Completed</span>
                  <span class="text-right font-medium"
                    >{formatTimestamp(sealState?.completedAt)}</span
                  >
                </div>
                <div class="flex items-start justify-between gap-4">
                  <span class="text-muted-foreground">Content hash</span>
                  <span
                    class="max-w-[12rem] truncate text-right font-mono text-xs"
                  >
                    {sealState?.contentHash ?? "Unavailable"}
                  </span>
                </div>
                <div class="flex items-start justify-between gap-4">
                  <span class="text-muted-foreground">Rust verifier</span>
                  <span
                    class={cn(
                      "max-w-[12rem] rounded-full border px-2 py-0.5 text-right text-[10px] font-semibold uppercase tracking-[0.16em]",
                      sealVerificationTone
                    )}
                  >
                    {sealVerificationLabel}
                  </span>
                </div>
                <div class="flex items-start justify-between gap-4">
                  <span class="text-muted-foreground">Runtime verifier</span>
                  <span
                    class={cn(
                      "max-w-[12rem] rounded-full border px-2 py-0.5 text-right text-[10px] font-semibold uppercase tracking-[0.16em]",
                      runtimeVerificationTone
                    )}
                  >
                    {runtimeVerificationLabel}
                  </span>
                </div>
                <div class="flex items-start justify-between gap-4">
                  <span class="text-muted-foreground">Runtime source</span>
                  <span class="text-right font-medium">{runtimeProviderLabel}</span>
                </div>
                <div class="flex items-start justify-between gap-4">
                  <span class="text-muted-foreground">Runtime fetched</span>
                  <span class="text-right font-medium">{runtimeFetchedAtLabel}</span>
                </div>
                {#if sealVerification.computedHash}
                  <div class="flex items-start justify-between gap-4">
                    <span class="text-muted-foreground">Computed hash</span>
                    <span
                      class="max-w-[12rem] truncate text-right font-mono text-xs"
                    >
                      {sealVerification.computedHash}
                    </span>
                  </div>
                {/if}
                {#if runtimeVerification.result}
                  <div class="flex items-start justify-between gap-4">
                    <span class="text-muted-foreground">Live events</span>
                    <span class="text-right font-medium">
                      {runtimeVerification.result.eventChain.verifiedCount}/
                      {runtimeProjection?.integrity.totalLiveEventCount ?? 0}
                    </span>
                  </div>
                  <div class="flex items-start justify-between gap-4">
                    <span class="text-muted-foreground">Lineage events</span>
                    <span class="text-right font-medium">
                      {runtimeVerification.result.lineage.verifiedCount}/
                      {runtimeProjection?.integrity.totalLineageEventCount ?? 0}
                    </span>
                  </div>
                  <div class="flex items-start justify-between gap-4">
                    <span class="text-muted-foreground">Chain heads</span>
                    <span class="text-right font-medium">
                      {runtimeVerification.result.chainHeads.verifiedCount}/
                      {runtimeProjection?.chainHeads.length ?? 0}
                    </span>
                  </div>
                {/if}
                {#if runtimeVerificationIssue}
                  <div class="flex items-start justify-between gap-4">
                    <span class="text-muted-foreground">Runtime note</span>
                    <span class="max-w-[12rem] text-right text-xs text-muted-foreground">
                      {runtimeVerificationIssue}
                    </span>
                  </div>
                {/if}
                {#if liveStatus}
                  <div class="flex items-start justify-between gap-4">
                    <span class="text-muted-foreground">State hash</span>
                    <span
                      class="max-w-[12rem] truncate text-right font-mono text-xs"
                    >
                      {liveStatus.stateHash}
                    </span>
                  </div>
                {/if}
              </div>
            </div>

            <div
              class="rounded-3xl border border-border/70 bg-card/85 p-4 shadow-sm"
            >
              <div class="mb-4 flex items-center justify-between">
                <div>
                  <div
                    class="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground"
                  >
                    Recipients
                  </div>
                  <div class="mt-1 text-base font-semibold">
                    {recipients.length}
                    tracked participants
                  </div>
                </div>
                <span class="text-xs text-muted-foreground">
                  {signatureState?.signatureCount ?? 0}
                  signature events
                </span>
              </div>

              {#if recipients.length === 0}
                <div
                  class="rounded-2xl border border-dashed border-border/70 bg-muted/30 px-4 py-5 text-sm text-muted-foreground"
                >
                  No signer assignments are attached to this envelope yet.
                </div>
              {:else}
                <div class="space-y-3">
                  {#each recipients as recipient (`${recipient.id}`)}
                    <div
                      class="rounded-2xl border border-border/60 bg-background/70 p-3"
                    >
                      <div class="flex items-start gap-3">
                        <div
                          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-border/60 font-semibold"
                          style:background-color={recipient.color ? `${recipient.color}18` : undefined}
                          style:color={recipient.color ?? undefined}
                        >
                          {recipientInitials(recipient.legalName)}
                        </div>

                        <div class="min-w-0 flex-1">
                          <div class="flex flex-wrap items-center gap-2">
                            <div class="truncate font-semibold">
                              {recipient.legalName || recipient.role}
                            </div>
                            <span
                              class={cn(
                                "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em]",
                                recipient.status === "signed" && "border-status-success/20 bg-status-success-soft text-status-success",
                                recipient.status !== "signed" && "border-border bg-muted text-muted-foreground"
                              )}
                            >
                              {recipient.status}
                            </span>
                          </div>
                          <div class="mt-1 text-xs text-muted-foreground">
                            {recipient.email}
                          </div>
                          <div
                            class="mt-2 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground"
                          >
                            <span>{recipient.authMethod}</span>
                            <span>{recipient.signatureCount} signatures</span>
                            {#if recipient.signedAt}
                              <span
                                >Signed
                                {formatRelative(recipient.signedAt)}</span
                              >
                            {/if}
                          </div>
                        </div>
                      </div>
                    </div>
                  {/each}
                </div>
              {/if}
            </div>

            <EnvelopeLiveBlockStatusList
              title="Smart block status"
              description="Freshness, signatures, and captured values projected from the sealed block snapshot."
              blocks={smartBlockRows.map((block: SmartBlockStatusRow) => block.ui)}
              now={renderNow}
              selectedId={selectedSmartBlock?.id ?? null}
              onSelect={(block: EnvelopeBlockStatus) => selectSmartBlock(block.id)}
              emptyLabel="No smart blocks have been captured in this envelope."
            />

            {#if selectedSmartBlock}
              <div
                class="rounded-3xl border border-border/70 bg-card/85 p-4 shadow-sm"
              >
                <div class="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <div
                      class="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground"
                    >
                      Selected smart block
                    </div>
                    <div class="mt-1 text-base font-semibold">
                      {selectedSmartBlock.label}
                    </div>
                  </div>

                  {#if selectedSmartBlock.unseenUpdate}
                    <button
                      type="button"
                      class="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary transition-colors hover:bg-primary/15"
                      onclick={() => acknowledgeSmartBlock(selectedSmartBlock.id)}
                    >
                      Mark current
                    </button>
                  {/if}
                </div>

                <div class="grid gap-3 sm:grid-cols-2">
                  <div
                    class="rounded-2xl border border-border/60 bg-background/70 p-3"
                  >
                    <div
                      class="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
                    >
                      Freshness
                    </div>
                    <div class="mt-1 font-medium">
                      {selectedSmartBlock.freshnessLabel}
                    </div>
                    <div class="mt-1 text-xs text-muted-foreground">
                      {selectedSmartBlock.live.matchedBy === "none"
                        ? "No live event has been matched to this block yet."
                        : `Matched by ${selectedSmartBlock.live.matchedBy}.`}
                    </div>
                  </div>

                  <div
                    class="rounded-2xl border border-border/60 bg-background/70 p-3"
                  >
                    <div
                      class="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
                    >
                      Captured state
                    </div>
                    <div class="mt-1 break-words font-medium">
                      {selectedSmartBlock.blockType === "signature"
                        ? `${selectedSmartBlock.signing.signatureCount} signature${selectedSmartBlock.signing.signatureCount === 1 ? "" : "s"} recorded`
                        : formatBlockValue(selectedSmartBlock.currentValue) || "No current field value"}
                    </div>
                    <div class="mt-1 text-xs text-muted-foreground">
                      {selectedSmartBlock.valueSource === "runtime"
                        ? "This value is currently sourced from governed runtime state."
                        : selectedSmartBlock.signing.isSatisfied
                          ? "Required state is currently satisfied."
                          : "This block is still waiting on a required value."}
                    </div>
                  </div>

                  <div
                    class="rounded-2xl border border-border/60 bg-background/70 p-3"
                  >
                    <div
                      class="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
                    >
                      Proof anchors
                    </div>
                    <div class="mt-2 space-y-2 text-xs">
                      <div class="flex items-start justify-between gap-3">
                        <span class="text-muted-foreground">Event head</span>
                        <span class="max-w-[11rem] truncate font-mono">
                          {selectedSmartBlock.live.currentEventHash
                            ? shortHash(selectedSmartBlock.live.currentEventHash)
                            : "None"}
                        </span>
                      </div>
                      <div class="flex items-start justify-between gap-3">
                        <span class="text-muted-foreground">Block hash</span>
                        <span class="max-w-[11rem] truncate font-mono">
                          {selectedSmartBlock.lineage.blockHash
                            ? shortHash(selectedSmartBlock.lineage.blockHash)
                            : "Unavailable"}
                        </span>
                      </div>
                      <div class="flex items-start justify-between gap-3">
                        <span class="text-muted-foreground">Lineage hash</span>
                        <span class="max-w-[11rem] truncate font-mono">
                          {selectedSmartBlock.lineage.lineageHash
                            ? shortHash(selectedSmartBlock.lineage.lineageHash)
                            : "Unavailable"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div
                    class="rounded-2xl border border-border/60 bg-background/70 p-3"
                  >
                    <div
                      class="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
                    >
                      Activity
                    </div>
                    <div class="mt-2 space-y-2 text-xs">
                      <div class="flex items-start justify-between gap-3">
                        <span class="text-muted-foreground">Live source</span>
                        <span class="font-medium capitalize">
                          {selectedSmartBlock.live.source ?? "None"}
                        </span>
                      </div>
                      <div class="flex items-start justify-between gap-3">
                        <span class="text-muted-foreground">Event type</span>
                        <span class="font-medium capitalize">
                          {selectedSmartBlock.live.eventType ?? "None"}
                        </span>
                      </div>
                      <div class="flex items-start justify-between gap-3">
                        <span class="text-muted-foreground">Last activity</span>
                        <span class="font-medium">
                          {formatRelative(
                            selectedSmartBlock.live.lastEventAt ??
                              selectedSmartBlock.signing.latestSignedAt ??
                              selectedSmartBlock.lineage.lastChangedAt
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {#if canManuallyMutateSelectedBlock}
                  <div
                    class="mt-4 rounded-2xl border border-border/60 bg-background/70 p-4"
                  >
                    <div class="flex flex-col gap-1">
                      <div
                        class="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
                      >
                        Manual runtime mutation
                      </div>
                      <div class="text-sm text-muted-foreground">
                        Appends an authorized owner mutation for this live block through the runtime gateway.
                      </div>
                    </div>

                    <div class="mt-4 grid gap-3">
                      <div class="grid gap-1.5">
                        <label
                          class="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
                          for="runtime-mutation-value"
                        >
                          Next value
                        </label>
                        <Input
                          id="runtime-mutation-value"
                          value={runtimeMutationValue}
                          oninput={(event: Event & { currentTarget: HTMLInputElement }) =>
                            runtimeMutationValue = event.currentTarget.value}
                          placeholder="Enter runtime value"
                        />
                      </div>

                      <div class="grid gap-1.5">
                        <label
                          class="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
                          for="runtime-mutation-reason"
                        >
                          Reason
                        </label>
                        <Input
                          id="runtime-mutation-reason"
                          value={runtimeMutationReason}
                          oninput={(event: Event & { currentTarget: HTMLInputElement }) =>
                            runtimeMutationReason = event.currentTarget.value}
                          placeholder="Explain why this runtime value changed"
                        />
                      </div>

                      <div class="flex flex-wrap items-center gap-3">
                        <Button
                          class="rounded-xl"
                          disabled={runtimeMutationState.status === "submitting"}
                          onclick={() => void applySelectedRuntimeMutation()}
                        >
                          {runtimeMutationState.status === "submitting"
                            ? "Applying update"
                            : "Append runtime update"}
                        </Button>

                        {#if selectedRuntimePolicy}
                          <span class="text-xs text-muted-foreground">
                            Mode: {selectedRuntimePolicy.mode} • Path: data.value
                          </span>
                        {/if}
                      </div>

                      {#if runtimeMutationState.message}
                        <div
                          class={cn(
                            "rounded-xl border px-3 py-2 text-xs",
                            runtimeMutationState.status === "success"
                              ? "border-status-success/20 bg-status-success-soft text-status-success"
                              : runtimeMutationState.status === "error"
                                ? "border-status-danger/20 bg-status-danger-soft text-status-danger"
                                : "border-border/60 bg-card text-muted-foreground"
                          )}
                        >
                          {runtimeMutationState.message}
                        </div>
                      {/if}
                    </div>
                  </div>
                {/if}
              </div>
            {/if}

            <div
              class="rounded-3xl border border-border/70 bg-card/85 p-4 shadow-sm"
            >
              <div class="mb-4">
                <div
                  class="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground"
                >
                  Audit, evidence, live data
                </div>
                <div class="mt-1 text-base font-semibold">Proof surface</div>
              </div>

              <Tabs.Root bind:value={evidenceTab}>
                <Tabs.List
                  class="grid h-auto w-full grid-cols-3 rounded-2xl bg-muted/70 p-1"
                >
                  <Tabs.Trigger value="audit" class="rounded-xl text-xs"
                    >Audit</Tabs.Trigger
                  >
                  <Tabs.Trigger value="live" class="rounded-xl text-xs"
                    >Live</Tabs.Trigger
                  >
                  <Tabs.Trigger value="versions" class="rounded-xl text-xs"
                    >Versions</Tabs.Trigger
                  >
                </Tabs.List>

                <Tabs.Content value="audit" class="mt-4">
                  <div class="space-y-3">
                    {#if auditLogs.length === 0}
                      <div
                        class="rounded-2xl border border-dashed border-border/70 bg-muted/30 px-4 py-5 text-sm text-muted-foreground"
                      >
                        No audit entries exist for this envelope yet.
                      </div>
                    {:else}
                      {#each auditLogs as entry (`${entry.id}`)}
                        <div
                          class="rounded-2xl border border-border/60 bg-background/70 p-3"
                        >
                          <div
                            class="mb-2 flex items-start justify-between gap-3"
                          >
                            <div class="min-w-0">
                              <div class="truncate font-medium">
                                {entry.action}
                              </div>
                              <div class="mt-1 text-xs text-muted-foreground">
                                {formatRelative(entry.timestamp)}
                              </div>
                            </div>
                            <span
                              class={cn(
                                "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em]",
                                levelConfig[entry.level as keyof typeof levelConfig] ?? levelConfig.info
                              )}
                            >
                              {entry.level}
                            </span>
                          </div>
                          <div
                            class="font-mono text-[11px] text-muted-foreground"
                          >
                            {shortHash(entry.entryHash)}
                          </div>
                          {#if metadataSummary(entry.metadata)}
                            <div
                              class="mt-2 text-xs leading-relaxed text-muted-foreground"
                            >
                              {metadataSummary(entry.metadata)}
                            </div>
                          {/if}
                        </div>
                      {/each}
                    {/if}
                  </div>
                </Tabs.Content>

                <Tabs.Content value="live" class="mt-4">
                  {#if !runtimeProjection && !liveStatus}
                    <div
                      class="rounded-2xl border border-dashed border-border/70 bg-muted/30 px-4 py-5 text-sm text-muted-foreground"
                    >
                      Live contract state has not been initialized for this
                      envelope.
                    </div>
                  {:else}
                    <div class="space-y-4">
                      <div
                        class={cn(
                          "rounded-2xl border border-border/60 bg-background/70 p-3",
                          livePulse && "shadow-[0_0_0_1px_rgba(59,130,246,0.18),0_0_36px_rgba(59,130,246,0.10)]"
                        )}
                      >
                        <div class="mb-3 flex items-center justify-between">
                          <div class="font-medium capitalize">
                            {runtimeLiveSummary?.status ?? liveStatus?.status}
                            state
                          </div>
                          <span
                            class="font-mono text-[11px] text-muted-foreground"
                          >
                            {shortHash(
                              runtimeLiveSummary?.stateHash ?? liveStatus?.stateHash
                            )}
                          </span>
                        </div>
                        <div class="space-y-2 text-sm">
                          <div class="flex items-center justify-between gap-3">
                            <span class="text-muted-foreground"
                              >Live events</span
                            >
                            <span class="font-medium">
                              {runtimeLiveSummary?.totalLiveEventCount ??
                                liveStatus?.totalEventCount ??
                                0}
                            </span>
                          </div>
                          <div class="flex items-center justify-between gap-3">
                            <span class="text-muted-foreground"
                              >Lineage events</span
                            >
                            <span class="font-medium"
                              >{runtimeLiveSummary?.totalLineageEventCount ??
                                blockLineage?.totalEvents ??
                                0}</span
                            >
                          </div>
                          <div class="flex items-center justify-between gap-3">
                            <span class="text-muted-foreground"
                              >Seal anchor</span
                            >
                            <span
                              class={cn(
                                "font-medium",
                                (
                                  runtimeLiveSummary?.isSealAnchorCurrent ??
                                  liveStatus?.isSealAnchorCurrent
                                )
                                  ? "text-status-success"
                                  : "text-status-warning"
                              )}
                            >
                              {(runtimeLiveSummary?.isSealAnchorCurrent ??
                                liveStatus?.isSealAnchorCurrent)
                                ? "Current"
                                : "Mismatch"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div class="space-y-3">
                        {#each runtimeRecentLiveEvents as event (`${event.id}`)}
                          <div
                            class="rounded-2xl border border-border/60 bg-background/70 p-3"
                          >
                            <div
                              class="mb-1 flex items-center justify-between gap-3"
                            >
                              <div class="font-medium capitalize">
                                {event.eventType.replaceAll("_", " ")}
                              </div>
                              <span class="text-xs text-muted-foreground">
                                {formatRelative(event.createdAt)}
                              </span>
                            </div>
                            <div class="text-xs text-muted-foreground">
                              Source: {event.source}
                            </div>
                            <div
                              class="mt-2 font-mono text-[11px] text-muted-foreground"
                            >
                              {shortHash(event.eventHash)}
                            </div>
                          </div>
                        {/each}

                        {#if runtimeRecentLiveEvents.length === 0}
                          <div
                            class="rounded-2xl border border-dashed border-border/70 bg-muted/30 px-4 py-5 text-sm text-muted-foreground"
                          >
                            No governed runtime events have been projected yet.
                          </div>
                        {/if}
                      </div>
                    </div>
                  {/if}
                </Tabs.Content>

                <Tabs.Content value="versions" class="mt-4">
                  <div class="space-y-3">
                    {#each versions as version (`${version.id}`)}
                      <div
                        class={cn(
                          "rounded-2xl border border-border/60 bg-background/70 p-3",
                          version.isSealedVersion && "border-primary/30 bg-primary/5"
                        )}
                      >
                        <div
                          class="mb-2 flex items-center justify-between gap-3"
                        >
                          <div class="font-medium">
                            Version {version.version}
                            {#if version.isSealedVersion}
                              <span
                                class="ml-2 text-xs uppercase tracking-[0.18em] text-primary"
                              >
                                sealed
                              </span>
                            {/if}
                          </div>
                          <div class="text-xs text-muted-foreground">
                            {formatRelative(version.createdAt)}
                          </div>
                        </div>
                        <div
                          class="font-mono text-[11px] text-muted-foreground"
                        >
                          {version.contentHash}
                        </div>
                      </div>
                    {/each}

                    {#if versions.length === 0}
                      <div
                        class="rounded-2xl border border-dashed border-border/70 bg-muted/30 px-4 py-5 text-sm text-muted-foreground"
                      >
                        No version snapshots are attached to this envelope.
                      </div>
                    {/if}
                  </div>
                </Tabs.Content>
              </Tabs.Root>
            </div>

            <div
              class="rounded-3xl border border-border/70 bg-card/85 p-4 shadow-sm"
            >
              <div class="mb-4 flex items-center justify-between">
                <div>
                  <div
                    class="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground"
                  >
                    Additional evidence
                  </div>
                  <div class="mt-1 text-base font-semibold">
                    Signature and lineage trace
                  </div>
                </div>
                <span class="text-xs text-muted-foreground">
                  {runtimeProjection?.integrity.totalLineageEventCount ??
                    blockLineage?.totalEvents ??
                    0}
                  lineage events
                </span>
              </div>

              <div class="space-y-3">
                {#if recentSignatures.length > 0}
                  <div
                    class="rounded-2xl border border-border/60 bg-background/70 p-3"
                  >
                    <div
                      class="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground"
                    >
                      Latest signatures
                    </div>
                    <div class="space-y-2">
                      {#each recentSignatures as signature (`${signature.id}`)}
                        <div
                          class="flex items-center justify-between gap-3 text-sm"
                        >
                          <div class="min-w-0">
                            <div class="truncate font-medium">
                              {signature.signerName ?? signature.signedAsName}
                            </div>
                            <div class="truncate text-xs text-muted-foreground">
                              {signature.signatureType}
                              • {signature.blockId}
                            </div>
                          </div>
                          <div class="text-right text-xs text-muted-foreground">
                            {formatRelative(signature.signedAt)}
                          </div>
                        </div>
                      {/each}
                    </div>
                  </div>
                {/if}

                <div
                  class="rounded-2xl border border-border/60 bg-background/70 p-3"
                >
                  <div
                    class="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground"
                  >
                    Block lineage
                  </div>
                  {#if runtimeRecentLineageEvents.length === 0}
                    <div class="text-sm text-muted-foreground">
                      No block lineage activity has been recorded yet.
                    </div>
                  {:else}
                    <div class="space-y-2">
                      {#each runtimeRecentLineageEvents as event (`${event.id}`)}
                        <div
                          class={cn(
                            "rounded-2xl border px-3 py-2 text-sm",
                            Date.now() - event.createdAt < 1000 * 60 * 10
                              ? "border-primary/25 bg-primary/5"
                              : "border-border/60 bg-background/60"
                          )}
                        >
                          <div class="flex items-center justify-between gap-3">
                            <div class="min-w-0">
                              <div class="font-medium capitalize">
                                {event.changeType}
                                • {event.blockId}
                              </div>
                              <div
                                class="truncate text-xs text-muted-foreground"
                              >
                                {event.reason ?? event.how ?? "Lineage update"}
                              </div>
                            </div>
                            <div class="text-xs text-muted-foreground">
                              {formatRelative(event.createdAt)}
                            </div>
                          </div>
                          <Separator class="my-2" />
                          <div
                            class="font-mono text-[11px] text-muted-foreground"
                          >
                            {shortHash(event.lineageHash)}
                          </div>
                        </div>
                      {/each}
                    </div>
                  {/if}
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  {/if}
</div>
