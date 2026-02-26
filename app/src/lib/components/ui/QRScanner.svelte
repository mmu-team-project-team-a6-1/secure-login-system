<script lang="ts">
	import { onMount, onDestroy } from "svelte";
	import { BarcodeDetector } from "barcode-detector";
	import { X, CheckCircle, AlertCircle, Loader2, Monitor, MapPin, Globe, ShieldCheck } from "@lucide/svelte";

	let { onclose }: { onclose: () => void } = $props();

	let status = $state<"scanning" | "verifying" | "approving" | "approving-loading" | "success" | "error">("scanning");
	let errorMsg = $state("");
	let visible = $state(false);

	interface DesktopInfo {
		device: string;
		ip: string;
		location: string | null;
	}
	let desktopInfo = $state<DesktopInfo | null>(null);
	let pendingSessionId = $state<string | null>(null);

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
				const data = await res.json();
				stopCamera();
				pendingSessionId = sessionId;
				desktopInfo = data.desktop;
				status = "approving";
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

	async function approveLogin() {
		if (!pendingSessionId) return;
		status = "approving-loading";

		try {
			const res = await fetch("/api/auth/qr-approve", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ sessionId: pendingSessionId }),
			});

			if (res.ok) {
				status = "success";
				setTimeout(handleClose, 1500);
			} else {
				const data = await res.json();
				status = "error";
				errorMsg = data.error ?? "Approval failed";
			}
		} catch {
			status = "error";
			errorMsg = "Network error";
		}
	}

	function denyLogin() {
		pendingSessionId = null;
		desktopInfo = null;
		handleClose();
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

{#if status === "approving" || status === "approving-loading" || status === "success"}
	<!-- Approval screen (full-screen, replaces camera) -->
	<div
		class="fixed inset-0 z-50 flex flex-col bg-black"
		class:opacity-0={!visible}
		class:opacity-100={visible}
		style="transition: opacity 0.35s cubic-bezier(0.2, 0.9, 0.3, 1);"
	>
		<div class="relative z-10 flex items-center justify-between px-5 pt-[max(env(safe-area-inset-top),1rem)] pb-3">
			<h2 class="text-lg font-semibold text-white">
				{#if status === "success"}
					Login Approved
				{:else}
					Approve Login
				{/if}
			</h2>
			{#if status !== "success"}
				<button
					onclick={denyLogin}
					class="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center active:scale-90 transition-transform duration-150"
					aria-label="Deny and close"
				>
					<X class="size-5 text-white" />
				</button>
			{/if}
		</div>

		<div class="flex-1 flex flex-col items-center justify-center px-8 gap-6">
			{#if status === "success"}
				<div class="flex flex-col items-center gap-3">
					<div class="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
						<CheckCircle class="size-8 text-green-400" />
					</div>
					<p class="text-green-400 text-base font-medium">Login authorized!</p>
				</div>
			{:else}
				<div class="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
					<ShieldCheck class="size-8 text-white" />
				</div>

				<p class="text-white/70 text-sm text-center leading-relaxed">
					A device is requesting to log in to your account. Please verify the details below.
				</p>

				{#if desktopInfo}
					<div class="w-full max-w-xs rounded-2xl bg-white/10 backdrop-blur-sm overflow-hidden">
						<div class="px-5 py-3.5 flex items-center gap-3 border-b border-white/10">
							<Monitor class="size-4.5 text-white/60 flex-shrink-0" />
							<div class="min-w-0">
								<p class="text-xs text-white/40">Device</p>
								<p class="text-sm text-white font-medium truncate">{desktopInfo.device}</p>
							</div>
						</div>
						<div class="px-5 py-3.5 flex items-center gap-3 border-b border-white/10">
							<Globe class="size-4.5 text-white/60 flex-shrink-0" />
							<div class="min-w-0">
								<p class="text-xs text-white/40">IP Address</p>
								<p class="text-sm text-white font-medium truncate">{desktopInfo.ip}</p>
							</div>
						</div>
						{#if desktopInfo.location}
							<div class="px-5 py-3.5 flex items-center gap-3">
								<MapPin class="size-4.5 text-white/60 flex-shrink-0" />
								<div class="min-w-0">
									<p class="text-xs text-white/40">Location</p>
									<p class="text-sm text-white font-medium truncate">{desktopInfo.location}</p>
								</div>
							</div>
						{/if}
					</div>
				{/if}
			{/if}
		</div>

		{#if status !== "success"}
			<div
				class="relative z-10 pb-[max(env(safe-area-inset-bottom),2rem)] pt-4 px-6 flex flex-col gap-3"
			>
				<button
					onclick={approveLogin}
					disabled={status === "approving-loading"}
					class="w-full py-3.5 rounded-2xl bg-white text-black font-semibold text-sm
						   active:scale-[0.98] transition-all duration-150 disabled:opacity-60
						   flex items-center justify-center gap-2"
				>
					{#if status === "approving-loading"}
						<Loader2 class="size-4 animate-spin" />
						Approving...
					{:else}
						Approve Login
					{/if}
				</button>
				<button
					onclick={denyLogin}
					disabled={status === "approving-loading"}
					class="w-full py-3.5 rounded-2xl bg-white/10 text-white font-medium text-sm
						   active:scale-[0.98] transition-all duration-150 disabled:opacity-40"
				>
					Deny
				</button>
			</div>
		{/if}
	</div>
{:else}
	<!-- Camera scanner screen -->
	<div
		class="fixed inset-0 z-50 flex flex-col bg-black"
		class:opacity-0={!visible}
		class:opacity-100={visible}
		style="transition: opacity 0.35s cubic-bezier(0.2, 0.9, 0.3, 1);"
	>
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

		<div class="flex-1 relative flex items-center justify-center overflow-hidden">
			<video
				bind:this={videoEl}
				class="absolute inset-0 w-full h-full object-cover"
				autoplay
				playsinline
				muted
			></video>

			<div class="absolute inset-0 z-10 pointer-events-none">
				<div class="absolute inset-0 bg-black/40"></div>
				<div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64">
					<div class="w-full h-full rounded-3xl ring-[9999px] ring-black/40 bg-transparent"></div>
					<div class="absolute inset-0 rounded-3xl border-2 border-white/50"></div>
				</div>
			</div>
		</div>

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
			{:else if status === "error"}
				<div class="flex items-center gap-2">
					<AlertCircle class="size-5 text-red-400" />
					<p class="text-red-400 text-sm">{errorMsg}</p>
				</div>
			{/if}
		</div>
	</div>
{/if}
