<script lang="ts">
	import { onMount, onDestroy } from "svelte";
	import { Html5Qrcode } from "html5-qrcode";
	import { X, CheckCircle, AlertCircle, Loader2 } from "@lucide/svelte";

	let { onclose }: { onclose: () => void } = $props();

	let status = $state<"scanning" | "verifying" | "success" | "error">("scanning");
	let errorMsg = $state("");
	let visible = $state(false);
	let scanner: Html5Qrcode | null = null;
	const scannerId = "qr-scanner-region";

	onMount(async () => {
		requestAnimationFrame(() => {
			visible = true;
		});

		try {
			scanner = new Html5Qrcode(scannerId);
			await scanner.start(
				{ facingMode: "environment" },
				{ fps: 10, qrbox: { width: 250, height: 250 } },
				onScanSuccess,
				() => {},
			);
		} catch {
			status = "error";
			errorMsg = "Could not access camera";
		}
	});

	onDestroy(() => {
		if (scanner?.isScanning) {
			scanner.stop().catch(() => {});
		}
	});

	async function onScanSuccess(decoded: string) {
		if (status !== "scanning") return;

		const parts = decoded.split(":");
		if (parts.length !== 4 || parts[0] !== "sls") {
			status = "error";
			errorMsg = "Not a valid login QR code";
			resetAfterDelay();
			return;
		}

		const [, sessionId, token, tsStr] = parts;
		const timestamp = parseInt(tsStr, 10);

		if (scanner?.isScanning) {
			await scanner.stop().catch(() => {});
		}

		status = "verifying";

		try {
			const res = await fetch("/api/auth/qr-verify", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ sessionId, token, timestamp }),
			});

			if (res.ok) {
				status = "success";
				setTimeout(handleClose, 1500);
			} else {
				const data = await res.json();
				status = "error";
				errorMsg = data.error ?? "Verification failed";
				resetAfterDelay();
			}
		} catch {
			status = "error";
			errorMsg = "Network error";
			resetAfterDelay();
		}
	}

	function resetAfterDelay() {
		setTimeout(async () => {
			status = "scanning";
			errorMsg = "";
			try {
				if (scanner && !scanner.isScanning) {
					await scanner.start(
						{ facingMode: "environment" },
						{ fps: 10, qrbox: { width: 250, height: 250 } },
						onScanSuccess,
						() => {},
					);
				}
			} catch {
				/* camera may be unavailable */
			}
		}, 2500);
	}

	function handleClose() {
		visible = false;
		setTimeout(onclose, 350);
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
	class="fixed inset-0 z-50 flex flex-col bg-black"
	class:opacity-0={!visible}
	class:opacity-100={visible}
	style="transition: opacity 0.35s cubic-bezier(0.2, 0.9, 0.3, 1);"
>
	<!-- Top bar -->
	<div class="relative z-10 flex items-center justify-between px-5 pt-[max(env(safe-area-inset-top),1rem)] pb-3">
		<h2 class="text-lg font-semibold text-white">Scan QR Code</h2>
		<button
			onclick={handleClose}
			class="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center active:scale-90 transition-transform duration-150"
			aria-label="Close scanner"
		>
			<X class="size-5 text-white" />
		</button>
	</div>

	<!-- Camera viewfinder -->
	<div class="flex-1 relative flex items-center justify-center overflow-hidden">
		<div id={scannerId} class="w-full h-full absolute inset-0"></div>

		<!-- Viewfinder overlay -->
		<div class="relative z-10 pointer-events-none">
			<div class="w-64 h-64 rounded-3xl border-2 border-white/40"></div>
		</div>
	</div>

	<!-- Bottom status area -->
	<div
		class="relative z-10 pb-[max(env(safe-area-inset-bottom),2rem)] pt-6 px-6 flex flex-col items-center gap-3"
		class:translate-y-0={visible}
		class:translate-y-full={!visible}
		style="transition: transform 0.4s cubic-bezier(0.2, 0.9, 0.3, 1);"
	>
		{#if status === "scanning"}
			<p class="text-white/70 text-sm text-center">Point your camera at the login QR code</p>
		{:else if status === "verifying"}
			<div class="flex items-center gap-2">
				<Loader2 class="size-5 text-white animate-spin" />
				<p class="text-white text-sm">Verifying...</p>
			</div>
		{:else if status === "success"}
			<div class="flex items-center gap-2">
				<CheckCircle class="size-5 text-green-400" />
				<p class="text-green-400 text-sm font-medium">Login authorized!</p>
			</div>
		{:else if status === "error"}
			<div class="flex items-center gap-2">
				<AlertCircle class="size-5 text-red-400" />
				<p class="text-red-400 text-sm">{errorMsg}</p>
			</div>
		{/if}
	</div>
</div>

<style>
	:global(#qr-scanner-region video) {
		object-fit: cover !important;
		width: 100% !important;
		height: 100% !important;
	}
	:global(#qr-scanner-region) {
		border: none !important;
	}
	:global(#qr-scanner-region img[alt="Info icon"]) {
		display: none !important;
	}
	:global(#qr-shaded-region) {
		display: none !important;
	}
</style>
