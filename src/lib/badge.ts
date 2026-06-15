import { loadSpec } from './spec';

const TIER_COLORS: Record<string, string> = {
  Platinum: '#94a3b8',
  Gold:     '#f59e0b',
  Silver:   '#9ca3af',
  Bronze:   '#b45309',
  Failing:  '#dc2626',
};

const LABEL_BG = '#1e293b';
const TEXT_COLOR = '#ffffff';

export function generateBadge(score: number, tier: string, platform: string): string {
  const tierColor = TIER_COLORS[tier] ?? '#6b7280';
  const scoreText = `${Math.round(score)}/100`;
  const tierText = tier;
  const labelText = 'carta';

  const labelWidth = 48;
  const scoreWidth = 52;
  const tierWidth = tier.length * 7 + 16;
  const totalWidth = labelWidth + scoreWidth + tierWidth;
  const height = 20;
  const y = 14;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${height}" role="img" aria-label="carta: ${score}/100 ${tier}">
  <title>carta: ${platform} scores ${score}/100 — ${tier}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${totalWidth}" height="${height}" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="${height}" fill="${LABEL_BG}"/>
    <rect x="${labelWidth}" width="${scoreWidth}" height="${height}" fill="#334155"/>
    <rect x="${labelWidth + scoreWidth}" width="${tierWidth}" height="${height}" fill="${tierColor}"/>
    <rect width="${totalWidth}" height="${height}" fill="url(#s)"/>
  </g>
  <g fill="${TEXT_COLOR}" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
    <text x="${labelWidth / 2}" y="${y}" fill="#000" fill-opacity=".3" clip-path="url(#r)">${labelText}</text>
    <text x="${labelWidth / 2}" y="${y - 1}" clip-path="url(#r)">${labelText}</text>
    <text x="${labelWidth + scoreWidth / 2}" y="${y}" fill="#000" fill-opacity=".3" clip-path="url(#r)">${scoreText}</text>
    <text x="${labelWidth + scoreWidth / 2}" y="${y - 1}" clip-path="url(#r)">${scoreText}</text>
    <text x="${labelWidth + scoreWidth + tierWidth / 2}" y="${y}" fill="#000" fill-opacity=".3" clip-path="url(#r)">${tierText}</text>
    <text x="${labelWidth + scoreWidth + tierWidth / 2}" y="${y - 1}" clip-path="url(#r)">${tierText}</text>
  </g>
</svg>`;
}

export function tierColor(tier: string): string {
  return TIER_COLORS[tier] ?? '#6b7280';
}
