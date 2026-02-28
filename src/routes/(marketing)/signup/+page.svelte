<script lang="ts">
  import { onMount } from "svelte";
  import { Spinner } from "$lib/components/ui/spinner";
  import { Mail, Shield, Lock, Fingerprint, ArrowRight, UserPlus } from "lucide-svelte";
  import gsap from "gsap";

  let container = $state<HTMLElement>();
  let isLoading = $state(false);

  onMount(() => {
    if (container) {
      gsap.from(".auth-card", {
        scale: 0.95,
        opacity: 0,
        duration: 0.8,
        ease: "power4.out"
      });
      
      gsap.to(".grid-line", {
        opacity: 0.1,
        duration: 2,
        stagger: 0.1,
        repeat: -1,
        yoyo: true
      });
    }
  });

  function handleAuth(method: string) {
    isLoading = true;
    if (method === "email") {
      window.location.href = `/auth/email?screen_hint=sign-up`;
      return;
    }

    if (method === "google") {
      window.location.href = `/auth/login?provider=GoogleOAuth&screen_hint=sign-up`;
      return;
    }

    if (method === "sso") {
      window.location.href = `/auth/sso?screen_hint=sign-up`;
      return;
    }

    isLoading = false;
  }
</script>

<div bind:this={container} class="relative flex min-h-screen items-center justify-center bg-background overflow-hidden font-sans">
  <!-- Background Grid -->
  <div class="absolute inset-0 z-0 pointer-events-none opacity-[0.03]">
    <div class="grid grid-cols-12 h-full w-full">
      {#each Array(12) as _}
        <div class="grid-line border-r border-primary h-full"></div>
      {/each}
    </div>
  </div>

  <div class="auth-card relative z-10 w-full max-w-lg p-1">
    <div class="bg-card/50 backdrop-blur-3xl border border-border/50 rounded-[2.5rem] p-12 shadow-2xl shadow-primary/5 space-y-12">
      
      <!-- Header -->
      <div class="text-center space-y-4">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-[10px] font-bold uppercase tracking-widest italic animate-pulse">
           Registration Protocol
        </div>
        <h1 class="text-5xl font-bold font-display tracking-tighter text-foreground uppercase italic">
          HyprDoc <span class="text-primary">Join</span>
        </h1>
        <p class="text-muted-foreground font-medium">Initialize your sovereign contract engine.</p>
      </div>

      <!-- Auth Methods -->
      <div class="grid gap-4">
         <button 
           onclick={() => handleAuth('google')}
           class="group flex items-center justify-between p-6 rounded-2xl border border-border bg-card/50 hover:border-primary/50 hover:bg-card transition-all active:scale-[0.98]"
         >
           <div class="flex items-center gap-4">
              <div class="h-10 w-10 flex items-center justify-center rounded-xl bg-muted group-hover:bg-primary/10 transition-colors">
                <UserPlus class="text-muted-foreground group-hover:text-primary transition-colors" size={20} />
              </div>
              <div class="text-left">
                <div class="font-bold text-foreground">Create Identity</div>
                <div class="text-xs text-muted-foreground">Sign up with Google / Email</div>
              </div>
           </div>
           <ArrowRight size={18} class="text-muted-foreground group-hover:text-primary transition-all group-hover:translate-x-1" />
         </button>

         <button 
           onclick={() => handleAuth('sso')}
           class="group flex items-center justify-between p-6 rounded-2xl border border-border bg-card/50 hover:border-primary/50 hover:bg-card transition-all active:scale-[0.98]"
         >
           <div class="flex items-center gap-4">
              <div class="h-10 w-10 flex items-center justify-center rounded-xl bg-muted group-hover:bg-primary/10 transition-colors">
                <Shield class="text-muted-foreground group-hover:text-primary transition-colors" size={20} />
              </div>
              <div class="text-left">
                <div class="font-bold text-foreground">Enterprise Node</div>
                <div class="text-xs text-muted-foreground">Corporate SSO Registration</div>
              </div>
           </div>
           <ArrowRight size={18} class="text-muted-foreground group-hover:text-primary transition-all group-hover:translate-x-1" />
         </button>
      </div>

      <!-- Footer Info -->
      <p class="text-center text-xs text-muted-foreground leading-relaxed">
        By initializing, you agree to the <a href="/terms" class="underline hover:text-primary">Service Protocol</a> and <a href="/privacy" class="underline hover:text-primary">Data Sovereignty Policy</a>.
      </p>

      <!-- Trust Nodes -->
      <div class="flex items-center justify-center gap-8 py-4 border-t border-border/30">
         <div class="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            <Lock size={12} class="text-primary/50" />
            SOC 2 Type II
         </div>
         <div class="h-4 w-px bg-border/50"></div>
         <div class="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            <Shield size={12} class="text-primary/50" />
            GDPR Ready
         </div>
      </div>

    </div>
  </div>

  {#if isLoading}
    <div class="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md transition-opacity">
       <div class="flex flex-col items-center gap-4">
          <Spinner size="lg" class="text-primary" />
          <p class="font-mono text-xs uppercase tracking-widest text-primary font-bold animate-pulse">Initializing Flow...</p>
       </div>
    </div>
  {/if}
</div>
