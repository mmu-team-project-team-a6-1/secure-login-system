<script lang="ts">
	import { onMount, onDestroy } from "svelte";
	import QRCode from "qrcode";
	import * as Card from "$lib/components/ui/card/index.js";
	import { generateToken, nowEpochSeconds } from "$lib/utils/totp";
	import { RefreshCw, Loader2, ShieldCheck } from "@lucide/svelte";

	let sessionId = $state<string | null>(null);
	let secret = $state<string | null>(null);
	let qrImages = $state<[string | null, string | null]>([null, null]);
	let activeSlot = $state(0);
	let status = $state<"loading" | "active" | "scanned" | "authenticated" | "expired">("loading");
	let error = $state<string | null>(null);

	let rotateTimer: ReturnType<typeof setInterval> | undefined;
	let pollTimer: ReturnType<typeof setInterval> | undefined;

	async function initSession() {
		status = "loading";
		error = null;
		try {
			const res = await fetch("/api/auth/qr-session", { method: "POST" });
			const data = await res.json();
			sessionId = data.sessionId;
			secret = data.secret;
			status = "active";
			await rotateQR();
			startRotation();
			startPolling();
		} catch {
			error = "Failed to start QR session";
			status = "expired";
		}
	}

	async function rotateQR() {
		if (!secret || !sessionId) return;
		const t = nowEpochSeconds();
		const token = await generateToken(secret, t);
		const payload = `sls:${sessionId}:${token}:${t}`;
		const next = activeSlot === 0 ? 1 : 0;
		qrImages[next] = await QRCode.toDataURL(payload, {
			width: 192,
			margin: 1,
			errorCorrectionLevel: "L",
		});
		activeSlot = next;
	}

	function startRotation() {
		stopRotation();
		rotateTimer = setInterval(rotateQR, 1000);
	}

	function stopRotation() {
		if (rotateTimer) clearInterval(rotateTimer);
		rotateTimer = undefined;
	}

	function startPolling() {
		stopPolling();
		pollTimer = setInterval(async () => {
			if (!sessionId) return;
			try {
				const res = await fetch(`/api/auth/qr-session/${sessionId}`);
				const data = await res.json();
				if (data.status === "authenticated") {
					status = "authenticated";
					stopRotation();
					stopPolling();
					setTimeout(() => {
						window.location.href = "/dashboard";
					}, 800);
				} else if (data.status === "scanned") {
					if (status !== "scanned") {
						status = "scanned";
						stopRotation();
					}
				} else if (data.status === "expired") {
					status = "expired";
					stopRotation();
					stopPolling();
				}
			} catch {
				/* polling failure is non-fatal */
			}
		}, 2000);
	}

	function stopPolling() {
		if (pollTimer) clearInterval(pollTimer);
		pollTimer = undefined;
	}

	onMount(initSession);
	onDestroy(() => {
		stopRotation();
		stopPolling();
	});
</script>

<Card.Root class="w-full max-w-sm bg-[#E7E7E7] border-[#1C1C1C] rounded-[28px] p-8 shadow-none">
	<Card.Header class="p-0 pb-1">
		<Card.Title class="text-2xl font-semibold tracking-tight text-neutral-900">
			Log in with mobile app
		</Card.Title>
		<Card.Description class="text-sm text-neutral-600">
			{#if status === "scanned"}
				Confirm the login on your mobile device
			{:else if status === "authenticated"}
				Login approved — redirecting...
			{:else}
				Scan the QR code with your mobile app to sign in
			{/if}
		</Card.Description>
	</Card.Header>
	<Card.Content class="p-0 flex flex-col items-center justify-center gap-4">
		<div
			class="relative w-48 h-48 rounded-2xl border border-neutral-300 bg-white p-3 flex items-center justify-center overflow-hidden"
		>
			{#if status === "loading"}
				<span class="text-neutral-400 text-sm">Loading QR...</span>
			{:else if status === "expired"}
				<div class="flex flex-col items-center gap-2">
					<span class="text-neutral-400 text-xs text-center">Session expired</span>
					<button
						onclick={initSession}
						class="flex items-center gap-1.5 text-xs font-medium text-[#4F83C2] hover:text-[#4373AB] transition-colors"
					>
						<RefreshCw class="size-3.5" />
						Refresh
					</button>
				</div>
			{:else if status === "scanned"}
				<div class="flex flex-col items-center gap-3">
					<div class="relative">
						<div class="w-12 h-12 rounded-full border-[3px] border-neutral-200 border-t-[#4F83C2] animate-spin"></div>
					</div>
					<div class="flex flex-col items-center gap-1">
						<span class="text-neutral-700 text-xs font-medium">Waiting for approval</span>
						<span class="text-neutral-400 text-[10px]">Check your mobile device</span>
					</div>
				</div>
			{:else if status === "authenticated"}
				<div class="flex flex-col items-center gap-2">
					<ShieldCheck class="size-10 text-green-500" />
					<span class="text-green-600 text-sm font-medium">Approved!</span>
				</div>
			{:else}
				{#each [0, 1] as slot}
					{#if qrImages[slot]}
						<img
							src={qrImages[slot]}
							alt="QR code to log in with mobile app"
							class="absolute inset-3 w-[calc(100%-1.5rem)] h-[calc(100%-1.5rem)] object-contain transition-opacity duration-300 ease-out"
							style:opacity={activeSlot === slot ? 1 : 0}
						/>
					{/if}
				{/each}
			{/if}
		</div>
	</Card.Content>
</Card.Root>
