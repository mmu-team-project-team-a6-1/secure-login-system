<script lang="ts">
	import { onMount, onDestroy } from "svelte";
	import QRCode from "qrcode";
	import * as Card from "$lib/components/ui/card/index.js";
	import { Button } from "$lib/components/ui/button/index.js";
	import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
	import { generateToken, nowEpochSeconds } from "$lib/utils/totp";
	import { RefreshCw, Loader2, ShieldCheck, ShieldX, X } from "@lucide/svelte";

	let sessionId = $state<string | null>(null);
	let secret = $state<string | null>(null);
	let qrImages = $state<[string | null, string | null]>([null, null]);
	let activeSlot = $state(0);
	let status = $state<"loading" | "active" | "scanned" | "authenticated" | "expired" | "denied">("loading");
	let error = $state<string | null>(null);

	let helpOpen = $state(false);
	let helpMode = $state<"steps" | "wizard">("steps");
	let wizardStep = $state(0);

	let siteUrl = $state<string | null>(null);
	let siteUrlQR = $state<string | null>(null);

	const wizardSteps = [
		{
			title: "Open this site on your phone",
			description: "On your phone, open your browser and go to this same website."
		},
		{
			title: "Sign in and open your dashboard",
			description: "Log in on your phone and go to your account dashboard."
		},
		{
			title: "Tap the Scan option",
			description: "In your dashboard, find and tap the Scan option."
		},
		{
			title: "Scan this QR code",
			description: "Use the Scan feature on your phone to scan the QR code shown on this screen."
		}
	] as const;

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

	async function initSiteUrlQR() {
		if (typeof window === "undefined") return;
		const url = window.location.origin;
		siteUrl = url;
		try {
			siteUrlQR = await QRCode.toDataURL(url, {
				width: 120,
				margin: 1,
				errorCorrectionLevel: "M"
			});
		} catch {
			// non-fatal if we can't render this helper QR
		}
	}

	async function rotateQR() {
		if (!secret || !sessionId) return;
		const t = nowEpochSeconds();
		const token = await generateToken(secret, t);
		try {
			const res = await fetch("/api/auth/qr-session/jwt", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ sessionId, token, timestamp: t }),
			});
			if (!res.ok) return;
			const data = await res.json();
			const payload = `teama61qrlogin://${data.jwt}`;
			const next = activeSlot === 0 ? 1 : 0;
			qrImages[next] = await QRCode.toDataURL(payload, {
				width: 192,
				margin: 1,
				errorCorrectionLevel: "L",
			});
			activeSlot = next;
		} catch {
			/* keep previous QR for another second */
		}
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
				} else if (data.status === "denied") {
					status = "denied";
					stopRotation();
					stopPolling();
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

	function openHelp(mode: "steps" | "wizard" = "steps") {
		helpMode = mode;
		wizardStep = 0;
		helpOpen = true;
	}

	function nextWizardStep() {
		if (wizardStep < wizardSteps.length - 1) {
			wizardStep += 1;
		}
	}

	function prevWizardStep() {
		if (wizardStep > 0) {
			wizardStep -= 1;
		}
	}

	onMount(() => {
		initSession();
		initSiteUrlQR();
	});
onDestroy(() => {
	stopRotation();
	stopPolling();
});
</script>

<Card.Root class="w-full max-w-sm rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] liquid-glass p-8">
	<Card.Header class="p-0 pb-1">
		<Card.Title class="text-2xl font-semibold tracking-tight text-neutral-900">
			Log in with mobile app
		</Card.Title>
		<Card.Description class="text-sm text-neutral-700">
			{#if status === "scanned"}
				Confirm the login on your mobile device
			{:else if status === "authenticated"}
				Login approved — redirecting...
			{:else if status === "denied"}
				Login was denied on the mobile device
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
					<Button onclick={initSession} variant="default" size="sm" class="gap-1.5">
						<RefreshCw class="size-3.5" />
						Refresh
					</Button>
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
			{:else if status === "denied"}
				<div class="flex flex-col items-center gap-2">
					<ShieldX class="size-10 text-red-400" />
					<span class="text-red-500 text-sm font-medium">Login denied</span>
					<Button onclick={() => window.location.reload()} variant="default" size="sm" class="gap-1.5">
						<RefreshCw class="size-3.5" />
						Try again
					</Button>
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

		<div class="w-full mt-1 flex flex-col items-center gap-1">
			<p class="text-[11px] text-neutral-500 text-center">
				To use this QR code, open this site on your phone and use the Scan option in your dashboard.
			</p>
			<button
				type="button"
				class="text-xs font-medium text-[#4F83C2] hover:text-[#3a66a0] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#4F83C2] focus-visible:ring-offset-transparent rounded-full px-1 py-0.5"
				onclick={() => openHelp("steps")}
			>
				Need help scanning this?
			</button>
		</div>
	</Card.Content>
</Card.Root>

<AlertDialog.Root bind:open={helpOpen}>
	<AlertDialog.Content aria-label="How to scan this QR code">
		<div class="relative">
			<AlertDialog.Header>
				<AlertDialog.Title>How to scan this QR code</AlertDialog.Title>
				<AlertDialog.Description>
					Use your account dashboard on your phone to scan this QR code — not your camera app.
				</AlertDialog.Description>
			</AlertDialog.Header>
			<AlertDialog.Cancel
				class="absolute right-0 top-0 -mt-1 -mr-1 inline-flex h-7 w-7 items-center justify-center rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-neutral-400"
				aria-label="Close help"
			>
				<X class="h-3.5 w-3.5" />
			</AlertDialog.Cancel>
		</div>

		{#if siteUrlQR && siteUrl}
			<div class="mt-2 mb-4 flex flex-col items-center gap-2 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3">
				<p class="text-[11px] font-medium text-neutral-700 text-center">
					First, open this website on your phone:
				</p>
				<div class="flex items-center gap-3">
					<img
						src={siteUrlQR}
						alt="QR code to open this website on your phone"
						class="h-16 w-16 rounded-lg border border-neutral-200 bg-white p-1"
					/>
					<p class="max-w-[12rem] break-all text-[11px] font-mono text-neutral-600">
						{siteUrl}
					</p>
				</div>
			</div>
		{/if}

		<div class="mt-2 mb-4 flex items-center gap-1 rounded-full bg-neutral-100 p-1 text-xs font-medium text-neutral-600">
			<button
				type="button"
				class="flex-1 rounded-full px-3 py-1 text-center transition-colors"
				class:bg-white={helpMode === "steps"}
				class:shadow-sm={helpMode === "steps"}
				onclick={() => (helpMode = "steps")}
				aria-pressed={helpMode === "steps"}
			>
				Quick steps
			</button>
			<button
				type="button"
				class="flex-1 rounded-full px-3 py-1 text-center transition-colors"
				class:bg-white={helpMode === "wizard"}
				class:shadow-sm={helpMode === "wizard"}
				onclick={() => (helpMode = "wizard")}
				aria-pressed={helpMode === "wizard"}
			>
				Guided wizard
			</button>
		</div>

		{#if helpMode === "steps"}
			<div class="mt-1 flex gap-4">
				<div class="flex-1 space-y-2.5">
					{#each wizardSteps as step, index}
						<div class="flex gap-3">
							<div class="flex flex-col items-center">
								<div class="flex h-7 w-7 items-center justify-center rounded-full bg-[#4F83C2]/10 border border-[#4F83C2]/40 text-[11px] font-semibold text-[#4F83C2]">
									{index + 1}
								</div>
								{#if index < wizardSteps.length - 1}
									<div class="mt-0.5 h-6 w-px bg-neutral-200"></div>
								{/if}
							</div>
							<div class="flex-1">
								<p class="text-xs font-semibold text-neutral-800">
									{step.title}
								</p>
								<p class="mt-0.5 text-[11px] text-neutral-500">
									{step.description}
								</p>
							</div>
						</div>
					{/each}

					<p class="pt-2.5 text-[11px] text-neutral-500">
						Keep this page open on your computer while you scan from your phone.
					</p>
				</div>

				<div class="w-[8.5rem] flex flex-col items-center gap-1.5">
					<div
						class="relative w-full aspect-square rounded-2xl border border-neutral-300 bg-white p-2 flex items-center justify-center overflow-hidden"
					>
						{#if status === "loading"}
							<span class="text-neutral-400 text-[11px]">Loading QR...</span>
						{:else if status === "expired"}
							<span class="text-[11px] text-neutral-400 text-center">Session expired</span>
						{:else if status === "scanned"}
							<div class="flex flex-col items-center gap-2">
								<div class="relative">
									<div class="w-9 h-9 rounded-full border-[3px] border-neutral-200 border-t-[#4F83C2] animate-spin"></div>
								</div>
								<div class="flex flex-col items-center gap-0.5">
									<span class="text-[11px] text-neutral-700 font-medium">Waiting for approval</span>
								</div>
							</div>
						{:else if status === "authenticated"}
							<div class="flex flex-col items-center gap-1.5">
								<ShieldCheck class="size-7 text-green-500" />
								<span class="text-[11px] text-green-600 font-medium">Approved!</span>
							</div>
						{:else if status === "denied"}
							<div class="flex flex-col items-center gap-1.5">
								<ShieldX class="size-7 text-red-400" />
								<span class="text-[11px] text-red-500 font-medium">Login denied</span>
							</div>
						{:else}
							{#each [0, 1] as slot}
								{#if qrImages[slot]}
									<img
										src={qrImages[slot]}
										alt="QR code to log in with mobile app"
										class="absolute inset-2 w-[calc(100%-1rem)] h-[calc(100%-1rem)] object-contain transition-opacity duration-300 ease-out"
										style:opacity={activeSlot === slot ? 1 : 0}
									/>
								{/if}
							{/each}
						{/if}
					</div>
					<p class="text-[11px] text-neutral-600 text-center">
						Use your phone’s Scan screen to scan this code.
					</p>
				</div>
			</div>
		{:else}
			<div class="space-y-4">
				<div class="flex items-center justify-center gap-1">
					{#each wizardSteps as _, index}
						<div
							class="h-1.5 w-6 rounded-full bg-neutral-200 transition-colors"
							class:bg-[#4F83C2]={(index) === wizardStep}
						></div>
					{/each}
				</div>

				<div class="space-y-2">
					<p class="text-xs font-semibold text-neutral-800">
						Step {wizardStep + 1} of {wizardSteps.length}
					</p>
					<p class="mt-1 text-sm font-medium text-neutral-900">
						{wizardSteps[wizardStep].title}
					</p>
					<p class="mt-1 text-[13px] text-neutral-600">
						{wizardSteps[wizardStep].description}
					</p>

					{#if wizardStep === wizardSteps.length - 1}
						<div class="mt-2 flex flex-col items-center gap-1.5">
							<div
								class="relative w-32 h-32 rounded-2xl border border-neutral-300 bg-white p-2 flex items-center justify-center overflow-hidden"
							>
								{#if status === "loading"}
									<span class="text-neutral-400 text-[11px]">Loading QR...</span>
								{:else if status === "expired"}
									<span class="text-[11px] text-neutral-400 text-center">Session expired</span>
								{:else if status === "scanned"}
									<div class="flex flex-col items-center gap-2">
										<div class="relative">
											<div class="w-9 h-9 rounded-full border-[3px] border-neutral-200 border-t-[#4F83C2] animate-spin"></div>
										</div>
										<div class="flex flex-col items-center gap-0.5">
											<span class="text-[11px] text-neutral-700 font-medium">Waiting for approval</span>
										</div>
									</div>
								{:else if status === "authenticated"}
									<div class="flex flex-col items-center gap-1.5">
										<ShieldCheck class="size-7 text-green-500" />
										<span class="text-[11px] text-green-600 font-medium">Approved!</span>
									</div>
								{:else if status === "denied"}
									<div class="flex flex-col items-center gap-1.5">
										<ShieldX class="size-7 text-red-400" />
										<span class="text-[11px] text-red-500 font-medium">Login denied</span>
									</div>
								{:else}
									{#each [0, 1] as slot}
										{#if qrImages[slot]}
											<img
												src={qrImages[slot]}
												alt="QR code to log in with mobile app"
												class="absolute inset-2 w-[calc(100%-1rem)] h-[calc(100%-1rem)] object-contain transition-opacity duration-300 ease-out"
												style:opacity={activeSlot === slot ? 1 : 0}
											/>
										{/if}
									{/each}
								{/if}
							</div>
							<p class="text-[11px] text-neutral-600 text-center max-w-xs">
								Now, point your phone at this QR code to approve the login.
							</p>
						</div>
					{/if}
				</div>

				<div class="flex justify-between items-center pt-2">
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onclick={prevWizardStep}
						disabled={wizardStep === 0}
						class="text-xs"
					>
						Back
					</Button>
					{#if wizardStep < wizardSteps.length - 1}
						<Button
							type="button"
							variant="default"
							size="sm"
							onclick={nextWizardStep}
							class="text-xs"
						>
							Next step
						</Button>
					{/if}
				</div>
			</div>
		{/if}
	</AlertDialog.Content>
</AlertDialog.Root>
