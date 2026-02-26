<script lang="ts">
	import * as Card from "$lib/components/ui/card/index.js";
	import { Button } from "$lib/components/ui/button/index.js";
	import { Input } from "$lib/components/ui/input/index.js";
	import { Label } from "$lib/components/ui/label/index.js";
	import { Fingerprint } from "@lucide/svelte";

	type Mode = "login" | "signup";

	let mode = $state<Mode>("login");
	let username = $state("");
	let passkeyLoading = $state(false);
	let passkeyError = $state<string | null>(null);

	function setMode(m: Mode) {
		mode = m;
		passkeyError = null;
	}

	function handleSignup(e: SubmitEvent) {
		e.preventDefault();
		console.log("signup", { username });
	}

	async function handlePasskeyLogin() {
		passkeyError = null;
		passkeyLoading = true;
		try {
			const credential = await navigator.credentials.get({
				mediation: "optional",
				publicKey: {
					challenge: new Uint8Array(32),
					rpId: typeof window !== "undefined" ? window.location.hostname : "localhost",
					userVerification: "preferred",
				},
			});
			if (credential) {
				console.log("passkey login", credential);
			}
		} catch (err) {
			passkeyError = err instanceof Error ? err.message : "Passkey sign-in failed";
		} finally {
			passkeyLoading = false;
		}
	}
</script>

<Card.Root class="w-full max-w-sm bg-[#E7E7E7] border-[#1C1C1C] rounded-[24px] p-8 shadow-none">
	<Card.Header class="p-0 pb-6">
		<Card.Title class="text-2xl font-semibold tracking-tight text-neutral-900">Welcome</Card.Title>
		<Card.Description class="text-sm text-neutral-600">
			{mode === "login" ? "Sign in to your account" : "Create an account with your username"}
		</Card.Description>
	</Card.Header>
	<Card.Content class="p-0">
		{#if mode === "signup"}
			<form onsubmit={handleSignup} class="space-y-4">
				<div class="flex gap-3">
					<Button
						variant="default"
						class="flex-1 bg-[#4F83C2] hover:bg-[#4373AB] text-white h-10 rounded-md transition-colors duration-150"
						onclick={() => setMode("login")}
						type="button"
					>
						Log in
					</Button>
					<Button
						variant="default"
						class="flex-1 bg-[#111111] hover:bg-[#222222] text-white h-10 rounded-md transition-colors duration-150"
						type="button"
						disabled
					>
						Sign up
					</Button>
				</div>
				<div class="space-y-2">
					<Label for="username" class="text-neutral-800">Username</Label>
					<Input
						id="username"
						type="text"
						placeholder="Enter username"
						bind:value={username}
						required
						autocomplete="username"
						class="bg-white border-neutral-300"
					/>
				</div>
				<Button
					type="submit"
					class="w-full bg-[#111111] hover:bg-[#222222] text-white h-11 rounded-md transition-colors duration-150"
				>
					Sign up
				</Button>
			</form>
		{:else}
			<div class="flex gap-3">
				<Button
					variant="default"
					class="flex-1 bg-[#4F83C2] hover:bg-[#4373AB] text-white h-10 rounded-md transition-colors duration-150"
					type="button"
					disabled
				>
					Log in
				</Button>
				<Button
					variant="default"
					class="flex-1 bg-[#111111] hover:bg-[#222222] text-white h-10 rounded-md transition-colors duration-150"
					onclick={() => setMode("signup")}
					type="button"
				>
					Sign up
				</Button>
			</div>
			<Button
				type="button"
				class="w-full bg-[#111111] hover:bg-[#222222] text-white h-11 rounded-md mt-4 gap-2 transition-colors duration-150"
				onclick={handlePasskeyLogin}
				disabled={passkeyLoading}
			>
				<Fingerprint class="size-5" />
				{passkeyLoading ? "Signing in…" : "Log in with passkey"}
			</Button>
			{#if passkeyError}
				<p class="text-sm text-red-600 mt-2">{passkeyError}</p>
			{/if}
		{/if}
	</Card.Content>
</Card.Root>
