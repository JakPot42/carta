import chalk from 'chalk';
import ora from 'ora';
import { format } from 'date-fns';
import { fetchPage, FetchError } from '../lib/fetcher';
import { parseToS, computeHash } from '../lib/parser';
import { computeDiff } from '../lib/differ';
import { findPlatform } from '../lib/registry';
import {
  upsertPlatform,
  getLatestSnapshot,
  saveSnapshot,
  recordChange,
  listWatchedPlatforms,
  getChangeHistory,
  getPlatformByIdentifier,
} from '../lib/storage';
import type { DiffChunk } from '../types';

export interface WatchOptions {
  url?: string;
  list?: boolean;
  history?: boolean;
}

export async function watchCommand(platform: string | undefined, opts: WatchOptions): Promise<void> {
  if (opts.list || !platform) {
    showWatchedList();
    return;
  }

  if (opts.history) {
    showHistory(platform);
    return;
  }

  await doWatch(platform, opts.url);
}

function showWatchedList(): void {
  const platforms = listWatchedPlatforms();
  if (platforms.length === 0) {
    console.log(chalk.gray('No platforms watched yet. Run: carta watch <platform>'));
    return;
  }

  console.log(chalk.bold('\nWatched platforms\n'));
  for (const p of platforms) {
    const lastCheck = p.last_checked_at
      ? format(new Date(p.last_checked_at), 'yyyy-MM-dd HH:mm')
      : 'never re-checked';
    console.log(`  ${chalk.cyan(p.identifier.padEnd(20))} ${chalk.gray(lastCheck)}`);
    console.log(`    ${chalk.dim(p.tos_url)}`);
  }
  console.log();
}

function showHistory(platformIdentifier: string): void {
  const platform = getPlatformByIdentifier(platformIdentifier);
  if (!platform) {
    console.log(chalk.red(`Platform "${platformIdentifier}" not found in watch list.`));
    process.exit(1);
  }

  const history = getChangeHistory(platformIdentifier);
  if (history.length === 0) {
    console.log(chalk.gray(`No changes detected yet for ${platform.display_name}.`));
    return;
  }

  console.log(chalk.bold(`\nChange history — ${platform.display_name}\n`));
  for (const change of history) {
    const date = format(new Date(change.detected_at), 'yyyy-MM-dd');
    console.log(`  ${chalk.yellow(date)}  ${chalk.green('+' + change.additions)} ${chalk.red('-' + change.deletions)}`);
    if (change.affected_sections.length > 0) {
      console.log(`    Sections: ${chalk.dim(change.affected_sections.join(', '))}`);
    }
  }
  console.log();
}

async function doWatch(platformArg: string, explicitUrl?: string): Promise<void> {
  const spinner = ora('Resolving platform...').start();

  let tosUrl: string;
  let displayName: string;
  let identifier: string;

  if (explicitUrl) {
    tosUrl = explicitUrl;
    identifier = platformArg.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    displayName = platformArg;
  } else {
    const entry = findPlatform(platformArg);
    if (!entry) {
      spinner.fail(`Unknown platform: "${platformArg}"`);
      console.log(chalk.gray('  Use --url to specify a ToS URL, or run: carta score --all'));
      process.exit(1);
    }
    tosUrl = entry.tos_url;
    displayName = entry.display_name;
    identifier = entry.id;
  }

  upsertPlatform(identifier, displayName, tosUrl);

  spinner.text = `Fetching ${tosUrl}`;

  let html: string;
  try {
    html = await fetchPage(tosUrl);
  } catch (err) {
    if (err instanceof FetchError) {
      spinner.fail('Could not fetch ToS page.');
      console.log(chalk.red(`  ${err.message}`));
      if (err.statusCode === 403 || err.statusCode === 401) {
        console.log(chalk.gray('  This platform may block automated fetching. Try --url with a direct link.'));
      }
      process.exit(1);
    }
    throw err;
  }

  spinner.text = 'Parsing content...';
  const text = parseToS(html, tosUrl);
  const hash = computeHash(text);

  const existing = getLatestSnapshot(identifier);

  if (!existing) {
    saveSnapshot(identifier, tosUrl, text, hash);
    spinner.succeed(chalk.green(`First snapshot saved — ${displayName}`));
    console.log(chalk.gray(`  URL:  ${tosUrl}`));
    console.log(chalk.gray(`  Size: ${text.split('\n').length} lines`));
    console.log(chalk.gray(`  Run again to check for changes.`));
    return;
  }

  if (existing.hash === hash) {
    spinner.succeed(chalk.green('No changes detected.'));
    console.log(chalk.gray(`  ${displayName} — last snapshot: ${format(new Date(existing.fetched_at), 'yyyy-MM-dd HH:mm')}`));
    return;
  }

  spinner.succeed(chalk.yellow(`Changes detected — ${displayName}`));
  const diff = computeDiff(existing.content, text);
  saveSnapshot(identifier, tosUrl, text, hash);
  recordChange(identifier, existing.fetched_at, diff);

  displayDiff(diff, existing.fetched_at, displayName);
}

function displayDiff(diff: { additions: number; deletions: number; chunks: DiffChunk[] }, previousDate: string, name: string): void {
  const prev = format(new Date(previousDate), 'yyyy-MM-dd HH:mm');
  const now = format(new Date(), 'yyyy-MM-dd HH:mm');

  console.log();
  console.log(chalk.bold(`  ${name} ToS changed`));
  console.log(chalk.gray(`  ${prev} → ${now}`));
  console.log();

  for (const chunk of diff.chunks) {
    const divider = chalk.dim('  ' + '─'.repeat(60));
    console.log(divider);
    if (chunk.section && chunk.section !== '(preamble)') {
      console.log(chalk.bold.white(`  § ${chunk.section}`));
    }
    console.log(divider);

    for (const line of chunk.removed) {
      if (line.trim()) console.log(chalk.red(`  - ${line}`));
    }
    for (const line of chunk.added) {
      if (line.trim()) console.log(chalk.green(`  + ${line}`));
    }
    console.log();
  }

  const summary = [];
  if (diff.additions > 0) summary.push(chalk.green(`+${diff.additions} lines added`));
  if (diff.deletions > 0) summary.push(chalk.red(`-${diff.deletions} lines removed`));
  console.log(`  Summary: ${summary.join(', ')}`);
  console.log(chalk.gray('  New snapshot saved.'));
  console.log();
}
