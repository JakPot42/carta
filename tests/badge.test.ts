import { describe, it, expect } from 'vitest';
import { generateBadge, tierColor } from '../src/lib/badge';

describe('generateBadge', () => {
  it('returns a string containing <svg', () => {
    const svg = generateBadge(88.3, 'Platinum', 'Mastodon');
    expect(svg).toContain('<svg');
  });

  it('contains the score text', () => {
    const svg = generateBadge(72.5, 'Gold', 'GitHub');
    expect(svg).toContain('73/100');
  });

  it('contains the tier name', () => {
    const svg = generateBadge(40, 'Bronze', 'Reddit');
    expect(svg).toContain('Bronze');
  });

  it('contains the platform name in title', () => {
    const svg = generateBadge(55, 'Silver', 'Discord');
    expect(svg).toContain('Discord');
  });

  it('contains carta label', () => {
    const svg = generateBadge(88, 'Platinum', 'Test');
    expect(svg).toContain('carta');
  });

  it('closes svg tag', () => {
    const svg = generateBadge(50, 'Silver', 'Test');
    expect(svg).toContain('</svg>');
  });

  it('uses different colors for different tiers', () => {
    const platinum = generateBadge(90, 'Platinum', 'T');
    const failing = generateBadge(10, 'Failing', 'T');
    expect(platinum).not.toBe(failing);
  });
});

describe('tierColor', () => {
  it('returns a hex color for known tiers', () => {
    for (const tier of ['Platinum', 'Gold', 'Silver', 'Bronze', 'Failing']) {
      const color = tierColor(tier);
      expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it('returns a fallback for unknown tier', () => {
    const color = tierColor('Unknown');
    expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
  });
});
