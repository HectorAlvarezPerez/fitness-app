export type ThemeMode = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'fitness-theme';

export const getStoredTheme = (): ThemeMode | null => {
  if (typeof window === 'undefined') return null;

  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (value === 'light' || value === 'dark') return value;
  } catch {
    // Ignore localStorage access errors
  }

  return null;
};

export const resolveTheme = (): ThemeMode => {
  const stored = getStoredTheme();
  if (stored) return stored;

  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  return 'dark';
};

export const applyTheme = (theme: ThemeMode) => {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.setAttribute('data-theme', theme);

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore localStorage write errors
    }
  }
};

export const initTheme = (): ThemeMode => {
  const theme = resolveTheme();
  applyTheme(theme);
  return theme;
};
