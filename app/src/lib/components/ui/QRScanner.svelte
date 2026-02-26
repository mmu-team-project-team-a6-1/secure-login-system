<script lang="ts">
	import { onMount, onDestroy } from "svelte";
	import { BarcodeDetector } from "barcode-detector";
	import { X, CheckCircle, AlertCircle, Loader2 } from "@lucide/svelte";

	let { onclose }: { onclose: () => void } = $props();

	let status = $state<"scanning" | "verifying" | "success" | "error">("scanning");
	let errorMsg = $state("");
	let visible = $state(false);

	let videoEl: HTMLVideoElement | undefined = $state();
	let stream: MediaStream | null = null;
	let scanLoop: number | undefined;
	let destroyed = false;

	onMount(async () => {
		requestAnimationFrame(() => {
			visible = true;
		});

		try {
			stream = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
				audio: false,
			});
			if (videoEl) {
				videoEl.srcObject = stream;
				await videoEl.play();
				startScanning();
			}
		} catch {
			status = "error";
			errorMsg = "Could not access camera";
		}
	});

	onDestroy(() => {
		destroyed = true;
		stopCamera();
	});

	function stopCamera() {
		if (scanLoop) cancelAnimationFrame(scanLoop);
		scanLoop = undefined;
		stream?.getTracks().forEach((t) => t.stop());
		stream = null;
	}

	function startScanning() {
		const detector = new BarcodeDetector({ formats: ["qr_code"] });

		async function tick() {
			if (destroyed || status !== "scanning" || !videoEl || videoEl.readyState < 2) {
				if (!destroyed && status === "scanning") scanLoop = requestAnimationFrame(tick);
				return;
			}

			try {
				const codes = await detector.detect(videoEl);
				if (codes.length > 0) {
					await onScanSuccess(codes[0].rawValue);
					return;
				}
			} catch {
				/* detection can fail on individual frames */
			}

			scanLoop = requestAnimationFrame(tick);
		}

		scanLoop = requestAnimationFrame(tick);
	}

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

		status = "verifying";

		try {
			const res = await fetch("/api/auth/qr-verify", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ sessionId, token, timestamp }),
			});

			if (res.ok) {
				status = "success";
				stopCamera();
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
		setTimeout(() => {
			if (destroyed) return;
			status = "scanning";
			errorMsg = "";
			startScanning();
		}, 2500);
	}

	function handleClose() {
		visible = false;
		stopCamera();
		setTimeout(onclose, 350);
	}
</script>

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
		<!-- Raw video stream — full control, no library DOM -->
		<video
			bind:this={videoEl}
			class="absolute inset-0 w-full h-full object-cover"
			autoplay
			playsinline
			muted
		></video>

		<!-- Viewfinder overlay with cutout effect -->
		<div class="absolute inset-0 z-10 pointer-events-none">
			<!-- Semi-transparent surround -->
			<div class="absolute inset-0 bg-black/40"></div>
			<!-- Transparent cutout in center -->
			<div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64">
				<div class="w-full h-full rounded-3xl ring-[9999px] ring-black/40 bg-transparent"></div>
				<!-- Corner accents -->
				<div class="absolute inset-0 rounded-3xl border-2 border-white/50"></div>
			</div>
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
