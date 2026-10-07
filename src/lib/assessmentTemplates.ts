import { type AssessmentType } from "@/lib/assessmentTypes";
import { t, type Locale } from "@/lib/i18n";

export type AssessmentMetricKey =
  | "averageVelocity"
  | "peakVelocity"
  | "rangeOfMotion"
  | "averagePower"
  | "peakPower"
  | "timeToPeakVelocity"
  | "elasticAccelerationIndex";

export type AssessmentTemplateMetric = {
  key: AssessmentMetricKey;
  unit: string;
  computed?: boolean;
};

export type AssessmentTemplate = {
  id: string;
  type: AssessmentType;
  primaryMetric: AssessmentMetricKey;
  metrics: AssessmentTemplateMetric[];
};

export const ASSESSMENT_TEMPLATES: AssessmentTemplate[] = [
  {
    id: "barbellVelocity",
    type: "Strength",
    primaryMetric: "peakVelocity",
    metrics: [
      { key: "averageVelocity", unit: "m/s" },
      { key: "peakVelocity", unit: "m/s" },
      { key: "rangeOfMotion", unit: "m" },
      { key: "averagePower", unit: "W" },
      { key: "peakPower", unit: "W" },
      { key: "timeToPeakVelocity", unit: "s" },
      { key: "elasticAccelerationIndex", unit: "m/s²", computed: true },
    ],
  },
];

const templateById = new Map(ASSESSMENT_TEMPLATES.map((template) => [template.id, template]));

export function getAssessmentTemplate(id: string | null | undefined) {
  if (!id) return undefined;
  return templateById.get(id);
}

export function parseStoredMetrics(value: string | null | undefined): Record<string, number> | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const metrics: Record<string, number> = {};
    for (const [key, metricValue] of Object.entries(parsed)) {
      if (typeof metricValue === "number" && Number.isFinite(metricValue)) metrics[key] = metricValue;
    }
    return metrics;
  } catch {
    return null;
  }
}

export function serializeMetrics(metrics: Record<string, number>) {
  return JSON.stringify(metrics);
}

export function computedElasticAccelerationIndex(peakVelocity?: number, timeToPeakVelocity?: number) {
  if (peakVelocity == null || timeToPeakVelocity == null || timeToPeakVelocity <= 0) return undefined;
  return Number((peakVelocity / timeToPeakVelocity).toFixed(4));
}

export function resolveTemplateMetrics(template: AssessmentTemplate, inputs: Record<string, string> | Record<string, number>) {
  const metrics: Record<string, number> = {};
  for (const metric of template.metrics) {
    if (metric.computed) continue;
    const raw = inputs[metric.key];
    const value = typeof raw === "number" ? raw : Number(raw);
    if (raw == null || (typeof raw === "string" && raw.trim() === "") || !Number.isFinite(value)) {
      return { ok: false as const, error: "invalidMetrics" as const };
    }
    metrics[metric.key] = value;
  }

  const elastic = computedElasticAccelerationIndex(metrics.peakVelocity, metrics.timeToPeakVelocity);
  if (elastic != null) metrics.elasticAccelerationIndex = elastic;

  const score = metrics[template.primaryMetric];
  if (score == null || !Number.isFinite(score)) {
    return { ok: false as const, error: "invalidMetrics" as const };
  }
  return { ok: true as const, metrics, score };
}

export function assessmentLabel(
  assessment: { type: string; templateId?: string | null },
  locale: Locale
) {
  const template = getAssessmentTemplate(assessment.templateId);
  if (template) return t(locale, `coach.assessmentTemplates.${template.id}.title`);
  return assessment.type;
}

export function metricLabel(locale: Locale, key: string) {
  return t(locale, `coach.assessmentTemplates.metrics.${key}`);
}

export function metricHint(locale: Locale, key: string) {
  return t(locale, `coach.assessmentTemplates.metrics.${key}Hint`);
}
