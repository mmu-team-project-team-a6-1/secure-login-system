import { writable } from "svelte/store";
import type { User } from "$lib/data/example-data";

export const currentUser = writable<User | null>(null);
