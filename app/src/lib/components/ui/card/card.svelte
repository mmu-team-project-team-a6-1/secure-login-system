<script lang="ts">
	import type { HTMLAttributes } from "svelte/elements";
	import { cn, type WithElementRef } from "$lib/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();
</script>

<div
	bind:this={ref}
	data-slot="card"
	class={cn(
		"bg-[var(--glass-bg)] backdrop-blur-xl text-card-foreground flex flex-col gap-6 rounded-2xl border border-[var(--glass-border)] py-6 shadow-[var(--glass-shadow)]",
		className
	)}
	{...restProps}
>
	{@render children?.()}
</div>
