import { writable } from "svelte/store";

const STORAGE_KEY = "theme";

export type Theme = "light" | "dark";

function getInitialTheme(): Theme {
	if (typeof document === "undefined") return "dark";
	const stored = localStorage.getItem(STORAGE_KEY);
	return stored === "light" ? "light" : "dark";
}

function createThemeStore() {
	const { subscribe, set, update } = writable<Theme>(getInitialTheme());

	return {
		subscribe,
		set: (value: Theme) => {
			if (typeof document !== "undefined") {
				document.documentElement.classList.toggle("dark", value === "dark");
				localStorage.setItem(STORAGE_KEY, value);
			}
			set(value);
		},
		toggle: () => {
			update((current) => {
				const next = current === "dark" ? "light" : "dark";
				if (typeof document !== "undefined") {
					document.documentElement.classList.toggle("dark", next === "dark");
					localStorage.setItem(STORAGE_KEY, next);
				}
				return next;
			});
		},
	};
}

export const theme = createThemeStore();
