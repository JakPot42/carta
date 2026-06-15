import * as fs from 'fs';
import chalk from 'chalk';

const DECLARATIONS = [
  'I have the right to export my personal data, including inferred and derived data, in an open, machine-readable format.',
  'I have the right to delete my account and all associated data, including copies held by third parties at the platform\'s direction, within a bounded and stated timeframe.',
  'I have the right to advance notice of at least 30 days before any material change to the terms of service becomes binding.',
  'I have the right to receive direct notification — not merely a webpage update — when the platform changes terms that affect my rights.',
  'I have the right to know what data the platform shares with third parties, for what purpose, and to opt out of non-essential sharing.',
  'I have the right to refuse the sale of my personal data to data brokers or third-party advertising networks.',
  'I have the right to know whether an algorithm determines what content I see, how it works, and to use a non-algorithmic alternative.',
  'I have the right to appeal any automated decision — including content removal, account suspension, or demonetization — to a human reviewer.',
  'I have the right to switch to a competing platform without losing the ability to communicate with those I connected with here.',
  'I have the right to build tools on top of this platform\'s public API, with committed advance notice before any API deprecation.',
];

export interface CharterOptions {
  output?: string;
  issuer?: string;
}

export function charterCommand(opts: CharterOptions): void {
  const issuedAt = new Date().toISOString();
  const issuer = opts.issuer ?? 'anonymous';

  const charter = {
    title: 'Carta Digital Rights Declaration',
    spec_version: '1.0.0',
    issued_at: issuedAt,
    issuer,
    preamble: 'Technology platforms hold power over the digital lives of billions of people through contracts they write unilaterally, change without notice, and enforce without appeal. The Magna Carta\'s key move was forcing power to submit to written, verifiable, third-party-enforceable law. Carta makes platform power subject to a standard a machine can audit. The following rights are not aspirational — they are the minimum conditions for human dignity in a networked world.',
    declarations: DECLARATIONS.map((text, i) => ({
      id: `RIGHT-${String(i + 1).padStart(2, '0')}`,
      text,
    })),
    footer: 'This declaration is issued under the Carta specification v1.0.0. Platforms can demonstrate compliance by submitting a carta-audit-result.json to the community registry at github.com/JakPot42/carta.',
  };

  const outputPath = opts.output ?? 'carta-charter.json';
  fs.writeFileSync(outputPath, JSON.stringify(charter, null, 2));

  console.log(chalk.bold('\ncarta — Digital Rights Declaration\n'));
  console.log(chalk.dim('━'.repeat(60)));
  console.log();
  console.log(chalk.italic(charter.preamble));
  console.log();
  console.log(chalk.dim('━'.repeat(60)));
  console.log();

  for (const declaration of charter.declarations) {
    console.log(chalk.bold.cyan(`  ${declaration.id}`));
    console.log(`  ${declaration.text}`);
    console.log();
  }

  console.log(chalk.dim('━'.repeat(60)));
  console.log(chalk.dim(`\n  Issued: ${issuedAt}`));
  console.log(chalk.dim(`  By:     ${issuer}`));
  console.log(chalk.dim(`  Spec:   carta v1.0.0\n`));
  console.log(chalk.green(`  Saved to ${outputPath}\n`));
}
