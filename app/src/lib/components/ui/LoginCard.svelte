<script lang="ts">
	import * as Card from "$lib/components/ui/card/index.js";
	import * as Tabs from "$lib/components/ui/tabs/index.js";
	import { Button } from "$lib/components/ui/button/index.js";
	import { Input } from "$lib/components/ui/input/index.js";
	import { Label } from "$lib/components/ui/label/index.js";
	import { Fingerprint } from "@lucide/svelte";

	let mode = $state("login");
	let username = $state("");
	let loading = $state(false);
	let errorMsg = $state<string | null>(null);

	function onModeChange() {
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

<Card.Root class="w-full max-w-sm rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-xl p-8">
	<Card.Header class="p-0 pb-1">
		<Card.Title class="text-2xl font-semibold tracking-tight text-neutral-900">Welcome</Card.Title>
		<Card.Description class="text-sm text-neutral-700">
			{mode === "login" ? "Sign in with your passkey" : "Create an account with a passkey"}
		</Card.Description>
	</Card.Header>
	<Card.Content class="p-0">
		<Tabs.Root bind:value={mode} onValueChange={onModeChange} class="w-full">
			<Tabs.List class="w-full grid grid-cols-2 h-10 rounded-lg">
				<Tabs.Trigger value="login">Log in</Tabs.Trigger>
				<Tabs.Trigger value="signup">Sign up</Tabs.Trigger>
			</Tabs.List>
			<Tabs.Content value="login" class="pt-4">
				<div class="space-y-4">
					<Button
						type="button"
						class="w-full h-11 rounded-lg gap-2"
						onclick={handlePasskeyLogin}
						disabled={loading}
					>
						<Fingerprint class="size-5" />
						{loading ? "Signing in..." : "Log in with passkey"}
					</Button>
				</div>
			</Tabs.Content>
			<Tabs.Content value="signup" class="pt-4">
				<form onsubmit={handleSignup} class="space-y-4">
					<div class="space-y-2">
						<Label for="username" class="text-neutral-800">Username</Label>
						<Input
							id="username"
							type="text"
							placeholder="Choose a username"
							bind:value={username}
							required
							autocomplete="username"
							class="border-[var(--glass-border)]"
						/>
					</div>
					<Button
						type="submit"
						class="w-full h-11 rounded-lg gap-2"
						disabled={loading}
					>
						<Fingerprint class="size-5" />
						{loading ? "Creating passkey..." : "Create account with passkey"}
					</Button>
				</form>
			</Tabs.Content>
		</Tabs.Root>
		{#if errorMsg}
			<p class="text-sm text-red-600 mt-3">{errorMsg}</p>
		{/if}
	</Card.Content>
</Card.Root>
