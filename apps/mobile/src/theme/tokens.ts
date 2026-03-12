export const radius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  full: 999,
} as const

export const space = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
} as const

export const border = {
  thin: 1,
  medium: 1.5,
  strong: 2,
} as const

export const typography = {
  display: { fontSize: 32, lineHeight: 38, fontWeight: '600' as const },
  title1: { fontSize: 28, lineHeight: 34, fontWeight: '600' as const },
  title2: { fontSize: 22, lineHeight: 28, fontWeight: '600' as const },
  sectionTitle: { fontSize: 18, lineHeight: 24, fontWeight: '600' as const },
  cardTitle: { fontSize: 17, lineHeight: 22, fontWeight: '600' as const },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' as const },
  bodyStrong: { fontSize: 15, lineHeight: 22, fontWeight: '500' as const },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' as const },
  captionStrong: { fontSize: 13, lineHeight: 18, fontWeight: '500' as const },
  micro: { fontSize: 11, lineHeight: 14, fontWeight: '500' as const },
} as const

export const palette = {
  blue: '#6EA8FE',
  purple: '#A78BFA',
  pink: '#F472B6',
  orange: '#FB923C',
  green: '#4ADE80',
  teal: '#2DD4BF',
  yellow: '#FACC15',
  red: '#F87171',
} as const

export const priorityColors = {
  low: palette.green,
  medium: palette.yellow,
  high: palette.orange,
  urgent: palette.red,
} as const
