import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { DiffResult } from '../types';

function cartaDir(): string {
  return process.env.CARTA_TEST_DIR ?? path.join(os.homedir(), '.carta');
}

function ensureDirs(): void {
  fs.mkdirSync(path.join(cartaDir(), 'snapshots'), { recursive: true });
}

export interface WatchedPlatformRow {
  identifier: string;
  display_name: string;
  tos_url: string;
  privacy_url?: string;
  created_at: string;
  last_checked_at?: string;
}

interface SnapshotMeta {
  hash: string;
  fetched_at: string;
  url: string;
}

export interface ChangeRecord {
  platform: string;
  detected_at: string;
  additions: number;
  deletions: number;
  affected_sections: string[];
  old_fetched_at: string;
  new_fetched_at: string;
}

export interface SnapshotResult {
  hash: string;
  content: string;
  fetched_at: string;
}

function watchedFilePath(): string {
  return path.join(cartaDir(), 'watched.json');
}

function changesFilePath(): string {
  return path.join(cartaDir(), 'changes.json');
}

function snapshotContentPath(identifier: string): string {
  return path.join(cartaDir(), 'snapshots', `${identifier}.txt`);
}

function snapshotMetaPath(identifier: string): string {
  return path.join(cartaDir(), 'snapshots', `${identifier}.meta.json`);
}

function loadWatched(): WatchedPlatformRow[] {
  ensureDirs();
  const p = watchedFilePath();
  if (!fs.existsSync(p)) return [];
  return JSON.parse(fs.readFileSync(p, 'utf-8')) as WatchedPlatformRow[];
}

function saveWatched(platforms: WatchedPlatformRow[]): void {
  fs.writeFileSync(watchedFilePath(), JSON.stringify(platforms, null, 2), 'utf-8');
}

function loadChanges(): ChangeRecord[] {
  ensureDirs();
  const p = changesFilePath();
  if (!fs.existsSync(p)) return [];
  return JSON.parse(fs.readFileSync(p, 'utf-8')) as ChangeRecord[];
}

function saveChanges(changes: ChangeRecord[]): void {
  fs.writeFileSync(changesFilePath(), JSON.stringify(changes, null, 2), 'utf-8');
}

export function upsertPlatform(identifier: string, displayName: string, tosUrl: string, privacyUrl?: string): void {
  const platforms = loadWatched();
  const existing = platforms.find(p => p.identifier === identifier);
  if (existing) {
    existing.last_checked_at = new Date().toISOString();
    saveWatched(platforms);
    return;
  }
  platforms.push({
    identifier,
    display_name: displayName,
    tos_url: tosUrl,
    privacy_url: privacyUrl,
    created_at: new Date().toISOString(),
  });
  saveWatched(platforms);
}

export function getLatestSnapshot(identifier: string): SnapshotResult | null {
  const contentPath = snapshotContentPath(identifier);
  const metaPath = snapshotMetaPath(identifier);
  if (!fs.existsSync(contentPath) || !fs.existsSync(metaPath)) return null;
  const content = fs.readFileSync(contentPath, 'utf-8');
  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8')) as SnapshotMeta;
  return { hash: meta.hash, content, fetched_at: meta.fetched_at };
}

export function saveSnapshot(identifier: string, url: string, content: string, hash: string): void {
  ensureDirs();
  const meta: SnapshotMeta = { hash, fetched_at: new Date().toISOString(), url };
  fs.writeFileSync(snapshotContentPath(identifier), content, 'utf-8');
  fs.writeFileSync(snapshotMetaPath(identifier), JSON.stringify(meta, null, 2), 'utf-8');
}

export function recordChange(identifier: string, oldFetchedAt: string, diff: DiffResult): void {
  const changes = loadChanges();
  changes.push({
    platform: identifier,
    detected_at: new Date().toISOString(),
    additions: diff.additions,
    deletions: diff.deletions,
    affected_sections: [...new Set(diff.chunks.map(c => c.section))],
    old_fetched_at: oldFetchedAt,
    new_fetched_at: new Date().toISOString(),
  });
  saveChanges(changes);
}

export function listWatchedPlatforms(): WatchedPlatformRow[] {
  return loadWatched().sort((a, b) => a.display_name.localeCompare(b.display_name));
}

export function getPlatformByIdentifier(identifier: string): WatchedPlatformRow | null {
  return loadWatched().find(p => p.identifier === identifier) ?? null;
}

export function getChangeHistory(identifier: string): ChangeRecord[] {
  return loadChanges()
    .filter(c => c.platform === identifier)
    .sort((a, b) => b.detected_at.localeCompare(a.detected_at));
}
