<script lang="ts">
	import { onMount } from "svelte";
	import QRCode from "qrcode";
	import LoginCard from "$lib/components/ui/LoginCard.svelte";
	import QRLoginCard from "$lib/components/ui/QRLoginCard.svelte";

	let qrDataUrl = $state<string | null>(null);

	onMount(() => {
		const loginUrl = "https://example.com/app-login";
		QRCode.toDataURL(loginUrl, { width: 192, margin: 1 }).then((url) => {
			qrDataUrl = url;
		});
	});
</script>

<h1 class="sr-only">Secure Login System</h1>

<div class="min-h-screen flex items-center justify-center bg-[#B784C7] p-4 md:p-6">
	<div class="flex flex-col items-center gap-8 w-full max-w-[420px] lg:hidden">
		<LoginCard />
		<QRLoginCard {qrDataUrl} />
	</div>

	<div class="relative w-full max-w-6xl min-h-[70vh] overflow-x-clip hidden lg:block">
		<div class="absolute inset-0 bg-white rounded-[36px] rotate-[-2deg]" aria-hidden="true"></div>
		<div
			class="relative w-full min-h-[70vh] bg-[#0B0B0D] rounded-[36px] overflow-hidden flex items-center justify-center px-16"
		>
			<div class="flex flex-row items-center gap-16 w-full justify-center">
				<LoginCard />
				<QRLoginCard {qrDataUrl} />
			</div>
		</div>
	</div>
</div>
