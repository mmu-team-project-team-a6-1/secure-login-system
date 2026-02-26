<script lang="ts">
	import { onMount, onDestroy } from "svelte";
	import { BarcodeDetector } from "barcode-detector";
	import { X, AlertCircle, AlertTriangle, Loader2, Monitor, MapPin, Globe, ShieldCheck, ChevronRight } from "@lucide/svelte";

	let { onclose }: { onclose: () => void } = $props();

	let status = $state<"scanning" | "verifying" | "verified" | "approving" | "approving-loading" | "success" | "error">("scanning");
	let errorMsg = $state("");
	let visible = $state(false);
	let closing = $state(false);
	let successCloseTimer: ReturnType<typeof setTimeout> | undefined;
	let successSlideTimer: ReturnType<typeof setTimeout> | undefined;

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
	let qrInFrame = $state(false);
	const SCAN_DELAY_MS = 700;
	let verifiedTimer: ReturnType<typeof setTimeout> | undefined;

	let countdown = $state(3);
	let approvalReady = $derived(countdown <= 0);
	let sliderX = $state(0);
	let isDragging = $state(false);
	let trackEl: HTMLDivElement | undefined = $state();
	const THUMB_SIZE = 48;
	const THUMB_PAD = 4;

	$effect(() => {
		if (status === "approving") {
			countdown = 3;
			sliderX = 0;
			const timer = setInterval(() => {
				countdown--;
				if (countdown <= 0) clearInterval(timer);
			}, 1000);
			return () => clearInterval(timer);
		}
	});

	function getMaxTravel() {
		if (!trackEl) return 200;
		return trackEl.clientWidth - THUMB_SIZE - THUMB_PAD * 2;
	}

	function onSliderPointerDown(e: PointerEvent) {
		if (!approvalReady || status !== "approving") return;
		isDragging = true;
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	}

	function onSliderPointerMove(e: PointerEvent) {
		if (!isDragging) return;
		const max = getMaxTravel();
		const rect = trackEl!.getBoundingClientRect();
		const x = e.clientX - rect.left - THUMB_PAD - THUMB_SIZE / 2;
		sliderX = Math.max(0, Math.min(x, max));
	}

	function onSliderPointerUp() {
		if (!isDragging) return;
		isDragging = false;
		const max = getMaxTravel();
		if (max > 0 && sliderX / max >= 0.8) {
			sliderX = max;
			approveLogin();
		} else {
			sliderX = 0;
		}
	}

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
		if (verifiedTimer) clearTimeout(verifiedTimer);
		verifiedTimer = undefined;
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
		let lastDecoded: string | null = null;
		let delayStart = 0;

		async function tick() {
			if (destroyed || status !== "scanning" || !videoEl || videoEl.readyState < 2) {
				if (!destroyed && status === "scanning") scanLoop = requestAnimationFrame(tick);
				return;
			}

			try {
				const codes = await detector.detect(videoEl);
				qrInFrame = codes.length > 0;
				if (codes.length > 0) {
					const decoded = codes[0].rawValue;
					if (decoded !== lastDecoded) {
						lastDecoded = decoded;
						delayStart = Date.now();
					}
					if (Date.now() - delayStart >= SCAN_DELAY_MS) {
						lastDecoded = null;
						await onScanSuccess(decoded);
						return;
					}
				} else {
					lastDecoded = null;
				}
			} catch {
				qrInFrame = false;
				lastDecoded = null;
			}

			scanLoop = requestAnimationFrame(tick);
		}

		scanLoop = requestAnimationFrame(tick);
	}

	async function onScanSuccess(decoded: string) {
		if (status !== "scanning") return;

		const scheme = "teama61qrlogin://";
		if (!decoded.startsWith(scheme)) {
			status = "error";
			errorMsg = "Not a valid login QR code";
			resetAfterDelay();
			return;
		}
		const jwt = decoded.slice(scheme.length).trim();
		if (!jwt) {
			status = "error";
			errorMsg = "Not a valid login QR code";
			resetAfterDelay();
			return;
		}

		status = "verifying";

		try {
			const res = await fetch("/api/auth/qr-verify", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ jwt }),
			});

			if (res.ok) {
				const data = await res.json();
				pendingSessionId = data.sessionId ?? null;
				desktopInfo = data.desktop;
				status = "verified";
				stopCamera();
				verifiedTimer = setTimeout(() => {
					verifiedTimer = undefined;
					if (destroyed) return;
					status = "approving";
				}, 1000);
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
				closing = false;
				successCloseTimer = setTimeout(() => {
					closing = true;
					successSlideTimer = setTimeout(handleClose, 400);
				}, 1400);
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

	async function denyLogin() {
		if (pendingSessionId) {
			try {
				await fetch("/api/auth/qr-deny", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ sessionId: pendingSessionId }),
				});
			} catch { /* best-effort */ }
		}
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
		if (successCloseTimer) clearTimeout(successCloseTimer);
		if (successSlideTimer) clearTimeout(successSlideTimer);
		successCloseTimer = undefined;
		successSlideTimer = undefined;
		closing = false;
		visible = false;
		stopCamera();
		setTimeout(onclose, 350);
	}
</script>

<style>
	.scanner-outside-blur {
		-webkit-backdrop-filter: blur(20px);
		backdrop-filter: blur(20px);
		background: rgba(0, 0, 0, 0.25);
	}
	.scan-box-border {
		border-width: 2px;
		border-style: solid;
		border-color: rgba(255, 255, 255, 0.4);
		box-shadow: 0 0 0 0 transparent;
		transition: border-color 0.2s, box-shadow 0.2s;
	}
	.scan-box-glow {
		border-color: rgba(255, 255, 255, 0.9);
		box-shadow: 0 0 20px rgba(255, 255, 255, 0.4), 0 0 40px rgba(100, 200, 255, 0.2);
	}
	.scan-box-success {
		border-color: rgb(34, 197, 94);
		box-shadow: 0 0 16px rgba(34, 197, 94, 0.5);
	}
	.scan-box-error {
		border-color: rgb(239, 68, 68);
		box-shadow: 0 0 16px rgba(239, 68, 68, 0.4);
	}
	.approval-sheet {
		transition: transform 0.35s cubic-bezier(0.2, 0.9, 0.3, 1);
	}
	.approval-sheet-closing {
		transform: translateY(100vh);
	}
	@media (prefers-reduced-motion: reduce) {
		.approval-sheet-closing {
			transition-duration: 0.2s;
		}
	}
</style>

{#if status === "approving" || status === "approving-loading" || status === "success"}
	<!-- Approval screen (full-screen, replaces camera) -->
	<div
		class="fixed inset-0 z-50 flex flex-col bg-black approval-sheet"
		class:opacity-0={!visible}
		class:opacity-100={visible}
		class:approval-sheet-closing={closing}
		style="transition: opacity 0.35s cubic-bezier(0.2, 0.9, 0.3, 1);"
	>
		{#if status === "success"}
			<!-- Ambient green glow (Kaspersky / security theme) -->
			<div
				class="absolute inset-0 z-0 opacity-80"
				style="background: radial-gradient(ellipse 80% 70% at 50% 45%, rgba(0, 168, 142, 0.35) 0%, rgba(111, 207, 151, 0.2) 40%, transparent 70%);"
				aria-hidden="true"
			></div>
		{/if}
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
					class="w-10 h-10 rounded-full bg-white/10 backdrop-blur-xl border border-white/15 flex items-center justify-center active:scale-90 transition-transform duration-150"
					style="-webkit-backdrop-filter: blur(24px);"
					aria-label="Deny and close"
				>
					<X class="size-5 text-white" />
				</button>
			{/if}
		</div>

		<div class="flex-1 flex flex-col items-center justify-center px-8 gap-6">
			{#if status === "success"}
				<div class="flex flex-col items-center gap-3">
					<div class="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
						<svg class="success-checkmark w-10 h-10 text-green-400" viewBox="0 0 52 52" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
							<path d="M14 27 l8 8 16 -20" />
						</svg>
					</div>
					<p class="text-green-400 text-base font-medium">Login authorized!</p>
				</div>
			{:else}
				<div class="w-16 h-16 rounded-full bg-white/10 backdrop-blur-xl border border-white/15 flex items-center justify-center" style="-webkit-backdrop-filter: blur(24px);">
					<ShieldCheck class="size-8 text-white" />
				</div>

				<p class="text-white/70 text-sm text-center leading-relaxed">
					A device is requesting to log in to your account. Please verify the details below.
				</p>

				{#if desktopInfo}
					<div class="w-full max-w-xs rounded-2xl bg-white/10 backdrop-blur-xl border border-white/15 overflow-hidden" style="-webkit-backdrop-filter: blur(24px);">
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

			<div class="w-full max-w-xs rounded-xl bg-amber-500/15 backdrop-blur-md border border-amber-500/30 px-4 py-3 flex gap-3" style="-webkit-backdrop-filter: blur(12px);">
				<AlertTriangle class="size-5 text-amber-400 flex-shrink-0 mt-0.5" />
				<p class="text-xs text-amber-200/90 leading-relaxed">
					Only approve if you are logging in on a device directly in front of you.
					<span class="font-semibold text-amber-300">Never scan a QR code someone sent you.</span>
				</p>
			</div>
		{/if}
	</div>

		{#if status !== "success"}
			<div
				class="relative z-10 pb-[max(env(safe-area-inset-bottom),2rem)] pt-4 px-6 flex flex-col gap-3"
			>
			{#if status === "approving-loading"}
				<div class="w-full h-14 rounded-full bg-white/10 backdrop-blur-xl border border-white/15 flex items-center justify-center gap-2" style="-webkit-backdrop-filter: blur(24px);">
					<Loader2 class="size-5 text-white animate-spin" />
					<span class="text-white/70 text-sm font-medium">Approving...</span>
				</div>
			{:else}
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					bind:this={trackEl}
					class="relative w-full h-14 rounded-full select-none touch-none overflow-hidden backdrop-blur-xl border border-white/15 bg-white/10"
					style="-webkit-backdrop-filter: blur(24px);"
				>
					<span
						class="absolute inset-0 flex items-center justify-center text-sm font-medium pointer-events-none z-0 {approvalReady ? 'text-white/50' : 'text-white/30'}"
						style="opacity: {approvalReady ? Math.max(0, 1 - (sliderX / Math.max(getMaxTravel(), 1)) * 1.5) : 1};
							   transition: {isDragging ? 'none' : 'opacity 0.3s'};"
					>
						{#if !approvalReady}
							Wait {countdown}s...
						{:else}
							Slide to approve
						{/if}
					</span>
					<!-- Glass sheet fill (rounded rect dragged by thumb) -->
					<div
						class="absolute top-1 left-1 h-12 rounded-l-full overflow-hidden pointer-events-none z-[1] bg-white/10 border border-white/15 border-r-0"
						style="width: {sliderX + THUMB_SIZE / 2}px; min-width: 0; -webkit-backdrop-filter: blur(24px); backdrop-filter: blur(24px); transition: {isDragging ? 'none' : 'width 0.35s cubic-bezier(0.2, 0.9, 0.3, 1)'};"
					></div>
					<div
						class="absolute top-1 left-1 w-12 h-12 rounded-full flex items-center justify-center z-[2] {approvalReady ? 'bg-white shadow-lg' : 'bg-white/10'}"
						style="transform: translateX({sliderX}px);
							   transition: {isDragging ? 'none' : 'transform 0.35s cubic-bezier(0.2, 0.9, 0.3, 1), background-color 0.3s'};"
						onpointerdown={onSliderPointerDown}
						onpointermove={onSliderPointerMove}
						onpointerup={onSliderPointerUp}
						onpointercancel={onSliderPointerUp}
						role="slider"
						aria-valuenow={Math.round((sliderX / Math.max(getMaxTravel(), 1)) * 100)}
						aria-valuemin={0}
						aria-valuemax={100}
						aria-label="Slide to approve login"
						tabindex={0}
					>
						<ChevronRight class="size-5 {approvalReady ? 'text-black' : 'text-white/30'}" />
					</div>
				</div>
			{/if}
				<button
					onclick={denyLogin}
					disabled={status === "approving-loading"}
					class="w-full py-3.5 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/15 text-white font-medium text-sm
						   active:scale-[0.98] transition-all duration-150 disabled:opacity-40"
					style="-webkit-backdrop-filter: blur(24px);"
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
				class="w-10 h-10 rounded-full bg-white/10 backdrop-blur-xl border border-white/15 flex items-center justify-center active:scale-90 transition-transform duration-150"
				style="-webkit-backdrop-filter: blur(24px);"
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

			<!-- Full-screen blur outside scan box (mask cuts out center) -->
			<svg width="0" height="0" aria-hidden="true" focusable="false">
				<defs>
					<mask id="scanner-outside-mask" maskContentUnits="objectBoundingBox">
						<rect x="0" y="0" width="1" height="1" fill="white" />
						<rect x="0.3" y="0.3" width="0.4" height="0.4" rx="0.06" ry="0.06" fill="black" />
					</mask>
				</defs>
			</svg>
			<div
				class="absolute inset-0 z-10 pointer-events-none scanner-outside-blur"
				style="mask: url(#scanner-outside-mask); -webkit-mask: url(#scanner-outside-mask); mask-size: 100% 100%; -webkit-mask-size: 100% 100%;"
			></div>
			<!-- Center box: border only (camera feed inside box is never blurred) -->
			<div
				class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 z-10 pointer-events-none rounded-3xl box-border scan-box-border"
				class:scan-box-glow={(status === "scanning" && qrInFrame) || status === "verifying"}
				class:scan-box-success={status === "verified"}
				class:scan-box-error={status === "error"}
			></div>
		</div>

		<div
			class="relative z-10 pb-[max(env(safe-area-inset-bottom),2rem)] pt-6 px-6 flex flex-col items-center gap-3 bg-black/30 backdrop-blur-xl border-t border-white/10"
			style="-webkit-backdrop-filter: blur(24px); transition: transform 0.4s cubic-bezier(0.2, 0.9, 0.3, 1);"
			class:translate-y-0={visible}
			class:translate-y-full={!visible}
		>
			{#if status === "scanning"}
				<p class="text-white/70 text-sm text-center">Point your camera at the login QR code</p>
			{:else if status === "verifying"}
				<div class="flex items-center gap-2">
					<Loader2 class="size-5 text-white animate-spin" />
					<p class="text-white text-sm">Verifying...</p>
				</div>
			{:else if status === "verified"}
				<p class="text-green-400 text-sm text-center">Login recognized — opening confirmation...</p>
			{:else if status === "error"}
				<div class="flex items-center gap-2">
					<AlertCircle class="size-5 text-red-400" />
					<p class="text-red-400 text-sm">{errorMsg}</p>
				</div>
			{/if}
		</div>
	</div>
{/if}
