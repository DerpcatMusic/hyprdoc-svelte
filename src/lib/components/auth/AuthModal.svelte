<script lang="ts">
  import { X, Mail, Shield, Smartphone, ArrowRight, Lock } from "lucide-svelte";
  import { fade, fly } from "svelte/transition";
  import { cn } from "$lib/utils";

  let { isOpen = $bindable(false) } = $props();

  let email = $state("");
  let isLoading = $state(false);

  function close() {
    isOpen = false;
    email = "";
  }

  function handleLogin(provider?: string) {
    let url = "/auth/login";
    if (provider) {
      url += `?provider=${provider}`;
    } else if (email) {
      url += `?login_hint=${encodeURIComponent(email)}`;
    }
    window.location.href = url;
  }

  // Social providers - Direct OAuth routing requires credentials in WorkOS dashboard
  // See: WorkOS Dashboard → Authentication → Auth Methods
  const socialProviders = [
    { id: 'GoogleOAuth', label: 'Google', icon: 'https://www.google.com/favicon.ico' },
    { id: 'MicrosoftOAuth', label: 'Microsoft', icon: 'https://www.microsoft.com/favicon.ico' },
    { id: 'GitHubOAuth', label: 'GitHub', icon: 'https://github.com/favicon.ico' },
    { id: 'AppleOAuth', label: 'Apple', icon: 'https://www.apple.com/favicon.ico' }
  ];
</script>

{#if isOpen}
  <!-- Backdrop -->
  <div 
    class="fixed inset-0 z-[100] grid place-items-center bg-black/60 backdrop-blur-md transition-all duration-300"
    role="button"
    tabindex="0"
    onclick={close}
    onkeydown={(e: KeyboardEvent) => e.key === 'Escape' && close()}
    transition:fade={{ duration: 200 }}
  >
    <!-- Modal Card (Wise-inspired: Clean, Solid, Sharp) -->
    <div 
      class="relative w-full max-w-[440px] overflow-hidden rounded-[1.5rem] border border-[#27272a] bg-[#18181b] p-10 shadow-2xl"
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      onclick={(e: MouseEvent) => e.stopPropagation()}
      onkeydown={(e: KeyboardEvent) => e.stopPropagation()}
      transition:fly={{ y: 20, duration: 400, opacity: 0 }}
    >
      <!-- Close Button -->
      <button 
        onclick={close}
        class="absolute right-6 top-6 grid h-8 w-8 place-items-center rounded-full bg-[#27272a] text-[#a1a1aa] transition-colors hover:bg-[#3f3f46] hover:text-white"
      >
        <X size={16} strokeWidth={3} />
      </button>

      <!-- Header -->
      <div class="mb-10">
        <h2 class="font-display font-black text-4xl tracking-tight text-white mb-1">
          Sign in
        </h2>
      </div>

      <!-- Main Form -->
      <div class="space-y-6">
        <div class="space-y-2">
          <label for="email" class="text-xs font-bold uppercase tracking-widest text-[#52525b]">Email</label>
          <input 
            id="email"
            type="email" 
            bind:value={email}
            placeholder="Your email address"
            onkeydown={(e: KeyboardEvent) => e.key === 'Enter' && handleLogin()}
            class="w-full rounded-xl border border-[#27272a] bg-[#09090b] p-4 font-bold text-white placeholder:text-[#3f3f46] focus:border-[#9FE870] focus:outline-none transition-all"
          />
        </div>

        <button 
          onclick={() => handleLogin()}
          disabled={!email}
          class="w-full rounded-full bg-white py-4 font-black text-black transition-all hover:bg-[#f4f4f5] active:scale-[0.98] disabled:opacity-50 disabled:grayscale"
        >
          Continue
        </button>

        <div class="relative flex items-center py-4">
          <div class="grow border-t border-[#27272a]"></div>
          <span class="mx-4 text-[10px] font-bold uppercase tracking-widest text-[#52525b]">or</span>
          <div class="grow border-t border-[#27272a]"></div>
        </div>

        <!-- Social Providers -->
        <div class="grid grid-cols-4 gap-3">
          {#each socialProviders as provider}
            <button 
              onclick={() => handleLogin(provider.id)}
              class="group flex h-14 items-center justify-center rounded-xl border border-[#27272a] bg-[#09090b] transition-all hover:border-[#3f3f46] hover:bg-[#27272a] active:scale-95"
              title="Sign in with {provider.label}"
            >
              <img src={provider.icon} alt={provider.label} class="h-5 w-5 grayscale group-hover:grayscale-0 transition-all opacity-60 group-hover:opacity-100" />
            </button>
          {/each}
        </div>

        <div class="pt-6 text-center">
          <p class="text-sm font-medium text-[#52525b]">
            Don't have an account? <a href="/auth/login?screen_hint=sign-up" class="text-[#9FE870] hover:underline">Sign up</a>
          </p>
        </div>
      </div>
    </div>
  </div>
{/if}
