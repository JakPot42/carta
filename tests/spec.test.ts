import { describe, it, expect } from 'vitest';
import { loadSpec, getCriteria, getCategories, getCriterion, getCategory, computeScore } from '../src/lib/spec';
import type { CriterionResult } from '../src/types';

describe('loadSpec', () => {
  it('loads without error', () => {
    expect(() => loadSpec()).not.toThrow();
  });

  it('has spec_version 1.0.0', () => {
    const spec = loadSpec();
    expect(spec.spec_version).toBe('1.0.0');
  });

  it('has 6 categories', () => {
    const spec = loadSpec();
    expect(spec.categories).toHaveLength(6);
  });

  it('has 18 criteria', () => {
    const spec = loadSpec();
    expect(spec.criteria).toHaveLength(18);
  });

  it('category weights sum to 1.0', () => {
    const spec = loadSpec();
    const total = spec.categories.reduce((sum, c) => sum + c.weight, 0);
    expect(total).toBeCloseTo(1.0, 5);
  });

  it('each category criterion weights sum to 1.0', () => {
    const spec = loadSpec();
    for (const category of spec.categories) {
      const categoryCriteria = spec.criteria.filter(c => c.category === category.id);
      const total = categoryCriteria.reduce((sum, c) => sum + c.weight_in_category, 0);
      expect(total).toBeCloseTo(1.0, 5);
    }
  });
});

describe('getCriterion', () => {
  it('retrieves DP-1 by id', () => {
    const c = getCriterion('DP-1');
    expect(c.id).toBe('DP-1');
    expect(c.category).toBe('DP');
  });

  it('throws for unknown criterion', () => {
    expect(() => getCriterion('INVALID')).toThrow('Unknown criterion');
  });
});

describe('getCategory', () => {
  it('retrieves DP category', () => {
    const cat = getCategory('DP');
    expect(cat.id).toBe('DP');
    expect(cat.weight).toBe(0.20);
  });

  it('throws for unknown category', () => {
    expect(() => getCategory('XX')).toThrow('Unknown category');
  });
});

describe('computeScore', () => {
  function perfectScore(): CriterionResult[] {
    return getCriteria().map(c => ({
      criterion_id: c.id,
      value: 1.0,
      label: 'Perfect',
      evidence: {},
    }));
  }

  function zeroScore(): CriterionResult[] {
    return getCriteria().map(c => ({
      criterion_id: c.id,
      value: 0,
      label: 'Zero',
      evidence: {},
    }));
  }

  it('perfect score across all criteria yields 100', () => {
    const { overall } = computeScore(perfectScore());
    expect(overall).toBeCloseTo(100, 1);
  });

  it('zero score across all criteria yields 0', () => {
    const { overall } = computeScore(zeroScore());
    expect(overall).toBe(0);
  });

  it('perfect score is Platinum tier', () => {
    const { tier } = computeScore(perfectScore());
    expect(tier).toBe('Platinum');
  });

  it('zero score is Failing tier', () => {
    const { tier } = computeScore(zeroScore());
    expect(tier).toBe('Failing');
  });

  it('category scores are between 0 and 100', () => {
    const results = getCriteria().map(c => ({
      criterion_id: c.id,
      value: 0.5,
      label: 'Half',
      evidence: {},
    }));
    const { categoryScores } = computeScore(results);
    for (const score of Object.values(categoryScores)) {
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });

  it('tier reflects per-category floor: all 70 overall but one category at 30 fails Platinum', () => {
    // High scores everywhere except AC
    const results = getCriteria().map(c => ({
      criterion_id: c.id,
      value: c.category === 'AC' ? 0 : 1.0,
      label: c.category === 'AC' ? 'Zero' : 'Perfect',
      evidence: {},
    }));
    const { tier, overall } = computeScore(results);
    // AC is 10% weight — overall will be high but AC is 0
    expect(overall).toBeGreaterThan(80);
    // Should fail Platinum because AC score is below 60
    expect(tier).not.toBe('Platinum');
  });

  it('missing criteria default to 0', () => {
    const { overall } = computeScore([
      { criterion_id: 'DP-1', value: 1.0, label: 'Yes', evidence: {} },
    ]);
    expect(overall).toBeGreaterThan(0);
    expect(overall).toBeLessThan(100);
  });
});
