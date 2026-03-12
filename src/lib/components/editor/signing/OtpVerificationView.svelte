<script lang="ts">
  /**
   * OtpVerificationView - OTP code entry and verification
   * Used in the signing portal for signer authentication
   */
  import { Mail, Phone, RefreshCw, ShieldCheck, AlertCircle } from "lucide-svelte";
  import { Button } from "$lib/components/ui/button";
  import { cn } from "$lib/utils";
  import {
    sendSignerAuthChallenge,
    verifySignerAuthChallenge,
  } from "$lib/signing/client";
  import { toast } from "svelte-sonner";

  interface Props {
    accessToken: string;
    challengeId: string | null;
    type: 'email' | 'phone';
    maskedDestination: string;
    onVerified?: () => void;
    class?: string;
  }

  let {
    accessToken,
    challengeId: initialChallengeId,
    type,
    maskedDestination,
    onVerified,
    class: className,
  }: Props = $props();
  let currentChallengeId = $state<string | null>(null);

  $effect(() => {
    if (initialChallengeId && initialChallengeId !== currentChallengeId) {
      currentChallengeId = initialChallengeId;
    }
  });

  // OTP input state
  let otpDigits = $state<string[]>(['', '', '', '', '', '']);
  let focusedIndex = $state(0);
  let inputRefs = $state<HTMLInputElement[]>([]);
  
  let isVerifying = $state(false);
  let isResending = $state(false);
  let isBootstrapping = $state(false);
  let didBootstrap = $state(false);
  let error = $state<string | null>(null);
  let attemptsRemaining = $state(5);

  // Computed OTP code
  const otpCode = $derived(otpDigits.join(''));
  const isComplete = $derived(otpCode.length === 6 && otpDigits.every(d => /\d/.test(d)));

  $effect(() => {
    if (!currentChallengeId && !isBootstrapping && !didBootstrap) {
      didBootstrap = true;
      void bootstrapChallenge();
    }
  });

  async function bootstrapChallenge(): Promise<void> {
    isBootstrapping = true;
    try {
      const result = await sendSignerAuthChallenge(accessToken, {
        type,
      });
      currentChallengeId = result.challengeId;
    } catch (err) {
      console.error("Challenge bootstrap error:", err);
      error = "Unable to send verification code. Please retry.";
    } finally {
      isBootstrapping = false;
    }
  }

  function handleDigitInput(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;
    
    // Only allow digits
    if (!/^\d?$/.test(value)) {
      input.value = otpDigits[index];
      return;
    }
    
    // Update digit
    otpDigits[index] = value;
    error = null;
    
    // Move to next input if digit entered
    if (value && index < 5) {
      focusedIndex = index + 1;
      inputRefs[index + 1]?.focus();
    }
    
    // Auto-submit when complete
    if (otpCode.length === 6 && otpDigits.every(d => /\d/.test(d))) {
      handleVerify();
    }
  }

  function handleKeyDown(index: number, event: KeyboardEvent): void {
    if (event.key === 'Backspace') {
      if (!otpDigits[index] && index > 0) {
        // Move to previous input if current is empty
        focusedIndex = index - 1;
        inputRefs[index - 1]?.focus();
      }
      otpDigits[index] = '';
    } else if (event.key === 'ArrowLeft' && index > 0) {
      focusedIndex = index - 1;
      inputRefs[index - 1]?.focus();
    } else if (event.key === 'ArrowRight' && index < 5) {
      focusedIndex = index + 1;
      inputRefs[index + 1]?.focus();
    }
  }

  function handlePaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pastedData = event.clipboardData?.getData('text') ?? '';
    const digits = pastedData.replace(/\D/g, '').slice(0, 6).split('');
    
    for (let i = 0; i < 6; i++) {
      otpDigits[i] = digits[i] ?? '';
    }
    
    // Focus last filled or first empty
    const lastFilledIndex = digits.length - 1;
    if (lastFilledIndex >= 0 && lastFilledIndex < 5) {
      focusedIndex = lastFilledIndex + 1;
      inputRefs[lastFilledIndex + 1]?.focus();
    } else if (digits.length === 6) {
      handleVerify();
    }
  }

  async function handleVerify(): Promise<void> {
    if (!isComplete || !currentChallengeId) return;
    
    isVerifying = true;
    error = null;

    try {
      const result = await verifySignerAuthChallenge(accessToken, currentChallengeId, {
        code: otpCode,
      });

      if (result.verified) {
        toast.success(`${type === 'email' ? 'Email' : 'Phone'} verified!`);
        onVerified?.();
      } else {
        error = 'Invalid code';
        attemptsRemaining -= 1;
        // Clear OTP fields
        otpDigits = ['', '', '', '', '', ''];
        focusedIndex = 0;
        inputRefs[0]?.focus();
      }
    } catch (err) {
      console.error('Verification error:', err);
      error = 'Verification failed. Please try again.';
    } finally {
      isVerifying = false;
    }
  }

  async function handleResend(): Promise<void> {
    isResending = true;
    error = null;

    try {
      const result = await sendSignerAuthChallenge(accessToken, {
        type,
      });
      currentChallengeId = result.challengeId;
      
      toast.success(`New code sent to ${maskedDestination}`);
      // Reset attempts
      attemptsRemaining = 5;
      // Clear OTP fields
      otpDigits = ['', '', '', '', '', ''];
      focusedIndex = 0;
      inputRefs[0]?.focus();
    } catch (err) {
      console.error('Resend error:', err);
      toast.error('Failed to resend code');
    } finally {
      isResending = false;
    }
  }
</script>

<div class={cn("flex flex-col items-center space-y-6 p-6", className)}>
  <!-- Header -->
  <div class="flex flex-col items-center text-center space-y-2">
    <div class="flex items-center justify-center size-14 rounded-full bg-primary/10">
      {#if type === 'email'}
        <Mail class="size-7 text-primary" />
      {:else}
        <Phone class="size-7 text-primary" />
      {/if}
    </div>
    
    <h2 class="text-xl font-bold">Verify Your {type === 'email' ? 'Email' : 'Phone'}</h2>
    <p class="text-sm text-muted-foreground max-w-xs">
      We sent a 6-digit code to <span class="font-medium text-foreground">{maskedDestination}</span>
    </p>
  </div>

  <!-- OTP Input -->
  <div class="flex gap-2">
    {#each otpDigits as digit, i (i)}
      <input
        bind:this={inputRefs[i]}
        type="text"
        inputmode="numeric"
        maxlength={1}
        value={digit}
        oninput={(e: Event) => handleDigitInput(i, e)}
        onkeydown={(e: KeyboardEvent) => handleKeyDown(i, e)}
        onpaste={handlePaste}
        onfocus={() => focusedIndex = i}
        class={cn(
          "size-12 text-center text-xl font-bold",
          focusedIndex === i && "ring-2 ring-primary",
          error && "border-destructive"
        )}
        disabled={isVerifying}
        aria-label={`Digit ${i + 1}`}
      />
    {/each}
  </div>

  <!-- Error Message -->
  {#if error}
    <div class="flex items-center gap-2 text-sm text-destructive">
      <AlertCircle class="size-4" />
      <span>{error}</span>
      {#if attemptsRemaining > 0}
        <span class="text-muted-foreground">({attemptsRemaining} attempts remaining)</span>
      {/if}
    </div>
  {/if}

  <!-- Actions -->
  <div class="flex flex-col items-center gap-3 w-full max-w-xs">
    <Button
      onclick={handleVerify}
      disabled={!isComplete || isVerifying || !currentChallengeId}
      class="w-full gap-2"
    >
      {#if isVerifying}
        <span class="animate-spin">⏳</span>
        Verifying...
      {:else}
        <ShieldCheck class="size-4" />
        Verify Code
      {/if}
    </Button>

    <Button
      variant="ghost"
      size="sm"
      onclick={handleResend}
      disabled={isResending}
      class="gap-2 text-muted-foreground"
    >
      {#if isResending}
        <RefreshCw class="size-3 animate-spin" />
        Sending...
      {:else}
        <RefreshCw class="size-3" />
        Resend Code
      {/if}
    </Button>
  </div>
</div>
