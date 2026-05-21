import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { YearCheckIns, LearningRecord } from '@/types';

export function StatsPage() {
  const { getDB } = useAuthStore();
  const [checkins, setCheckins] = useState<YearCheckIns | null>(null);
  const [records, setRecords] = useState<Record<string, LearningRecord[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  const currentYear = new Date().getFullYear();

  useEffect(() => {
    async function loadStats() {
      const db = getDB();
      if (!db) return;

      try {
        const yearData = await db.getCheckIns(currentYear);
        setCheckins(yearData);

        // Load last 30 days of records
        const today = new Date();
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const start = thirtyDaysAgo.toISOString().slice(0, 10);
        const end = today.toISOString().slice(0, 10);
        const recs = await db.getRecordsInRange(start, end);
        setRecords(recs);
      } catch (err) {
        console.error('Failed to load stats:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadStats();
  }, [getDB, currentYear]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  // Calculate stats
  const totalDays = checkins ? Object.keys(checkins.checkins).length : 0;
  const totalMinutes = checkins
    ? Object.values(checkins.checkins).reduce((sum, c) => sum + c.minutes, 0)
    : 0;
  const totalArticles = checkins
    ? Object.values(checkins.checkins).reduce((sum, c) => sum + c.articles, 0)
    : 0;

  // Accuracy trend
  const accuracyTrend: { date: string; accuracy: number }[] = [];
  for (const [date, recs] of Object.entries(records)) {
    const avgAccuracy = recs.reduce((sum, r) => sum + r.overallAccuracy, 0) / recs.length;
    accuracyTrend.push({ date, accuracy: Math.round(avgAccuracy * 10) / 10 });
  }
  accuracyTrend.sort((a, b) => a.date.localeCompare(b.date));

  // Heatmap data
  const heatmapDays = checkins ? Object.entries(checkins.checkins) : [];

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">学习统计</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">累计天数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDays}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">累计篇数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalArticles}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">累计时长</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMinutes} 分钟</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">连续打卡</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{checkins?.streak || 0} 天</div>
          </CardContent>
        </Card>
      </div>

      {/* Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle>学习热力图 ({currentYear})</CardTitle>
        </CardHeader>
        <CardContent>
          {heatmapDays.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>📊 还没有学习记录</p>
              <p className="text-sm mt-1">开始学习后，这里会显示你的学习热力图</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-1">
              {heatmapDays.map(([date, data]) => {
                const intensity = Math.min(data.minutes / 60, 1);
                return (
                  <div
                    key={date}
                    className="w-3 h-3 rounded-sm"
                    style={{
                      backgroundColor: `rgba(34, 197, 94, ${0.2 + intensity * 0.8})`,
                    }}
                    title={`${date}: ${data.minutes} 分钟, ${data.articles} 篇`}
                  />
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Accuracy Trend */}
      <Card>
        <CardHeader>
          <CardTitle>默写准确率趋势（近 30 天）</CardTitle>
        </CardHeader>
        <CardContent>
          {accuracyTrend.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>📈 还没有默写记录</p>
              <p className="text-sm mt-1">完成默写后，这里会显示准确率趋势</p>
            </div>
          ) : (
            <div className="space-y-2">
              {accuracyTrend.map(({ date, accuracy }) => (
                <div key={date} className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground w-24">{date}</span>
                  <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        accuracy >= 90 ? 'bg-green-500' :
                        accuracy >= 70 ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${accuracy}%` }}
                    />
                  </div>
                  <span className={`text-sm font-mono w-14 text-right ${
                    accuracy >= 90 ? 'text-green-600' :
                    accuracy >= 70 ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {accuracy}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
