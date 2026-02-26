<script lang="ts">
	import "./layout.css";
	import { onMount } from "svelte";
	import favicon from "$lib/assets/favicon.svg";
	import { theme } from "$lib/stores/theme.js";
	import { Button } from "$lib/components/ui/button/index.js";
	import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
	import { Moon, Sun } from "@lucide/svelte";

	let { children } = $props();
	let disclaimerOpen = $state(false);

	// Sync store with DOM on client (inline script already set class; this keeps store in sync)
	onMount(() => {
		theme.set("light");
		disclaimerOpen = true;
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

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
				onclick={() => (disclaimerOpen = false)}
				class="min-w-[theme(spacing.20)]"
			>
				I understand
			</Button>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>

<div class="relative min-h-screen">
	{@render children()}
</div>
