<script lang="ts">
	import * as Card from "$lib/components/ui/card/index.js";

	let { qrDataUrl }: { qrDataUrl: string | null } = $props();
</script>

<Card.Root class="w-full max-w-sm bg-[#E7E7E7] border-[#1C1C1C] rounded-[28px] p-8 shadow-none">
	<Card.Header class="p-0 pb-6">
		<Card.Title class="text-2xl font-semibold tracking-tight text-neutral-900">
			Log in with mobile app
		</Card.Title>
		<Card.Description class="text-sm text-neutral-600">
			Scan the QR code with your mobile app to sign in
		</Card.Description>
	</Card.Header>
	<Card.Content class="p-0 flex items-center justify-center">
		<div
			class="w-48 h-48 rounded-lg border border-neutral-300 bg-white p-3 flex items-center justify-center"
		>
			{#if qrDataUrl}
				<img
					src={qrDataUrl}
					alt="QR code to log in with mobile app"
					class="w-full h-full object-contain"
				/>
			{:else}
				<span class="text-neutral-400 text-sm">Loading QR…</span>
			{/if}
		</div>
	</Card.Content>
</Card.Root>
