import type { Article } from '@/types';

/**
 * Parse a markdown file with YAML front matter into an Article object.
 * Format:
 * ---
 * title: Why do we dream?
 * source: BBC Take Away English
 * date: 2026-01-15
 * difficulty: medium
 * audio: https://...
 * tags: [sleep, science]
 * ---
 * 
 * Article content here...
 */
export function parseArticleMarkdown(raw: string, filename: string): Article {
  const { frontMatter, body } = splitFrontMatter(raw);
  const sentences = splitSentences(body);

  return {
    id: filename.replace(/\.md$/, ''),
    title: frontMatter.title || 'Untitled',
    content: body.trim(),
    sentences,
    audioUrl: frontMatter.audio || '',
    source: frontMatter.source || '',
    difficulty: frontMatter.difficulty || 'medium',
    tags: frontMatter.tags || [],
    createdAt: frontMatter.date || new Date().toISOString().slice(0, 10),
  };
}

/**
 * Convert an Article object back to markdown string with front matter.
 */
export function articleToMarkdown(article: Omit<Article, 'id' | 'sentences'>): string {
  const tagsStr = article.tags.length > 0 ? `\ntags: [${article.tags.join(', ')}]` : '';
  return `---
title: ${article.title}
source: ${article.source}
date: ${article.createdAt}
difficulty: ${article.difficulty}
audio: ${article.audioUrl}${tagsStr}
---

${article.content}`;
}

function splitFrontMatter(raw: string): { frontMatter: Record<string, any>; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    return { frontMatter: {}, body: raw };
  }

  const yamlStr = match[1];
  const body = match[2];
  const frontMatter: Record<string, any> = {};

  for (const line of yamlStr.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    let value: any = line.slice(colonIdx + 1).trim();

    // Parse arrays like [a, b, c]
    if (value.startsWith('[') && value.endsWith(']')) {
      value = value.slice(1, -1).split(',').map(s => s.trim()).filter(Boolean);
    }

    frontMatter[key] = value;
  }

  return { frontMatter, body };
}

/**
 * Split English text into sentences.
 * Handles common abbreviations (Mr., Dr., etc.) and ellipsis.
 */
export function splitSentences(text: string): string[] {
  // Normalize whitespace
  const normalized = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

  // Split on sentence-ending punctuation followed by space and capital letter
  // But avoid splitting on common abbreviations
  const abbreviations = ['Mr', 'Mrs', 'Ms', 'Dr', 'Prof', 'Sr', 'Jr', 'Inc', 'Ltd', 'vs', 'etc', 'e.g', 'i.e'];
  
  // Temporarily replace abbreviations to avoid false splits
  let processed = normalized;
  for (const abbr of abbreviations) {
    const regex = new RegExp(`\\b${abbr}\\.`, 'g');
    processed = processed.replace(regex, `${abbr}__DOT__`);
  }

  // Split on .!? followed by space(s) and a capital letter or newline
  const rawSentences = processed.split(/(?<=[.!?])\s+(?=[A-Z\u201C\u201D"'])/);

  // Restore abbreviations and clean up
  const sentences = rawSentences
    .map(s => s.replace(/__DOT__/g, '.').trim())
    .filter(s => s.length > 0);

  return sentences;
}
