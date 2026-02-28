<script lang="ts">
  import { onDestroy } from "svelte";
  import { CheckCircle2, X } from "lucide-svelte";
  import { fade, fly } from "svelte/transition";

  type Step = "email" | "otp" | "magic-link-sent";
  type Method = "otp" | "magic-link";
  type AuthResponseBody = {
    success?: boolean;
    error?: string;
    retryAfterSec?: number;
    redirectTo?: string;
    expiresAt?: string;
  };

  const OTP_LENGTH = 6;

  let { isOpen = $bindable(false) } = $props();

  let step = $state<Step>("email");
  let method = $state<Method>("otp");
  let email = $state("");
  let errorMessage = $state("");
  let infoMessage = $state("");
  let isSending = $state(false);
  let isVerifying = $state(false);
  let cooldownSeconds = $state(0);
  let cooldownTimer: ReturnType<typeof setInterval> | null = null;

  let otpDigits = $state<string[]>(Array.from({ length: OTP_LENGTH }, () => ""));
  let otpRefs = $state<Array<HTMLInputElement | null>>(Array.from({ length: OTP_LENGTH }, () => null));

  const showMethodPill = $derived(email.includes("@"));
  const otpCode = $derived(otpDigits.join(""));
  const isOtpComplete = $derived(
    otpDigits.length === OTP_LENGTH && otpDigits.every((digit) => /^\d$/.test(digit))
  );

  $effect(() => {
    if (!showMethodPill && method !== "otp") {
      method = "otp";
    }
  });

  $effect(() => {
    if (cooldownSeconds > 0) {
      if (!cooldownTimer) {
        cooldownTimer = setInterval(() => {
          if (cooldownSeconds <= 1) {
            cooldownSeconds = 0;
            if (cooldownTimer) {
              clearInterval(cooldownTimer);
              cooldownTimer = null;
            }
            return;
          }
          cooldownSeconds -= 1;
        }, 1000);
      }
      return;
    }

    if (cooldownTimer) {
      clearInterval(cooldownTimer);
      cooldownTimer = null;
    }
  });

  onDestroy(() => {
    if (cooldownTimer) {
      clearInterval(cooldownTimer);
      cooldownTimer = null;
    }
  });

  function resetOtp() {
    otpDigits = Array.from({ length: OTP_LENGTH }, () => "");
  }

  function resetFlow() {
    step = "email";
    method = "otp";
    email = "";
    errorMessage = "";
    infoMessage = "";
    cooldownSeconds = 0;
    isSending = false;
    isVerifying = false;
    resetOtp();
  }

  function close() {
    isOpen = false;
    resetFlow();
  }

  function getReturnTo() {
    return "/dashboard";
  }

  function isValidEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }

  function normalizeEmail() {
    return email.trim().toLowerCase();
  }

  async function readBody(response: Response): Promise<AuthResponseBody | null> {
    try {
      return (await response.json()) as AuthResponseBody;
    } catch {
      return null;
    }
  }

  async function sendOtpCode() {
    const normalizedEmail = normalizeEmail();
    if (!isValidEmail(normalizedEmail)) {
      errorMessage = "Enter a valid email address.";
      return;
    }

    isSending = true;
    errorMessage = "";
    infoMessage = "";

    try {
      const response = await fetch("/auth/magic/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      const body = await readBody(response);
      if (!response.ok) {
        errorMessage = body?.error ?? "Unable to send code.";
        if (typeof body?.retryAfterSec === "number" && body.retryAfterSec > 0) {
          cooldownSeconds = body.retryAfterSec;
        }
        return;
      }

      email = normalizedEmail;
      resetOtp();
      step = "otp";
      infoMessage = "Code sent. Enter the 6-digit code.";
      cooldownSeconds = 30;

      setTimeout(() => {
        otpRefs[0]?.focus();
      }, 0);
    } catch {
      errorMessage = "Unable to send code. Please try again.";
    } finally {
      isSending = false;
    }
  }

  async function sendMagicLink() {
    const normalizedEmail = normalizeEmail();
    if (!isValidEmail(normalizedEmail)) {
      errorMessage = "Enter a valid email address.";
      return;
    }

    isSending = true;
    errorMessage = "";
    infoMessage = "";

    try {
      const response = await fetch("/auth/magic/link/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: normalizedEmail,
          returnTo: getReturnTo(),
        }),
      });

      const body = await readBody(response);
      if (!response.ok) {
        errorMessage = body?.error ?? "Unable to send magic link.";
        if (typeof body?.retryAfterSec === "number" && body.retryAfterSec > 0) {
          cooldownSeconds = body.retryAfterSec;
        }
        return;
      }

      if (body?.redirectTo) {
        window.location.href = body.redirectTo;
        return;
      }

      email = normalizedEmail;
      step = "magic-link-sent";
      infoMessage = "Magic link sent. Open your email to continue.";
      cooldownSeconds = 30;
    } catch {
      errorMessage = "Unable to send magic link. Please try again.";
    } finally {
      isSending = false;
    }
  }

  async function continueWithEmail() {
    if (isSending || isVerifying) return;
    if (method === "magic-link") {
      await sendMagicLink();
      return;
    }
    await sendOtpCode();
  }

  async function verifyOtp() {
    const normalizedEmail = normalizeEmail();
    if (!isValidEmail(normalizedEmail)) {
      errorMessage = "Enter a valid email address.";
      step = "email";
      return;
    }

    if (!isOtpComplete) {
      errorMessage = "Enter the full 6-digit code.";
      return;
    }

    isVerifying = true;
    errorMessage = "";
    infoMessage = "";

    try {
      const response = await fetch("/auth/magic/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: normalizedEmail,
          code: otpCode,
          returnTo: getReturnTo(),
        }),
      });

      const body = await readBody(response);
      if (!response.ok) {
        errorMessage = body?.error ?? "Invalid or expired code.";
        return;
      }

      window.location.href = body?.redirectTo || "/dashboard";
    } catch {
      errorMessage = "Unable to verify code. Please try again.";
    } finally {
      isVerifying = false;
    }
  }

  function handleOtpInput(index: number, event: Event) {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/\D/g, "").slice(-1);
    otpDigits[index] = value;
    errorMessage = "";

    if (value && index < OTP_LENGTH - 1) {
      otpRefs[index + 1]?.focus();
    }

    if (index === OTP_LENGTH - 1 && value && isOtpComplete && !isVerifying) {
      void verifyOtp();
    }
  }

  function handleOtpKeydown(index: number, event: KeyboardEvent) {
    if (event.key === "Backspace") {
      if (!otpDigits[index] && index > 0) {
        otpRefs[index - 1]?.focus();
      }
      otpDigits[index] = "";
      return;
    }

    if (event.key === "ArrowLeft" && index > 0) {
      otpRefs[index - 1]?.focus();
      return;
    }

    if (event.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      otpRefs[index + 1]?.focus();
    }
  }

  function handleOtpPaste(event: ClipboardEvent) {
    event.preventDefault();
    const pasted = event.clipboardData?.getData("text") ?? "";
    const digits = pasted.replace(/\D/g, "").slice(0, OTP_LENGTH).split("");

    for (let i = 0; i < OTP_LENGTH; i += 1) {
      otpDigits[i] = digits[i] ?? "";
    }

    if (digits.length === OTP_LENGTH) {
      void verifyOtp();
      return;
    }

    const nextIndex = Math.min(digits.length, OTP_LENGTH - 1);
    otpRefs[nextIndex]?.focus();
  }

  function goBackToEmail() {
    step = "email";
    errorMessage = "";
    infoMessage = "";
    resetOtp();
  }

  function handleProviderLogin(provider?: string) {
    let url = "/auth/login";
    if (provider) {
      url += `?provider=${provider}`;
    }
    window.location.href = url;
  }

  const socialProviders = [
    { id: "GoogleOAuth", label: "Google", icon: "https://www.google.com/favicon.ico" },
    { id: "MicrosoftOAuth", label: "Microsoft", icon: "https://www.microsoft.com/favicon.ico" },
    { id: "GitHubOAuth", label: "GitHub", icon: "https://github.com/favicon.ico" },
    { id: "AppleOAuth", label: "Apple", icon: "https://www.apple.com/favicon.ico" },
  ];
</script>

{#if isOpen}
  <div
    class="fixed inset-0 z-[100] grid place-items-center bg-black/60 backdrop-blur-md transition-all duration-300"
    role="button"
    tabindex="0"
    onclick={close}
    onkeydown={(e: KeyboardEvent) => e.key === "Escape" && close()}
    transition:fade={{ duration: 200 }}
  >
    <div
      class="relative w-full max-w-[460px] overflow-hidden rounded-[1.5rem] border border-border bg-card p-10 text-card-foreground shadow-2xl"
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      onclick={(e: MouseEvent) => e.stopPropagation()}
      onkeydown={(e: KeyboardEvent) => e.stopPropagation()}
      transition:fly={{ y: 20, duration: 400, opacity: 0 }}
    >
      <button
        onclick={close}
        aria-label="Close auth modal"
        class="absolute right-6 top-6 grid h-8 w-8 place-items-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        <X size={16} strokeWidth={3} />
      </button>

      <div class="mb-8">
        <h2 class="mb-1 font-display text-4xl font-black tracking-tight text-foreground">
          Sign in
        </h2>
        {#if step === "otp"}
          <p class="text-sm text-muted-foreground">Enter the 6-digit code sent to {email}</p>
        {:else if step === "magic-link-sent"}
          <p class="text-sm text-muted-foreground">Magic link sent to {email}</p>
        {/if}
      </div>

      <div class="space-y-6">
        {#if step === "email"}
          <div class="space-y-2">
            <label for="email" class="text-xs font-bold uppercase tracking-widest text-muted-foreground">Email</label>
            <input
              id="email"
              type="email"
              bind:value={email}
              autocomplete="email"
              placeholder="you@company.com"
              onkeydown={(e: KeyboardEvent) => e.key === "Enter" && continueWithEmail()}
              class="w-full rounded-xl border border-input bg-background p-4 font-bold text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-all"
            />
          </div>

          {#if showMethodPill}
            <div class="space-y-2">
              <p class="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Choose method</p>
              <div class="inline-flex w-full rounded-full border border-input bg-muted/40 p-1">
                <button
                  type="button"
                  onclick={() => (method = "otp")}
                  class={`w-1/2 rounded-full px-4 py-2 text-xs font-black uppercase tracking-wide transition-all ${
                    method === "otp"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  OTP Code
                </button>
                <button
                  type="button"
                  onclick={() => (method = "magic-link")}
                  class={`w-1/2 rounded-full px-4 py-2 text-xs font-black uppercase tracking-wide transition-all ${
                    method === "magic-link"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Magic Link
                </button>
              </div>
            </div>
          {/if}

          <button
            onclick={continueWithEmail}
            disabled={isSending || !email.trim() || cooldownSeconds > 0}
            class="w-full rounded-full bg-primary py-4 font-black text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:grayscale"
          >
            {#if isSending}
              Sending...
            {:else if cooldownSeconds > 0}
              Retry in {cooldownSeconds}s
            {:else if method === "magic-link"}
              Send Magic Link
            {:else}
              Send Code
            {/if}
          </button>

          <div class="relative flex items-center py-4">
            <div class="grow border-t border-border"></div>
            <span class="mx-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">or</span>
            <div class="grow border-t border-border"></div>
          </div>

          <div class="grid grid-cols-4 gap-3">
            {#each socialProviders as provider}
              <button
                onclick={() => handleProviderLogin(provider.id)}
                class="group flex h-14 items-center justify-center rounded-xl border border-input bg-background transition-all hover:border-primary/40 hover:bg-muted active:scale-95"
                title={`Sign in with ${provider.label}`}
              >
                <img
                  src={provider.icon}
                  alt={provider.label}
                  class="h-5 w-5 grayscale opacity-60 transition-all group-hover:grayscale-0 group-hover:opacity-100"
                />
              </button>
            {/each}
          </div>
        {:else if step === "otp"}
          <div class="space-y-5">
            <div class="flex justify-center gap-2">
              {#each otpDigits as digit, i (i)}
                <input
                  bind:this={otpRefs[i]}
                  type="text"
                  inputmode="numeric"
                  maxlength={1}
                  value={digit}
                  oninput={(e: Event) => handleOtpInput(i, e)}
                  onkeydown={(e: KeyboardEvent) => handleOtpKeydown(i, e)}
                  onpaste={handleOtpPaste}
                  aria-label={`OTP digit ${i + 1}`}
                  class="h-12 w-11 rounded-xl border border-input bg-background text-center font-mono text-lg font-bold tracking-wide text-foreground focus:border-primary focus:outline-none"
                />
              {/each}
            </div>

            <button
              onclick={verifyOtp}
              disabled={isVerifying || !isOtpComplete}
              class="w-full rounded-full bg-primary py-4 font-black text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:grayscale"
            >
              {isVerifying ? "Verifying..." : "Verify and Continue"}
            </button>

            <div class="flex items-center justify-between gap-3">
              <button
                type="button"
                onclick={sendOtpCode}
                disabled={isSending || cooldownSeconds > 0}
                class="text-xs font-bold uppercase tracking-wide text-primary hover:underline disabled:opacity-50"
              >
                {cooldownSeconds > 0 ? `Resend in ${cooldownSeconds}s` : "Resend code"}
              </button>
              <button
                type="button"
                onclick={goBackToEmail}
                class="text-xs font-bold uppercase tracking-wide text-muted-foreground hover:text-foreground"
              >
                Use different email
              </button>
            </div>
          </div>
        {:else}
          <div class="space-y-5">
            <div class="rounded-2xl border border-primary/20 bg-primary/5 p-5">
              <div class="mb-2 flex items-center gap-2">
                <CheckCircle2 size={18} class="text-primary" />
                <p class="text-sm font-black text-foreground">Magic link sent</p>
              </div>
              <p class="text-sm text-muted-foreground">
                Open the email we sent to <span class="font-semibold text-foreground">{email}</span> and click the secure link.
              </p>
            </div>

            <button
              type="button"
              onclick={sendMagicLink}
              disabled={isSending || cooldownSeconds > 0}
              class="w-full rounded-full border border-input bg-background py-3 text-sm font-black text-foreground transition-all hover:bg-muted disabled:opacity-50"
            >
              {cooldownSeconds > 0 ? `Resend in ${cooldownSeconds}s` : "Resend magic link"}
            </button>

            <button
              type="button"
              onclick={goBackToEmail}
              class="w-full text-xs font-bold uppercase tracking-wide text-muted-foreground hover:text-foreground"
            >
              Use different email
            </button>
          </div>
        {/if}

        {#if errorMessage}
          <p class="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            {errorMessage}
          </p>
        {/if}

        {#if infoMessage}
          <p class="rounded-lg border border-primary/20 bg-primary/10 p-3 text-sm text-primary">
            {infoMessage}
          </p>
        {/if}

        <div class="pt-2 text-center">
          <p class="text-sm font-medium text-muted-foreground">
            Don't have an account? <a href="/auth/login?screen_hint=sign-up" class="text-primary hover:underline">Sign up</a>
          </p>
        </div>
      </div>
    </div>
  </div>
{/if}
