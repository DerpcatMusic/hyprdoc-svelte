<script lang="ts">
  import { fade, fly } from "svelte/transition";
  import { ArrowRight, Briefcase, LayoutDashboard, Moon, Sun, X } from "lucide-svelte";
  import { onMount } from "svelte";

  interface Props {
    isOpen: boolean;
    onClose: () => void;
    onScrollTo: (index: number) => void;
    isCorporate: boolean;
    onToggleCorporate?: () => void;
  }

  let { isOpen, onClose, onScrollTo, isCorporate, onToggleCorporate }: Props = $props();

  let isDark = $state(false);
  let isSignedIn = $state(false); // Stub for now

  function toggleTheme() {
    isDark = !isDark;
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", isDark);
    }
  }

  // Lock body scroll when menu is open
  $effect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  });
</script>

{#if isOpen}
  <!-- BACKDROP -->
  <div
    onclick={onClose}
    transition:fade={{ duration: 200 }}
    class="fixed inset-0 z-[99] bg-background/50 backdrop-blur-sm"
    role="button"
    tabindex="0"
    onkeydown={(e: KeyboardEvent) => e.key === 'Escape' && onClose()}
  ></div>

  <!-- SIDEBAR -->
  <div
    transition:fly={{ x: 300, duration: 300, opacity: 1 }}
    class="fixed top-0 right-0 bottom-0 z-[100] w-[300px] border-l border-border bg-background/95 shadow-2xl backdrop-blur-xl"
  >
    <div class="flex h-full flex-col p-6">
      <!-- HEADER -->
      <div class="mb-8 flex items-center justify-between">
        <span class="font-bold font-sans text-lg tracking-tight">Menu</span>
        <button
          type="button"
          onclick={onClose}
          class="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <X size={20} />
        </button>
      </div>

      <!-- NAV SECTION -->
      <nav class="flex flex-col gap-2">
        <button
          onclick={() => {
            onScrollTo(1);
            onClose();
          }}
          class="rounded-lg px-4 py-3 text-left font-medium text-lg transition-colors hover:bg-accent"
        >
          Features
        </button>
        <button
          onclick={() => {
            onScrollTo(2);
            onClose();
          }}
          class="rounded-lg px-4 py-3 text-left font-medium text-lg transition-colors hover:bg-accent"
        >
          Logic
        </button>
        <button
          onclick={() => {
            onScrollTo(3);
            onClose();
          }}
          class="rounded-lg px-4 py-3 text-left font-medium text-lg transition-colors hover:bg-accent"
        >
          Pricing
        </button>
      </nav>

      <div class="my-6 h-px w-full bg-border/50"></div>

      <!-- SETTINGS SECTION -->
      <div class="flex flex-col gap-4">
        <button
          type="button"
          onclick={toggleTheme}
          class="flex w-full items-center justify-between rounded-lg border border-border bg-background/50 px-4 py-3 font-medium transition-all hover:bg-accent"
        >
          <div class="flex items-center gap-3">
            {#if isDark}
              <Sun size={18} />
              <span>Light Mode</span>
            {:else}
              <Moon size={18} />
              <span>Dark Mode</span>
            {/if}
          </div>
        </button>

        {#if onToggleCorporate}
          <button
            type="button"
            onclick={onToggleCorporate}
            class={`flex w-full items-center justify-between rounded-lg border px-4 py-3 font-medium transition-all ${
              isCorporate
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background/50 hover:bg-accent"
            }`}
          >
            <div class="flex items-center gap-3">
              <Briefcase size={18} />
              <span>Corporate</span>
            </div>
          </button>
        {/if}
      </div>

      <div class="mt-auto">
        {#if isSignedIn}
          <a
            href="/dashboard"
            class="group flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-bold text-primary-foreground shadow-lg transition-all hover:opacity-90 active:scale-95"
          >
            <LayoutDashboard class="h-5 w-5" />
            App Dashboard
          </a>
        {:else}
          <a
            href="/login"
            class="group flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-bold text-primary-foreground shadow-lg transition-all hover:opacity-90 active:scale-95"
          >
            Sign In
            <ArrowRight class="transition-transform group-hover:translate-x-1" />
          </a>
        {/if}
      </div>
    </div>
  </div>
{/if}
