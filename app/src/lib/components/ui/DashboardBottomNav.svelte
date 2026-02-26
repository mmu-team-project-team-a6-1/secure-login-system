<script lang="ts">
	import { Home, QrCode, User } from "@lucide/svelte";

	type Tab = "home" | "scan" | "account";

	let {
		active = "home",
		onScan,
		onAccount,
	}: {
		active?: Tab;
		onScan: () => void;
		onAccount?: () => void;
	} = $props();

	function scrollToAccount() {
		document.getElementById("account-card")?.scrollIntoView({ behavior: "smooth" });
		onAccount?.();
	}
</script>

<nav
	class="fixed bottom-0 left-0 right-0 z-20 flex items-center justify-around bg-[var(--glass-bg)] backdrop-blur-xl border-t border-[var(--glass-border)] pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] px-4"
	style="-webkit-backdrop-filter: blur(24px);"
	aria-label="Main navigation"
>
	<button
		type="button"
		class="flex flex-col items-center gap-1 min-w-[4rem] py-2.5 px-3 rounded-xl transition-all btn-glass {active === 'home'
			? 'text-neutral-900 font-medium'
			: 'text-neutral-500'}"
		aria-current={active === "home" ? "page" : undefined}
	>
		<Home class="size-6" />
		<span class="text-xs">Home</span>
	</button>
	<button
		type="button"
		class="flex flex-col items-center gap-1 min-w-[4rem] py-2.5 px-3 rounded-xl transition-all btn-glass {active === 'scan'
			? 'text-neutral-900 font-medium'
			: 'text-neutral-500'}"
		onclick={onScan}
		aria-label="Open QR scanner"
	>
		<QrCode class="size-6" />
		<span class="text-xs">Scan</span>
	</button>
	<button
		type="button"
		class="flex flex-col items-center gap-1 min-w-[4rem] py-2.5 px-3 rounded-xl transition-all btn-glass {active === 'account'
			? 'text-neutral-900 font-medium'
			: 'text-neutral-500'}"
		onclick={scrollToAccount}
		aria-label="Go to account"
	>
		<User class="size-6" />
		<span class="text-xs">Account</span>
	</button>
</nav>
