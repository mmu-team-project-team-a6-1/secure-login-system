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

<div class="bg-white rounded-[20px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
	<h3 class="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-3">{title}</h3>
	{@render children()}
</div>
