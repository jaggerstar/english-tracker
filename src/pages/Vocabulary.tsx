import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { VocabularyWord } from '@/types';

export function VocabularyPage() {
  const { getDB } = useAuthStore();
  const [words, setWords] = useState<VocabularyWord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showReviewOnly, setShowReviewOnly] = useState(false);

  useEffect(() => {
    async function loadVocabulary() {
      const db = getDB();
      if (!db) return;

      try {
        const vocab = await db.getVocabulary();
        setWords(Array.isArray(vocab) ? vocab : []);
      } catch (err) {
        console.error('Failed to load vocabulary:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadVocabulary();
  }, [getDB]);

  const today = new Date().toISOString().slice(0, 10);

  const filteredWords = words.filter(w => {
    const matchesSearch = !search || w.word.toLowerCase().includes(search.toLowerCase());
    const matchesReview = !showReviewOnly || w.nextReviewDate <= today;
    return matchesSearch && matchesReview;
  });

  const dueForReview = words.filter(w => w.nextReviewDate <= today).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">生词本</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">总词数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{words.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">待复习</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{dueForReview}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-3">
        <Input
          placeholder="搜索单词..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Button
          variant={showReviewOnly ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowReviewOnly(!showReviewOnly)}
        >
          {showReviewOnly ? '显示全部' : `仅待复习 (${dueForReview})`}
        </Button>
      </div>

      {/* Word List */}
      {filteredWords.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">
              {words.length === 0
                ? '📝 还没有生词，默写中的错词会自动收录'
                : '没有匹配的单词'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredWords.map((word, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{word.word}</h3>
                    {word.definition && (
                      <p className="text-sm text-muted-foreground mt-1">{word.definition}</p>
                    )}
                    {word.contextSentence && (
                      <p className="text-sm italic mt-2 bg-muted p-2 rounded">
                        "{word.contextSentence}"
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground">
                      复习 {word.reviewCount} 次
                    </p>
                    <p className="text-xs text-muted-foreground">
                      下次: {word.nextReviewDate}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
