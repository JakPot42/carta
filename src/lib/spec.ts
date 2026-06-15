import * as fs from 'fs';
import * as path from 'path';
import { CartaSpecZ, type CartaSpec, type Criterion, type Category, type Tier, type AuditResult, type CriterionResult } from '../types';

const SPEC_PATH = path.join(__dirname, '../../spec/carta-spec.json');

let _spec: CartaSpec | null = null;

export function loadSpec(): CartaSpec {
  if (_spec) return _spec;
  const raw = fs.readFileSync(SPEC_PATH, 'utf-8');
  const parsed = JSON.parse(raw);
  _spec = CartaSpecZ.parse(parsed);
  return _spec;
}

export function getCriteria(): Criterion[] {
  return loadSpec().criteria;
}

export function getCategories(): Category[] {
  return loadSpec().categories;
}

export function getCriterion(id: string): Criterion {
  const c = loadSpec().criteria.find(c => c.id === id);
  if (!c) throw new Error(`Unknown criterion: ${id}`);
  return c;
}

export function getCategory(id: string): Category {
  const cat = loadSpec().categories.find(c => c.id === id);
  if (!cat) throw new Error(`Unknown category: ${id}`);
  return cat;
}

export function computeScore(results: CriterionResult[]): { categoryScores: Record<string, number>; overall: number; tier: string } {
  const spec = loadSpec();
  const resultMap = new Map(results.map(r => [r.criterion_id, r.value]));

  const categoryScores: Record<string, number> = {};
  for (const cat of spec.categories) {
    let score = 0;
    for (const criterionId of cat.criteria) {
      const criterion = spec.criteria.find(c => c.id === criterionId);
      if (!criterion) continue;
      const value = resultMap.get(criterionId) ?? 0;
      score += value * criterion.weight_in_category;
    }
    categoryScores[cat.id] = Math.round(score * 1000) / 10;
  }

  let overall = 0;
  for (const cat of spec.categories) {
    overall += (categoryScores[cat.id] ?? 0) * cat.weight;
  }
  overall = Math.round(overall * 10) / 10;

  const tier = computeTier(overall, categoryScores, spec.scoring.tiers);
  return { categoryScores, overall, tier };
}

function computeTier(overall: number, categoryScores: Record<string, number>, tiers: Tier[]): string {
  for (const tier of tiers) {
    if (overall < tier.min_overall) continue;
    if (tier.min_per_category !== null) {
      const catFloor = tier.min_per_category;
      const allAboveFloor = Object.values(categoryScores).every(s => s >= catFloor);
      if (!allAboveFloor) continue;
    }
    return tier.name;
  }
  return 'Failing';
}
