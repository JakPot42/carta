#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import * as fs from 'fs';
import { watchCommand } from './commands/watch';
import { auditCommand } from './commands/audit';
import { scoreCommand } from './commands/score';
import { charterCommand } from './commands/charter';
import { generateBadge } from './lib/badge';
import { findPlatform } from './lib/registry';
import type { WatchOptions } from './commands/watch';

const program = new Command();

program
  .name('carta')
  .description('Open standard and CLI for platform accountability')
  .version('0.1.0');

// carta watch
program
  .command('watch [platform]')
  .description('Watch a platform\'s ToS for changes')
  .option('-u, --url <url>', 'Explicit URL to watch (overrides registry entry)')
  .option('-l, --list', 'List all watched platforms')
  .option('--history', 'Show change history for a platform')
  .addHelpText('after', `
Examples:
  carta watch github            # watch GitHub ToS using registry URL
  carta watch github --history  # show detected changes for GitHub
  carta watch --list            # list all watched platforms
  carta watch openai --url https://openai.com/policies/terms-of-use
`)
  .action(async (platform: string | undefined, opts: WatchOptions) => {
    try {
      await watchCommand(platform, opts);
    } catch (err) {
      console.error(chalk.red('Error:'), (err as Error).message);
      process.exit(1);
    }
  });

// carta audit
program
  .command('audit <platform-url>')
  .description('Interactively audit a platform against the Carta spec')
  .option('-o, --output <file>', 'Output file for audit result', 'carta-audit-result.json')
  .option('--badge', 'Also generate an SVG badge')
  .addHelpText('after', `
Examples:
  carta audit https://twitter.com/en/tos
  carta audit twitter --badge
  carta audit github --output github-audit.json
`)
  .action(async (platformUrl: string, opts: { output: string; badge: boolean }) => {
    try {
      await auditCommand(platformUrl, opts);
    } catch (err) {
      console.error(chalk.red('Error:'), (err as Error).message);
      process.exit(1);
    }
  });

// carta score
program
  .command('score [platform]')
  .description('Look up platform scores from the community registry')
  .option('-a, --all', 'Show all platforms including unaudited ones')
  .addHelpText('after', `
Examples:
  carta score               # show all audited platforms
  carta score mastodon      # detailed score for Mastodon
  carta score --all         # show all platforms in registry
`)
  .action((platform: string | undefined, opts: { all?: boolean }) => {
    try {
      scoreCommand(platform, opts);
    } catch (err) {
      console.error(chalk.red('Error:'), (err as Error).message);
      process.exit(1);
    }
  });

// carta charter
program
  .command('charter')
  .description('Print and save a timestamped Digital Rights Declaration')
  .option('-o, --output <file>', 'Output file for charter JSON', 'carta-charter.json')
  .option('--issuer <name>', 'Your name or GitHub username')
  .action((opts: { output: string; issuer?: string }) => {
    try {
      charterCommand(opts);
    } catch (err) {
      console.error(chalk.red('Error:'), (err as Error).message);
      process.exit(1);
    }
  });

// carta badge
program
  .command('badge <platform-or-audit-file>')
  .description('Generate an SVG badge from a registry entry or audit result file')
  .option('-o, --output <file>', 'Output SVG file')
  .addHelpText('after', `
Examples:
  carta badge mastodon                       # badge from registry
  carta badge carta-audit-result.json        # badge from local audit file
`)
  .action((target: string, opts: { output?: string }) => {
    try {
      let score: number;
      let tier: string;
      let platformName: string;

      if (target.endsWith('.json') && fs.existsSync(target)) {
        const data = JSON.parse(fs.readFileSync(target, 'utf-8'));
        score = data.overall_score;
        tier = data.tier;
        platformName = data.platform;
      } else {
        const entry = findPlatform(target);
        if (!entry?.audit_result) {
          console.error(chalk.red(`No audit result found for "${target}". Run "carta audit" first.`));
          process.exit(1);
        }
        score = entry.audit_result.overall_score;
        tier = entry.audit_result.tier;
        platformName = entry.display_name;
      }

      const svg = generateBadge(score, tier, platformName);
      const outputPath = opts.output ?? `carta-${target.replace(/[^a-z0-9]/gi, '-')}-badge.svg`;
      fs.writeFileSync(outputPath, svg);
      console.log(chalk.green(`Badge saved to ${outputPath}`));
      console.log(chalk.gray(`Score: ${score}/100 — ${tier}`));
    } catch (err) {
      console.error(chalk.red('Error:'), (err as Error).message);
      process.exit(1);
    }
  });

program.parse();
