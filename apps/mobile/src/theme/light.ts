export const lightColors = {
  bg: {
    app: '#F5F7FB',
    surface: '#FFFFFF',
    surfaceSecondary: '#EEF2F8',
    input: '#F3F6FB',
  },
  text: {
    primary: '#111827',
    secondary: '#667085',
    tertiary: '#98A2B3',
  },
  border: {
    default: '#E4E7EC',
  },
  accent: {
    primary: '#5B7CFA',
    primaryPressed: '#4C6DF0',
    soft: '#E8EEFF',
  },
  status: {
    success: '#12B76A',
    warning: '#F79009',
    error: '#F04438',
    info: '#2E90FA',
  },
  shadow: {
    card: {
      shadowColor: '#111827',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 20,
      elevation: 4,
    },
    fab: {
      shadowColor: '#3B82F6',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.22,
      shadowRadius: 28,
      elevation: 8,
    },
  },
} as const

export type LightColors = typeof lightColors
