import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  upsertPlatform,
  getLatestSnapshot,
  saveSnapshot,
  recordChange,
  getPlatformByIdentifier,
  listWatchedPlatforms,
  getChangeHistory,
} from '../src/lib/storage';
import type { DiffResult } from '../src/types';

let testDir: string;

beforeEach(() => {
  testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'carta-test-'));
  process.env.CARTA_TEST_DIR = testDir;
});

afterEach(() => {
  delete process.env.CARTA_TEST_DIR;
  fs.rmSync(testDir, { recursive: true, force: true });
});

const FAKE_DIFF: DiffResult = {
  additions: 3,
  deletions: 1,
  chunks: [{ section: 'Data Sharing', added: ['New line'], removed: ['Old line'] }],
};

describe('upsertPlatform', () => {
  it('creates a new platform entry', () => {
    upsertPlatform('twitter', 'X (Twitter)', 'https://twitter.com/en/tos');
    const p = getPlatformByIdentifier('twitter');
    expect(p).not.toBeNull();
    expect(p?.identifier).toBe('twitter');
    expect(p?.display_name).toBe('X (Twitter)');
  });

  it('updates last_checked_at on second upsert', () => {
    upsertPlatform('twitter', 'X (Twitter)', 'https://twitter.com/en/tos');
    const before = getPlatformByIdentifier('twitter')?.created_at;
    upsertPlatform('twitter', 'X (Twitter)', 'https://twitter.com/en/tos');
    const after = getPlatformByIdentifier('twitter')?.last_checked_at;
    expect(before).toBeDefined();
    expect(after).toBeDefined();
  });

  it('allows multiple different platforms', () => {
    upsertPlatform('twitter', 'X', 'https://twitter.com/en/tos');
    upsertPlatform('github', 'GitHub', 'https://github.com/terms');
    const all = listWatchedPlatforms();
    expect(all).toHaveLength(2);
  });
});

describe('getPlatformByIdentifier', () => {
  it('returns null for unknown platform', () => {
    const row = getPlatformByIdentifier('nonexistent');
    expect(row).toBeNull();
  });

  it('returns the platform after insert', () => {
    upsertPlatform('discord', 'Discord', 'https://discord.com/terms');
    const row = getPlatformByIdentifier('discord');
    expect(row?.display_name).toBe('Discord');
    expect(row?.tos_url).toBe('https://discord.com/terms');
  });
});

describe('snapshots', () => {
  it('getLatestSnapshot returns null when no snapshots exist', () => {
    upsertPlatform('reddit', 'Reddit', 'https://reddit.com/terms');
    const snap = getLatestSnapshot('reddit');
    expect(snap).toBeNull();
  });

  it('saveSnapshot stores content', () => {
    upsertPlatform('reddit', 'Reddit', 'https://reddit.com/terms');
    saveSnapshot('reddit', 'https://reddit.com/terms', 'Hello world', 'abc123');
    const snap = getLatestSnapshot('reddit');
    expect(snap).not.toBeNull();
    expect(snap?.content).toBe('Hello world');
    expect(snap?.hash).toBe('abc123');
  });

  it('saves snapshot without platform being upserted first', () => {
    saveSnapshot('newplatform', 'https://newplatform.com/terms', 'Terms content', 'hashxyz');
    const snap = getLatestSnapshot('newplatform');
    expect(snap?.content).toBe('Terms content');
  });

  it('overwrites previous snapshot on second save', () => {
    saveSnapshot('reddit', 'https://reddit.com/terms', 'First', 'hash1');
    saveSnapshot('reddit', 'https://reddit.com/terms', 'Second', 'hash2');
    const snap = getLatestSnapshot('reddit');
    expect(snap?.content).toBe('Second');
    expect(snap?.hash).toBe('hash2');
  });
});

describe('listWatchedPlatforms', () => {
  it('returns empty array when no platforms watched', () => {
    const list = listWatchedPlatforms();
    expect(list).toHaveLength(0);
  });

  it('returns all inserted platforms sorted by name', () => {
    upsertPlatform('twitter', 'X', 'https://twitter.com/en/tos');
    upsertPlatform('github', 'GitHub', 'https://github.com/terms');
    const list = listWatchedPlatforms();
    expect(list).toHaveLength(2);
    expect(list[0].identifier).toBe('github');
    expect(list[1].identifier).toBe('twitter');
  });
});

describe('recordChange and getChangeHistory', () => {
  it('records a change and retrieves it in history', () => {
    upsertPlatform('slack', 'Slack', 'https://slack.com/terms');
    saveSnapshot('slack', 'https://slack.com/terms', 'Old terms', 'hash_old');
    const oldFetchedAt = getLatestSnapshot('slack')!.fetched_at;
    saveSnapshot('slack', 'https://slack.com/terms', 'New terms', 'hash_new');
    recordChange('slack', oldFetchedAt, FAKE_DIFF);

    const history = getChangeHistory('slack');
    expect(history).toHaveLength(1);
    expect(history[0].additions).toBe(3);
    expect(history[0].deletions).toBe(1);
    expect(history[0].affected_sections).toContain('Data Sharing');
  });

  it('returns empty history when no changes recorded', () => {
    upsertPlatform('slack', 'Slack', 'https://slack.com/terms');
    const history = getChangeHistory('slack');
    expect(history).toHaveLength(0);
  });

  it('records multiple changes and returns them newest-first', () => {
    const diff1 = { ...FAKE_DIFF, additions: 3 };
    const diff2 = { ...FAKE_DIFF, additions: 7, deletions: 2 };

    recordChange('slack', '2026-05-01T00:00:00Z', diff1);
    recordChange('slack', '2026-06-01T00:00:00Z', diff2);

    const history = getChangeHistory('slack');
    expect(history).toHaveLength(2);
    expect(history[0].additions).toBe(7);
  });

  it('filters history by platform identifier', () => {
    recordChange('slack', '2026-05-01T00:00:00Z', FAKE_DIFF);
    recordChange('github', '2026-05-01T00:00:00Z', FAKE_DIFF);

    const slackHistory = getChangeHistory('slack');
    expect(slackHistory).toHaveLength(1);
    expect(slackHistory[0].platform).toBe('slack');
  });
});
