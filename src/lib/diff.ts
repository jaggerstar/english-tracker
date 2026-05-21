import DiffMatchPatch from 'diff-match-patch';
import type { DiffError } from '@/types';

const dmp = new DiffMatchPatch();

export interface DiffResult {
  parts: DiffPart[];
  accuracy: number;
  errors: DiffError[];
}

export interface DiffPart {
  value: string;
  type: 'equal' | 'insert' | 'delete';
}

/**
 * Compare user input against original text and return diff results.
 */
export function compareText(original: string, userInput: string): DiffResult {
  const diffs = dmp.diff_main(original, userInput);
  dmp.diff_cleanupSemantic(diffs);

  const parts: DiffPart[] = diffs.map(([op, text]) => ({
    value: text,
    type: op === 0 ? 'equal' : op === 1 ? 'insert' : 'delete',
  }));

  const { accuracy, errors } = calculateAccuracy(original, userInput, diffs);

  return { parts, accuracy, errors };
}

/**
 * Calculate word-level accuracy and collect errors.
 */
function calculateAccuracy(
  original: string,
  userInput: string,
  diffs: DiffMatchPatch.Diff[]
): { accuracy: number; errors: DiffError[] } {
  const originalWords = original.split(/\s+/).filter(Boolean);
  const userWords = userInput.split(/\s+/).filter(Boolean);

  // Use word-level diff for accuracy
  const wordDiffs = dmp.diff_main(originalWords.join(' '), userWords.join(' '));
  dmp.diff_cleanupSemantic(wordDiffs);

  const errors: DiffError[] = [];
  let correctWords = 0;
  let totalWords = originalWords.length;
  let position = 0;

  for (const [op, text] of wordDiffs) {
    const words = text.split(/\s+/).filter(Boolean);
    if (op === 0) {
      correctWords += words.length;
      position += words.length;
    } else if (op === -1) {
      // Deleted words (in original but not in user input)
      for (const word of words) {
        errors.push({
          expected: word,
          got: '',
          position: position,
        });
        position++;
      }
    } else {
      // Inserted words (in user input but not in original)
      for (let i = 0; i < words.length; i++) {
        if (errors.length > 0 && errors[errors.length - 1].got === '') {
          errors[errors.length - 1].got = words[i];
        } else {
          errors.push({
            expected: '',
            got: words[i],
            position: position,
          });
        }
      }
    }
  }

  const accuracy = totalWords > 0 ? Math.round((correctWords / totalWords) * 1000) / 10 : 0;

  return { accuracy, errors };
}
