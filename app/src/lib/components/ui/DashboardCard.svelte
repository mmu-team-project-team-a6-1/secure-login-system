<script lang="ts">
	import type { Snippet } from "svelte";

	let {
		title,
		children,
	}: {
		title: string;
		children: Snippet;
	} = $props();
</script>

<div class="glass-panel rounded-2xl border border-[var(--glass-border)] p-5">
	<h3 class="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-3">{title}</h3>
	{@render children()}
</div>
