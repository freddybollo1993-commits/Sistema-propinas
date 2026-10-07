"use client";

export type AppTheme = "halloween" | "original";

const THEME_STORAGE_KEY = "shimaya_active_theme";

/**
 * Obtiene el tema activo actual.
 * Por defecto para esta temporada (octubre) es 'halloween'.
 * Si el usuario seleccionó 'original' o 'halloween' explícitamente, se respeta su preferencia.
 */
export function getActiveTheme(): AppTheme {
	if (typeof window === "undefined") return "halloween";
	try {
		const saved = localStorage.getItem(THEME_STORAGE_KEY);
		if (saved === "original" || saved === "halloween") {
			return saved;
		}
	} catch (_e) {
		// Si localStorage no está disponible
	}
	return "halloween";
}

/**
 * Aplica el tema al DOM (atributo data-theme y clases auxiliares)
 */
export function applyTheme(theme: AppTheme) {
	if (typeof document === "undefined") return;

	const root = document.documentElement;
	root.setAttribute("data-theme", theme);

	if (document.body) {
		if (theme === "halloween") {
			document.body.classList.add("theme-halloween");
		} else {
			document.body.classList.remove("theme-halloween");
		}
	}

	try {
		localStorage.setItem(THEME_STORAGE_KEY, theme);
	} catch (_e) {}

	if (typeof window !== "undefined") {
		window.dispatchEvent(
			new CustomEvent("shimaya-theme-change", { detail: { theme } }),
		);
	}
}

/**
 * Alterna entre tema Halloween y tema original
 */
export function toggleTheme(): AppTheme {
	const current = getActiveTheme();
	const next: AppTheme = current === "halloween" ? "original" : "halloween";
	applyTheme(next);
	return next;
}
