export const ASSESSMENT_TYPES = [
  "Speed",
  "Strength",
  "Endurance",
  "Agility",
  "Mobility",
  "Body composition",
  "General",
] as const;

export type AssessmentType = (typeof ASSESSMENT_TYPES)[number];

