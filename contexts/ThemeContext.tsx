import { storageService } from '@/services/storage';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';

// ─── Paletas — mismos valores que `JiroPOS-Frontend/src/context/ThemeContext.jsx` ─
export interface PaletteTones {
  label: string;
  brand: string;
  dark: string;
  deeper: string;
  hover: string;
  surface: string;
  border: string;
  bg: string;
  dmPage: string;
  dmCard: string;
  dmInput: string;
  dmHover: string;
  dmStripe: string;
  dmBorder: string;
  dmText: string;
  dmMuted: string;
  dmSoft: string;
}

export const PALETTES: Record<string, PaletteTones> = {
  marron: {
    label: 'Marrón (default)',
    brand: '#6C4B4B', dark: '#583333', deeper: '#4A2025',
    hover: '#5A3D3D', surface: '#EDE4DD', border: '#C4B5A0', bg: '#F9F5F2',
    dmPage: '#14100f', dmCard: '#201815', dmInput: '#1a1310',
    dmHover: '#2e1e18', dmStripe: '#1b1512', dmBorder: '#3d2d24',
    dmText: '#f0e8e3', dmMuted: '#c8b2a5', dmSoft: '#927060',
  },
  azul: {
    label: 'Azul',
    brand: '#2B5EA7', dark: '#1E4280', deeper: '#152E5C',
    hover: '#3A6BB5', surface: '#DCE8F8', border: '#A0BBE0', bg: '#F0F5FC',
    dmPage: '#0d1219', dmCard: '#141c2a', dmInput: '#111622',
    dmHover: '#1c293c', dmStripe: '#121820', dmBorder: '#2a3d5c',
    dmText: '#e8eef5', dmMuted: '#a8bcd5', dmSoft: '#6880a8',
  },
  verde: {
    label: 'Verde',
    brand: '#2D7D46', dark: '#1F5C33', deeper: '#143D22',
    hover: '#3A8F55', surface: '#D4EDD9', border: '#9ECCA9', bg: '#F0F7F1',
    dmPage: '#0d1510', dmCard: '#141f18', dmInput: '#111a14',
    dmHover: '#1c2e22', dmStripe: '#121c15', dmBorder: '#2a4033',
    dmText: '#e8f0ea', dmMuted: '#9fc4a8', dmSoft: '#618470',
  },
  morado: {
    label: 'Morado',
    brand: '#6B3FA0', dark: '#4E2C78', deeper: '#351C52',
    hover: '#7A4EAD', surface: '#E8D9F8', border: '#C0A0E0', bg: '#F5F0FC',
    dmPage: '#120d1a', dmCard: '#1c1428', dmInput: '#171022',
    dmHover: '#271c38', dmStripe: '#151020', dmBorder: '#382856',
    dmText: '#ede8f5', dmMuted: '#b8a0d5', dmSoft: '#8060aa',
  },
  teal: {
    label: 'Teal',
    brand: '#1A7A7A', dark: '#135858', deeper: '#0C3B3B',
    hover: '#268888', surface: '#D0ECEC', border: '#90CCCC', bg: '#F0F8F8',
    dmPage: '#0d1618', dmCard: '#142022', dmInput: '#111a1e',
    dmHover: '#1c2e32', dmStripe: '#121c20', dmBorder: '#2a4045',
    dmText: '#e8f2f2', dmMuted: '#9cc0c5', dmSoft: '#5e8e95',
  },
  oscuro: {
    label: 'Gris',
    brand: '#4A4A4A', dark: '#2D2D2D', deeper: '#1A1A1A',
    hover: '#555555', surface: '#E8E8E8', border: '#B0B0B0', bg: '#F5F5F5',
    dmPage: '#111111', dmCard: '#1c1c1c', dmInput: '#161616',
    dmHover: '#252525', dmStripe: '#191919', dmBorder: '#303030',
    dmText: '#eeeeee', dmMuted: '#aaaaaa', dmSoft: '#777777',
  },
};

export type PaletteKey = keyof typeof PALETTES;
const DEFAULT_PALETTE: PaletteKey = 'marron';

const STORAGE_KEY_PALETTE = 'theme_palette';
const STORAGE_KEY_DARK = 'theme_dark_mode';

interface ThemeContextType {
  palette: PaletteKey;
  setPalette: (palette: PaletteKey) => void;
  dark: boolean;
  setDark: (dark: boolean) => void;
  toggleDark: () => void;
  tones: PaletteTones;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * Fuente de verdad de paleta + modo oscuro, persistida en AsyncStorage —
 * puerto de `JiroPOS-Frontend/src/context/ThemeContext.jsx`.
 *
 * Nota de alcance (FASE 01): esta fase solo construye la infraestructura.
 * `constants/theme.ts` sigue exportando `Colors` estático (paleta marrón,
 * modo claro) porque ~30 pantallas ya lo importan así; migrarlas todas a
 * `useThemeColors()` de golpe es el trabajo de fases posteriores, pantalla
 * por pantalla. El selector de paleta en Perfil se conecta en FASE 02.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [palette, setPaletteState] = useState<PaletteKey>(DEFAULT_PALETTE);
  const [dark, setDarkState] = useState(false);

  useEffect(() => {
    (async () => {
      const [savedPalette, savedDark] = await Promise.all([
        storageService.getItem(STORAGE_KEY_PALETTE),
        storageService.getItem(STORAGE_KEY_DARK),
      ]);
      if (savedPalette && PALETTES[savedPalette]) {
        setPaletteState(savedPalette as PaletteKey);
      }
      if (savedDark === 'true') {
        setDarkState(true);
      }
    })();
  }, []);

  const setPalette = useCallback((next: PaletteKey) => {
    setPaletteState(next);
    storageService.setItem(STORAGE_KEY_PALETTE, next);
  }, []);

  const setDark = useCallback((next: boolean) => {
    setDarkState(next);
    storageService.setItem(STORAGE_KEY_DARK, next ? 'true' : 'false');
  }, []);

  const toggleDark = useCallback(() => setDark(!dark), [dark, setDark]);

  const tones = PALETTES[palette] || PALETTES[DEFAULT_PALETTE];

  return (
    <ThemeContext.Provider value={{ palette, setPalette, dark, setDark, toggleDark, tones }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useAppTheme must be used within a ThemeProvider');
  }
  return context;
}
