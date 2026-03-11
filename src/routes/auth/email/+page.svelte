<script lang="ts">
  import { onDestroy } from "svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { Spinner } from "$lib/components/ui/spinner";
  import { Mail, ShieldCheck } from "lucide-svelte";

  type Step = "email" | "code";
  type AuthResponseBody = {
    success?: boolean;
    error?: string;
    retryAfterSec?: number;
    redirectTo?: string;
  };

  let step = $state<Step>("email");
  let email = $state("");
  let code = $state("");
  let errorMessage = $state("");
  let infoMessage = $state("");
  let isSending = $state(false);
  let isVerifying = $state(false);
  let cooldownSeconds = $state(0);
  let cooldownTimer: ReturnType<typeof setInterval> | null = null;

  const returnTo = $derived(
    normalizeReturnTo(
      page.url.searchParams.get("returnTo") ?? page.url.searchParams.get("redirectTo")
    )
  );

  const emailFromQuery = $derived(page.url.searchParams.get("email")?.trim() ?? "");

  $effect(() => {
    if (!email && emailFromQuery) {
      email = emailFromQuery;
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

  function normalizeReturnTo(value: string | null) {
    if (!value) return "/dashboard";
    if (!value.startsWith("/") || value.startsWith("//")) return "/dashboard";
    return value;
  }

  function isValidEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }

  async function readBody(response: Response): Promise<AuthResponseBody | null> {
    try {
      return (await response.json()) as AuthResponseBody;
    } catch {
      return null;
    }
  }

  async function sendCode() {
    const normalizedEmail = email.trim().toLowerCase();
    errorMessage = "";
    infoMessage = "";

    if (!isValidEmail(normalizedEmail)) {
      errorMessage = "Enter a valid email address.";
      return;
    }

    isSending = true;
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

      step = "code";
      code = "";
      email = normalizedEmail;
      infoMessage = "Code sent. Check your email and enter it below.";
      cooldownSeconds = 30;
    } catch {
      errorMessage = "Unable to send code. Please try again.";
    } finally {
      isSending = false;
    }
  }

  async function verifyCode() {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedCode = code.trim();
    errorMessage = "";
    infoMessage = "";

    if (!isValidEmail(normalizedEmail)) {
      errorMessage = "Enter a valid email address.";
      step = "email";
      return;
    }

    if (!normalizedCode) {
      errorMessage = "Enter the code from your email.";
      return;
    }

    isVerifying = true;
    try {
      const response = await fetch("/auth/magic/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: normalizedEmail,
          code: normalizedCode,
          returnTo,
        }),
      });

      const body = await readBody(response);

      if (!response.ok) {
        errorMessage = body?.error ?? "Unable to verify code.";
        return;
      }

      await goto(body?.redirectTo || returnTo, { replaceState: true });
    } catch {
      errorMessage = "Unable to verify code. Please try again.";
    } finally {
      isVerifying = false;
    }
  }
</script>

<svelte:head>
  <title>Email Sign In | HyprDoc</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-background p-6">
  <div class="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-xl">
    <div class="mb-8 space-y-2 text-center">
      <div class="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {#if step === "email"}
          <Mail size={22} />
        {:else}
          <ShieldCheck size={22} />
        {/if}
      </div>
      <h1 class="font-display text-3xl font-black tracking-tight text-foreground">
        {step === "email" ? "Sign in with Email" : "Enter Magic Code"}
      </h1>
      <p class="text-sm text-muted-foreground">
        {step === "email"
          ? "We'll send a one-time code to your inbox."
          : `Code sent to ${email}.`}
      </p>
    </div>

    {#if step === "email"}
      <form
        class="space-y-4"
        onsubmit={(event: SubmitEvent) => {
          event.preventDefault();
          sendCode();
        }}
      >
        <div class="space-y-2">
          <label class="text-xs font-bold uppercase tracking-widest text-muted-foreground" for="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            bind:value={email}
            autocomplete="email"
            placeholder="you@company.com"
            class="w-full rounded-xl border border-input bg-background p-4 font-medium text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={isSending || !email.trim() || cooldownSeconds > 0}
          class="inline-flex w-full items-center justify-center rounded-full bg-primary py-3 text-sm font-black text-primary-foreground transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {#if isSending}
            <Spinner size="sm" />
          {:else if cooldownSeconds > 0}
            Resend in {cooldownSeconds}s
          {:else}
            Send Code
          {/if}
        </button>
      </form>
    {:else}
      <form
        class="space-y-4"
        onsubmit={(event: SubmitEvent) => {
          event.preventDefault();
          verifyCode();
        }}
      >
        <div class="space-y-2">
          <label class="text-xs font-bold uppercase tracking-widest text-muted-foreground" for="code">
            Verification Code
          </label>
          <input
            id="code"
            type="text"
            bind:value={code}
            inputmode="numeric"
            autocomplete="one-time-code"
            placeholder="Enter code"
            class="w-full rounded-xl border border-input bg-background p-4 text-center font-mono text-lg tracking-[0.2em] text-foreground placeholder:tracking-normal placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={isVerifying || !code.trim()}
          class="inline-flex w-full items-center justify-center rounded-full bg-primary py-3 text-sm font-black text-primary-foreground transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {#if isVerifying}
            <Spinner size="sm" />
          {:else}
            Verify and Continue
          {/if}
        </button>
        <button
          type="button"
          disabled={isSending || cooldownSeconds > 0}
          onclick={sendCode}
          class="w-full text-sm font-semibold text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-60"
        >
          {cooldownSeconds > 0 ? `Resend code in ${cooldownSeconds}s` : "Resend code"}
        </button>
        <button
          type="button"
          onclick={() => {
            step = "email";
            code = "";
            errorMessage = "";
            infoMessage = "";
          }}
          class="w-full text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Use a different email
        </button>
      </form>
    {/if}

    {#if errorMessage}
      <p class="mt-4 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
        {errorMessage}
      </p>
    {/if}

    {#if infoMessage}
      <p class="mt-4 rounded-lg border border-primary/20 bg-primary/10 p-3 text-sm text-primary">
        {infoMessage}
      </p>
    {/if}

    <p class="mt-6 text-center text-sm text-muted-foreground">
      Need OAuth instead? <a href="/auth/login" class="font-semibold text-primary hover:underline">Continue with provider</a>
    </p>
  </div>
</div>

