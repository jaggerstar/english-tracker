import type { Article, GitHubFile, LearningRecord, YearCheckIns, VocabularyWord } from '@/types';
import { parseArticleMarkdown, articleToMarkdown } from '@/lib/markdown-parser';

const GITHUB_API = 'https://api.github.com';

async function githubFetch(token: string, path: string, options: RequestInit = {}) {
  const url = path.startsWith('http') ? path : `${GITHUB_API}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error: any = new Error(`GitHub API error: ${res.status} ${res.statusText}`);
    error.response = res;
    throw error;
  }

  // 204 No Content
  if (res.status === 204) return null;
  return res.json();
}

export class GitHubDB {
  private token: string;
  private owner: string;
  private repo: string;

  constructor(token: string, owner: string, repo: string) {
    this.token = token;
    this.owner = owner;
    this.repo = repo;
  }

  private api(path: string, options?: RequestInit) {
    return githubFetch(this.token, path, options);
  }

  private repoPath(path: string) {
    return `/repos/${this.owner}/${this.repo}/contents/${path}`;
  }

  // ─── Articles ────────────────────────────────────────────

  async listArticles(): Promise<string[]> {
    try {
      const files = await this.api(this.repoPath('articles')) as GitHubFile[];
      return files.filter(f => f.name.endsWith('.md')).map(f => f.name);
    } catch (error: any) {
      if (error?.response?.status === 404) return [];
      throw error;
    }
  }

  async getArticle(filename: string): Promise<Article> {
    const file = await this.api(this.repoPath(`articles/${filename}`)) as GitHubFile;
    const raw = atob(file.content || '');
    return parseArticleMarkdown(raw, filename);
  }

  async getAllArticles(): Promise<Article[]> {
    const filenames = await this.listArticles();
    const articles = await Promise.all(filenames.map(f => this.getArticle(f)));
    return articles.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async createArticle(article: Omit<Article, 'id' | 'sentences'>): Promise<void> {
    const slug = article.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const filename = `${article.createdAt}-${slug}.md`;
    const content = articleToMarkdown(article);

    await this.api(this.repoPath(`articles/${filename}`), {
      method: 'PUT',
      body: JSON.stringify({
        message: `📖 Add article: ${article.title}`,
        content: btoa(unescape(encodeURIComponent(content))),
      }),
    });
  }

  async deleteArticle(filename: string): Promise<void> {
    const file = await this.api(this.repoPath(`articles/${filename}`)) as GitHubFile;

    await this.api(this.repoPath(`articles/${filename}`), {
      method: 'DELETE',
      body: JSON.stringify({
        message: `🗑️ Delete article: ${filename}`,
        sha: file.sha,
      }),
    });
  }

  // ─── Learning Records ────────────────────────────────────

  async getRecord(date: string): Promise<(LearningRecord[] & { _sha?: string }) | null> {
    try {
      const file = await this.api(this.repoPath(`records/${date}.json`)) as GitHubFile;
      const raw = atob(file.content || '');
      const data = JSON.parse(raw);
      return { ...data, _sha: file.sha };
    } catch (error: any) {
      if (error?.response?.status === 404) return null;
      throw error;
    }
  }

  async saveRecord(date: string, records: LearningRecord[], sha?: string): Promise<void> {
    const data = { date, records };
    const body: any = {
      message: `📝 Learning record: ${date}`,
      content: btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2)))),
    };
    if (sha) body.sha = sha;

    await this.api(this.repoPath(`records/${date}.json`), {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  async getRecordsInRange(startDate: string, endDate: string): Promise<Record<string, LearningRecord[]>> {
    try {
      const files = await this.api(this.repoPath('records')) as GitHubFile[];

      const result: Record<string, LearningRecord[]> = {};
      const dateFiles = files
        .filter(f => f.name.endsWith('.json'))
        .map(f => f.name.replace('.json', ''))
        .filter(d => d >= startDate && d <= endDate)
        .sort();

      // Fetch in batches of 5 to avoid rate limits
      const batchSize = 5;
      for (let i = 0; i < dateFiles.length; i += batchSize) {
        const batch = dateFiles.slice(i, i + batchSize);
        const records = await Promise.all(batch.map(d => this.getRecord(d)));
        batch.forEach((d, idx) => {
          if (records[idx]) result[d] = records[idx]!;
        });
      }

      return result;
    } catch (error: any) {
      if (error?.response?.status === 404) return {};
      throw error;
    }
  }

  // ─── Check-ins ───────────────────────────────────────────

  async getCheckIns(year: number): Promise<YearCheckIns & { _sha?: string }> {
    try {
      const file = await this.api(this.repoPath(`checkins/${year}.json`)) as GitHubFile;
      const raw = atob(file.content || '');
      const data = JSON.parse(raw);
      return { ...data, _sha: file.sha };
    } catch (error: any) {
      if (error?.response?.status === 404) {
        return { year, checkins: {}, streak: 0 };
      }
      throw error;
    }
  }

  async saveCheckIns(yearData: YearCheckIns, sha?: string): Promise<void> {
    const body: any = {
      message: `✅ Check-in: ${new Date().toISOString().slice(0, 10)}`,
      content: btoa(unescape(encodeURIComponent(JSON.stringify(yearData, null, 2)))),
    };
    if (sha) body.sha = sha;

    await this.api(this.repoPath(`checkins/${yearData.year}.json`), {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  // ─── Vocabulary ──────────────────────────────────────────

  async getVocabulary(): Promise<(VocabularyWord[] & { _sha?: string })> {
    try {
      const file = await this.api(this.repoPath('vocabulary/words.json')) as GitHubFile;
      const raw = atob(file.content || '');
      const data = JSON.parse(raw);
      return { ...data, _sha: file.sha };
    } catch (error: any) {
      if (error?.response?.status === 404) return [] as any;
      throw error;
    }
  }

  async saveVocabulary(words: VocabularyWord[], sha?: string): Promise<void> {
    const body: any = {
      message: `📝 Update vocabulary`,
      content: btoa(unescape(encodeURIComponent(JSON.stringify(words, null, 2)))),
    };
    if (sha) body.sha = sha;

    await this.api(this.repoPath('vocabulary/words.json'), {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  // ─── Repo Management ─────────────────────────────────────

  async ensureRepoExists(): Promise<void> {
    try {
      await this.api(`/repos/${this.owner}/${this.repo}`);
    } catch (error: any) {
      if (error?.response?.status === 404) {
        // Create the repo
        await this.api('/user/repos', {
          method: 'POST',
          body: JSON.stringify({
            name: this.repo,
            private: true,
            description: 'English learning tracker data',
            auto_init: true,
          }),
        });

        // Create directory structure with .gitkeep files
        const dirs = ['articles', 'records', 'checkins', 'vocabulary'];
        for (const dir of dirs) {
          await this.api(this.repoPath(`${dir}/.gitkeep`), {
            method: 'PUT',
            body: JSON.stringify({
              message: `📁 Create ${dir} directory`,
              content: btoa(''),
            }),
          });
        }
      } else {
        throw error;
      }
    }
  }
}

// Singleton instance
let dbInstance: GitHubDB | null = null;

export function getDB(): GitHubDB | null {
  return dbInstance;
}

export function initDB(token: string, owner: string, repo: string): GitHubDB {
  dbInstance = new GitHubDB(token, owner, repo);
  return dbInstance;
}

export function clearDB(): void {
  dbInstance = null;
}
