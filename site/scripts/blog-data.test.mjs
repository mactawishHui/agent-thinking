import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildGitHubDirectoryConfig,
  buildBlogData,
  extractArticleMeta,
  parseGitHubDirectoryItems,
  parseReadmeArticleLinks
} from './blog-data.mjs';

const root = new URL('../', import.meta.url);
const repoRoot = new URL('../../', import.meta.url);
const read = (path) => readFileSync(new URL(path, repoRoot), 'utf8');

test('parseReadmeArticleLinks returns the public article list in README order', () => {
  const links = parseReadmeArticleLinks(`
## Articles

- [Harness Engineering，AI Agent 不是要放开跑，而是要在规则里赢](./harness-engineering-article.md)
- [AI Agent 越能写，我们越需要奥卡姆剃刀](./harness-occam-razor-article.md)
- [可能隐藏在FDE工程师背后的战略意图](./fde-engineers-ai-company-real-strategy-article.md)
- [Agent 是手段，而非目的](./agent-means-not-purpose-article.md)
- [我现在使用 Agent 的六条实践原则](./agent-practical-best-practices-article.md)
- [Claude 员工为什么能把想法直接做成产品](./claude-prototype-workflow-article.md)
- [Agent 很强，但人不能偷懒](./agent-human-not-lazy-article.md)
- [AI 提高下限，但人决定上限](./ai-raises-floor-human-ceiling-article.md)
- [Voice Coding 是先进生产力工具](./voice-coding-article.md)
`);

  assert.equal(links.length, 9);
  assert.deepEqual(
    links.map((link) => link.file),
    [
      'harness-engineering-article.md',
      'harness-occam-razor-article.md',
      'fde-engineers-ai-company-real-strategy-article.md',
      'agent-means-not-purpose-article.md',
      'agent-practical-best-practices-article.md',
      'claude-prototype-workflow-article.md',
      'agent-human-not-lazy-article.md',
      'ai-raises-floor-human-ceiling-article.md',
      'voice-coding-article.md'
    ]
  );
});

test('extractArticleMeta derives readable card metadata from markdown', () => {
  const markdown = read('articles/voice-coding-article.md');
  const meta = extractArticleMeta('voice-coding-article.md', markdown);

  assert.equal(meta.title, 'Voice Coding 是先进生产力工具');
  assert.equal(meta.slug, 'voice-coding');
  assert.equal(meta.heroImage, 'assets/voice-coding/01-cover-voice-coding-productivity.png');
  assert.equal(meta.imageCount, 6);
  assert.ok(meta.readingMinutes >= 8);
  assert.ok(meta.summary.includes('打字开始变成新的瓶颈'));
  assert.ok(meta.sections.includes('为什么现在可以直接说'));
});

test('buildBlogData includes repository links and article markdown', () => {
  const data = buildBlogData({
    rootDir: repoRoot,
    repositoryUrl: 'https://github.com/mactawishHui/agent-thinking',
    articlesDirectory: 'articles'
  });

  assert.equal(data.repository.url, 'https://github.com/mactawishHui/agent-thinking');
  assert.equal(data.repository.articlesPath, 'https://github.com/mactawishHui/agent-thinking/blob/main/articles/');
  assert.equal(data.articles.length, 9);
  assert.ok(data.articles.every((article) => article.markdown.startsWith('# ')));
  assert.ok(data.articles.every((article) => article.githubUrl.startsWith(data.repository.articlesPath)));
  assert.ok(data.articles.every((article) => article.rawDirectoryUrl === 'https://raw.githubusercontent.com/mactawishHui/agent-thinking/main/articles/'));
});

test('buildGitHubDirectoryConfig creates GitHub API and source URLs for a docs directory', () => {
  const config = buildGitHubDirectoryConfig({
    repositoryUrl: 'https://github.com/mactawishHui/agent-thinking.git',
    branch: 'main',
    articlesDirectory: 'articles'
  });

  assert.equal(config.owner, 'mactawishHui');
  assert.equal(config.repo, 'agent-thinking');
  assert.equal(config.directory, 'articles');
  assert.equal(config.apiUrl, 'https://api.github.com/repos/mactawishHui/agent-thinking/contents/articles?ref=main');
  assert.equal(config.rawBaseUrl, 'https://raw.githubusercontent.com/mactawishHui/agent-thinking/main/articles/');
  assert.equal(config.htmlBaseUrl, 'https://github.com/mactawishHui/agent-thinking/blob/main/articles/');
});

test('parseGitHubDirectoryItems keeps markdown files and removes private exports', () => {
  const config = buildGitHubDirectoryConfig({
    repositoryUrl: 'https://github.com/mactawishHui/agent-thinking',
    branch: 'main',
    articlesDirectory: ''
  });
  const items = [
    { type: 'file', name: 'README.md', path: 'README.md', download_url: 'https://example.com/README.md' },
    { type: 'file', name: 'voice-coding-article.md', path: 'voice-coding-article.md', download_url: 'https://example.com/voice.md' },
    { type: 'file', name: 'chatgpt_conversation_6a1bbec3_full.md', path: 'chatgpt_conversation_6a1bbec3_full.md', download_url: 'https://example.com/private.md' },
    { type: 'file', name: 'notes.txt', path: 'notes.txt', download_url: 'https://example.com/notes.txt' },
    { type: 'dir', name: 'assets', path: 'assets' }
  ];

  const articles = parseGitHubDirectoryItems(items, config);

  assert.deepEqual(articles.map((article) => article.file), ['voice-coding-article.md']);
  assert.equal(articles[0].githubUrl, 'https://github.com/mactawishHui/agent-thinking/blob/main/voice-coding-article.md');
  assert.equal(articles[0].downloadUrl, 'https://example.com/voice.md');
});
