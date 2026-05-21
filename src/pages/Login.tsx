import { useState } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PenTool, Key, AlertCircle } from 'lucide-react';

export function LoginPage() {
  const [token, setToken] = useState('');
  const { login, isLoading, error } = useAuthStore();
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    if (!token.trim()) {
      setLocalError('请输入 GitHub Personal Access Token');
      return;
    }

    try {
      await login(token.trim());
    } catch (err: any) {
      setLocalError(err.message || '登录失败');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center">
              <PenTool className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl">English Tracker</CardTitle>
          <CardDescription>英语学习追踪 — 听说读写四步法</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">GitHub Personal Access Token</label>
              <Input
                type="password"
                placeholder="ghp_xxxxxxxxxxxx"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                需要 <code className="bg-muted px-1 rounded">repo</code> 权限来读写私有仓库数据。
                前往{' '}
                <a
                  href="https://github.com/settings/tokens/new?scopes=repo"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  创建 Token →
                </a>
              </p>
            </div>

            {(error || localError) && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {localError || error}
              </div>
            )}

            <Button type="submit" className="w-full gap-2" disabled={isLoading}>
              <Key className="h-4 w-4" />
              {isLoading ? '连接中...' : '使用 GitHub 登录'}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t">
            <div className="text-xs text-muted-foreground space-y-1">
              <p>🔒 数据存储在你的 GitHub 私有仓库中</p>
              <p>📝 素材以 Markdown 格式保存，人机两读</p>
              <p>📊 学习记录以 JSON 格式保存，天然版本控制</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
