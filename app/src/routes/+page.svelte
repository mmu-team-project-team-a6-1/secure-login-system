<script lang="ts">
	import { onMount } from "svelte";
	import QRCode from "qrcode";
	import * as Card from "$lib/components/ui/card/index.js";
	import { Button } from "$lib/components/ui/button/index.js";
	import { Input } from "$lib/components/ui/input/index.js";
	import { Label } from "$lib/components/ui/label/index.js";
	import { Fingerprint } from "@lucide/svelte";

	type Mode = "login" | "signup";

	let mode = $state<Mode>("login");
	let username = $state("");
	let qrDataUrl = $state<string | null>(null);
	let passkeyLoading = $state(false);
	let passkeyError = $state<string | null>(null);

	onMount(() => {
		const loginUrl = "https://example.com/app-login";
		QRCode.toDataURL(loginUrl, { width: 192, margin: 1 }).then((url) => {
			qrDataUrl = url;
		});
	});

	function setMode(m: Mode) {
		mode = m;
		passkeyError = null;
	}

	function handleSignup(e: SubmitEvent) {
		e.preventDefault();
		// Placeholder: no backend yet
		console.log("signup", { username });
	}

	async function handlePasskeyLogin() {
		passkeyError = null;
		passkeyLoading = true;
		try {
			// Placeholder: backend would supply challenge, allowCredentials, rpId
			const credential = await navigator.credentials.get({
				mediation: "optional",
				publicKey: {
					challenge: new Uint8Array(32),
					rpId: typeof window !== "undefined" ? window.location.hostname : "localhost",
					userVerification: "preferred",
				},
			});
			if (credential) {
				// Placeholder: send credential to backend
				console.log("passkey login", credential);
			}
		} catch (err) {
			passkeyError = err instanceof Error ? err.message : "Passkey sign-in failed";
		} finally {
			passkeyLoading = false;
		}
	}
</script>

<div class="min-h-screen flex flex-col items-center justify-center p-4 md:p-6 bg-muted/30">
	<div
		class="w-full max-w-4xl grid gap-6 md:grid-cols-[1fr_1fr] md:gap-8 items-stretch"
	>
		<Card.Root class="flex flex-col max-w-md w-full mx-auto md:max-w-none shadow-lg">
			<Card.Header>
				<Card.Title class="text-2xl">Welcome</Card.Title>
				<Card.Description>
					{mode === "login"
						? "Sign in to your account"
						: "Create an account with your username"}
				</Card.Description>
			</Card.Header>
			<Card.Content class="flex-1">
				<div class="flex gap-2 mb-6">
					<Button
						variant={mode === "login" ? "default" : "outline"}
						class="flex-1"
						onclick={() => setMode("login")}
						type="button"
					>
						Log in
					</Button>
					<Button
						variant={mode === "signup" ? "default" : "outline"}
						class="flex-1"
						onclick={() => setMode("signup")}
						type="button"
					>
						Sign up
					</Button>
				</div>

				{#if mode === "signup"}
					<form onsubmit={handleSignup} class="space-y-4">
						<div class="space-y-2">
							<Label for="username">Username</Label>
							<Input
								id="username"
								type="text"
								placeholder="Enter username"
								bind:value={username}
								required
								autocomplete="username"
							/>
						</div>
						<Button type="submit" class="w-full" size="lg">
							Sign up
						</Button>
					</form>
				{:else}
					<div class="space-y-4">
						<Button
							type="button"
							variant="outline"
							class="w-full gap-2"
							size="lg"
							onclick={handlePasskeyLogin}
							disabled={passkeyLoading}
						>
							<Fingerprint class="size-5" />
							{passkeyLoading ? "Signing in…" : "Log in with passkey"}
						</Button>
						{#if passkeyError}
							<p class="text-sm text-destructive">{passkeyError}</p>
						{/if}
					</div>
				{/if}
			</Card.Content>
		</Card.Root>

		<div class="hidden md:flex flex-col">
			<Card.Root class="flex-1 flex flex-col shadow-lg min-h-[320px]">
				<Card.Header class="w-full text-left">
					<Card.Title class="text-xl">Log in with mobile app</Card.Title>
					<Card.Description>
						Scan the QR code with your mobile app to sign in
					</Card.Description>
				</Card.Header>
				<Card.Content class="flex-1 flex items-center justify-center w-full">
					<div
						class="aspect-square w-48 h-48 rounded-lg border-2 border-border flex items-center justify-center bg-card overflow-hidden"
						aria-label="QR code for mobile app login"
					>
						{#if qrDataUrl}
							<img
								src={qrDataUrl}
								alt="Scan to log in with mobile app"
								class="w-full h-full object-contain p-1"
							/>
						{:else}
							<div
								class="w-full h-full flex items-center justify-center bg-muted/50 border-2 border-dashed border-muted-foreground/25 rounded-lg"
							>
								<span class="text-muted-foreground text-sm">Loading QR…</span>
							</div>
						{/if}
					</div>
				</Card.Content>
			</Card.Root>
		</div>
	</div>
</div>
