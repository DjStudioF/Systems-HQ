export type ThemePref = "system" | "light" | "dark";
export const THEME_STORAGE_KEY = "shq-theme";

export function resolveTheme(pref: ThemePref, systemPrefersDark: boolean): "light" | "dark" {
  if (pref === "light" || pref === "dark") return pref;
  return systemPrefersDark ? "dark" : "light";
}

export function isThemePref(v: unknown): v is ThemePref {
  return v === "system" || v === "light" || v === "dark";
}

/** Apply in the browser and remember as a pre-paint hint. Call from effects/handlers only. */
export function applyTheme(pref: ThemePref) {
  const dark = resolveTheme(pref, window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark === "dark");
  try {
    localStorage.setItem(THEME_STORAGE_KEY, pref);
  } catch {
    /* storage unavailable */
  }
}

/** Inline pre-paint script: avoids a light flash before React hydrates. */
export const THEME_INIT_SCRIPT = `(function(){try{var p=localStorage.getItem('${THEME_STORAGE_KEY}')||'system';var d=p==='dark'||(p==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');}catch(e){}})();`;
