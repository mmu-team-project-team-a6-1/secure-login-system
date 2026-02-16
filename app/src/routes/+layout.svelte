<script lang="ts">
	import "./layout.css";
	import { onMount } from "svelte";
	import favicon from "$lib/assets/favicon.svg";
	import { theme } from "$lib/stores/theme.js";
	import { Button } from "$lib/components/ui/button/index.js";
	import { Moon, Sun } from "@lucide/svelte";

	let { children } = $props();

	// Sync store with DOM on client (inline script already set class; this keeps store in sync)
	onMount(() => {
		const isDark = document.documentElement.classList.contains("dark");
		theme.set(isDark ? "dark" : "light");
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<div class="relative min-h-screen">
	<Button
		variant="ghost"
		size="icon"
		class="absolute top-4 right-4 z-10 rounded-full"
		onclick={() => theme.toggle()}
		aria-label={$theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
	>
		{#if $theme === "dark"}
			<Sun class="size-5" />
		{:else}
			<Moon class="size-5" />
		{/if}
	</Button>
	{@render children()}
</div>
