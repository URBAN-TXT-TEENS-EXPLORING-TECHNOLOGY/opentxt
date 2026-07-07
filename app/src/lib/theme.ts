/** Design tokens — one dark theme, shared by every screen. */
export const colors = {
  bg: "#0b0e12",
  surface: "#151a21",
  surfaceRaised: "#1c232d",
  border: "#232b35",
  text: "#e8edf2",
  textDim: "#8a96a3",
  accent: "#6ea8fe",
  accentText: "#0b0e12",
  danger: "#ff6b6b",
  live: "#4ade80",
} as const

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 40,
} as const

export const radius = {
  sm: 8,
  md: 14,
  lg: 22,
  pill: 999,
} as const
