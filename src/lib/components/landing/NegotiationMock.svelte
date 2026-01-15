<script lang="ts">
  import { onMount } from "svelte";

  let messages = $state([
    {
      id: 1,
      user: "Sarah Counsel",
      color: "bg-purple-500",
      text: "Can we cap this liability at 2x?",
      time: "2m ago",
    }
  ]);

  onMount(() => {
    const timer = setTimeout(() => {
      messages = [
        ...messages,
        {
          id: 2,
          user: "Mike Legal",
          color: "bg-blue-500",
          text: "Standard is 1x, let me check with risk team.",
          time: "Just now",
        }
      ];
    }, 2000);
    return () => clearTimeout(timer);
  });
</script>

<div class="flex w-72 flex-col gap-3 text-left">
  {#each messages as comment (comment.id)}
    <div
      class="flex gap-3 rounded-lg border border-border/60 bg-card p-3 shadow-sm backdrop-blur-sm animate-in fade-in slide-in-from-bottom-2"
    >
      <div
        class={`flex h-8 w-8 items-center justify-center rounded-full font-bold text-white text-xs ${comment.color}`}
      >
        {comment.user.charAt(0)}
      </div>
      <div class="flex-1 space-y-1">
        <div class="flex items-center justify-between">
          <span class="font-bold text-foreground text-xs">{comment.user}</span>
          <span class="text-[10px] text-muted-foreground">{comment.time}</span>
        </div>
        <p class="text-muted-foreground text-xs">{comment.text}</p>
      </div>
    </div>
  {/each}
</div>
