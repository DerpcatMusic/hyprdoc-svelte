<script lang="ts">
  import { fade, fly } from "svelte/transition";
  import { ArrowRight, ArrowLeft, Camera, Building2, User, Check, Sparkles, Briefcase, Users, Laptop } from "lucide-svelte";
  import { invalidateAll, goto } from "$app/navigation"; // Added invalidateAll and goto
  import { useConvexMutation, useGenerateUploadUrl, uploadFile } from "$lib/convex/hooks";
  import { api } from "@/convex/_generated/api";
  import { HYPR_BRAND_ACCENT } from "$lib/styles/ui-palette";
  import { cn } from "$lib/utils";

  let { user, onComplete } = $props<{ user: any, onComplete: () => void }>();

  let step = $state(1);
  let isLoading = $state(false);

  const initialNameParts = $derived.by(() => (user?.name ? user.name.split(" ") : []));

  // Form State
  let firstName = $state("");
  let lastName = $state("");
  let companyName = $state("");
  let role = $state("");
  let currentERP = $state("");
  let employeeCount = $state("Just me");
  let brandLogoUrl = $state("");
  let brandLogoColor = $state(HYPR_BRAND_ACCENT);
  let agentTone = $state<'casual' | 'professional' | 'friendly'>("casual");

  $effect(() => {
    if ((firstName || lastName) || initialNameParts.length === 0) return;
    firstName = initialNameParts[0] || "";
    lastName = initialNameParts[1] || "";
  });

  const completeMutation = useConvexMutation(api.users.mutations.completeOnboarding);
  const generateUploadUrl = useGenerateUploadUrl();

  async function handleFileUpload(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    isLoading = true;
    try {
      const storageId = await uploadFile(file, () => generateUploadUrl.mutate({}));
      // Construct the URL (Assuming /api/storage/[storageId] pattern based on mutations.ts)
      brandLogoUrl = `/api/storage/${storageId}`;
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      isLoading = false;
    }
  }

  async function handleSubmit() {
    isLoading = true;
    try {
      await completeMutation.mutate({
        firstName,
        lastName,
        companyName,
        role,
        currentERP,
        employeeCount,
        brandLogoUrl,
        brandLogoColor,
        agentTone
      });
      onComplete();
    } catch (err) {
      console.error("Submission failed:", err);
    } finally {
      isLoading = false;
    }
  }

  const erps = ["Microsoft Dynamics", "NetSuite", "SAP", "Sage", "FreshBooks", "Other"];
  const employeeSizes = ["Just me", "2-10", "11-50", "51-100", "100+"];
  const tones = [
    { id: 'casual', label: 'Casual', desc: 'Recommended, highest replies' },
    { id: 'professional', label: 'Professional', desc: 'Formal and direct' },
    { id: 'friendly', label: 'Friendly', desc: 'Warm and inviting' }
  ];

  // Derive preview data
  const previewName = $derived(`${firstName} ${lastName}`);
</script>

<div class="flex min-h-screen bg-background">
  <!-- Left Side: Form -->
  <div class="flex w-full flex-col p-8 md:w-1/2 lg:p-16">
    <!-- Header -->
    <div class="mb-12 flex items-center gap-3">
      <div class="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground">
        <Sparkles size={20} strokeWidth={2.5} />
      </div>
      <h1 class="font-display font-black text-2xl tracking-tight text-black dark:text-white">
        Initializing workspace, {firstName}
      </h1>
    </div>

    <!-- Progress Bar -->
    <div class="mb-12 flex items-center gap-2">
      <div class={cn("h-1.5 grow rounded-full transition-all duration-500", step >= 1 ? "bg-primary" : "bg-muted")}></div>
      <div class={cn("h-1.5 grow rounded-full transition-all duration-500", step >= 2 ? "bg-primary" : "bg-muted")}></div>
      <div class={cn("h-1.5 grow rounded-full transition-all duration-500", step >= 3 ? "bg-primary" : "bg-muted")}></div>
    </div>

    <div class="flex grow flex-col justify-center">
      {#if step === 1}
        <div in:fly={{ x: 20, duration: 400 }} out:fade={{ duration: 200 }}>
          <h2 class="mb-2 font-display font-black text-4xl tracking-tight text-black dark:text-white">
            Workspace Configuration
          </h2>
          <p class="mb-8 text-neutral-500 font-medium">Fine-tune your document engine for maximum precision and scale.</p>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label for="firstName" class="text-[10px] font-bold uppercase tracking-widest text-neutral-400">First name</label>
              <input id="firstName" bind:value={firstName} placeholder="Daniel" class="w-full rounded-xl border border-neutral-200 bg-white p-4 font-bold outline-none focus:border-primary dark:border-neutral-800 dark:bg-neutral-900" />
            </div>
            <div class="space-y-1.5">
              <label for="lastName" class="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Last name</label>
              <input id="lastName" bind:value={lastName} placeholder="Elmalah" class="w-full rounded-xl border border-neutral-200 bg-white p-4 font-bold outline-none focus:border-primary dark:border-neutral-800 dark:bg-neutral-900" />
            </div>
          </div>

          <div class="mt-6 grid grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label for="role" class="text-[10px] font-bold uppercase tracking-widest text-neutral-400">What's your role?</label>
              <div class="relative">
                <select id="role" bind:value={role} class="w-full appearance-none rounded-xl border border-neutral-200 bg-white p-4 font-bold outline-none focus:border-primary dark:border-neutral-800 dark:bg-neutral-900">
                  <option value="" disabled selected>Select role</option>
                  <option>Operations</option>
                  <option>Legal</option>
                  <option>Sales</option>
                  <option>Founder</option>
                </select>
                <Briefcase size={16} class="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400" />
              </div>
            </div>
            <div class="space-y-1.5">
              <label for="erp" class="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Primary Data Source (ERP)</label>
              <div class="relative">
                <select id="erp" bind:value={currentERP} class="w-full appearance-none rounded-xl border border-neutral-200 bg-white p-4 font-bold outline-none focus:border-primary dark:border-neutral-800 dark:bg-neutral-900">
                  <option value="" disabled selected>Select system</option>
                  {#each erps as erp (erp)}
                    <option>{erp}</option>
                  {/each}
                </select>
                <Laptop size={16} class="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400" />
              </div>
            </div>
          </div>

          <div class="mt-6 space-y-1.5">
            <p class="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Organization Scale</p>
            <div class="flex gap-2 overflow-x-auto pb-2">
              {#each employeeSizes as size (size)}
                <button 
                  onclick={() => employeeCount = size}
                  class={cn(
                    "whitespace-nowrap rounded-xl border px-6 py-3 font-bold transition-all active:scale-95",
                    employeeCount === size 
                      ? "border-primary bg-primary text-primary-foreground" 
                      : "border-neutral-200 bg-white hover:border-primary dark:border-neutral-800 dark:bg-neutral-900"
                  )}
                >
                  {size}
                </button>
              {/each}
            </div>
          </div>
        </div>
      {:else if step === 2}
        <div in:fly={{ x: 20, duration: 400 }} out:fade={{ duration: 200 }}>
          <h2 class="mb-2 font-display font-black text-4xl tracking-tight text-black dark:text-white">
            Visual Identity
          </h2>
          <p class="mb-8 text-neutral-500 font-medium">Personalize your document output and communication tone.</p>

          <div class="space-y-6">
            <div class="space-y-1.5">
              <label for="companyName" class="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Company name</label>
              <div class="relative">
                <input id="companyName" bind:value={companyName} placeholder="Acme Inc." class="w-full rounded-xl border border-neutral-200 bg-white p-4 pl-12 font-bold outline-none focus:border-primary dark:border-neutral-800 dark:bg-neutral-900" />
                <Building2 size={18} class="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
              </div>
            </div>

            <div class="rounded-2xl border border-dashed border-neutral-200 p-6 dark:border-neutral-800">
              <p class="mb-4 block text-[10px] font-bold uppercase tracking-widest text-neutral-400">Corporate Branding</p>
              
              <div class="flex items-center gap-6">
                <div class="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-800">
                  {#if brandLogoUrl}
                    <img src={brandLogoUrl} alt="Logo" class="h-full w-full object-cover" />
                  {:else}
                    <div class="grid h-full w-full place-items-center text-neutral-400">
                      <Camera size={24} />
                    </div>
                  {/if}
                  <input type="file" accept="image/*,image/svg+xml" onchange={handleFileUpload} class="absolute inset-0 cursor-pointer opacity-0" />
                </div>
                
                <div class="grow space-y-2">
                  <div class="flex items-center gap-3">
                    <span class="text-sm font-bold">Logo</span>
                    {#if isLoading}
                      <span class="text-xs text-neutral-400">Uploading...</span>
                    {/if}
                  </div>
                  <p class="text-xs text-neutral-400">JPG, PNG, or SVG up to 5MB. Square is best.</p>
                </div>

                <div class="relative shrink-0">
                  <label for="brandColor" class="mb-2 block text-center text-[10px] font-bold uppercase tracking-widest text-neutral-400">Color</label>
                  <input id="brandColor" type="color" bind:value={brandLogoColor} class="h-10 w-10 cursor-pointer rounded-lg border-0 bg-transparent" />
                </div>
              </div>
            </div>

            <div class="space-y-1.5">
              <label for="agentTone" class="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Voice Engine Parameters (Tone)</label>
              <div class="relative">
                <select id="agentTone" bind:value={agentTone} class="w-full appearance-none rounded-xl border border-neutral-200 bg-white p-4 font-bold outline-none focus:border-primary dark:border-neutral-800 dark:bg-neutral-900">
                  {#each tones as tone (tone.id)}
                    <option value={tone.id}>{tone.label} ({tone.desc})</option>
                  {/each}
                </select>
                <User size={16} class="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400" />
              </div>
            </div>
          </div>
        </div>
      {:else}
        <div class="text-center" in:fly={{ y: 20, duration: 400 }}>
          <div class="mb-6 flex justify-center">
            <div class="grid h-20 w-20 place-items-center rounded-3xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <Check size={40} strokeWidth={3} />
            </div>
          </div>
          <h2 class="mb-4 font-display font-black text-5xl tracking-tight text-black dark:text-white">
            System Initialized
          </h2>
          <p class="mx-auto max-w-sm text-neutral-500 font-medium">
            Logic parameters applied. Your legal documents are now aligned with your organization's visual and linguistic identity.
          </p>
        </div>
      {/if}
    </div>

    <!-- Actions -->
    <div class="mt-12 flex items-center justify-between border-t border-neutral-100 pt-8 dark:border-neutral-800">
      <button 
        onclick={() => step > 1 ? step-- : history.back()}
        class="flex items-center gap-2 font-bold text-neutral-400 transition-colors hover:text-black dark:hover:text-white"
      >
        <ArrowLeft size={18} />
        Back
      </button>

      {#if step < 3}
        <button 
          onclick={() => step++}
          disabled={step === 1 && (!firstName || !lastName || !role || !currentERP)}
          class="flex items-center gap-2 rounded-full bg-black px-8 py-4 font-black text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-50 dark:bg-white dark:text-black"
        >
          Continue
          <ArrowRight size={18} />
        </button>
      {:else}
        <button 
          onclick={handleSubmit}
          class="flex items-center gap-2 rounded-full bg-primary px-12 py-4 font-black text-primary-foreground transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary/20"
        >
          Enter Workspace
          <ArrowRight size={18} />
        </button>
      {/if}
    </div>
  </div>

  <!-- Right Side: Preview (Agree.com inspired) -->
  <div class="hidden w-1/2 items-center justify-center bg-neutral-50 p-12 md:flex dark:bg-card">
    <div class="relative w-full max-w-md" in:fly={{ x: 40, duration: 600 }}>
      <!-- Card Preview -->
      <div class="relative overflow-hidden rounded-[2rem] bg-white p-12 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.1)] dark:bg-neutral-900">
        <!-- Brand Accent Bar -->
        <div class="absolute inset-x-0 top-0 h-4" style="background-color: {brandLogoColor}"></div>
        
        <div class="mb-12 flex items-center justify-center">
          <div class="h-16 w-16 overflow-hidden rounded-2xl bg-neutral-100 dark:bg-neutral-800">
            {#if brandLogoUrl}
              <img src={brandLogoUrl} alt="Logo" class="h-full w-full object-cover" />
            {:else}
              <div class="grid h-full w-full place-items-center text-neutral-400">
                <Building2 size={24} />
              </div>
            {/if}
          </div>
        </div>

        <h3 class="mb-8 text-center font-display font-black text-2xl tracking-tight">
          {companyName || "Your company"}
        </h3>

        <!-- Skeleton Content -->
        <div class="mb-12 space-y-3">
          <div class="h-3 w-full rounded-full bg-neutral-100 dark:bg-neutral-800"></div>
          <div class="h-3 w-4/5 rounded-full bg-neutral-100 dark:bg-neutral-800"></div>
          <div class="h-3 w-3/4 rounded-full bg-neutral-100 dark:bg-neutral-800"></div>
          <div class="h-3 w-2/3 rounded-full bg-neutral-100 dark:bg-neutral-800"></div>
        </div>

        <!-- Signature -->
        <div class="border-t border-neutral-100 pt-8 dark:border-neutral-800">
          <div class="mb-2 font-display text-4xl italic text-neutral-300 transition-all duration-500" style="color: {brandLogoColor}88">
            {previewName || "Signature"}
          </div>
          <div class="text-xs font-bold text-neutral-400">
            {previewName} • {user?.email}
          </div>
        </div>
      </div>

      <!-- Floating Tooltip Preview -->
      <div 
        class="absolute -right-8 bottom-20 max-w-[240px] rounded-2xl bg-white p-4 shadow-2xl dark:bg-neutral-800"
        transition:fly={{ y: 20, duration: 500, delay: 200 }}
      >
        <div class="mb-2 flex items-center gap-2">
          <div class="h-6 w-6 rounded-lg bg-neutral-100 p-1 dark:bg-neutral-700">
            {#if brandLogoUrl}
               <img src={brandLogoUrl} alt="Logo" class="h-full w-full object-cover rounded-sm" />
            {:else}
               <Building2 size={12} class="text-neutral-400" />
            {/if}
          </div>
          <span class="text-[10px] font-black uppercase tracking-widest text-black dark:text-white">
            {companyName || "Your company"}
          </span>
        </div>
        <p class="text-[11px] font-medium text-neutral-500">
          {companyName || "Your company"} sent you a message
        </p>
        <div class="mt-3 flex gap-2">
          <div class="flex items-center gap-1.5 rounded-lg bg-neutral-50 px-2 py-1 dark:bg-neutral-700">
             <div class="h-3 w-3 rounded-sm bg-red-500/20 text-red-500 text-[8px] flex items-center justify-center font-black">PDF</div>
             <span class="text-[9px] font-bold">Invoice</span>
          </div>
          <div class="flex items-center gap-1.5 rounded-lg bg-neutral-50 px-2 py-1 dark:bg-neutral-700">
             <div class="h-3 w-3 rounded-sm bg-primary/20 text-primary text-[8px] flex items-center justify-center font-black">HT</div>
             <span class="text-[9px] font-bold">Agreement</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  :global(.font-display) {
    font-family: 'Outfit', sans-serif;
  }
  
  select {
    background-image: none;
  }
</style>
