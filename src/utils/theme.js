import { DEFAULT_THEME, THEME_VAR_MAP } from "../constants/theme.js";

export function applyWorldTheme(theme) {
  const t = { ...DEFAULT_THEME, ...(theme || {}) };
  Object.entries(THEME_VAR_MAP).forEach(([key, cssVar]) => {
    document.documentElement.style.setProperty(cssVar, t[key]);
  });
}
export function resetWorldTheme() {
  Object.values(THEME_VAR_MAP).forEach((cssVar) => document.documentElement.style.removeProperty(cssVar));
}
