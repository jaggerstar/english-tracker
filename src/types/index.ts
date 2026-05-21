// Article (learning material)
export interface Article {
  id: string;           // filename without .md, e.g. "2026-01-15-why-do-we-dream"
  title: string;
  content: string;      // full original text
  sentences: string[];  // split by sentence for dictation
  audioUrl: string;     // BBC direct link or empty
  source: string;       // e.g. "BBC Take Away English"
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
  createdAt: string;    // ISO date
}

// Learning record for one article on one day
export interface LearningRecord {
  id: string;
  articleId: string;
  learnDate: string;    // YYYY-MM-DD
  steps: {
    listening: boolean;
    intensive: boolean;
    dictation: boolean;
    shadowing: boolean;
    retelling: boolean;
  };
  dictationDetails: DictationDetail[];
  overallAccuracy: number;
  timeSpentMin: number;
  notes: string;
  createdAt: string;
}

export interface DictationDetail {
  sentenceIndex: number;
  original: string;
  userInput: string;
  accuracy: number;
  errors: DiffError[];
}

export interface DiffError {
  expected: string;
  got: string;
  position: number;
}

// Daily check-in
export interface DailyCheckIn {
  date: string;          // YYYY-MM-DD
  articlesCompleted: number;
  totalMinutes: number;
  streakDays: number;
}

// Check-in data for a whole year
export interface YearCheckIns {
  year: number;
  checkins: Record<string, { articles: number; minutes: number }>;
  streak: number;
}

// Vocabulary word
export interface VocabularyWord {
  word: string;
  definition: string;
  contextSentence: string;
  articleId: string;
  addedDate: string;
  reviewCount: number;
  nextReviewDate: string;
}

// GitHub file metadata
export interface GitHubFile {
  name: string;
  path: string;
  sha: string;
  content?: string;
  encoding?: string;
}
