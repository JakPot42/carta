import * as cheerio from 'cheerio';
import { createHash } from 'crypto';

const MAIN_SELECTORS = [
  'main', 'article', '[role="main"]', '#main-content',
  '#content', '.main-content', '.content', '.terms', '.privacy-policy', '.legal-content',
];
const STRIP_TAGS = ['script', 'style', 'nav', 'header', 'footer', 'aside', 'noscript', 'iframe'];
const HEADING_TAGS = ['h1', 'h2', 'h3', 'h4'];

export function parseToS(html: string, _url: string): string {
  const $ = cheerio.load(html);

  STRIP_TAGS.forEach(sel => $(sel).remove());

  // Pick the best content container — single expression avoids type reassignment mismatch
  const contentSel = MAIN_SELECTORS.find(sel => $(sel).length > 0) ?? 'body';
  const $content = $(contentSel).first();

  // Replace heading elements with markdown-style markers before text extraction
  HEADING_TAGS.forEach((tag, level) => {
    $content.find(tag).each((_i, el) => {
      const text = $(el).text().trim();
      if (text) {
        $(el).replaceWith('\n' + '#'.repeat(level + 1) + ' ' + text + '\n');
      }
    });
  });

  const raw = $content.text();

  return raw
    .split('\n')
    .map(l => l.trimEnd())
    .filter((l, i, arr) => !(l === '' && (i === 0 || arr[i - 1] === '')))
    .join('\n')
    .trim();
}

export function computeHash(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}
