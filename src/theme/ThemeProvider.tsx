import Storage from 'expo-sqlite/kv-store';
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { palette, type Colors } from './colors';

export type ThemePreference = 'system' | 'light' | 'dark';
const KEY = 'pref.theme';

type ThemeValue = {
  colors: Colors;
  scheme: 'light' | 'dark';
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeValue | null>(null);

function readPreference(): ThemePreference {
  const v = Storage.getItemSync(KEY);
  return v === 'light' || v === 'dark' ? v : 'system';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [preference, setPref] = useState<ThemePreference>(readPreference);
  const scheme = preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;

  const value = useMemo<ThemeValue>(
    () => ({
      colors: palette[scheme],
      scheme,
      preference,
      setPreference: (p) => {
        Storage.setItemSync(KEY, p);
        setPref(p);
      },
    }),
    [scheme, preference],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const v = useContext(ThemeContext);
  if (!v) throw new Error('useTheme ThemeProvider dışında kullanıldı');
  return v;
}
