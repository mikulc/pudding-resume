export type DiffSegmentType = 'equal' | 'added' | 'removed' | 'modified';

export interface DiffSegmentData {
  type: DiffSegmentType;
  text: string;
  previousText?: string;
}

const sentenceBreakChars = new Set([
  '\n',
  '\r',
  '。',
  '！',
  '？',
  '!',
  '?',
  '；',
  ';',
  '，',
  ',',
  '、',
]);

function normalizeText(text: string) {
  return text.replace(/\r\n?/g, '\n');
}

function normalizeMeaningfulText(text: string) {
  return normalizeText(text).replace(/\s+/g, '');
}

function isMeaningfullyEqual(left: string, right: string) {
  return normalizeMeaningfulText(left) === normalizeMeaningfulText(right);
}

function tokenizeText(text: string) {
  const normalized = normalizeText(text);
  if (!normalized) return [];

  const tokens: string[] = [];
  let current = '';

  for (let i = 0; i < normalized.length; i += 1) {
    const char = normalized[i];
    current += char;

    if (!sentenceBreakChars.has(char)) continue;

    if (char === '\n') {
      while (i + 1 < normalized.length && normalized[i + 1] === '\n') {
        i += 1;
        current += normalized[i];
      }
    }

    tokens.push(current);
    current = '';
  }

  if (current) {
    tokens.push(current);
  }

  return tokens.filter((token) => token.length > 0);
}

function coalesceSegments(segments: DiffSegmentData[]) {
  const result: DiffSegmentData[] = [];

  for (const segment of segments) {
    const previous = result[result.length - 1];
    if (
      previous
      && previous.type === segment.type
      && segment.type !== 'modified'
      && !segment.previousText
    ) {
      previous.text += segment.text;
      continue;
    }
    result.push({ ...segment });
  }

  return result;
}

function pairModifiedSegments(segments: DiffSegmentData[]) {
  const result: DiffSegmentData[] = [];

  for (let i = 0; i < segments.length; i += 1) {
    const current = segments[i];
    const next = segments[i + 1];

    if (current.type === 'removed' && next?.type === 'added') {
      if (isMeaningfullyEqual(current.text, next.text)) {
        result.push({
          type: 'equal',
          text: next.text,
        });
        i += 1;
        continue;
      }

      result.push({
        type: 'modified',
        previousText: current.text,
        text: next.text,
      });
      i += 1;
      continue;
    }

    result.push(current);
  }

  return result;
}

export function createDiffSegments(originalText: string, optimizedText: string): DiffSegmentData[] {
  const originalTokens = tokenizeText(originalText);
  const optimizedTokens = tokenizeText(optimizedText);
  const originalLength = originalTokens.length;
  const optimizedLength = optimizedTokens.length;

  if (originalLength === 0 && optimizedLength === 0) return [];
  if (originalLength === 0) return [{ type: 'added', text: normalizeText(optimizedText) }];
  if (optimizedLength === 0) return [{ type: 'removed', text: normalizeText(originalText) }];

  const dp = Array.from({ length: originalLength + 1 }, () => new Array<number>(optimizedLength + 1).fill(0));

  for (let i = originalLength - 1; i >= 0; i -= 1) {
    for (let j = optimizedLength - 1; j >= 0; j -= 1) {
      dp[i][j] = isMeaningfullyEqual(originalTokens[i], optimizedTokens[j])
        ? dp[i + 1][j + 1] + 1
        : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const rawSegments: DiffSegmentData[] = [];
  let i = 0;
  let j = 0;

  while (i < originalLength && j < optimizedLength) {
    if (isMeaningfullyEqual(originalTokens[i], optimizedTokens[j])) {
      rawSegments.push({ type: 'equal', text: optimizedTokens[j] });
      i += 1;
      j += 1;
      continue;
    }

    if (dp[i + 1][j] >= dp[i][j + 1]) {
      rawSegments.push({ type: 'removed', text: originalTokens[i] });
      i += 1;
    } else {
      rawSegments.push({ type: 'added', text: optimizedTokens[j] });
      j += 1;
    }
  }

  while (i < originalLength) {
    rawSegments.push({ type: 'removed', text: originalTokens[i] });
    i += 1;
  }

  while (j < optimizedLength) {
    rawSegments.push({ type: 'added', text: optimizedTokens[j] });
    j += 1;
  }

  return pairModifiedSegments(coalesceSegments(rawSegments));
}
