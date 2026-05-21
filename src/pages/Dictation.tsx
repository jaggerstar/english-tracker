import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import { useDictationStore } from '@/stores/useDictationStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Play, Pause, SkipForward, Check, RotateCcw, Volume2 } from 'lucide-react';
import type { Article, DictationDetail, LearningRecord, YearCheckIns } from '@/types';
import { compareText, type DiffPart } from '@/lib/diff';

export function DictationPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getDB } = useAuthStore();
  const {
    articleId,
    sentences,
    currentIndex,
    results,
    isCompleted,
    startDictation,
    submitSentence,
    reset,
    getOverallAccuracy,
    getElapsedTime,
  } = useDictationStore();

  const [article, setArticle] = useState<Article | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userInput, setUserInput] = useState('');
  const [currentResult, setCurrentResult] = useState<DictationDetail | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load article
  useEffect(() => {
    async function loadArticle() {
      const db = getDB();
      if (!db || !id) return;

      try {
        const filenames = await db.listArticles();
        const filename = filenames.find(f => f.replace('.md', '') === id);
        if (!filename) {
          navigate('/articles');
          return;
        }
        const art = await db.getArticle(filename);
        setArticle(art);
        startDictation(art.id, art.sentences);
      } catch (err) {
        console.error('Failed to load article:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadArticle();

    return () => {
      reset();
    };
  }, [id, getDB, navigate, startDictation, reset]);

  // Setup audio
  useEffect(() => {
    if (article?.audioUrl) {
      audioRef.current = new Audio(article.audioUrl);
      audioRef.current.addEventListener('ended', () => setIsPlaying(false));
      return () => {
        audioRef.current?.pause();
        audioRef.current = null;
      };
    }
  }, [article?.audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSubmit = () => {
    if (!userInput.trim()) return;
    const result = submitSentence(userInput.trim());
    setCurrentResult(result);
    setUserInput('');
  };

  const handleNext = () => {
    setCurrentResult(null);
    setShowOriginal(false);
  };

  const handleRestart = () => {
    if (confirm('确定要重新开始吗？当前进度将丢失。')) {
      reset();
      if (article) {
        startDictation(article.id, article.sentences);
      }
      setUserInput('');
      setCurrentResult(null);
      setShowOriginal(false);
    }
  };

  const handleSaveAndCheckIn = async () => {
    const db = getDB();
    if (!db || !article) return;

    setIsSaving(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const overallAccuracy = getOverallAccuracy();
      const timeSpentMin = getElapsedTime();

      // Save learning record
      const existingRecord = await db.getRecord(today);
      const newRecord: LearningRecord = {
        id: `${today}-${article.id}`,
        articleId: article.id,
        learnDate: today,
        steps: {
          listening: true,
          intensive: true,
          dictation: true,
          shadowing: false,
          retelling: false,
        },
        dictationDetails: results,
        overallAccuracy,
        timeSpentMin: timeSpentMin || 1,
        notes: '',
        createdAt: new Date().toISOString(),
      };

      const existingRecords = existingRecord ? (Array.isArray(existingRecord) ? existingRecord : []) : [];
      await db.saveRecord(today, [...existingRecords, newRecord], (existingRecord as any)?._sha);

      // Update check-in
      const currentYear = new Date().getFullYear();
      const yearData = await db.getCheckIns(currentYear);
      const todayData = yearData.checkins[today] || { articles: 0, minutes: 0 };
      const allDates = Object.keys(yearData.checkins);

      // Calculate streak
      let streak = 1;
      const sortedDates = [...allDates, today].sort().reverse();
      for (let i = 1; i < sortedDates.length; i++) {
        const prev = new Date(sortedDates[i - 1]);
        const curr = new Date(sortedDates[i]);
        const diffDays = (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays === 1) {
          streak++;
        } else {
          break;
        }
      }

      const updatedYearData: YearCheckIns = {
        year: currentYear,
        checkins: {
          ...yearData.checkins,
          [today]: {
            articles: todayData.articles + 1,
            minutes: todayData.minutes + (timeSpentMin || 1),
          },
        },
        streak,
      };

      await db.saveCheckIns(updatedYearData, (yearData as any)?._sha);

      navigate('/');
    } catch (err: any) {
      console.error('Failed to save record:', err);
      alert('保存失败: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  if (!article) return null;

  const progress = sentences.length > 0 ? ((results.length) / sentences.length) * 100 : 0;
  const currentSentence = sentences[currentIndex];

  return (
    <div className="container mx-auto p-4 space-y-4 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-bold">{article.title}</h1>
            <p className="text-sm text-muted-foreground">{article.source}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleRestart} className="gap-1">
          <RotateCcw className="h-3 w-3" />
          重新开始
        </Button>
      </div>

      {/* Progress */}
      <div className="space-y-1">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>进度: {results.length} / {sentences.length} 句</span>
          {!isCompleted && results.length > 0 && (
            <span>当前准确率: {getOverallAccuracy()}%</span>
          )}
        </div>
        <Progress value={progress} />
      </div>

      {/* Audio Player */}
      {article.audioUrl && (
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <Button size="icon" variant="outline" onClick={togglePlay}>
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <div className="flex-1">
                <div className="text-sm text-muted-foreground">
                  🔊 点击播放音频（可反复听）
                </div>
              </div>
              <Volume2 className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dictation Area */}
      {!isCompleted ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              第 {currentIndex + 1} 句
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Show original hint */}
            {!currentResult && (
              <>
                <div className="bg-muted p-3 rounded-md">
                  <p className="text-sm text-muted-foreground">
                    💡 仔细听音频，然后写下你听到的内容。不确定的可以先跳过。
                  </p>
                  {showOriginal && (
                    <p className="text-sm mt-2 font-medium text-foreground">
                      原文: {currentSentence}
                    </p>
                  )}
                  {!showOriginal && (
                    <Button
                      variant="link"
                      size="sm"
                      className="p-0 h-auto text-xs"
                      onClick={() => setShowOriginal(true)}
                    >
                      看一眼原文（练习精听时可用）
                    </Button>
                  )}
                </div>

                <Textarea
                  placeholder="写下你听到的内容..."
                  className="min-h-[80px] text-base"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      handleSubmit();
                    }
                  }}
                />

                <div className="flex justify-between">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setUserInput('');
                      setCurrentResult(null);
                    }}
                  >
                    清空
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        submitSentence('');
                        setCurrentResult(null);
                        setUserInput('');
                      }}
                      className="gap-1"
                    >
                      <SkipForward className="h-3 w-3" />
                      跳过
                    </Button>
                    <Button onClick={handleSubmit} disabled={!userInput.trim()} className="gap-1">
                      <Check className="h-3 w-3" />
                      提交 (⌘+Enter)
                    </Button>
                  </div>
                </div>
              </>
            )}

            {/* Show result after submission */}
            {currentResult && (
              <div className="space-y-4">
                <DiffViewer
                  original={currentResult.original}
                  parts={compareText(currentResult.original, currentResult.userInput).parts}
                  accuracy={currentResult.accuracy}
                />

                <div className="flex justify-end">
                  <Button onClick={handleNext} className="gap-1">
                    {currentIndex < sentences.length - 1 ? (
                      <>下一句 <SkipForward className="h-3 w-3" /></>
                    ) : (
                      <>查看结果</>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        /* Completion Summary */
        <Card>
          <CardHeader>
            <CardTitle className="text-center text-xl">🎉 默写完成！</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <div className="text-4xl font-bold mb-1">
                {getOverallAccuracy()}%
              </div>
              <p className="text-muted-foreground">整体准确率</p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="bg-muted p-3 rounded-lg">
                <div className="text-lg font-semibold">{sentences.length}</div>
                <div className="text-xs text-muted-foreground">总句数</div>
              </div>
              <div className="bg-muted p-3 rounded-lg">
                <div className="text-lg font-semibold">{getElapsedTime() || '<1'} 分钟</div>
                <div className="text-xs text-muted-foreground">用时</div>
              </div>
            </div>

            {/* Per-sentence results */}
            <div className="space-y-2">
              <h3 className="font-medium">逐句结果</h3>
              {results.map((r, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded border">
                  <span className={`text-sm font-mono w-12 text-right ${
                    r.accuracy >= 90 ? 'text-green-600' :
                    r.accuracy >= 70 ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {r.accuracy}%
                  </span>
                  <span className="text-sm text-muted-foreground flex-1 truncate">
                    {r.original}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-center gap-3 pt-4">
              <Button variant="outline" onClick={handleRestart} className="gap-1">
                <RotateCcw className="h-4 w-4" />
                重新默写
              </Button>
              <Button onClick={handleSaveAndCheckIn} disabled={isSaving} className="gap-1">
                <Check className="h-4 w-4" />
                {isSaving ? '保存中...' : '保存并打卡'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Diff Viewer Component
function DiffViewer({ original, parts, accuracy }: { original: string; parts: DiffPart[]; accuracy: number }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className={`text-lg font-bold ${
          accuracy >= 90 ? 'text-green-600' :
          accuracy >= 70 ? 'text-yellow-600' :
          'text-red-600'
        }`}>
          {accuracy}%
        </span>
        <span className="text-sm text-muted-foreground">准确率</span>
      </div>

      {/* Original */}
      <div className="bg-green-50 border border-green-200 p-3 rounded-md">
        <p className="text-xs text-green-600 mb-1 font-medium">原文</p>
        <p className="text-sm">{original}</p>
      </div>

      {/* Diff */}
      <div className="bg-white border p-3 rounded-md">
        <p className="text-xs text-muted-foreground mb-1 font-medium">你的输入（差异高亮）</p>
        <p className="text-sm leading-relaxed">
          {parts.map((part, i) => (
            <span
              key={i}
              className={
                part.type === 'equal' ? '' :
                part.type === 'delete' ? 'bg-red-100 text-red-700 line-through' :
                part.type === 'insert' ? 'bg-blue-100 text-blue-700 underline' : ''
              }
            >
              {part.value}
            </span>
          ))}
        </p>
      </div>
    </div>
  );
}
