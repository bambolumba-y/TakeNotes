import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { useColorScheme } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { lightColors, type LightColors } from './light'
import { darkColors, type DarkColors } from './dark'
import { radius, space, border, typography, palette, priorityColors } from './tokens'
import { ThemeMode } from '@takenotes/shared'

const THEME_KEY = 'takenotes_appearance_mode'

export type AppTheme = {
  colors: LightColors | DarkColors
  radius: typeof radius
  space: typeof space
  border: typeof border
  typography: typeof typography
  palette: typeof palette
  priorityColors: typeof priorityColors
  isDark: boolean
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
}

const ThemeContext = createContext<AppTheme | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme()
  const [mode, setModeState] = useState<ThemeMode>(ThemeMode.System)

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((stored) => {
      if (stored && Object.values(ThemeMode).includes(stored as ThemeMode)) {
        setModeState(stored as ThemeMode)
      }
    })
  }, [])

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode)
    AsyncStorage.setItem(THEME_KEY, newMode)
  }

  const isDark = mode === ThemeMode.Dark || (mode === ThemeMode.System && systemScheme === 'dark')
  const colors = isDark ? darkColors : lightColors

  const theme: AppTheme = {
    colors,
    radius,
    space,
    border,
    typography,
    palette,
    priorityColors,
    isDark,
    mode,
    setMode,
  }

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
}

export function useThemeContext(): AppTheme {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useThemeContext must be used within ThemeProvider')
  return ctx
}
