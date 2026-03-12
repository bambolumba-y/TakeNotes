export const darkColors = {
  bg: {
    app: '#0B1020',
    surface: '#121A2F',
    surfaceSecondary: '#1A2540',
    input: '#18233B',
  },
  text: {
    primary: '#F8FAFC',
    secondary: '#C7D0E0',
    tertiary: '#8FA0BA',
  },
  border: {
    default: '#26324F',
  },
  accent: {
    primary: '#7C95FF',
    primaryPressed: '#6E88FF',
    soft: '#1F2B52',
  },
  status: {
    success: '#32D583',
    warning: '#FDB022',
    error: '#F97066',
    info: '#53B1FD',
  },
  shadow: {
    card: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.24,
      shadowRadius: 24,
      elevation: 6,
    },
    fab: {
      shadowColor: '#2563EB',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.28,
      shadowRadius: 28,
      elevation: 10,
    },
  },
} as const

export type DarkColors = typeof darkColors
