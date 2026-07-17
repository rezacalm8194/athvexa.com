export const themes = ["dark", "light", "system"] as const;
export type ThemeName = (typeof themes)[number];

export const directions = ["ltr", "rtl"] as const;
export type Direction = (typeof directions)[number];

export const designTokens = {
  radius: {
    control: "var(--radius-control)",
    card: "var(--radius-card)",
    round: "var(--radius-round)"
  },
  space: {
    1: "var(--space-1)",
    2: "var(--space-2)",
    3: "var(--space-3)",
    4: "var(--space-4)",
    5: "var(--space-5)",
    6: "var(--space-6)",
    8: "var(--space-8)",
    10: "var(--space-10)"
  }
} as const;
