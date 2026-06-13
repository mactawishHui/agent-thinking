import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');

test('index.html wires the static blog shell', () => {
  const html = read('index.html');

  assert.match(html, /<main[^>]+id="app"/);
  assert.match(html, /id="articleList"/);
  assert.match(html, /id="reader"/);
  assert.match(html, /href="https:\/\/github\.com\/mactawishHui\/agent-thinking"/);
  assert.match(html, /src="blog-config\.js"/);
  assert.match(html, /src="blog-data\.js"/);
  assert.match(html, /src="site\.js"/);
});

test('site.js fetches GitHub docs and renders markdown content', () => {
  const script = read('site.js');

  assert.match(script, /window\.BLOG_CONFIG/);
  assert.match(script, /window\.BLOG_DATA/);
  assert.match(script, /fetchGitHubArticles/);
  assert.match(script, /renderArticleCards/);
  assert.match(script, /renderMarkdown/);
  assert.match(script, /location\.hash/);
});

test('styles.css contains baoyu-inspired responsive blog layout primitives', () => {
  const css = read('styles.css');

  assert.match(css, /--ink:/);
  assert.match(css, /\.post-list/);
  assert.match(css, /\.post-item/);
  assert.match(css, /\.reader-shell/);
  assert.match(css, /@media \(max-width: 760px\)/);
});

test('blog-config.js declares the GitHub directory source', () => {
  const config = read('blog-config.js');

  assert.match(config, /window\.BLOG_CONFIG/);
  assert.match(config, /owner:\s*['"]mactawishHui['"]/);
  assert.match(config, /repo:\s*['"]agent-thinking['"]/);
  assert.match(config, /articlesDirectory:\s*['"]articles['"]/);
});
