import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Flame, BookOpen, Clock, Plus, PenTool } from 'lucide-react';
import type { YearCheckIns, Article } from '@/types';

export function Dashboard() {
  const { getDB } = useAuthStore();
  const [articles, setArticles] = useState<Article[]>([]);
  const [checkins, setCheckins] = useState<YearCheckIns | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const today = new Date().toISOString().slice(0, 10);
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    async function loadData() {
      const db = getDB();
      if (!db) return;

      try {
        const [articleList, yearCheckins] = await Promise.all([
          db.getAllArticles(),
          db.getCheckIns(currentYear),
        ]);
        setArticles(articleList);
        setCheckins(yearCheckins);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [getDB, currentYear]);

  // Calculate stats
  const totalArticles = articles.length;
  const streakDays = checkins?.streak || 0;
  const totalMinutes = checkins
    ? Object.values(checkins.checkins).reduce((sum, c) => sum + c.minutes, 0)
    : 0;
  const todayCheckin = checkins?.checkins[today];
  const todayDone = !!todayCheckin;

  // Recent articles (last 5)
  const recentArticles = articles.slice(0, 5);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">连续打卡</CardTitle>
            <Flame className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{streakDays} 天</div>
            <p className="text-xs text-muted-foreground">
              {todayDone ? '✅ 今日已打卡' : '⏳ 今日尚未打卡'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">已学篇数</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalArticles} 篇</div>
            <p className="text-xs text-muted-foreground">
              素材库共 {articles.length} 篇
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">累计时长</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMinutes} 分钟</div>
            <p className="text-xs text-muted-foreground">
              约 {Math.round(totalMinutes / 60 * 10) / 10} 小时
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3">
        <Link to="/articles/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            添加素材
          </Button>
        </Link>
        {articles.length > 0 && (
          <Link to={`/dictation/${articles[0].id}`}>
            <Button variant="outline" className="gap-2">
              <PenTool className="h-4 w-4" />
              开始默写
            </Button>
          </Link>
        )}
      </div>

      {/* Recent Articles */}
      <Card>
        <CardHeader>
          <CardTitle>最近素材</CardTitle>
        </CardHeader>
        <CardContent>
          {recentArticles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>还没有素材，点击"添加素材"开始学习吧！</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentArticles.map((article) => (
                <div
                  key={article.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{article.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {article.source} · {article.createdAt}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      article.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                      article.difficulty === 'hard' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {article.difficulty === 'easy' ? '简单' : article.difficulty === 'hard' ? '困难' : '中等'}
                    </span>
                    <Link to={`/dictation/${article.id}`}>
                      <Button size="sm" variant="outline" className="gap-1">
                        <PenTool className="h-3 w-3" />
                        默写
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Heatmap placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>学习热力图</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>📊 学习数据积累后将显示热力图</p>
            <p className="text-sm mt-1">坚持学习，让日历亮起来！</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
