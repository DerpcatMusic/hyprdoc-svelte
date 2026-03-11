<script lang="ts">
  import { 
    Save, Loader2, User, Building2, FileText, 
    Palette, Link2, CreditCard, ChevronRight,
    Camera, CheckCircle2, Globe, ShieldCheck,
    Briefcase, Phone, MapPin, Hash, Sparkles
  } from "lucide-svelte";
  import { api } from "@/convex/_generated/api";
  import { cn } from "$lib/utils";
  import { toast } from "svelte-sonner";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { Switch } from "$lib/components/ui/switch";
  import * as Select from "$lib/components/ui/select";
  import { Slider } from "$lib/components/ui/slider";
  import { fade, fly } from "svelte/transition";
  import { useConvexClient, useQuery } from "convex-svelte";
  import { HYPR_BRAND_ACCENT } from "$lib/styles/ui-palette";

  const client = useConvexClient();
  const userQuery = useQuery(api.users.queries.me, {});

  // Tab state
  let activeTab = $state("profile");
  let isSaving = $state(false);
  let hasChanges = $state(false);

  // ═══════════════════════════════════════════════════════════════
  // PROFILE STATE
  // ═══════════════════════════════════════════════════════════════
  let firstName = $state("");
  let lastName = $state("");
  let companyName = $state("");
  let role = $state("");
  let phoneNumber = $state("");
  let physicalAddress = $state("");
  let city = $state("");
  let stateProvince = $state("");
  let zipCode = $state("");

  // ═══════════════════════════════════════════════════════════════
  // BRANDING STATE
  // ═══════════════════════════════════════════════════════════════
  let brandLogoUrl = $state("");
  let brandLogoColor = $state("");
  let brandLogoPosition = $state<"left" | "center" | "right">("center");
  let brandEnabled = $state(false);
  let agentTone = $state<"casual" | "professional" | "friendly">("casual");

  // ═══════════════════════════════════════════════════════════════
  // DOCUMENT DEFAULTS STATE
  // ═══════════════════════════════════════════════════════════════
  let defaultPaperTexture = $state("dots");
  let defaultPaperTextureOpacity = $state(20);
  let defaultShowMargins = $state(false);

  // Sync user data on load
  $effect(() => {
    const user = userQuery.data;
    if (!user) return;
    
    // Profile
    const profile = user.autoFillProfile ?? {};
    firstName = profile.firstName ?? user.name?.split(" ")[0] ?? "";
    lastName = profile.lastName ?? user.name?.split(" ")[1] ?? "";
    companyName = profile.companyName ?? "";
    role = profile.jobTitle ?? "";
    phoneNumber = profile.phoneNumber ?? "";
    physicalAddress = profile.physicalAddress ?? "";
    city = profile.city ?? "";
    stateProvince = profile.state ?? "";
    zipCode = profile.zipCode ?? "";

    // Branding
    brandLogoUrl = user.brandLogoUrl ?? "";
    brandLogoColor = user.brandLogoColor ?? HYPR_BRAND_ACCENT;
    brandLogoPosition = user.brandLogoPosition ?? "center";
    brandEnabled = user.brandEnabled ?? false;
    agentTone = user.agentTone ?? "casual";

    // Document Defaults
    defaultPaperTexture = user.defaultPaperTexture ?? "dots";
    defaultPaperTextureOpacity = (user.defaultPaperTextureOpacity ?? 0.2) * 100;
    defaultShowMargins = user.defaultShowMargins ?? false;
  });

  function markChanged() {
    hasChanges = true;
  }

  async function handleSave() {
    if (!hasChanges || isSaving) return;
    isSaving = true;
    try {
      await client.mutation(api.users.mutations.updateSettings, {
        firstName, lastName, companyName, jobTitle: role,
        phoneNumber, physicalAddress, city, state: stateProvince, zipCode,
        brandLogoUrl, brandLogoColor, brandLogoPosition, brandEnabled, agentTone,
        defaultPaperTexture, 
        defaultPaperTextureOpacity: defaultPaperTextureOpacity / 100,
        defaultShowMargins
      });
      hasChanges = false;
      toast.success("Settings saved", {
        description: "Your preferences have been updated across the workspace.",
      });
    } catch (err) {
      toast.error("Save failed");
    } finally {
      isSaving = false;
    }
  }

  const tabs = [
    { id: "profile", label: "Profile", icon: User, desc: "Personal & signing info" },
    { id: "branding", label: "Branding", icon: Sparkles, desc: "Logo & AI personality" },
    { id: "defaults", label: "Defaults", icon: FileText, desc: "Document editor rules" },
    { id: "integrations", label: "Connect", icon: Link2, desc: "CRMs & external tools" },
    { id: "billing", label: "Billing", icon: CreditCard, desc: "Plan & usage" },
  ];

  const toneOptions = [
    { value: "casual", label: "Casual", icon: "🤝", desc: "Best for outreach" },
    { value: "professional", label: "Formal", icon: "🏛️", desc: "For legal docs" },
    { value: "friendly", label: "Friendly", icon: "👋", desc: "Warm and inviting" },
  ];

  const textureOptions = [
    { value: "none", label: "Clean" },
    { value: "dots", label: "Dots" },
    { value: "grid", label: "Grid" },
    { value: "lines", label: "Lines" },
  ];
</script>

<div class="mx-auto max-w-5xl px-4 py-8 md:py-12">
  <!-- Top Navigation / Header -->
  <div class="mb-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
    <div class="space-y-1">
      <div class="flex items-center gap-2 text-muted-foreground text-sm font-medium">
        <span>Dashboard</span>
        <ChevronRight size={14} />
        <span class="text-foreground">Settings</span>
      </div>
      <h1 class="font-display text-4xl font-black tracking-tight text-foreground md:text-5xl">
        Workspace Settings
      </h1>
    </div>

    <div class="flex items-center gap-3">
      {#if hasChanges}
        <span class="animate-pulse text-primary text-xs font-bold uppercase tracking-widest" in:fade>
          Unsaved Changes
        </span>
      {/if}
      <Button
        onclick={handleSave}
        disabled={isSaving || !hasChanges}
        class={cn(
          "h-12 gap-2 rounded-2xl px-8 text-base font-bold transition-all duration-300",
          hasChanges 
            ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
            : "bg-muted text-muted-foreground"
        )}
      >
        {#if isSaving}
          <Loader2 class="h-5 w-5 animate-spin" />
        {:else}
          <Save class="h-5 w-5" />
        {/if}
        Save Changes
      </Button>
    </div>
  </div>

  <div class="grid gap-12 lg:grid-cols-[280px_1fr]">
    <!-- Sidebar -->
    <aside class="space-y-2">
      <div class="mb-4 px-4 text-xs font-bold uppercase tracking-widest text-muted-foreground/50">
        Navigation
      </div>
      <nav class="flex flex-col gap-1">
        {#each tabs as tab (tab.id)}
          <button
            type="button"
            onclick={() => activeTab = tab.id}
            class={cn(
              "group relative flex w-full flex-col items-start gap-0.5 rounded-2xl p-4 text-left transition-all duration-200",
              activeTab === tab.id
                ? "bg-primary text-primary-foreground shadow-sm border border-primary/20"
                : "border border-transparent text-muted-foreground hover:border-border hover:bg-card"
            )}
          >
            <div class="flex items-center gap-3 font-black text-lg">
              <tab.icon class={cn("h-5 w-5", activeTab === tab.id ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")} />
              {tab.label}
            </div>
            <div class={cn("ml-8 text-xs font-medium", activeTab === tab.id ? "text-primary-foreground/70" : "text-muted-foreground/70")}>
              {tab.desc}
            </div>
          </button>
        {/each}
      </nav>

      <!-- Quick Summary Card -->
      <div class="mt-8 rounded-3xl border border-border bg-surface-3 px-6 py-8 text-foreground">
        <div class="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <ShieldCheck size={20} />
        </div>
        <div class="text-lg font-bold">HyprSign Pro</div>
        <p class="mt-1 text-muted-foreground text-sm">You are currently using the enterprise-grade signing layer.</p>
        <div class="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div class="h-full w-[65%] bg-primary"></div>
        </div>
        <div class="mt-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">650 / 1000 Envelopes used</div>
      </div>
    </aside>

    <!-- Main Content Container -->
    <main class="min-h-[600px]">
      <div class="rounded-[2.5rem] border border-border bg-card p-8 shadow-sm md:p-12">
        {#key activeTab}
          <div in:fly={{ y: 20, duration: 400, delay: 100 }}>
            <!-- PROFILE TAB -->
            {#if activeTab === "profile"}
              <div class="space-y-12">
                <header>
                  <h2 class="font-display text-3xl font-black tracking-tight">Personal Profile</h2>
                  <p class="mt-2 text-muted-foreground">
                    This information is used to automatically fill your contracts and professional documents.
                  </p>
                </header>

                <section class="space-y-8">
                  <div class="grid gap-8 sm:grid-cols-2">
                    <div class="space-y-2">
                      <Label class="text-xs font-bold uppercase tracking-wider text-muted-foreground">First Name</Label>
                      <div class="relative">
                        <User class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
                        <Input bind:value={firstName} oninput={markChanged} class="h-12 rounded-2xl pl-10 border-border bg-background focus-visible:ring-primary/40" placeholder="John" />
                      </div>
                    </div>
                    <div class="space-y-2">
                      <Label class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Last Name</Label>
                      <Input bind:value={lastName} oninput={markChanged} class="h-12 rounded-2xl border-border bg-background focus-visible:ring-primary/40" placeholder="Doe" />
                    </div>
                    <div class="space-y-2">
                      <Label class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Company Name</Label>
                      <div class="relative">
                        <Building2 class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
                        <Input bind:value={companyName} oninput={markChanged} class="h-12 rounded-2xl pl-10 border-border bg-background focus-visible:ring-primary/40" placeholder="Wise Inc." />
                      </div>
                    </div>
                    <div class="space-y-2">
                      <Label class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Job Title</Label>
                      <div class="relative">
                        <Briefcase class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
                        <Input bind:value={role} oninput={markChanged} class="h-12 rounded-2xl pl-10 border-border bg-background focus-visible:ring-primary/40" placeholder="CEO" />
                      </div>
                    </div>
                  </div>

                  <div class="space-y-8 border-t border-border/50 pt-8">
                    <div class="space-y-2">
                      <Label class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Phone Number</Label>
                      <div class="relative">
                        <Phone class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
                        <Input bind:value={phoneNumber} oninput={markChanged} class="h-12 rounded-2xl pl-10 border-border bg-background focus-visible:ring-primary/40" placeholder="+1 (555) 000-0000" />
                      </div>
                    </div>

                    <div class="space-y-2">
                      <Label class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Street Address</Label>
                      <div class="relative">
                        <MapPin class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
                        <Input bind:value={physicalAddress} oninput={markChanged} class="h-12 rounded-2xl pl-10 border-border bg-background focus-visible:ring-primary/40" placeholder="123 Wise Street" />
                      </div>
                    </div>

                    <div class="grid gap-8 sm:grid-cols-3">
                      <div class="space-y-2 sm:col-span-1">
                        <Label class="text-xs font-bold uppercase tracking-wider text-muted-foreground">City</Label>
                        <Input bind:value={city} oninput={markChanged} class="h-12 rounded-2xl border-border bg-background focus-visible:ring-primary/40" placeholder="London" />
                      </div>
                      <div class="space-y-2">
                        <Label class="text-xs font-bold uppercase tracking-wider text-muted-foreground">State / Province</Label>
                        <Input bind:value={stateProvince} oninput={markChanged} class="h-12 rounded-2xl border-border bg-background focus-visible:ring-primary/40" placeholder="Greater London" />
                      </div>
                      <div class="space-y-2">
                        <Label class="text-xs font-bold uppercase tracking-wider text-muted-foreground">ZIP / Postcode</Label>
                        <div class="relative">
                          <Hash class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
                          <Input bind:value={zipCode} oninput={markChanged} class="h-12 rounded-2xl pl-10 border-border bg-background focus-visible:ring-primary/40" placeholder="E1 6AN" />
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              </div>

            <!-- BRANDING TAB -->
            {:else if activeTab === "branding"}
              <div class="space-y-12">
                <header class="flex items-center justify-between gap-4">
                  <div>
                    <h2 class="font-display text-3xl font-black tracking-tight">Brand Identity</h2>
                    <p class="mt-2 text-muted-foreground">
                      Customize how your documents and AI agent appear to your clients.
                    </p>
                  </div>
                  <div class="flex flex-col items-end gap-2">
                    <span class="text-[10px] font-bold uppercase tracking-tighter text-muted-foreground">Active</span>
                    <Switch bind:checked={brandEnabled} onCheckedChange={markChanged} class="data-[state=checked]:bg-primary" />
                  </div>
                </header>

                <div class={cn("space-y-12 transition-all duration-500", !brandEnabled && "opacity-40 grayscale pointer-events-none")}>
                  <section class="grid gap-12 md:grid-cols-2">
                    <div class="space-y-6">
                      <div class="space-y-2">
                        <Label class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Logo Source</Label>
                        <div class="relative">
                          <Camera class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
                          <Input bind:value={brandLogoUrl} oninput={markChanged} class="h-12 rounded-2xl pl-10 border-border bg-background focus-visible:ring-primary/40" placeholder="https://logo.com/my-brand.svg" />
                        </div>
                      </div>
                      
                      <div class="space-y-4">
                        <Label class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Logo Alignment</Label>
                        <div class="flex gap-2 rounded-2xl bg-muted p-1">
                          {#each ["left", "center", "right"] as pos (pos)}
                            <button
                              onclick={() => { brandLogoPosition = pos as any; markChanged(); }}
                              class={cn(
                                "flex-1 rounded-xl py-2 text-xs font-bold uppercase tracking-widest transition-all",
                                brandLogoPosition === pos ? "bg-card text-foreground shadow-sm" : "text-muted-foreground/60 hover:text-foreground"
                              )}
                            >
                              {pos}
                            </button>
                          {/each}
                        </div>
                      </div>
                    </div>

                    <!-- Logo Preview Card -->
                    <div class="flex flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-border bg-muted p-8">
                       {#if brandLogoUrl}
                         <img src={brandLogoUrl} alt="Brand Preview" class="max-h-16 w-auto object-contain transition-all hover:scale-105" />
                       {:else}
                         <div class="flex flex-col items-center gap-2 text-muted-foreground">
                           <Camera size={32} strokeWidth={1} />
                           <span class="text-xs font-bold uppercase tracking-wider">No Logo URL Provided</span>
                         </div>
                       {/if}
                    </div>
                  </section>

                  <section class="space-y-8 border-t border-border/50 pt-8">
                    <div>
                      <h3 class="font-display text-2xl font-bold">AI Agent Voice</h3>
                      <p class="mt-1 text-muted-foreground text-sm">How should the AI interact with your stakeholders?</p>
                    </div>

                    <div class="grid gap-4 sm:grid-cols-3">
                      {#each toneOptions as tone (tone.value)}
                        <button
                          type="button"
                          onclick={() => { agentTone = tone.value as any; markChanged(); }}
                          class={cn(
                            "group flex flex-col items-center gap-3 rounded-[2rem] border-2 p-8 transition-all duration-300",
                            agentTone === tone.value
                              ? "border-primary bg-primary/10 scale-[1.02]"
                              : "border-border bg-muted hover:border-border"
                          )}
                        >
                          <span class="flex h-10 w-10 items-center justify-center rounded-full bg-card text-lg font-black transition-transform duration-300 group-hover:scale-125">{tone.icon}</span>
                          <div class="text-center">
                            <div class="font-black text-lg">{tone.label}</div>
                            <div class="text-muted-foreground/70 text-xs font-medium">{tone.desc}</div>
                          </div>
                        </button>
                      {/each}
                    </div>
                  </section>
                </div>
              </div>

            <!-- DEFAULTS TAB -->
            {:else if activeTab === "defaults"}
              <div class="space-y-12">
                <header>
                  <h2 class="font-display text-3xl font-black tracking-tight">Editor Defaults</h2>
                  <p class="mt-2 text-muted-foreground">
                    Define the starting look and feel for every new document you create.
                  </p>
                </header>

                <div class="grid gap-12 md:grid-cols-2">
                  <div class="space-y-8">
                    <div class="space-y-4">
                      <Label class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Paper Texture</Label>
                      <div class="grid grid-cols-2 gap-2">
                        {#each textureOptions as opt (opt.value)}
                          <button
                            onclick={() => { defaultPaperTexture = opt.value; markChanged(); }}
                            class={cn(
                              "rounded-2xl border-2 py-4 font-bold transition-all",
                              defaultPaperTexture === opt.value
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-muted hover:border-border text-muted-foreground"
                            )}
                          >
                            {opt.label}
                          </button>
                        {/each}
                      </div>
                    </div>

                    <div class="space-y-6">
                      <div class="flex items-center justify-between">
                        <Label class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Texture Intensity</Label>
                        <span class="font-mono text-sm font-bold text-primary">{defaultPaperTextureOpacity}%</span>
                      </div>
                      <Slider
                        value={[defaultPaperTextureOpacity]}
                        onValueChange={(v) => { defaultPaperTextureOpacity = v[0]; markChanged(); }}
                        min={5}
                        max={50}
                        step={5}
                        class="[&_[role=slider]]:bg-primary [&_[role=slider]]:border-border"
                      />
                    </div>
                  </div>

                  <div class="flex flex-col items-start justify-between rounded-[2rem] border border-border bg-muted p-10">
                    <div class="space-y-4">
                      <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-card shadow-sm">
                        <Globe size={24} class="text-primary" />
                      </div>
                      <h3 class="text-xl font-black">Visual Guides</h3>
                      <p class="text-muted-foreground text-sm">Enable margin guides and ruler systems by default to ensure perfectly aligned signatures every time.</p>
                    </div>
                    
                    <div class="mt-8 flex w-full items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-sm">
                      <span class="font-bold">Show Margins</span>
                      <Switch bind:checked={defaultShowMargins} onCheckedChange={markChanged} class="data-[state=checked]:bg-primary" />
                    </div>
                  </div>
                </div>
              </div>

            <!-- CONNECT TAB -->
            {:else if activeTab === "integrations"}
               <div class="flex min-h-[400px] flex-col items-center justify-center p-8 text-center">
                 <div class="relative mb-8">
                   <div class="absolute inset-0 animate-ping rounded-full bg-primary/20"></div>
                   <div class="relative flex h-24 w-24 items-center justify-center rounded-[2.5rem] bg-primary text-primary-foreground">
                     <Link2 size={40} />
                   </div>
                 </div>
                 <h2 class="font-display text-4xl font-black">Integrations Hub</h2>
                 <p class="mx-auto mt-4 max-w-md text-muted-foreground">
                   Connect HubSpot, Salesforce, and Microsoft Dynamics to automatically sync your signed documents back to your CRM.
                 </p>
                 <Button variant="outline" class="mt-10 h-12 rounded-2xl border-2 px-8 font-bold text-muted-foreground/60">
                   Register Interest for API
                 </Button>
               </div>

            <!-- BILLING TAB -->
            {:else if activeTab === "billing"}
              <div class="space-y-12">
                <header>
                  <h2 class="font-display text-3xl font-black tracking-tight">Plan & Billing</h2>
                  <p class="mt-2 text-muted-foreground">
                    Manage your subscription, view usage, and download invoices.
                  </p>
                </header>

                <div class="rounded-[2.5rem] border-2 border-border p-10 transition-all hover:border-primary/50">
                   <div class="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
                     <div class="space-y-3">
                        <div class="inline-flex rounded-full bg-primary px-4 py-1 text-[10px] font-black uppercase tracking-widest text-primary-foreground">
                          {userQuery.data?.subscriptionTier ?? "Free"} Member
                        </div>
                        <h3 class="text-4xl font-black">{userQuery.data?.subscriptionTier === 'free' ? 'Starter' : 'Enterprise'} Flow</h3>
                        <p class="text-muted-foreground font-medium">Next billing date: <span class="text-foreground">Feb 15, 2026</span></p>
                     </div>
                     <Button class="h-14 rounded-3xl bg-primary px-10 text-lg font-black text-primary-foreground hover:bg-primary/90">
                        Manage Subscription
                     </Button>
                   </div>
                   
                   <div class="mt-12 grid gap-4 md:grid-cols-3">
                      <div class="rounded-3xl border border-border bg-muted p-6">
                        <div class="text-muted-foreground text-xs font-bold uppercase tracking-widest">Envelopes</div>
                        <div class="mt-2 text-3xl font-black">12/50</div>
                      </div>
                      <div class="rounded-3xl border border-border bg-muted p-6">
                        <div class="text-muted-foreground text-xs font-bold uppercase tracking-widest">AI Credits</div>
                        <div class="mt-2 text-3xl font-black">Infinity</div>
                      </div>
                      <div class="rounded-3xl border border-border bg-muted p-6">
                        <div class="text-muted-foreground text-xs font-bold uppercase tracking-widest">Team Seats</div>
                        <div class="mt-2 text-3xl font-black">1/10</div>
                      </div>
                   </div>
                </div>
              </div>
            {/if}
          </div>
        {/key}
      </div>
    </main>
  </div>
</div>

<style>
  :global(.dark) main {
    background-image: radial-gradient(circle at 100% 100%, color-mix(in srgb, var(--brand-accent) 3%, transparent) 0%, transparent 100%);
  }

  /* Slider customization uses semantic tokens */
  :global(.SliderRoot [role=slider]) {
    border: 3px solid var(--border) !important;
    background-color: var(--primary) !important;
  }
  :global(.dark .SliderRoot [role=slider]) {
     border-color: var(--border) !important;
  }
</style>


