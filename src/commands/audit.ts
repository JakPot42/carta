import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { getCriteria, getCategories, computeScore } from '../lib/spec';
import { findPlatform } from '../lib/registry';
import { generateBadge } from '../lib/badge';
import type { CriterionResult } from '../types';

export interface AuditOptions {
  platform?: string;
  output?: string;
  badge?: boolean;
}

export async function auditCommand(platformUrl: string, opts: AuditOptions): Promise<void> {
  const criteria = getCriteria();
  const categories = getCategories();

  console.log(chalk.bold('\ncarta audit — interactive guided audit\n'));
  console.log(chalk.gray('Read the platform\'s ToS and privacy policy, then answer each criterion.'));
  console.log(chalk.gray('Tip: open the ToS in your browser as you go through this.\n'));

  // Resolve platform info
  const entry = findPlatform(platformUrl) ?? { display_name: platformUrl, tos_url: platformUrl, id: platformUrl };
  console.log(chalk.cyan(`Platform: ${entry.display_name}`));
  console.log(chalk.gray(`ToS URL:  ${'tos_url' in entry ? entry.tos_url : platformUrl}\n`));

  const { auditor } = await inquirer.prompt<{ auditor: string }>([{
    type: 'input',
    name: 'auditor',
    message: 'Your GitHub username or organization (for attribution):',
    default: 'anonymous',
  }]);

  const results: CriterionResult[] = [];

  for (const category of categories) {
    console.log('\n' + chalk.bold.underline(`\n${category.name.toUpperCase()} — ${category.description}`));
    const categoryCriteria = criteria.filter(c => c.category === category.id);

    for (const criterion of categoryCriteria) {
      console.log(`\n  ${chalk.bold(criterion.id + ' — ' + criterion.name)}`);
      console.log(chalk.dim(`  ${criterion.description}`));
      console.log(chalk.italic.gray('\n  Why it matters: ' + criterion.why_this_matters.slice(0, 150) + '...'));
      console.log(chalk.dim('\n  How to audit: ' + criterion.how_to_audit.slice(0, 200) + '...\n'));

      const rubricChoices = criterion.rubric.map(r => ({
        name: `${r.value.toFixed(2)} — ${r.label}: ${r.description.slice(0, 80)}${r.description.length > 80 ? '...' : ''}`,
        value: r.value,
      }));

      const { value, notes } = await inquirer.prompt<{ value: number; notes: string }>([
        {
          type: 'list',
          name: 'value',
          message: `  Score for ${criterion.id}:`,
          choices: rubricChoices,
        },
        {
          type: 'input',
          name: 'notes',
          message: '  Evidence URL or notes (optional):',
          default: '',
        },
      ]);

      const rubricEntry = criterion.rubric.find(r => r.value === value)!;
      results.push({
        criterion_id: criterion.id,
        value,
        label: rubricEntry.label,
        evidence: {},
        notes: notes || undefined,
      });
    }
  }

  const { categoryScores, overall, tier } = computeScore(results);

  console.log('\n' + chalk.bold('━'.repeat(60)));
  console.log(chalk.bold(`\nAudit complete — ${entry.display_name}\n`));

  for (const category of categories) {
    const score = categoryScores[category.id] ?? 0;
    const bar = scoreBar(score);
    console.log(`  ${category.id.padEnd(4)} ${category.name.padEnd(22)} ${bar} ${scoreColor(score)(score.toFixed(1).padStart(5))}`);
  }

  console.log();
  console.log(chalk.bold(`  Overall:  ${scoreColor(overall)(overall.toFixed(1))} / 100`));
  console.log(chalk.bold(`  Tier:     ${tierLabel(tier)}`));
  console.log();

  const auditResult = {
    carta_version: '1.0.0',
    platform: entry.id ?? platformUrl,
    platform_url: platformUrl,
    tos_url: 'tos_url' in entry ? entry.tos_url : platformUrl,
    audited_at: new Date().toISOString(),
    audited_by: auditor,
    audit_method: 'manual' as const,
    notes: '',
    criteria_results: results,
    category_scores: categoryScores,
    overall_score: overall,
    tier,
  };

  const outputPath = opts.output ?? 'carta-audit-result.json';
  fs.writeFileSync(outputPath, JSON.stringify(auditResult, null, 2));
  console.log(chalk.green(`  Audit saved to ${outputPath}`));

  if (opts.badge) {
    const svg = generateBadge(overall, tier, entry.display_name ?? platformUrl);
    const badgePath = outputPath.replace('.json', '-badge.svg');
    fs.writeFileSync(badgePath, svg);
    console.log(chalk.green(`  Badge saved to ${badgePath}`));
  }
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
    Silver: chalk.bold.gray,
    Bronze: chalk.bold.red,
    Failing: chalk.bold.bgRed,
  };
  return (colors[tier] ?? chalk.white)(tier);
}
