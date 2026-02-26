<script lang="ts">
	import * as Card from "$lib/components/ui/card/index.js";
	import { Button } from "$lib/components/ui/button/index.js";
	import { Input } from "$lib/components/ui/input/index.js";
	import { Label } from "$lib/components/ui/label/index.js";
	import { Fingerprint } from "@lucide/svelte";

	type Mode = "login" | "signup";

	let mode = $state<Mode>("login");
	let username = $state("");
	let loading = $state(false);
	let errorMsg = $state<string | null>(null);

	function setMode(m: Mode) {
		mode = m;
		errorMsg = null;
	}

	async function handleSignup(e: SubmitEvent) {
		e.preventDefault();
		errorMsg = null;
		loading = true;
		try {
			const res = await fetch("/api/auth/signup", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ username: username.trim() }),
			});
			const data = await res.json();
			if (!res.ok) {
				errorMsg = data.error ?? "Signup failed";
				return;
			}
			window.location.href = "/dashboard";
		} catch {
			errorMsg = "Network error";
		} finally {
			loading = false;
		}
	}

	async function handlePasskeyLogin() {
		errorMsg = null;
		loading = true;
		try {
			const credential = await navigator.credentials.get({
				mediation: "optional",
				publicKey: {
					challenge: new Uint8Array(32),
					rpId: typeof window !== "undefined" ? window.location.hostname : "localhost",
					userVerification: "preferred",
				},
			});
			if (!credential) {
				errorMsg = "No credential selected";
				return;
			}
			// In a real app, send credential to server for verification.
			// For this demo, fall through to /api/auth/login with the username prompt.
			errorMsg = "Passkey received — use Sign Up to create a demo account";
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : "Passkey sign-in failed";
		} finally {
			loading = false;
		}
	}

	async function handleLogin(e: SubmitEvent) {
		e.preventDefault();
		errorMsg = null;
		loading = true;
		try {
			const res = await fetch("/api/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ username: username.trim() }),
			});
			const data = await res.json();
			if (!res.ok) {
				errorMsg = data.error ?? "Login failed";
				return;
			}
			window.location.href = "/dashboard";
		} catch {
			errorMsg = "Network error";
		} finally {
			loading = false;
		}
	}
</script>

<Card.Root class="w-full max-w-sm bg-[#E7E7E7] border-[#1C1C1C] rounded-[24px] p-8 shadow-none">
	<Card.Header class="p-0 pb-1">
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
					disabled={loading}
				>
					{loading ? "Creating account..." : "Sign up"}
				</Button>
			</form>
		{:else}
			<form onsubmit={handleLogin} class="space-y-4">
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
				<div class="space-y-2">
					<Label for="login-username" class="text-neutral-800">Username</Label>
					<Input
						id="login-username"
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
					disabled={loading}
				>
					{loading ? "Signing in..." : "Log in"}
				</Button>
				<div class="relative flex items-center gap-3">
					<div class="flex-1 h-px bg-neutral-300"></div>
					<span class="text-xs text-neutral-500">or</span>
					<div class="flex-1 h-px bg-neutral-300"></div>
				</div>
				<Button
					type="button"
					class="w-full bg-[#111111] hover:bg-[#222222] text-white h-11 rounded-md gap-2 transition-colors duration-150"
					onclick={handlePasskeyLogin}
					disabled={loading}
				>
					<Fingerprint class="size-5" />
					{loading ? "Signing in..." : "Log in with passkey"}
				</Button>
			</form>
		{/if}
		{#if errorMsg}
			<p class="text-sm text-red-600 mt-3">{errorMsg}</p>
		{/if}
	</Card.Content>
</Card.Root>
