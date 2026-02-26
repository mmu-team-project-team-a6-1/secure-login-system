<script lang="ts">
	import { Tabs as TabsPrimitive } from "bits-ui";
	import { cn } from "$lib/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: TabsPrimitive.ListProps = $props();
</script>

<TabsPrimitive.List
	bind:ref
	data-slot="tabs-list"
	class={cn(
		"bg-[var(--glass-bg)]/60 backdrop-blur-sm text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg border border-[var(--glass-border)] p-[3px]",
		className
	)}
	{...restProps}
/>
