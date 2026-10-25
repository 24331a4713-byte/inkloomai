/**
 * INKLOOM AI - Text Diff Utility
 * Computes word-level additions, removals, and changes between original and revised drafts.
 */

export interface DiffPart {
  value: string;
  added?: boolean;
  removed?: boolean;
}

export function computeWordDiff(original: string, revised: string): DiffPart[] {
  if (original === revised) {
    return [{ value: original }];
  }

  // Tokenize into words and whitespace/punctuation
  const origTokens = tokenize(original);
  const revTokens = tokenize(revised);

  // Compute Longest Common Subsequence (LCS) matrix
  const matrix: number[][] = Array(origTokens.length + 1)
    .fill(0)
    .map(() => Array(revTokens.length + 1).fill(0));

  for (let i = 0; i < origTokens.length; i++) {
    for (let j = 0; j < revTokens.length; j++) {
      if (origTokens[i] === revTokens[j]) {
        matrix[i + 1][j + 1] = matrix[i][j] + 1;
      } else {
        matrix[i + 1][j + 1] = Math.max(matrix[i + 1][j], matrix[i][j + 1]);
      }
    }
  }

  // Backtrack to extract additions and deletions
  const diff: DiffPart[] = [];
  let i = origTokens.length;
  let j = revTokens.length;

  const rawDiff: DiffPart[] = [];
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && origTokens[i - 1] === revTokens[j - 1]) {
      rawDiff.push({ value: origTokens[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || matrix[i][j - 1] >= matrix[i - 1][j])) {
      rawDiff.push({ value: revTokens[j - 1], added: true });
      j--;
    } else if (i > 0 && (j === 0 || matrix[i][j - 1] < matrix[i - 1][j])) {
      rawDiff.push({ value: origTokens[i - 1], removed: true });
      i--;
    }
  }

  rawDiff.reverse();

  // Merge consecutive tokens with the same flag
  for (const part of rawDiff) {
    if (diff.length > 0) {
      const last = diff[diff.length - 1];
      if (
        (last.added && part.added) ||
        (last.removed && part.removed) ||
        (!last.added && !last.removed && !part.added && !part.removed)
      ) {
        last.value += part.value;
        continue;
      }
    }
    diff.push({ ...part });
  }

  return diff;
}

function tokenize(text: string): string[] {
  // Split on words while preserving whitespace
  return text.match(/[\w'-]+|[^\w\s]+|\s+/g) || [text];
}
