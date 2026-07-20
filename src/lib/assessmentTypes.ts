export const ASSESSMENT_TYPES = [
  "Speed",
  "Strength",
  "Endurance",
  "Agility",
  "Mobility",
  "Body composition",
  "Technical",
  "General",
] as const;

export type AssessmentType = (typeof ASSESSMENT_TYPES)[number];

