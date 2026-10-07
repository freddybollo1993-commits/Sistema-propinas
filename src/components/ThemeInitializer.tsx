"use client";

import { useEffect } from "react";
import { applyTheme, getActiveTheme } from "@/lib/theme";

export default function ThemeInitializer() {
	useEffect(() => {
		const active = getActiveTheme();
		applyTheme(active);
	}, []);

	return null;
}
