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
  return 'light';
};

export const applyTheme = (_theme: ThemeMode) => {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const lightTheme: ThemeMode = 'light';
  root.classList.remove('dark');
  root.setAttribute('data-theme', lightTheme);

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, lightTheme);
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
