<script lang="ts">
	import { onMount } from "svelte";
	import DashboardCard from "$lib/components/ui/DashboardCard.svelte";
	import DashboardBottomNav from "$lib/components/ui/DashboardBottomNav.svelte";
	import QRScanner from "$lib/components/ui/QRScanner.svelte";
	import { QrCode, LogOut, Monitor, Smartphone, Globe, ShieldCheck } from "@lucide/svelte";

	let { data } = $props();
	let scannerOpen = $state(false);
	let isMobile = $state(false);
	let mounted = $state(false);
	let navActive = $state<"home" | "scan" | "account">("home");

	onMount(() => {
		isMobile = window.innerWidth < 768 || /Mobi|Android/i.test(navigator.userAgent);
		mounted = true;
	});

	function formatTime(iso: string): string {
		const d = new Date(iso);
		const now = new Date();
		const diff = now.getTime() - d.getTime();
		const mins = Math.floor(diff / 60_000);
		if (mins < 1) return "Just now";
		if (mins < 60) return `${mins}m ago`;
		const hrs = Math.floor(mins / 60);
		if (hrs < 24) return `${hrs}h ago`;
		return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
	}

	function deviceIcon(device: string): typeof Monitor {
		if (/iphone|android|mobile/i.test(device)) return Smartphone;
		if (/safari|chrome|firefox|edge/i.test(device)) return Monitor;
		return Globe;
	}

	async function logout() {
		await fetch("/api/auth/logout", { method: "POST" });
		window.location.href = "/";
	}
</script>

<svelte:head>
	<title>Dashboard</title>
</svelte:head>

<div class="min-h-screen bg-[#F2F2F7] transition-colors duration-500">
	<!-- Header -->
	<header
		class="sticky top-0 z-30 bg-[var(--glass-bg)] backdrop-blur-xl border-b border-[var(--glass-border)]"
		class:opacity-0={!mounted}
		class:translate-y-[-8px]={!mounted}
		style="-webkit-backdrop-filter: blur(24px); transition: opacity 0.5s cubic-bezier(0.2,0.9,0.3,1), transform 0.5s cubic-bezier(0.2,0.9,0.3,1);"
	>
		<div class="max-w-2xl mx-auto px-5 py-4 flex items-center justify-between">
			<div>
				<h1 class="text-2xl font-semibold tracking-tight text-neutral-900">
					Hello, {data.user.displayName}
				</h1>
				<p class="text-sm text-neutral-500">Welcome back</p>
			</div>
			<button
				onclick={logout}
				class="p-2.5 rounded-full glass-panel border border-[var(--glass-border)] active:scale-95 transition-transform duration-150"
				aria-label="Log out"
			>
				<LogOut class="size-5 text-neutral-600" />
			</button>
		</div>
	</header>

	<!-- Content -->
	<main class="max-w-2xl mx-auto px-5 py-6 space-y-4" class:pb-24={isMobile}>
		<!-- QR Scanner CTA (mobile only; hidden when bottom nav is shown so Scan is in nav) -->
		{#if isMobile}
			<button
				onclick={() => (scannerOpen = true)}
				class="w-full bg-[#111111] text-white rounded-2xl p-5 flex items-center gap-4
					   active:scale-[0.98] transition-transform duration-150
					   shadow-[var(--glass-shadow)] backdrop-blur-xl border border-white/10"
				style="transition: transform 0.2s cubic-bezier(0.2,0.9,0.3,1); -webkit-backdrop-filter: blur(24px);"
			>
				<div class="flex-shrink-0 w-12 h-12 rounded-2xl bg-white/20 border border-white/20 flex items-center justify-center">
					<QrCode class="size-6 text-white" />
				</div>
				<div class="text-left">
					<p class="font-semibold text-base">Scan QR Code</p>
					<p class="text-sm text-neutral-400">Authorize login on another device</p>
				</div>
			</button>
		{/if}

		<!-- Active Sessions -->
		<DashboardCard title="Active Sessions">
			{#if data.sessions.length === 0}
				<p class="text-sm text-neutral-400">No active sessions</p>
			{:else}
				<div class="space-y-3">
					{#each data.sessions as session}
						{@const Icon = deviceIcon(session.deviceInfo)}
						<div class="flex items-center gap-3">
							<div class="w-9 h-9 rounded-lg bg-[var(--glass-bg)]/60 border border-[var(--glass-border)] flex items-center justify-center flex-shrink-0">
								<Icon class="size-4.5 text-neutral-600" />
							</div>
							<div class="flex-1 min-w-0">
								<p class="text-sm font-medium text-neutral-900 truncate">{session.deviceInfo}</p>
								<p class="text-xs text-neutral-400">{session.ipAddress}</p>
							</div>
							<span class="text-xs text-neutral-400 flex-shrink-0">{formatTime(session.createdAt)}</span>
						</div>
					{/each}
				</div>
			{/if}
		</DashboardCard>

		<!-- Login Activity -->
		<DashboardCard title="Recent Activity">
			{#if data.activity.length === 0}
				<p class="text-sm text-neutral-400">No login activity yet</p>
			{:else}
				<div class="space-y-3">
					{#each data.activity as entry}
						<div class="flex items-center gap-3">
							<div
								class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 border border-[var(--glass-border)]"
								class:bg-green-50={entry.success}
								class:bg-red-50={!entry.success}
							>
								<ShieldCheck
									class="size-4.5 {entry.success ? 'text-green-600' : 'text-red-500'}"
								/>
							</div>
							<div class="flex-1 min-w-0">
								<p class="text-sm font-medium text-neutral-900">
									{entry.success ? "Signed in" : "Failed sign-in"}
									<span class="text-neutral-400 font-normal">via {entry.method}</span>
								</p>
								<p class="text-xs text-neutral-400 truncate">{entry.deviceInfo}</p>
							</div>
							<span class="text-xs text-neutral-400 flex-shrink-0">{formatTime(entry.timestamp)}</span>
						</div>
					{/each}
				</div>
			{/if}
		</DashboardCard>

		<!-- Account info -->
		<div id="account-card">
			<DashboardCard title="Account">
			<div class="space-y-2">
				<div class="flex justify-between">
					<span class="text-sm text-neutral-500">Username</span>
					<span class="text-sm font-medium text-neutral-900">{data.user.username}</span>
				</div>
				<div class="flex justify-between">
					<span class="text-sm text-neutral-500">Email</span>
					<span class="text-sm font-medium text-neutral-900">{data.user.email}</span>
				</div>
				<div class="flex justify-between">
					<span class="text-sm text-neutral-500">Joined</span>
					<span class="text-sm font-medium text-neutral-900">
						{new Date(data.user.createdAt).toLocaleDateString("en-GB", {
							day: "numeric",
							month: "short",
							year: "numeric",
						})}
					</span>
				</div>
			</div>
			</DashboardCard>
		</div>
	</main>
	{#if isMobile}
		<DashboardBottomNav
			active={scannerOpen ? 'scan' : navActive}
			onScan={() => (scannerOpen = true)}
			onAccount={() => (navActive = 'account')}
		/>
	{/if}
</div>

{#if scannerOpen}
	<QRScanner onclose={() => (scannerOpen = false)} />
{/if}
