import { describe, it, expect } from 'vitest';
import { parseToS, computeHash } from '../src/lib/parser';

const SIMPLE_TOS = `
<html>
<head><title>Terms of Service</title></head>
<body>
  <nav><a href="/">Home</a></nav>
  <main>
    <h1>Terms of Service</h1>
    <h2>Data We Collect</h2>
    <p>We collect your email address and usage data.</p>
    <h2>How We Use Data</h2>
    <p>We use your data to provide and improve the service.</p>
    <p>We may share data with third-party partners.</p>
  </main>
  <footer>Copyright 2026</footer>
</body>
</html>
`;

const SPA_LIKE = `
<html>
<body>
  <div id="content">
    <h2>Privacy Policy</h2>
    <p>Your data is yours.</p>
  </div>
  <script>window.__data = {}</script>
  <style>.hidden { display: none; }</style>
</body>
</html>
`;

describe('parseToS', () => {
  it('strips nav and footer', () => {
    const result = parseToS(SIMPLE_TOS, 'https://example.com/tos');
    expect(result).not.toContain('Home');
    expect(result).not.toContain('Copyright');
  });

  it('strips script and style tags', () => {
    const result = parseToS(SPA_LIKE, 'https://example.com');
    expect(result).not.toContain('window.__data');
    expect(result).not.toContain('.hidden');
  });

  it('preserves headings with # prefix', () => {
    const result = parseToS(SIMPLE_TOS, 'https://example.com/tos');
    expect(result).toContain('# Terms of Service');
    expect(result).toContain('## Data We Collect');
    expect(result).toContain('## How We Use Data');
  });

  it('preserves paragraph text', () => {
    const result = parseToS(SIMPLE_TOS, 'https://example.com/tos');
    expect(result).toContain('We collect your email address');
    expect(result).toContain('third-party partners');
  });

  it('prefers main element over body', () => {
    const result = parseToS(SIMPLE_TOS, 'https://example.com/tos');
    expect(result).not.toContain('Copyright');
  });

  it('falls back to body when no main element', () => {
    const html = '<html><body><p>Just a paragraph</p></body></html>';
    const result = parseToS(html, 'https://example.com');
    expect(result).toContain('Just a paragraph');
  });

  it('handles empty document gracefully', () => {
    const result = parseToS('<html><body></body></html>', 'https://example.com');
    expect(typeof result).toBe('string');
  });

  it('collapses consecutive blank lines', () => {
    const html = '<html><body><main><p>A</p><p>B</p><p>C</p></main></body></html>';
    const result = parseToS(html, 'https://example.com');
    expect(result).not.toMatch(/\n\n\n/);
  });

  it('id-based content selector', () => {
    const result = parseToS(SPA_LIKE, 'https://example.com');
    expect(result).toContain('Your data is yours');
  });
});

describe('computeHash', () => {
  it('returns consistent hash for same input', () => {
    const h1 = computeHash('hello world');
    const h2 = computeHash('hello world');
    expect(h1).toBe(h2);
  });

  it('returns different hash for different input', () => {
    const h1 = computeHash('hello world');
    const h2 = computeHash('hello world!');
    expect(h1).not.toBe(h2);
  });

  it('returns 64 hex characters (sha256)', () => {
    const h = computeHash('test');
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });
});
