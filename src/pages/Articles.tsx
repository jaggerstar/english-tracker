import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, PenTool, Trash2 } from 'lucide-react';
import type { Article } from '@/types';

export function ArticlesPage() {
  const { getDB } = useAuthStore();
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadArticles = async () => {
    const db = getDB();
    if (!db) return;
    try {
      const list = await db.getAllArticles();
      setArticles(list);
    } catch (err) {
      console.error('Failed to load articles:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadArticles();
  }, [getDB]);

  const handleDelete = async (filename: string) => {
    if (!confirm('确定要删除这篇素材吗？')) return;
    const db = getDB();
    if (!db) return;
    try {
      await db.deleteArticle(filename);
      await loadArticles();
    } catch (err) {
      console.error('Failed to delete article:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">素材库</h1>
        <Link to="/articles/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            添加素材
          </Button>
        </Link>
      </div>

      {articles.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground mb-4">还没有素材</p>
            <Link to="/articles/new">
              <Button>添加第一篇素材</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {articles.map((article) => (
            <Card key={article.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg">{article.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {article.source} · {article.createdAt} · {article.sentences.length} 句
                    </p>
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                      {article.content.slice(0, 150)}...
                    </p>
                    {article.tags.length > 0 && (
                      <div className="flex gap-1 mt-2">
                        {article.tags.map((tag) => (
                          <span key={tag} className="text-xs bg-secondary px-2 py-0.5 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      article.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                      article.difficulty === 'hard' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {article.difficulty === 'easy' ? '简单' : article.difficulty === 'hard' ? '困难' : '中等'}
                    </span>
                    <Link to={`/dictation/${article.id}`}>
                      <Button size="sm" className="gap-1">
                        <PenTool className="h-3 w-3" />
                        默写
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(`${article.id}.md`)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
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
