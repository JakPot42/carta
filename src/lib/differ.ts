import { diffLines, Change } from 'diff';
import type { DiffResult, DiffChunk } from '../types';

const CONTEXT_LINES = 3;

export function computeDiff(oldText: string, newText: string): DiffResult {
  const changes: Change[] = diffLines(oldText, newText);

  let additions = 0;
  let deletions = 0;

  for (const c of changes) {
    if (c.added) additions += (c.count ?? 1);
    if (c.removed) deletions += (c.count ?? 1);
  }

  const chunks = buildChunks(changes);
  return { additions, deletions, chunks };
}

function buildChunks(changes: Change[]): DiffChunk[] {
  // Convert to line-level entries first, tracking section context
  const lines: Array<{ type: 'added' | 'removed' | 'context'; text: string; section: string }> = [];
  let currentSection = '(preamble)';

  for (const change of changes) {
    const changeLines = change.value.split('\n').filter((_, i, arr) => i < arr.length - 1 || arr[arr.length - 1] !== '');
    for (const line of changeLines) {
      const headingMatch = line.match(/^#{1,4} (.+)/);
      if (headingMatch && !change.added && !change.removed) {
        currentSection = headingMatch[1];
      }

      if (change.added) {
        lines.push({ type: 'added', text: line, section: currentSection });
      } else if (change.removed) {
        lines.push({ type: 'removed', text: line, section: currentSection });
      } else {
        lines.push({ type: 'context', text: line, section: currentSection });
      }
    }
  }

  // Find indices of all changed lines
  const changedIndices = lines
    .map((l, i) => (l.type !== 'context' ? i : -1))
    .filter(i => i !== -1);

  if (changedIndices.length === 0) return [];

  // Build windows: for each changed line, include CONTEXT_LINES before and after
  const included = new Set<number>();
  for (const idx of changedIndices) {
    for (let i = Math.max(0, idx - CONTEXT_LINES); i <= Math.min(lines.length - 1, idx + CONTEXT_LINES); i++) {
      included.add(i);
    }
  }

  // Group into chunks separated by gaps
  const sortedIndices = [...included].sort((a, b) => a - b);
  const groups: number[][] = [];
  let currentGroup: number[] = [];

  for (let i = 0; i < sortedIndices.length; i++) {
    if (i === 0 || sortedIndices[i] - sortedIndices[i - 1] > 1) {
      if (currentGroup.length > 0) groups.push(currentGroup);
      currentGroup = [sortedIndices[i]];
    } else {
      currentGroup.push(sortedIndices[i]);
    }
  }
  if (currentGroup.length > 0) groups.push(currentGroup);

  // Convert groups to DiffChunks
  const chunks: DiffChunk[] = [];
  for (const group of groups) {
    if (!group.some(i => lines[i].type !== 'context')) continue;

    const section = lines[group[0]].section;
    const added: string[] = [];
    const removed: string[] = [];

    for (const i of group) {
      const line = lines[i];
      if (line.type === 'added') added.push(line.text);
      else if (line.type === 'removed') removed.push(line.text);
    }

    chunks.push({ section, added, removed });
  }

  return chunks;
}
