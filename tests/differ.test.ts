import { describe, it, expect } from 'vitest';
import { computeDiff } from '../src/lib/differ';

const OLD_TOS = `## Data Collection

We collect your email address.
We collect your usage data.

## Data Sharing

We do not sell your data.
We share data only with service providers.
`;

const NEW_TOS_MINOR = `## Data Collection

We collect your email address.
We collect your usage data.

## Data Sharing

We do not sell your data.
We share data with service providers and advertising partners.
`;

const NEW_TOS_MAJOR = `## Data Collection

We collect your email address.
We collect your usage data.
We collect your biometric identifiers.

## Data Sharing

We sell your data to third parties.
We share data with advertising networks in 50 countries.
`;

const IDENTICAL = `## Terms

Same content here.
`;

describe('computeDiff', () => {
  it('returns zero additions/deletions for identical text', () => {
    const diff = computeDiff(IDENTICAL, IDENTICAL);
    expect(diff.additions).toBe(0);
    expect(diff.deletions).toBe(0);
    expect(diff.chunks).toHaveLength(0);
  });

  it('counts additions correctly', () => {
    const diff = computeDiff(OLD_TOS, NEW_TOS_MAJOR);
    expect(diff.additions).toBeGreaterThan(0);
  });

  it('counts deletions correctly', () => {
    const diff = computeDiff(OLD_TOS, NEW_TOS_MAJOR);
    expect(diff.deletions).toBeGreaterThan(0);
  });

  it('produces chunks for changed content', () => {
    const diff = computeDiff(OLD_TOS, NEW_TOS_MINOR);
    expect(diff.chunks.length).toBeGreaterThan(0);
  });

  it('identifies section names in chunks', () => {
    const diff = computeDiff(OLD_TOS, NEW_TOS_MINOR);
    const sections = diff.chunks.map(c => c.section);
    expect(sections.some(s => s.toLowerCase().includes('data sharing'))).toBe(true);
  });

  it('captures added lines', () => {
    const diff = computeDiff(OLD_TOS, NEW_TOS_MAJOR);
    const allAdded = diff.chunks.flatMap(c => c.added);
    expect(allAdded.some(l => l.includes('biometric'))).toBe(true);
  });

  it('captures removed lines', () => {
    const diff = computeDiff(OLD_TOS, NEW_TOS_MAJOR);
    const allRemoved = diff.chunks.flatMap(c => c.removed);
    expect(allRemoved.some(l => l.includes('do not sell'))).toBe(true);
  });

  it('handles empty old text (all additions)', () => {
    const diff = computeDiff('', 'New content\nLine 2\n');
    expect(diff.additions).toBeGreaterThan(0);
    expect(diff.deletions).toBe(0);
  });

  it('handles empty new text (all deletions)', () => {
    const diff = computeDiff('Old content\nLine 2\n', '');
    expect(diff.deletions).toBeGreaterThan(0);
    expect(diff.additions).toBe(0);
  });

  it('minor change produces fewer total lines than major change', () => {
    const minor = computeDiff(OLD_TOS, NEW_TOS_MINOR);
    const major = computeDiff(OLD_TOS, NEW_TOS_MAJOR);
    const minorTotal = minor.additions + minor.deletions;
    const majorTotal = major.additions + major.deletions;
    expect(majorTotal).toBeGreaterThan(minorTotal);
  });
});
