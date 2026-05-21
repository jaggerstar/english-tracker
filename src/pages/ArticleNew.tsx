import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { splitSentences } from '@/lib/markdown-parser';

export function ArticleNewPage() {
  const navigate = useNavigate();
  const { getDB } = useAuthStore();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    title: '',
    source: 'BBC Take Away English',
    content: '',
    audioUrl: '',
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    tags: '',
  });

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      setError('标题和内容不能为空');
      return;
    }

    const db = getDB();
    if (!db) return;

    setIsSaving(true);
    setError('');

    try {
      await db.createArticle({
        title: form.title.trim(),
        source: form.source.trim(),
        content: form.content.trim(),
        audioUrl: form.audioUrl.trim(),
        difficulty: form.difficulty,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        createdAt: new Date().toISOString().slice(0, 10),
      });
      navigate('/articles');
    } catch (err: any) {
      setError(err.message || '保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  const sentences = form.content ? splitSentences(form.content) : [];

  return (
    <div className="container mx-auto p-4 space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">添加素材</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>素材信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">标题 *</label>
            <Input
              placeholder="e.g. Why do we dream?"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">来源</label>
              <Input
                placeholder="BBC Take Away English"
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">难度</label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={form.difficulty}
                onChange={(e) => setForm({ ...form, difficulty: e.target.value as any })}
              >
                <option value="easy">简单</option>
                <option value="medium">中等</option>
                <option value="hard">困难</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">音频链接（可选）</label>
            <Input
              placeholder="https://downloads.bbc.co.uk/..."
              value={form.audioUrl}
              onChange={(e) => setForm({ ...form, audioUrl: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              填入 BBC 音频直链，默写时可逐句播放
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">标签（逗号分隔）</label>
            <Input
              placeholder="sleep, science, psychology"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">英文原文 *</label>
            <Textarea
              placeholder="粘贴英文原文到这里..."
              className="min-h-[200px] font-mono text-sm"
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
            />
          </div>

          {sentences.length > 0 && (
            <div className="bg-muted p-3 rounded-md">
              <p className="text-sm font-medium mb-2">
                📝 已识别 {sentences.length} 个句子（默写时将逐句进行）
              </p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {sentences.map((s, i) => (
                  <p key={i} className="text-xs text-muted-foreground">
                    {i + 1}. {s}
                  </p>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => navigate(-1)}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="gap-2">
              <Save className="h-4 w-4" />
              {isSaving ? '保存中...' : '保存'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
