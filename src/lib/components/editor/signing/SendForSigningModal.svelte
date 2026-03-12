<script lang="ts">
  /**
   * SendForSigningModal - Initiate signing workflow for a document
   * Allows document owner to assign real people to parties and configure settings
   */
  import { X, Send, Users, Mail, Phone, AlertCircle } from "lucide-svelte";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { Switch } from "$lib/components/ui/switch";
  import { Separator } from "$lib/components/ui/separator";
  import * as Dialog from "$lib/components/ui/dialog";
  import { cn } from "$lib/utils";
  import { useConvexMutation } from "$lib/convex/hooks";
  import { api } from "@/convex/_generated/api";
  import type { Id } from "@/convex/_generated/dataModel";
  import { partyStore } from "$lib/editor/core/party-store.svelte";
  import {
    assignSigner,
    createSigningSession,
    startSigningSession,
  } from "$lib/signing/client";
  import { toast } from "svelte-sonner";

  interface Props {
    documentId: Id<"documents">;
    documentTitle: string;
    documentKind: "template" | "envelope";
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }

  let {
    documentId,
    documentTitle,
    documentKind,
    open = $bindable(false),
    onOpenChange,
  }: Props = $props();

  // Get parties from the party store
  const parties = $derived(partyStore.parties);

  // Signer assignments state - maps party ID to signer info
  interface SignerInfo {
    email: string;
    phone: string;
    phoneCountryCode: string;
    legalName: string;
  }

  let signerAssignments = $state<Record<string, SignerInfo>>({});

  // Settings
  let settings = $state({
    requireEmailVerification: true,
    requirePhoneVerification: false,
    requireBoth: false,
    allowDecline: true,
    signingOrder: 'parallel' as 'parallel' | 'sequential',
    expiresInDays: 7,
    reminderIntervalHours: 24,
  });

  let isSubmitting = $state(false);
  let errors = $state<Record<string, string>>({});

  // Initialize signer assignments for each party
  // Use untrack to read existing assignments without triggering effect re-run
  $effect(() => {
    const currentAssignments = $state.snapshot(signerAssignments);
    const newAssignments: Record<string, SignerInfo> = {};
    for (const party of parties) {
      newAssignments[party.id] = currentAssignments[party.id] ?? {
        email: party.email ?? '',
        phone: party.phone ?? '',
        phoneCountryCode: '+1',
        legalName: party.name,
      };
    }
    // Only update if there's actually a new party
    const currentIds = new Set(Object.keys(currentAssignments));
    const newIds = new Set(parties.map(p => p.id));
    const hasNewParty = parties.some(p => !currentIds.has(p.id));
    const hasRemovedParty = [...currentIds].some(id => !newIds.has(id));

    if (hasNewParty || hasRemovedParty) {
      signerAssignments = newAssignments;
    }
  });

  // Convex mutations
  const createEnvelopeFromTemplate = useConvexMutation(
    api.documents.mutations.create.createEnvelopeFromTemplate
  );

  // Validation
  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    for (const party of parties) {
      const signer = signerAssignments[party.id];
      if (!signer) {
        newErrors[party.id] = 'Signer information required';
        continue;
      }

      if (!signer.email || !signer.email.includes('@')) {
        newErrors[`${party.id}_email`] = 'Valid email required';
      }

      if (!signer.legalName || signer.legalName.trim().length < 2) {
        newErrors[`${party.id}_name`] = 'Legal name required';
      }

      if (settings.requirePhoneVerification && !signer.phone) {
        newErrors[`${party.id}_phone`] = 'Phone required for verification';
      }
    }

    errors = newErrors;
    return Object.keys(newErrors).length === 0;
  }

  // Submit handler
  async function handleSubmit(): Promise<void> {
    if (!validate()) {
      toast.error('Please fix the errors before continuing');
      return;
    }

    if (parties.length === 0) {
      toast.error('Add at least one party to send for signing');
      return;
    }

    isSubmitting = true;

    try {
      let targetDocumentId: Id<"documents"> = documentId;

      if (documentKind === "template") {
        const { envelopeId } = await createEnvelopeFromTemplate.mutate({
          templateId: documentId,
        });
        targetDocumentId = envelopeId;
      }

      // 1. Create signing session
      const expiresAt = Date.now() + (settings.expiresInDays * 24 * 60 * 60 * 1000);

      const { sessionId, reused } = await createSigningSession({
        documentId: targetDocumentId,
        signingOrder: settings.signingOrder,
        expiresAt,
        reminderIntervalHours: settings.reminderIntervalHours,
        settings: {
          allowDecline: settings.allowDecline,
          requireEmailVerification: settings.requireEmailVerification,
          requirePhoneVerification: settings.requirePhoneVerification,
          requireBoth: settings.requireBoth,
        },
      });

      // 2. Assign signers for each party
      for (let index = 0; index < parties.length; index++) {
        const party = parties[index];
        const signer = signerAssignments[party.id];
        if (!signer) continue;

        const authMethod = settings.requireBoth
          ? 'both'
          : settings.requirePhoneVerification && !settings.requireEmailVerification
            ? 'phone'
            : settings.requireEmailVerification
              ? 'email'
              : 'none';

        await assignSigner(sessionId, {
          slotId: undefined,
          partyId: party.id,
          email: signer.email,
          phone: signer.phone || undefined,
          phoneCountryCode: signer.phoneCountryCode || undefined,
          legalName: signer.legalName,
          role: party.name,
          color: party.color,
          order: index,
          authMethod,
        });
      }

      // 3. Start the signing session (send invitations)
      const { alreadyStarted } = await startSigningSession(sessionId);

      if (alreadyStarted) {
        toast.success('Signing session was already active. Reusing existing session.');
      } else {
        toast.success(
          documentKind === "template"
            ? 'Envelope created and sent for signing!'
            : reused
              ? 'Existing envelope signing session updated and sent!'
              : 'Document sent for signing!'
        );
      }
      open = false;
      onOpenChange?.(false);
    } catch (error) {
      console.error('Failed to send for signing:', error);
      toast.error('Failed to send document for signing');
    } finally {
      isSubmitting = false;
    }
  }

  function updateSigner(partyId: string, field: keyof SignerInfo, value: string): void {
    signerAssignments = {
      ...signerAssignments,
      [partyId]: {
        ...signerAssignments[partyId],
        [field]: value,
      },
    };
    // Clear error when user types
    if (errors[`${partyId}_${field}`]) {
      const newErrors = { ...errors };
      delete newErrors[`${partyId}_${field}`];
      errors = newErrors;
    }
  }
</script>

<Dialog.Root bind:open onOpenChange={(o: boolean) => onOpenChange?.(o)}>
  <Dialog.Content class="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
    <Dialog.Header class="shrink-0">
      <Dialog.Title class="flex items-center gap-2">
        <Send class="size-5 text-primary" />
        Send for Signing
      </Dialog.Title>
      <Dialog.Description class="text-muted-foreground">
        Assign signers to each party and configure signing settings for "{documentTitle}"
      </Dialog.Description>
    </Dialog.Header>

    <div class="flex-1 overflow-y-auto py-4 space-y-6">
      {#if parties.length === 0}
        <div class="flex flex-col items-center justify-center py-12 text-center bg-muted/20 rounded-lg border border-dashed">
          <Users class="size-10 text-muted-foreground/40 mb-4" />
          <h3 class="font-semibold text-foreground mb-2">No Parties Defined</h3>
          <p class="text-sm text-muted-foreground max-w-xs">
            Add parties to your document first, then come back here to assign signers.
          </p>
        </div>
      {:else}
        <!-- Signer Assignments -->
        <div class="space-y-4">
          <h3 class="text-sm font-semibold text-foreground flex items-center gap-2">
            <Users class="size-4" />
            Assign Signers ({parties.length})
          </h3>

          {#each parties as party (party.id)}
            {@const signer = signerAssignments[party.id]}
            <div
              class="relative rounded-lg border border-border bg-card p-4 space-y-3"
              style="border-left: 4px solid {party.color}"
            >
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {party.name}
                </span>
                {#if errors[party.id]}
                  <span class="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle class="size-3" />
                    {errors[party.id]}
                  </span>
                {/if}
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div class="space-y-1.5">
                  <Label class="text-[10px] uppercase tracking-wider">Legal Name *</Label>
                  <Input
                    value={signer?.legalName ?? ''}
                    oninput={(e: Event) => updateSigner(party.id, 'legalName', (e.target as HTMLInputElement).value)}
                    placeholder="Full legal name"
                    class={cn("h-9 text-sm", errors[`${party.id}_name`] && "border-destructive")}
                  />
                  {#if errors[`${party.id}_name`]}
                    <span class="text-[10px] text-destructive">{errors[`${party.id}_name`]}</span>
                  {/if}
                </div>

                <div class="space-y-1.5">
                  <Label class="text-[10px] uppercase tracking-wider flex items-center gap-1">
                    <Mail class="size-3" />
                    Email *
                  </Label>
                  <Input
                    type="email"
                    value={signer?.email ?? ''}
                    oninput={(e: Event) => updateSigner(party.id, 'email', (e.target as HTMLInputElement).value)}
                    placeholder="signer@example.com"
                    class={cn("h-9 text-sm", errors[`${party.id}_email`] && "border-destructive")}
                  />
                  {#if errors[`${party.id}_email`]}
                    <span class="text-[10px] text-destructive">{errors[`${party.id}_email`]}</span>
                  {/if}
                </div>

                {#if settings.requirePhoneVerification || settings.requireBoth}
                  <div class="col-span-2 space-y-1.5">
                    <Label class="text-[10px] uppercase tracking-wider flex items-center gap-1">
                      <Phone class="size-3" />
                      Phone {settings.requirePhoneVerification ? '*' : ''}
                    </Label>
                    <div class="flex gap-2">
                      <Input
                        value={signer?.phoneCountryCode ?? '+1'}
                        oninput={(e: Event) => updateSigner(party.id, 'phoneCountryCode', (e.target as HTMLInputElement).value)}
                        placeholder="+1"
                        class="h-9 text-sm w-16"
                      />
                      <Input
                        type="tel"
                        value={signer?.phone ?? ''}
                        oninput={(e: Event) => updateSigner(party.id, 'phone', (e.target as HTMLInputElement).value)}
                        placeholder="(555) 123-4567"
                        class={cn("h-9 text-sm flex-1", errors[`${party.id}_phone`] && "border-destructive")}
                      />
                    </div>
                    {#if errors[`${party.id}_phone`]}
                      <span class="text-[10px] text-destructive">{errors[`${party.id}_phone`]}</span>
                    {/if}
                  </div>
                {/if}
              </div>
            </div>
          {/each}
        </div>

        <Separator />

        <!-- Signing Settings -->
        <div class="space-y-4">
          <h3 class="text-sm font-semibold text-foreground">Signing Settings</h3>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <Label class="text-[10px] uppercase tracking-wider">Signing Order</Label>
              <select
                class="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                bind:value={settings.signingOrder}
              >
                <option value="parallel">All signers at once</option>
                <option value="sequential">One after another</option>
              </select>
            </div>

            <div class="space-y-1.5">
              <Label class="text-[10px] uppercase tracking-wider">Expires In</Label>
              <select
                class="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                bind:value={settings.expiresInDays}
              >
                <option value={3}>3 days</option>
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
                <option value={90}>90 days</option>
              </select>
            </div>
          </div>

          <div class="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
            <h4 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Verification Requirements
            </h4>

            <div class="flex items-center justify-between">
              <div>
                <Label class="text-sm">Email Verification</Label>
                <p class="text-xs text-muted-foreground">Send OTP code to email</p>
              </div>
              <Switch bind:checked={settings.requireEmailVerification} />
            </div>

            <div class="flex items-center justify-between">
              <div>
                <Label class="text-sm">Phone Verification</Label>
                <p class="text-xs text-muted-foreground">Send SMS code to phone</p>
              </div>
              <Switch bind:checked={settings.requirePhoneVerification} />
            </div>

            <div class="flex items-center justify-between">
              <div>
                <Label class="text-sm">Allow Decline</Label>
                <p class="text-xs text-muted-foreground">Signers can decline to sign</p>
              </div>
              <Switch bind:checked={settings.allowDecline} />
            </div>
          </div>
        </div>
      {/if}
    </div>

    <Dialog.Footer class="shrink-0 border-t pt-4">
      <Button variant="outline" onclick={() => open = false} disabled={isSubmitting}>
        Cancel
      </Button>
      <Button
        onclick={handleSubmit}
        disabled={isSubmitting || parties.length === 0}
        class="gap-2"
      >
        {#if isSubmitting}
          <span class="animate-spin">⏳</span>
          Sending...
        {:else}
          <Send class="size-4" />
          Send for Signing
        {/if}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
