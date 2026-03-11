<script lang="ts">
  /**
   * SigningView - Full signing experience for signers
   * Manages the flow: View Document → Verify Identity → Sign → Complete
   */
  import { FileText, ShieldCheck, PenTool, CheckCircle2, AlertTriangle, XCircle, Loader2 } from "lucide-svelte";
  import { Button } from "$lib/components/ui/button";
  import { Separator } from "$lib/components/ui/separator";
  import { cn } from "$lib/utils";
  import { useQuery } from "convex-svelte";
  import { useConvexMutation } from "$lib/convex/hooks";
  import { api } from "@/convex/_generated/api";
  import type { Id } from "@/convex/_generated/dataModel";
  import DocumentViewer from "$lib/editor/ui/DocumentViewer.svelte";
  import type { ExtractedSmartBlock } from "$lib/blocks/runtime/extract-smart-blocks";
  import { extractSmartBlocksFromContent } from "$lib/blocks/runtime/extract-smart-blocks";
  import SignaturePad from "$lib/components/ui/signature/SignaturePad.svelte";
  import { HYPR_DEFAULT_PARTY_COLOR } from "$lib/styles/ui-palette";
  import OtpVerificationView from "./OtpVerificationView.svelte";
  import { toast } from "svelte-sonner";

  interface Props {
    accessToken: string;
  }

  let { accessToken }: Props = $props();

  // Current step in the signing flow
  type SigningStep = 'loading' | 'view' | 'verify-email' | 'verify-phone' | 'sign' | 'complete' | 'error' | 'declined';
  let currentStep = $state<SigningStep>('loading');

  // Data from backend
  let signerData = $state<{
    documentId: Id<"documents">;
    documentTitle: string;
    documentContent: string;
    signerName: string;
    partyName: string;
    partyColor: string;
    requiresEmailVerification: boolean;
    requiresPhoneVerification: boolean;
    emailVerified: boolean;
    phoneVerified: boolean;
    maskedEmail: string;
    maskedPhone?: string;
    assignedBlocks: ExtractedSmartBlock[];
    fieldValues: Record<string, string>;
  } | null>(null);

  let errorMessage = $state<string | null>(null);
  let signatureValue = $state<string | null>(null);
  let signedAsName = $state('');
  let inputValues = $state<Record<string, string>>({});
  let activeChallengeId = $state<Id<"authChallenges"> | null>(null);
  let isSubmitting = $state(false);
  let agreedToTerms = $state(false);

  const smartBlocks = $derived(
    signerData ? extractSmartBlocksFromContent(signerData.documentContent) : []
  );
  const signatureBlocks = $derived(
    smartBlocks.filter((block: ExtractedSmartBlock) => block.blockType === "signature")
  );
  const inputBlocks = $derived(
    smartBlocks.filter((block: ExtractedSmartBlock) => block.blockType === "text-input")
  );
  const assignedBlocks = $derived(signerData?.assignedBlocks ?? []);
  const assignedSignatureBlocks = $derived(
    assignedBlocks.filter((block: ExtractedSmartBlock) => block.blockType === "signature")
  );
  const assignedInputBlocks = $derived(
    assignedBlocks.filter((block: ExtractedSmartBlock) => block.blockType === "text-input")
  );
  const signatureTargetBlocks = $derived(
    assignedSignatureBlocks.filter((block: ExtractedSmartBlock) => block.required).length > 0
      ? assignedSignatureBlocks.filter((block: ExtractedSmartBlock) => block.required)
      : assignedSignatureBlocks.slice(0, 1)
  );
  const primarySignatureBlockId = $derived(
    signatureTargetBlocks[0]?.id ?? null
  );

  // Convex queries and mutations
  const signerView = useQuery(api.signing.getSignerView, () => ({ accessToken }));
  const recordSignerView = useConvexMutation(api.signing.recordSignerView);
  const saveFieldValue = useConvexMutation(api.signing.saveFieldValue);
  const recordSignature = useConvexMutation(api.signing.recordSignature);
  const completeSignerSession = useConvexMutation(api.signing.completeSignerSession);
  const sendAuthChallenge = useConvexMutation(api.signing.sendAuthChallenge);

  // Process query result
  $effect(() => {
    const data = signerView.data;

    if (signerView.isLoading) {
      currentStep = 'loading';
      return;
    }

    if (signerView.error || !data) {
      currentStep = 'error';
      errorMessage = 'Unable to load signing session. The link may be invalid or expired.';
      return;
    }

    // Check for already completed
    if (data.status === 'signed') {
      currentStep = 'complete';
      return;
    }

    if (data.status === 'declined') {
      currentStep = 'declined';
      return;
    }

    // Store signer data
    const settings = data.settings ?? {
      requireEmailVerification: true,
      requirePhoneVerification: false,
      requireBoth: false,
    };

    signerData = {
      documentId: data.documentId as Id<"documents">,
      documentTitle: data.documentTitle ?? 'Document',
      documentContent: data.documentContent ?? '',
      signerName: data.signerName ?? 'Signer',
      partyName: data.partyName ?? 'Signer',
      partyColor: data.partyColor ?? HYPR_DEFAULT_PARTY_COLOR,
      requiresEmailVerification: settings.requireEmailVerification ?? true,
      requiresPhoneVerification: settings.requirePhoneVerification ?? false,
      emailVerified: data.emailVerified ?? false,
      phoneVerified: data.phoneVerified ?? false,
      maskedEmail: data.maskedEmail ?? '',
      maskedPhone: data.maskedPhone,
      assignedBlocks: (data.assignedBlocks ?? []) as ExtractedSmartBlock[],
      fieldValues: (data.fieldValues ?? {}) as Record<string, string>,
    };

    signedAsName = data.signerName ?? '';

    // Determine current step based on verification status
    if (currentStep === 'loading' || currentStep === 'view') {
      if ((settings.requireEmailVerification ?? true) && !data.emailVerified) {
        currentStep = 'view'; // Start with document view
      } else if ((settings.requirePhoneVerification ?? false) && !data.phoneVerified) {
        currentStep = 'view';
      } else {
        currentStep = 'view'; // All verified, can proceed
      }
    }
  });

  $effect(() => {
    inputValues = signerData?.fieldValues ? { ...signerData.fieldValues } : {};
  });

  // Record view when signer first sees document
  $effect(() => {
    if (currentStep === 'view' && signerData) {
      recordSignerView.mutate({
        accessToken,
        metadata: {
          ipAddress: 'unknown',
          userAgent: navigator.userAgent,
        },
      }).catch(console.error);
    }
  });

  // Step navigation
  function proceedToVerification(): void {
    if (!signerData) return;

    if (signerData.requiresEmailVerification && !signerData.emailVerified) {
      // Send email challenge
      sendAuthChallenge.mutate({
        accessToken,
        type: 'email',
      }).then((result: { challengeId: Id<"authChallenges"> }) => {
        activeChallengeId = result.challengeId;
        currentStep = 'verify-email';
      }).catch(() => {
        toast.error('Failed to send verification code');
      });
    } else if (signerData.requiresPhoneVerification && !signerData.phoneVerified) {
      sendAuthChallenge.mutate({
        accessToken,
        type: 'phone',
      }).then((result: { challengeId: Id<"authChallenges"> }) => {
        activeChallengeId = result.challengeId;
        currentStep = 'verify-phone';
      }).catch(() => {
        toast.error('Failed to send verification code');
      });
    } else {
      currentStep = 'sign';
    }
  }

  function onEmailVerified(): void {
    if (!signerData) return;

    signerData = { ...signerData, emailVerified: true };

    if (signerData.requiresPhoneVerification && !signerData.phoneVerified) {
      // Need phone verification next
      sendAuthChallenge.mutate({
        accessToken,
        type: 'phone',
      }).then((result: { challengeId: Id<"authChallenges"> }) => {
        activeChallengeId = result.challengeId;
        currentStep = 'verify-phone';
      }).catch(() => {
        toast.error('Failed to send phone verification code');
      });
    } else {
      currentStep = 'sign';
    }
  }

  function onPhoneVerified(): void {
    if (!signerData) return;
    signerData = { ...signerData, phoneVerified: true };
    currentStep = 'sign';
  }

  function updateInputValue(blockId: string, value: string): void {
    inputValues = {
      ...inputValues,
      [blockId]: value,
    };
  }

  async function handleSign(): Promise<void> {
    if (!signerData || !signatureValue || !signedAsName.trim()) {
      toast.error('Please provide your signature and name');
      return;
    }

    if (!primarySignatureBlockId) {
      toast.error('No signature block was found in this document');
      return;
    }

    if (!agreedToTerms) {
      toast.error('Please agree to the terms to continue');
      return;
    }

    const missingInputs = assignedInputBlocks.filter(
      (block) => block.required && !(inputValues[block.id]?.trim())
    );
    if (missingInputs.length > 0) {
      toast.error(`Complete required fields: ${missingInputs.map((block) => block.label).join(", ")}`);
      return;
    }

    isSubmitting = true;

    try {
      for (const block of assignedInputBlocks) {
        const nextValue = inputValues[block.id] ?? "";
        if (!nextValue.trim() && !block.required) continue;
        await saveFieldValue.mutate({
          accessToken,
          blockId: block.id,
          value: nextValue,
        });
      }

      for (const block of signatureTargetBlocks) {
        await recordSignature.mutate({
          accessToken,
          blockId: block.id,
          signatureType: "draw",
          signatureData: signatureValue,
          metadata: {
            ipAddress: 'unknown',
            userAgent: navigator.userAgent,
          },
        });
      }

      await completeSignerSession.mutate({
        accessToken,
      });

      currentStep = 'complete';
      toast.success('Document signed successfully!');
    } catch (err) {
      console.error('Signing error:', err);
      toast.error('Failed to sign document');
    } finally {
      isSubmitting = false;
    }
  }

  async function handleDecline(): Promise<void> {
    if (!signerData) return;

    // TODO: Implement decline mutation
    toast.info('Declining is not yet implemented');
  }

  // Progress steps
  const steps = $derived([
    { id: 'view', label: 'Review', icon: FileText },
    { id: 'verify', label: 'Verify', icon: ShieldCheck },
    { id: 'sign', label: 'Sign', icon: PenTool },
    { id: 'complete', label: 'Done', icon: CheckCircle2 },
  ]);

  const currentStepIndex = $derived(() => {
    switch (currentStep) {
      case 'view': return 0;
      case 'verify-email':
      case 'verify-phone': return 1;
      case 'sign': return 2;
      case 'complete': return 3;
      default: return -1;
    }
  });
</script>

<div class="min-h-screen bg-background flex flex-col">
  <!-- Header -->
  <header class="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
    <div class="container flex h-14 items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2">
          <div class="size-8 rounded-lg bg-primary flex items-center justify-center">
            <PenTool class="size-4 text-primary-foreground" />
          </div>
          <span class="font-bold">HyprSign</span>
        </div>
        <Separator orientation="vertical" class="h-6" />
        <span class="text-sm text-muted-foreground truncate max-w-[200px]">
          {signerData?.documentTitle ?? 'Document'}
        </span>
      </div>

      {#if signerData}
        <div class="flex items-center gap-2 text-sm">
          <span class="text-muted-foreground">Signing as</span>
          <span
            class="font-medium px-2 py-0.5 rounded text-xs"
            style="background-color: {signerData.partyColor}20; color: {signerData.partyColor}"
          >
            {signerData.partyName}
          </span>
        </div>
      {/if}
    </div>
  </header>

  <!-- Progress Steps -->
  {#if currentStep !== 'loading' && currentStep !== 'error' && currentStep !== 'declined'}
    <div class="border-b bg-muted/30">
      <div class="container py-4">
        <div class="flex items-center justify-center gap-4">
          {#each steps as step, i (step.id)}
            {@const StepIcon = step.icon}
            {@const isActive = currentStepIndex() >= i}
            {@const isCurrent = currentStepIndex() === i}
            <div class="flex items-center gap-2">
              <div
                class={cn(
                  "flex items-center justify-center size-8 rounded-full transition-colors",
                  isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                  isCurrent && "ring-2 ring-primary ring-offset-2"
                )}
              >
                <StepIcon class="size-4" />
              </div>
              <span
                class={cn(
                  "text-sm font-medium hidden sm:block",
                  isActive ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
            {#if i < steps.length - 1}
              <div
                class={cn(
                  "w-8 h-0.5",
                  currentStepIndex() > i ? "bg-primary" : "bg-muted"
                )}
              ></div>
            {/if}
          {/each}
        </div>
      </div>
    </div>
  {/if}

  <!-- Main Content -->
  <main class="flex-1 container py-8">
    {#if currentStep === 'loading'}
      <div class="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 class="size-8 animate-spin text-primary" />
        <p class="text-muted-foreground">Loading document...</p>
      </div>

    {:else if currentStep === 'error'}
      <div class="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <div class="size-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertTriangle class="size-8 text-destructive" />
        </div>
        <h2 class="text-xl font-bold">Unable to Load</h2>
        <p class="text-muted-foreground max-w-md">{errorMessage}</p>
      </div>

    {:else if currentStep === 'declined'}
      <div class="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <div class="size-16 rounded-full bg-muted flex items-center justify-center">
          <XCircle class="size-8 text-muted-foreground" />
        </div>
        <h2 class="text-xl font-bold">Document Declined</h2>
        <p class="text-muted-foreground max-w-md">
          You have declined to sign this document.
        </p>
      </div>

    {:else if currentStep === 'view' && signerData}
      <div class="max-w-4xl mx-auto space-y-6">
        <div class="text-center space-y-2">
          <h1 class="text-2xl font-bold">{signerData.documentTitle}</h1>
          <p class="text-muted-foreground">
            Please review the document carefully before proceeding
          </p>
        </div>

        <!-- Document Preview -->
        <div class="border rounded-lg bg-white shadow-sm p-8 min-h-[500px]">
          <div class="mb-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span class="rounded-full border border-border px-3 py-1">
              {smartBlocks.length} smart blocks
            </span>
            <span class="rounded-full border border-border px-3 py-1">
              {assignedSignatureBlocks.length}/{signatureBlocks.length} signatures for you
            </span>
            <span class="rounded-full border border-border px-3 py-1">
              {assignedInputBlocks.length}/{inputBlocks.length} inputs for you
            </span>
          </div>
          <DocumentViewer
            content={signerData.documentContent}
            mode="view"
            showBadge={false}
            class="shadow-none"
          />
        </div>

        <!-- Actions -->
        <div class="flex items-center justify-between pt-4">
          <Button variant="outline" onclick={handleDecline}>
            Decline to Sign
          </Button>
          <Button onclick={proceedToVerification} class="gap-2">
            Continue to Sign
            <ShieldCheck class="size-4" />
          </Button>
        </div>
      </div>

    {:else if currentStep === 'verify-email' && signerData}
      <div class="max-w-md mx-auto">
        <OtpVerificationView
          {accessToken}
          challengeId={activeChallengeId}
          type="email"
          maskedDestination={signerData.maskedEmail}
          onVerified={onEmailVerified}
        />
      </div>

    {:else if currentStep === 'verify-phone' && signerData}
      <div class="max-w-md mx-auto">
        <OtpVerificationView
          {accessToken}
          challengeId={activeChallengeId}
          type="phone"
          maskedDestination={signerData.maskedPhone ?? ''}
          onVerified={onPhoneVerified}
        />
      </div>

    {:else if currentStep === 'sign' && signerData}
      <div class="max-w-xl mx-auto space-y-6">
        <div class="text-center space-y-2">
          <div class="size-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <PenTool class="size-7 text-primary" />
          </div>
          <h1 class="text-2xl font-bold">Sign Document</h1>
          <p class="text-muted-foreground">
            Draw your signature below and confirm your identity
          </p>
          {#if signatureTargetBlocks.length > 0}
            <p class="text-xs text-muted-foreground">
              Applying to {signatureTargetBlocks.length} signature field{signatureTargetBlocks.length === 1 ? "" : "s"}
            </p>
          {/if}
        </div>

        <div class="space-y-4">
          {#if assignedInputBlocks.length > 0}
            <div class="space-y-3">
              <p class="text-sm font-medium">Required Fields</p>
              {#each assignedInputBlocks as block (block.id)}
                <div class="space-y-2 rounded-lg border border-border/70 bg-muted/20 p-3">
                  <div class="flex items-center justify-between gap-3">
                    <label for={`block-${block.id}`} class="text-sm font-medium">
                      {block.label}
                    </label>
                    {#if block.required}
                      <span class="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                        required
                      </span>
                    {/if}
                  </div>
                  <input
                    id={`block-${block.id}`}
                    type="text"
                    value={inputValues[block.id] ?? ""}
                    oninput={(event: Event) => updateInputValue(block.id, (event.currentTarget as HTMLInputElement).value)}
                    class="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    placeholder={typeof block.data.placeholder === "string" ? block.data.placeholder : block.label}
                  />
                </div>
              {/each}
            </div>
          {/if}

          <!-- Signature Pad -->
          <div class="space-y-2">
            <p class="text-sm font-medium">Your Signature</p>
            <SignaturePad
              bind:value={signatureValue}
              class="border-2 border-dashed hover:border-primary transition-colors"
              placeholder="Draw your signature here"
            />
          </div>

          <!-- Name Input -->
          <div class="space-y-2">
            <label for="legal-name" class="text-sm font-medium">Type Your Full Legal Name</label>
            <input
              id="legal-name"
              type="text"
              bind:value={signedAsName}
              class="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              placeholder="Your full legal name"
            />
          </div>

          <!-- Terms Agreement -->
          <div class="flex items-start gap-2 p-4 rounded-lg bg-muted/50 border">
            <input
              type="checkbox"
              id="agree-terms"
              bind:checked={agreedToTerms}
              class="mt-1"
            />
            <label for="agree-terms" class="text-sm text-muted-foreground">
              I agree that my electronic signature is the legal equivalent of my manual signature.
              I consent to be legally bound by this document's terms and conditions.
            </label>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center justify-between pt-4">
          <Button variant="outline" onclick={() => currentStep = 'view'}>
            Back to Document
          </Button>
          <Button
            onclick={handleSign}
            disabled={!primarySignatureBlockId || !signatureValue || !signedAsName.trim() || !agreedToTerms || isSubmitting}
            class="gap-2"
          >
            {#if isSubmitting}
              <Loader2 class="size-4 animate-spin" />
              Signing...
            {:else}
              <CheckCircle2 class="size-4" />
              Sign Document
            {/if}
          </Button>
        </div>
      </div>

    {:else if currentStep === 'complete'}
      <div class="flex flex-col items-center justify-center py-20 gap-6 text-center">
        <div class="size-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <CheckCircle2 class="size-10 text-green-600 dark:text-green-400" />
        </div>
        <div class="space-y-2">
          <h1 class="text-2xl font-bold">Document Signed!</h1>
          <p class="text-muted-foreground max-w-md">
            Thank you for signing. You will receive a copy of the signed document via email once all parties have signed.
          </p>
        </div>
      </div>
    {/if}
  </main>

  <!-- Footer -->
  <footer class="border-t bg-muted/30 py-4">
    <div class="container text-center text-xs text-muted-foreground">
      Secured by HyprSign • All signatures are legally binding and tamper-proof
    </div>
  </footer>
</div>
