import type { User } from "$lib/data/example-data";

declare global {
	namespace App {
		interface Locals {
			user: User | null;
			sessionId: string | null;
		}
	}
}

export {};
