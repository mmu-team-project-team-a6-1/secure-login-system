<script lang="ts">
	import "./layout.css";
	import { onMount } from "svelte";
	import { page } from "$app/stores";
	import favicon from "$lib/assets/favicon.svg";
	import { theme } from "$lib/stores/theme.js";
	import { Button } from "$lib/components/ui/button/index.js";
	import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";

	let { children } = $props();
	let disclaimerOpen = $state(false);
	let disclaimerDismissed = $state(false);

	onMount(() => {
		theme.set("light");
		if (!sessionStorage.getItem("disclaimer_ok")) {
			disclaimerOpen = true;
		} else {
			disclaimerDismissed = true;
		}
	});

	function dismissDisclaimer() {
		disclaimerOpen = false;
		disclaimerDismissed = true;
		sessionStorage.setItem("disclaimer_ok", "1");
	}
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<!-- Global SVG filter for liquid glass effect (feTurbulence + feDisplacementMap) -->
<svg aria-hidden="true" width="0" height="0" style="position: absolute;">
	<defs>
		<filter id="liquid-glass" color-interpolation-filters="sRGB">
			<feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" result="noise" />
			<feDisplacementMap in="SourceGraphic" in2="noise" scale="8" xChannelSelector="R" yChannelSelector="G" />
		</filter>
	</defs>
</svg>

{#if !disclaimerDismissed}
	<AlertDialog.Root bind:open={disclaimerOpen}>
		<AlertDialog.Content>
			<AlertDialog.Header>
				<AlertDialog.Title>Legal disclaimer</AlertDialog.Title>
				<AlertDialog.Description>
					You must be a member of the development team to use this system. By continuing, you confirm that you are authorised to access this application.
				</AlertDialog.Description>
			</AlertDialog.Header>
			<AlertDialog.Footer>
				<Button
					onclick={dismissDisclaimer}
					class="min-w-[theme(spacing.20)]"
				>
					I understand
				</Button>
			</AlertDialog.Footer>
		</AlertDialog.Content>
	</AlertDialog.Root>
{/if}

<div class="relative min-h-screen">
	{@render children()}
</div>
