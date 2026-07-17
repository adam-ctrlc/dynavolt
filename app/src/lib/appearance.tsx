import { useColorScheme, vars } from 'nativewind';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { View } from 'react-native';

export type ColorOption = { label: string; channels: string; hex: string };
export type AccentOption = { label: string; light: string; dark: string; hex: string };
export type BgOption = { label: string; light: string; dark: string; lightHex: string; darkHex: string };

export const AC_COLORS: ColorOption[] = [
  { label: 'Emerald', channels: '142 71% 45%', hex: '#22c55e' },
  { label: 'Blue', channels: '217 91% 60%', hex: '#3b82f6' },
  { label: 'Violet', channels: '262 83% 63%', hex: '#8b5cf6' },
  { label: 'Cyan', channels: '189 94% 43%', hex: '#06b6d4' },
  { label: 'Amber', channels: '38 92% 50%', hex: '#f59e0b' },
  { label: 'Rose', channels: '347 77% 55%', hex: '#f43f5e' },
];

export const ACCENTS: AccentOption[] = [
  { label: 'Green', light: '140 60% 95%', dark: '142 30% 16%', hex: '#dcfce7' },
  { label: 'Neutral', light: '0 0% 96%', dark: '0 0% 15%', hex: '#e4e4e7' },
  { label: 'Blue', light: '214 95% 95%', dark: '217 33% 20%', hex: '#dbeafe' },
  { label: 'Warm', light: '38 92% 94%', dark: '30 40% 18%', hex: '#fef3c7' },
];

export const BACKGROUNDS: BgOption[] = [
  { label: 'White', light: '0 0% 100%', dark: '0 0% 3.9%', lightHex: '#ffffff', darkHex: '#0a0a0a' },
  { label: 'Slate', light: '210 40% 99%', dark: '222 47% 8%', lightHex: '#f8fafc', darkHex: '#0b1120' },
  { label: 'Warm', light: '40 33% 99%', dark: '20 14% 8%', lightHex: '#fffdf7', darkHex: '#171311' },
  { label: 'Cool', light: '200 33% 99%', dark: '215 32% 9%', lightHex: '#f6fbfe', darkHex: '#0c141b' },
];

export type Preset = {
  label: string;
  recommended?: boolean;
  primary: ColorOption;
  accent: AccentOption;
  background: BgOption;
};

export const DEFAULT_APPEARANCE = {
  primary: AC_COLORS[0],
  accent: ACCENTS[0],
  background: BACKGROUNDS[0],
};

export const PRESETS: Preset[] = [
  { label: 'Default', primary: AC_COLORS[0], accent: ACCENTS[0], background: BACKGROUNDS[0] },
  { label: 'Ocean', recommended: true, primary: AC_COLORS[1], accent: ACCENTS[2], background: BACKGROUNDS[3] },
  { label: 'Sunset', recommended: true, primary: AC_COLORS[4], accent: ACCENTS[3], background: BACKGROUNDS[2] },
  { label: 'Grape', recommended: true, primary: AC_COLORS[2], accent: ACCENTS[1], background: BACKGROUNDS[1] },
];

type AppearanceValue = {
  primary: ColorOption;
  accent: AccentOption;
  background: BgOption;
  setPrimary: (option: ColorOption) => void;
  setAccent: (option: AccentOption) => void;
  setBackground: (option: BgOption) => void;
  applyPreset: (preset: Preset) => void;
  reset: () => void;
};

const AppearanceContext = createContext<AppearanceValue | null>(null);

export function useAppearance() {
  const ctx = useContext(AppearanceContext);
  if (!ctx) throw new Error('useAppearance must be used within an AppearanceProvider');
  return ctx;
}

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [primary, setPrimary] = useState<ColorOption>(DEFAULT_APPEARANCE.primary);
  const [accent, setAccent] = useState<AccentOption>(DEFAULT_APPEARANCE.accent);
  const [background, setBackground] = useState<BgOption>(DEFAULT_APPEARANCE.background);

  const applyPreset = useCallback((preset: Preset) => {
    setPrimary(preset.primary);
    setAccent(preset.accent);
    setBackground(preset.background);
  }, []);

  const reset = useCallback(() => {
    setPrimary(DEFAULT_APPEARANCE.primary);
    setAccent(DEFAULT_APPEARANCE.accent);
    setBackground(DEFAULT_APPEARANCE.background);
  }, []);

  // A fresh vars() object on every render re-applies the whole variable set to the
  // subtree, so it is rebuilt only when a value it depends on actually changes.
  const style = useMemo(
    () =>
      vars({
        '--primary': primary.channels,
        '--primary-foreground': '0 0% 100%',
        '--ring': primary.channels,
        '--accent': isDark ? accent.dark : accent.light,
        '--accent-foreground': isDark ? '0 0% 98%' : '0 0% 12%',
        '--background': isDark ? background.dark : background.light,
        '--card': isDark ? background.dark : background.light,
        '--popover': isDark ? background.dark : background.light,
      }),
    [primary.channels, accent.dark, accent.light, background.dark, background.light, isDark]
  );

  const value = useMemo<AppearanceValue>(
    () => ({ primary, accent, background, setPrimary, setAccent, setBackground, applyPreset, reset }),
    [primary, accent, background, applyPreset, reset]
  );

  return (
    <AppearanceContext.Provider value={value}>
      <View style={style} className="flex-1">
        {children}
      </View>
    </AppearanceContext.Provider>
  );
}
