import { describe, it, expect } from 'vitest';
import { loadRegistry, findPlatform, listPlatforms, listAuditedPlatforms } from '../src/lib/registry';

describe('loadRegistry', () => {
  it('loads without error', () => {
    expect(() => loadRegistry()).not.toThrow();
  });

  it('has version field', () => {
    const registry = loadRegistry();
    expect(registry.version).toBe('1.0.0');
  });

  it('has at least 10 platforms', () => {
    const registry = loadRegistry();
    expect(registry.platforms.length).toBeGreaterThanOrEqual(10);
  });
});

describe('findPlatform', () => {
  it('finds by id', () => {
    const p = findPlatform('github');
    expect(p).not.toBeNull();
    expect(p?.id).toBe('github');
  });

  it('finds by alias (domain)', () => {
    const p = findPlatform('github.com');
    expect(p).not.toBeNull();
    expect(p?.id).toBe('github');
  });

  it('finds by alias (twitter.com)', () => {
    const p = findPlatform('twitter.com');
    expect(p).not.toBeNull();
    expect(p?.id).toBe('twitter');
  });

  it('finds x.com as twitter', () => {
    const p = findPlatform('x.com');
    expect(p).not.toBeNull();
    expect(p?.id).toBe('twitter');
  });

  it('is case-insensitive', () => {
    const p = findPlatform('GITHUB');
    expect(p).not.toBeNull();
    expect(p?.id).toBe('github');
  });

  it('returns null for unknown platform', () => {
    const p = findPlatform('totally-unknown-platform-xyz');
    expect(p).toBeNull();
  });

  it('finds mastodon which has an audit result', () => {
    const p = findPlatform('mastodon');
    expect(p).not.toBeNull();
    expect(p?.audit_result).not.toBeNull();
  });
});

describe('listAuditedPlatforms', () => {
  it('returns only platforms with audit results', () => {
    const audited = listAuditedPlatforms();
    for (const p of audited) {
      expect(p.audit_result).not.toBeNull();
    }
  });

  it('mastodon is in audited list', () => {
    const audited = listAuditedPlatforms();
    expect(audited.some(p => p.id === 'mastodon')).toBe(true);
  });

  it('unaudited platforms are not included', () => {
    const audited = listAuditedPlatforms();
    expect(audited.some(p => p.id === 'twitter')).toBe(false);
  });
});

describe('listPlatforms', () => {
  it('returns all platforms including unaudited', () => {
    const all = listPlatforms();
    const audited = listAuditedPlatforms();
    expect(all.length).toBeGreaterThan(audited.length);
  });
});
