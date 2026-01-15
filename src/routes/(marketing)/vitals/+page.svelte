<script lang="ts">
  import InvasiveSeo from "$lib/components/seo/InvasiveSeo.svelte";
  import { Check, X, ArrowRight } from "lucide-svelte";
  import { cn } from "$lib/utils";

  /* Updated from ROADMAP.md */
  const ROADMAP = [
    {
      quarter: "Q1 2026",
      title: "Smart Data Capture",
      description: "Radio & Checkbox Blocks that validate input before signing.",
      kill: "Typeform (Disconnected Data)",
      status: "Shipping"
    },
    {
      quarter: "Q2 2026",
      title: "Native Payments",
      description: "Stripe Integration inside the doc. Sign & Pay in one flow.",
      kill: "DocuSign Payments (Clunky)",
      status: "In Development"
    },
    {
      quarter: "Q2 2026",
      title: "Public Link Sharing",
      description: "Zero-friction viewing. /view/[slug] for instant access.",
      kill: "Dropbox Sign (Login Walls)",
      status: "Planned"
    },
    {
      quarter: "Q3 2026",
      title: "Living Contracts",
      description: "Dual-View Architecture. Editor for you, Form for them.",
      kill: "Ironclad (Legacy UI)",
      status: "Researching"
    },
    {
      quarter: "Q4 2026",
      title: "API Data Binding",
      description: "Connect blocks to live API endpoints for dynamic fields.",
      kill: "Salesforce (Data Silos)",
      status: "Horizon"
    }
  ];

  const COMPARISON = [
    { name: "HyprDoc", type: "Native Svelte 5", event: "Native Proxy", custom: "100%", headless: "Full", highlight: true },
    { name: "Anvil", type: "GraphQL / React", event: "Webhooks", custom: "High", headless: "Partial", highlight: false },
    { name: "DocuSign", type: "JS Lib (Ink)", event: "Poll / PostMessage", custom: "Low (iFrame)", headless: "No", highlight: false },
    { name: "PandaDoc", type: "JS Lib", event: "Webhooks", custom: "Low", headless: "No", highlight: false },
  ];
</script>

<InvasiveSeo 
  title="HyprDoc Vitals | The Strategy" 
  description="Our roadmap to disrupt the e-signature market. Sub-100ms sync, Logic Blocks, and Fair Pricing."
/>

<div class="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20">
  
  <!-- Header -->
  <header class="container max-w-5xl mx-auto px-6 pt-32 pb-24 text-center">
    <div class="inline-block px-4 py-1.5 rounded-full bg-secondary/50 text-secondary-foreground text-xs font-bold mb-8">
      STRATEGIC MANIFESTO
    </div>
    <h1 class="font-display font-black text-6xl md:text-8xl tracking-tight mb-8">
      We are <span class="text-primary">built different.</span>
    </h1>
    <p class="text-xl md:text-2xl text-muted-foreground font-medium max-w-2xl mx-auto leading-relaxed">
      Most e-signature tools are just wrappers around a PDF. <br/>
      We are a programmable logic engine that happens to output contracts.
    </p>
  </header>

  <!-- 1. The 10 Kill-Features (Roadmap) -->
  <section class="container max-w-6xl mx-auto px-6 py-24 border-t border-border">
    <h2 class="font-display font-black text-4xl mb-16">The Kill-Features</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
      {#each ROADMAP as item}
        <div class="group relative overflow-hidden rounded-[2rem] bg-card p-10 border border-transparent hover:border-primary/20 transition-all hover:shadow-lg">
          <div class="absolute top-0 right-0 p-6 opacity-50 font-mono text-sm font-bold tracking-widest uppercase">
            {item.quarter}
          </div>
          <div class="mb-4 inline-flex items-center gap-2 px-3 py-1 rounded-md bg-primary/10 text-primary-foreground text-xs font-bold bg-primary">
            {item.status}
          </div>
          <h3 class="font-display font-bold text-3xl mb-3">{item.title}</h3>
          <p class="text-lg font-medium text-foreground/80 mb-6">{item.description}</p>
          <div class="pt-6 border-t border-border/50">
            <p class="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Competitor Checkmate</p>
            <p class="font-mono text-sm font-bold text-red-500/80">{item.kill}</p>
          </div>
        </div>
      {/each}
    </div>
  </section>

  <!-- 2. The Pricing Siege -->
  <section class="bg-slate-50 dark:bg-zinc-900 py-24">
    <div class="container max-w-6xl mx-auto px-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
        <div>
          <h2 class="font-display font-black text-4xl md:text-5xl mb-6">The Pricing Siege</h2>
          <p class="text-xl font-medium text-muted-foreground leading-relaxed mb-8">
            The industry is rigged with "Envelope Taxes" and "Seat Minimums". We're breaking the wall.
          </p>
          
          <div class="space-y-6">
            <div class="flex gap-4">
              <div class="h-10 w-1 rounded-full bg-primary shrink-0"></div>
              <div>
                <h4 class="font-bold text-xl mb-1">No Per-Signature Fees</h4>
                <p class="text-muted-foreground font-medium">Competitors charge $4/doc. We charge for logic complexity only. Simple docs are free.</p>
              </div>
            </div>
            <div class="flex gap-4">
              <div class="h-10 w-1 rounded-full bg-primary shrink-0"></div>
              <div>
                <h4 class="font-bold text-xl mb-1">$0 Start (PLG)</h4>
                <p class="text-muted-foreground font-medium">No $10k implementation fees. Start for free. Scale when you win.</p>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Visual Comparison Card -->
        <div class="rounded-[2.5rem] bg-background p-8 md:p-12 shadow-2xl border border-border relative overflow-hidden">
          <div class="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl"></div>
          
          <div class="space-y-6 relative z-10">
            <div class="flex justify-between items-center pb-4 border-b border-border">
              <span class="font-bold text-muted-foreground">Them (DocuSign, etc.)</span>
              <span class="font-mono text-red-500 font-bold">$4.00 / env</span>
            </div>
            <div class="flex justify-between items-center pb-4 border-b border-border">
              <span class="font-bold text-muted-foreground">Implementation</span>
              <span class="font-mono text-red-500 font-bold">$10,000+</span>
            </div>
            <div class="flex justify-between items-center pt-2">
              <span class="font-display font-black text-2xl">HyprDoc</span>
              <span class="font-display font-black text-3xl text-primary">$0</span>
            </div>
            <p class="text-xs text-center text-muted-foreground font-medium mt-4">
              *Monetized via Logic Blocks & API Volume
            </p>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- 3. Technical SDK Comparison -->
  <section class="container max-w-6xl mx-auto px-6 py-24">
    <h2 class="font-display font-black text-4xl mb-12 text-center">Technical Superiority</h2>
    
    <div class="overflow-x-auto rounded-[2rem] border border-border shadow-sm">
      <table class="w-full text-left border-collapse">
        <thead class="bg-muted/50">
          <tr>
            <th class="p-6 font-bold text-sm text-muted-foreground uppercase tracking-wider">Solution</th>
            <th class="p-6 font-bold text-sm text-muted-foreground uppercase tracking-wider">SDK Type</th>
            <th class="p-6 font-bold text-sm text-muted-foreground uppercase tracking-wider">Event Handling</th>
            <th class="p-6 font-bold text-sm text-muted-foreground uppercase tracking-wider">Healess?</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          {#each COMPARISON as row}
            <tr class={cn("transition-colors", row.highlight ? "bg-primary/5 hover:bg-primary/10" : "bg-background hover:bg-muted/20")}>
              <td class="p-6 font-bold text-lg">
                {row.name}
                {#if row.highlight}
                  <span class="ml-2 inline-block h-2 w-2 rounded-full bg-primary animate-pulse"></span>
                {/if}
              </td>
              <td class="p-6 font-mono text-sm font-medium">{row.type}</td>
              <td class="p-6 font-medium">{row.event}</td>
              <td class="p-6">
                {#if row.headless === 'Full'}
                  <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs font-bold">
                    <Check size={12} strokeWidth={3} /> FULL
                  </div>
                {:else if row.headless === 'Partial'}
                  <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs font-bold">
                    PARTIAL
                  </div>
                {:else}
                  <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 text-xs font-bold">
                    <X size={12} strokeWidth={3} /> NO
                  </div>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </section>

  <section class="container max-w-4xl mx-auto px-6 py-24 text-center">
    <h2 class="font-display font-black text-5xl mb-8">Ready to disrupt?</h2>
    <a
      href="/signup"
      class="inline-block rounded-full bg-primary px-12 py-6 font-bold text-xl text-primary-foreground transition-all hover:scale-105 active:scale-95 shadow-md"
    >
      Start Building for Free
    </a>
  </section>

</div>
