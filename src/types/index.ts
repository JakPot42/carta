import { z } from 'zod';

export const RubricEntryZ = z.object({
  value: z.number(),
  label: z.string(),
  description: z.string(),
});

export const CriterionZ = z.object({
  id: z.string(),
  category: z.string(),
  name: z.string(),
  description: z.string(),
  weight_in_category: z.number(),
  type: z.enum(['binary', 'graded']),
  why_this_matters: z.string(),
  how_to_audit: z.string(),
  evidence_fields: z.record(z.string()),
  rubric: z.array(RubricEntryZ),
});

export const CategoryZ = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  weight: z.number(),
  references: z.array(z.string()),
  criteria: z.array(z.string()),
});

export const TierZ = z.object({
  name: z.string(),
  min_overall: z.number(),
  min_per_category: z.number().nullable(),
  description: z.string(),
  badge_color: z.string(),
});

export const CartaSpecZ = z.object({
  spec_version: z.string(),
  spec_date: z.string(),
  title: z.string(),
  categories: z.array(CategoryZ),
  criteria: z.array(CriterionZ),
  scoring: z.object({
    tiers: z.array(TierZ),
  }),
});

export const CriterionResultZ = z.object({
  criterion_id: z.string(),
  value: z.number(),
  label: z.string(),
  evidence: z.record(z.unknown()),
  notes: z.string().optional(),
});

export const AuditResultZ = z.object({
  carta_version: z.string(),
  platform: z.string(),
  platform_url: z.string(),
  tos_url: z.string(),
  privacy_url: z.string().optional(),
  audited_at: z.string(),
  audited_by: z.string(),
  audit_method: z.enum(['automated', 'manual', 'hybrid']),
  notes: z.string(),
  criteria_results: z.array(CriterionResultZ),
  category_scores: z.record(z.number()),
  overall_score: z.number(),
  tier: z.string(),
});

export const RegistryPlatformZ = z.object({
  id: z.string(),
  aliases: z.array(z.string()),
  display_name: z.string(),
  tos_url: z.string(),
  privacy_url: z.string().optional(),
  audit_result: AuditResultZ.nullable(),
});

export const RegistryZ = z.object({
  version: z.string(),
  last_updated: z.string(),
  platforms: z.array(RegistryPlatformZ),
});

export type RubricEntry = z.infer<typeof RubricEntryZ>;
export type Criterion = z.infer<typeof CriterionZ>;
export type Category = z.infer<typeof CategoryZ>;
export type Tier = z.infer<typeof TierZ>;
export type CartaSpec = z.infer<typeof CartaSpecZ>;
export type CriterionResult = z.infer<typeof CriterionResultZ>;
export type AuditResult = z.infer<typeof AuditResultZ>;
export type RegistryPlatform = z.infer<typeof RegistryPlatformZ>;
export type Registry = z.infer<typeof RegistryZ>;

export interface DiffChunk {
  section: string;
  added: string[];
  removed: string[];
}

export interface DiffResult {
  additions: number;
  deletions: number;
  chunks: DiffChunk[];
}
