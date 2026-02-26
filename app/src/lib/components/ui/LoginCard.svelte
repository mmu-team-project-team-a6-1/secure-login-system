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

	function bufferToBase64url(buf: ArrayBuffer): string {
		const bytes = new Uint8Array(buf);
		let binary = "";
		for (const b of bytes) binary += String.fromCharCode(b);
		return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
	}

	async function handleSignup(e: SubmitEvent) {
		e.preventDefault();
		if (!username.trim()) return;
		errorMsg = null;
		loading = true;

		try {
			const challenge = crypto.getRandomValues(new Uint8Array(32));
			const userId = crypto.getRandomValues(new Uint8Array(16));

			const credential = (await navigator.credentials.create({
				publicKey: {
					challenge,
					rp: { name: "Secure Login System", id: window.location.hostname },
					user: {
						id: userId,
						name: username.trim(),
						displayName: username.trim(),
					},
					pubKeyCredParams: [
						{ alg: -7, type: "public-key" },
						{ alg: -257, type: "public-key" },
					],
					authenticatorSelection: {
						residentKey: "required",
						userVerification: "preferred",
					},
					timeout: 60000,
				},
			})) as PublicKeyCredential | null;

			if (!credential) {
				errorMsg = "Passkey creation cancelled";
				return;
			}

			const credentialId = bufferToBase64url(credential.rawId);

			const res = await fetch("/api/auth/signup", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ username: username.trim(), credentialId }),
			});
			const data = await res.json();
			if (!res.ok) {
				errorMsg = data.error ?? "Signup failed";
				return;
			}
			window.location.href = "/dashboard";
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : "Passkey creation failed";
		} finally {
			loading = false;
		}
	}

	async function handlePasskeyLogin() {
		errorMsg = null;
		loading = true;
		try {
			const challenge = crypto.getRandomValues(new Uint8Array(32));

			const credential = (await navigator.credentials.get({
				mediation: "optional",
				publicKey: {
					challenge,
					rpId: window.location.hostname,
					userVerification: "preferred",
				},
			})) as PublicKeyCredential | null;

			if (!credential) {
				errorMsg = "No credential selected";
				return;
			}

			const credentialId = bufferToBase64url(credential.rawId);

			const res = await fetch("/api/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ credentialId }),
			});
			const data = await res.json();
			if (!res.ok) {
				errorMsg = data.error ?? "Login failed";
				return;
			}
			window.location.href = "/dashboard";
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : "Passkey sign-in failed";
		} finally {
			loading = false;
		}
	}
</script>

<Card.Root class="w-full max-w-sm bg-[#E7E7E7] border-[#1C1C1C] rounded-[24px] p-8 shadow-none">
	<Card.Header class="p-0 pb-1">
		<Card.Title class="text-2xl font-semibold tracking-tight text-neutral-900">Welcome</Card.Title>
		<Card.Description class="text-sm text-neutral-600">
			{mode === "login" ? "Sign in with your passkey" : "Create an account with a passkey"}
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
						placeholder="Choose a username"
						bind:value={username}
						required
						autocomplete="username"
						class="bg-white border-neutral-300"
					/>
				</div>
				<Button
					type="submit"
					class="w-full bg-[#111111] hover:bg-[#222222] text-white h-11 rounded-md gap-2 transition-colors duration-150"
					disabled={loading}
				>
					<Fingerprint class="size-5" />
					{loading ? "Creating passkey..." : "Create account with passkey"}
				</Button>
			</form>
		{:else}
			<div class="space-y-4">
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
					class="w-full bg-[#111111] hover:bg-[#222222] text-white h-11 rounded-md gap-2 transition-colors duration-150"
					onclick={handlePasskeyLogin}
					disabled={loading}
				>
					<Fingerprint class="size-5" />
					{loading ? "Signing in..." : "Log in with passkey"}
				</Button>
			</div>
		{/if}
		{#if errorMsg}
			<p class="text-sm text-red-600 mt-3">{errorMsg}</p>
		{/if}
	</Card.Content>
</Card.Root>
