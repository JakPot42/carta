import chalk from 'chalk';
import { listPlatforms, listAuditedPlatforms, findPlatform } from '../lib/registry';
import { getCategories } from '../lib/spec';

export interface ScoreOptions {
  all?: boolean;
}

export function scoreCommand(platformArg: string | undefined, opts: ScoreOptions): void {
  if (platformArg) {
    showPlatformScore(platformArg);
  } else {
    showScoreTable(opts.all ?? false);
  }
}

function showPlatformScore(platformArg: string): void {
  const entry = findPlatform(platformArg);
  if (!entry) {
    console.log(chalk.red(`Unknown platform: "${platformArg}"`));
    console.log(chalk.gray('Run "carta score" to see all platforms in the registry.'));
    process.exit(1);
  }

  if (!entry.audit_result) {
    console.log(chalk.yellow(`\n  ${entry.display_name} — not yet audited`));
    console.log(chalk.gray(`  ToS: ${entry.tos_url}`));
    console.log(chalk.gray('\n  To run an audit: carta audit ' + entry.tos_url));
    console.log(chalk.gray('  To submit an audit to the community registry, open a PR at github.com/JakPot42/carta'));
    return;
  }

  const result = entry.audit_result;
  const categories = getCategories();

  console.log(chalk.bold(`\n  ${entry.display_name}\n`));
  console.log(chalk.gray(`  Audited:  ${result.audited_at.slice(0, 10)}`));
  console.log(chalk.gray(`  By:       ${result.audited_by}`));
  console.log(chalk.gray(`  Method:   ${result.audit_method}`));
  console.log();

  for (const cat of categories) {
    const score = result.category_scores[cat.id] ?? 0;
    const bar = scoreBar(score);
    console.log(`  ${cat.id.padEnd(4)} ${cat.name.padEnd(22)} ${bar} ${scoreColor(score)(score.toFixed(1).padStart(5))}`);
  }

  console.log();
  console.log(chalk.bold(`  Overall:  ${scoreColor(result.overall_score)(result.overall_score.toFixed(1))} / 100`));
  console.log(chalk.bold(`  Tier:     ${tierLabel(result.tier)}`));

  if (result.notes) {
    console.log();
    console.log(chalk.dim(`  Notes: ${result.notes}`));
  }

  console.log();
  console.log(chalk.gray('  To embed a badge in your README:'));
  console.log(chalk.dim(`  carta badge ${entry.id}`));
  console.log();
}

function showScoreTable(showAll: boolean): void {
  const platforms = showAll ? listPlatforms() : listAuditedPlatforms();

  if (platforms.length === 0) {
    console.log(chalk.gray('\n  No audited platforms in the registry yet.'));
    console.log(chalk.gray('  Run "carta audit <url>" to create one.\n'));
    return;
  }

  console.log(chalk.bold('\n  Carta Platform Registry\n'));
  console.log(chalk.dim('  ' + '─'.repeat(72)));
  console.log(chalk.dim('  ' + 'Platform'.padEnd(24) + 'Score'.padStart(8) + '  ' + 'Tier'.padEnd(12) + 'Audited'.padStart(12)));
  console.log(chalk.dim('  ' + '─'.repeat(72)));

  for (const p of platforms) {
    if (!p.audit_result) {
      if (showAll) {
        console.log(`  ${p.display_name.padEnd(24)}${'—'.padStart(8)}  ${'unaudited'.padEnd(12)}`);
      }
      continue;
    }

    const r = p.audit_result;
    const scoreStr = r.overall_score.toFixed(1);
    const date = r.audited_at.slice(0, 10);
    console.log(
      `  ${p.display_name.padEnd(24)}` +
      scoreColor(r.overall_score)(scoreStr.padStart(8)) +
      `  ${tierLabel(r.tier).padEnd(12)}` +
      chalk.dim(date.padStart(12))
    );
  }

  console.log(chalk.dim('  ' + '─'.repeat(72)));
  console.log();

  if (!showAll) {
    const total = listPlatforms().length;
    const audited = listAuditedPlatforms().length;
    if (total > audited) {
      console.log(chalk.gray(`  ${total - audited} more platforms in registry without scores. Run "carta score --all" to see all.`));
    }
  }

  console.log(chalk.gray('  Submit an audit: github.com/JakPot42/carta\n'));
}

function scoreBar(score: number): string {
  const filled = Math.round(score / 10);
  return chalk.dim('[') + '█'.repeat(filled) + chalk.dim('░'.repeat(10 - filled)) + chalk.dim(']');
}

function scoreColor(score: number): (s: string) => string {
  if (score >= 85) return chalk.bold.green;
  if (score >= 70) return chalk.green;
  if (score >= 50) return chalk.yellow;
  if (score >= 30) return chalk.red;
  return chalk.bold.red;
}

function tierLabel(tier: string): string {
  const colors: Record<string, (s: string) => string> = {
    Platinum: chalk.bold.white,
    Gold: chalk.bold.yellow,
    Silver: (s) => chalk.bold(s),
    Bronze: chalk.bold.red,
    Failing: chalk.bold.bgRed,
  };
  return (colors[tier] ?? chalk.white)(tier);
}
