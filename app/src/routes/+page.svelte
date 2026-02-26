<script lang="ts">
	import LoginCard from "$lib/components/ui/LoginCard.svelte";
	import QRLoginCard from "$lib/components/ui/QRLoginCard.svelte";
	import LoginBackground from "$lib/components/ui/LoginBackground.svelte";
</script>

<svelte:head>
	<title>Sign in — Secure Login System</title>
	<meta name="theme-color" content="#3B82F6" />
</svelte:head>

<h1 class="sr-only">Secure Login System</h1>

<div class="relative min-h-screen flex flex-col items-center justify-center bg-[#3B82F6] p-4 md:p-6 overflow-x-hidden lg:flex-row">
	<LoginBackground />
	<div class="relative z-0 flex flex-col items-center justify-center w-full max-w-sm flex-1 lg:hidden">
		<div
			class="w-full rounded-2xl border-2 border-white/30 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.2)]"
		>
			<LoginCard />
		</div>
	</div>

	<div class="relative z-0 w-full max-w-6xl min-h-0 overflow-x-clip hidden lg:flex lg:items-center lg:justify-center">
		<div class="absolute inset-0 bg-white rounded-[36px] rotate-[-2deg]" aria-hidden="true"></div>
		<div
			class="relative w-full max-h-[52vh] min-h-[540px] bg-[#0B0B0D] rounded-[36px] overflow-hidden flex items-center justify-center px-16 py-10 border border-white/10 ring-1 ring-white/5"
		>
			<div class="flex flex-row items-center gap-16 w-full justify-center">
				<LoginCard />
				<QRLoginCard />
			</div>
		</div>
	</div>
</div>
