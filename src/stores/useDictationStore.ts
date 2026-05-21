import { create } from 'zustand';
import type { DictationDetail, DiffError } from '@/types';
import { compareText } from '@/lib/diff';

interface DictationState {
  articleId: string | null;
  sentences: string[];
  currentIndex: number;
  results: DictationDetail[];
  isCompleted: boolean;
  startTime: number;

  // Actions
  startDictation: (articleId: string, sentences: string[]) => void;
  submitSentence: (userInput: string) => DictationDetail;
  nextSentence: () => void;
  reset: () => void;
  getOverallAccuracy: () => number;
  getElapsedTime: () => number;
}

export const useDictationStore = create<DictationState>()((set, get) => ({
  articleId: null,
  sentences: [],
  currentIndex: 0,
  results: [],
  isCompleted: false,
  startTime: 0,

  startDictation: (articleId, sentences) => {
    set({
      articleId,
      sentences,
      currentIndex: 0,
      results: [],
      isCompleted: false,
      startTime: Date.now(),
    });
  },

  submitSentence: (userInput: string) => {
    const { sentences, currentIndex, results } = get();
    const original = sentences[currentIndex];
    const { accuracy, errors } = compareText(original, userInput);

    const detail: DictationDetail = {
      sentenceIndex: currentIndex,
      original,
      userInput,
      accuracy,
      errors,
    };

    const newResults = [...results, detail];
    const isCompleted = currentIndex >= sentences.length - 1;

    set({
      results: newResults,
      isCompleted,
      currentIndex: isCompleted ? currentIndex : currentIndex + 1,
    });

    return detail;
  },

  nextSentence: () => {
    const { currentIndex, sentences } = get();
    if (currentIndex < sentences.length - 1) {
      set({ currentIndex: currentIndex + 1 });
    }
  },

  reset: () => {
    set({
      articleId: null,
      sentences: [],
      currentIndex: 0,
      results: [],
      isCompleted: false,
      startTime: 0,
    });
  },

  getOverallAccuracy: () => {
    const { results } = get();
    if (results.length === 0) return 0;
    const total = results.reduce((sum, r) => sum + r.accuracy, 0);
    return Math.round((total / results.length) * 10) / 10;
  },

  getElapsedTime: () => {
    const { startTime } = get();
    if (!startTime) return 0;
    return Math.round((Date.now() - startTime) / 60000); // minutes
  },
}));
