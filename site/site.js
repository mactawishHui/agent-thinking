const blogConfig = window.BLOG_CONFIG || {};
let blogData = window.BLOG_DATA || null;
let activeArticles = [];

const homeView = document.querySelector('#homeView');
const articleList = document.querySelector('#articleList');
const reader = document.querySelector('#reader');
const searchInput = document.querySelector('#searchInput');
const sourceStatus = document.querySelector('#sourceStatus');
const siteDescription = document.querySelector('#siteDescription');
const repoLink = document.querySelector('#repoLink');
const repoFooterLink = document.querySelector('#repoFooterLink');

boot();

async function boot() {
  hydrateShell();
  renderLoadingState();

  try {
    blogData = await fetchGitHubArticles(blogConfig);
    sourceStatus.textContent = `已从 GitHub 读取 ${blogData.articles.length} 篇文章`;
  } catch (error) {
    if (!blogData || !Array.isArray(blogData.articles)) {
      renderFatalState(error);
      return;
    }
    sourceStatus.textContent = `GitHub 读取失败，正在使用本地缓存 ${blogData.articles.length} 篇文章`;
  }

  activeArticles = blogData.articles;
  renderArticleCards(activeArticles);
  renderRoute();

  searchInput.addEventListener('input', () => {
    activeArticles = filterArticles(searchInput.value);
    renderArticleCards(activeArticles);
  });

  window.addEventListener('hashchange', renderRoute);
}

function hydrateShell() {
  const repoUrl = getRepositoryUrl(blogConfig);
  document.title = blogConfig.title || blogData?.site?.title || 'Agent Thinking';
  siteDescription.textContent = blogConfig.description || blogData?.site?.description || '';
  repoLink.href = repoUrl;
  repoFooterLink.href = repoUrl;
  repoFooterLink.textContent = `${blogConfig.owner || 'mactawishHui'}/${blogConfig.repo || 'agent-thinking'}`;
}

async function fetchGitHubArticles(config) {
  const directoryConfig = buildDirectoryConfig(config);
  const items = await fetchJson(directoryConfig.apiUrl);
  const files = parseGitHubDirectoryItems(items, directoryConfig, config);
  const articles = await Promise.all(files.map(async (file, index) => {
    const markdown = await fetchText(file.downloadUrl);
    const commitDate = config.loadCommitDates === false ? '' : await fetchLatestCommitDate(file.path, directoryConfig);
    const meta = extractArticleMeta(file.file, markdown, {
      commitDate,
      rawDirectoryUrl: getRawDirectoryUrl(file.path, directoryConfig),
      rawRootUrl: directoryConfig.rawRootUrl
    });

    return {
      ...meta,
      order: index + 1,
      path: file.path,
      markdown,
      githubUrl: file.githubUrl,
      downloadUrl: file.downloadUrl
    };
  }));

  const sortedArticles = articles.sort(compareArticles);

  return {
    site: {
      title: config.title || 'Agent Thinking',
      description: config.description || ''
    },
    repository: {
      name: `${directoryConfig.owner}/${directoryConfig.repo}`,
      url: directoryConfig.repositoryUrl,
      branch: directoryConfig.branch,
      articlesPath: directoryConfig.htmlBaseUrl
    },
    source: {
      mode: 'github',
      directory: directoryConfig.directory,
      apiUrl: directoryConfig.apiUrl
    },
    articles: sortedArticles.map((article, index) => ({ ...article, order: index + 1 }))
  };
}

function buildDirectoryConfig(config) {
  const owner = config.owner || 'mactawishHui';
  const repo = config.repo || 'agent-thinking';
  const branch = config.branch || 'main';
  const directory = normalizeDirectory(config.articlesDirectory || '');
  const encodedDirectory = encodePath(directory);
  const repositoryUrl = `https://github.com/${owner}/${repo}`;
  const apiPath = encodedDirectory ? `contents/${encodedDirectory}` : 'contents';
  const suffix = encodedDirectory ? `${encodedDirectory}/` : '';

  return {
    owner,
    repo,
    branch,
    directory,
    repositoryUrl,
    apiUrl: `https://api.github.com/repos/${owner}/${repo}/${apiPath}?ref=${encodeURIComponent(branch)}`,
    rawRootUrl: `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/`,
    rawBaseUrl: `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${suffix}`,
    htmlBaseUrl: `${repositoryUrl}/blob/${branch}/${suffix}`
  };
}

function parseGitHubDirectoryItems(items, directoryConfig, config) {
  const includePattern = new RegExp(config.includePattern || '\\.md$');
  const excludePattern = new RegExp(config.excludePattern || '^(README|chatgpt_conversation_)', 'i');

  return items
    .filter((item) => item.type === 'file')
    .filter((item) => includePattern.test(item.name))
    .filter((item) => !excludePattern.test(item.name))
    .map((item) => {
      const file = directoryConfig.directory
        ? item.path.replace(`${directoryConfig.directory}/`, '')
        : item.path;

      return {
        file,
        path: item.path,
        name: item.name,
        downloadUrl: item.download_url || `${directoryConfig.rawBaseUrl}${encodeURIComponent(file)}`,
        githubUrl: `${directoryConfig.htmlBaseUrl}${encodePath(file)}`
      };
    });
}

async function fetchLatestCommitDate(path, directoryConfig) {
  try {
    const url = `https://api.github.com/repos/${directoryConfig.owner}/${directoryConfig.repo}/commits?sha=${encodeURIComponent(directoryConfig.branch)}&path=${encodeURIComponent(path)}&per_page=1`;
    const commits = await fetchJson(url);
    return commits[0]?.commit?.committer?.date || commits[0]?.commit?.author?.date || '';
  } catch {
    return '';
  }
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { Accept: 'application/vnd.github+json' } });

  if (!response.ok) {
    throw new Error(`GitHub request failed: ${response.status}`);
  }

  return response.json();
}

async function fetchText(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Markdown request failed: ${response.status}`);
  }

  return response.text();
}

function renderLoadingState() {
  articleList.innerHTML = `
    <div class="empty-state">
      <p>正在同步 GitHub 文章...</p>
    </div>
  `;
}

function renderArticleCards(articles) {
  if (articles.length === 0) {
    articleList.innerHTML = '<div class="empty-state"><p>No matching articles</p></div>';
    return;
  }

  articleList.innerHTML = articles.map((article) => `
    <article class="post-item">
      <h2>${escapeHtml(article.title)}</h2>
      <p class="post-summary">${escapeHtml(article.summary)}</p>
      <p class="post-date">${escapeHtml(article.dateLabel || 'Markdown')}</p>
      <a class="post-hit-area" href="#article-${encodeURIComponent(article.slug)}">
        <span class="sr-only">View Article</span>
      </a>
    </article>
  `).join('');
}

function renderRoute() {
  const slug = getHashSlug();

  if (!slug) {
    homeView.hidden = false;
    reader.hidden = true;
    document.title = blogData.site.title;
    return;
  }

  const article = blogData.articles.find((item) => item.slug === slug);

  if (!article) {
    history.replaceState(null, '', '#');
    renderRoute();
    return;
  }

  homeView.hidden = true;
  reader.hidden = false;
  document.title = `${article.title} | ${blogData.site.title}`;

  reader.innerHTML = `
    <a class="back-link" href="#">← 返回首页</a>
    <header class="reader-header">
      <h1>${escapeHtml(article.title)}</h1>
      <p>${escapeHtml(article.dateLabel || '')}</p>
      <div class="reader-actions">
        <a href="${escapeAttribute(article.githubUrl)}" target="_blank" rel="noreferrer">Markdown 源文件</a>
        <a href="${escapeAttribute(blogData.repository.url)}" target="_blank" rel="noreferrer">GitHub 仓库</a>
      </div>
    </header>
    <div class="reader-content">${renderMarkdown(article.markdown, article)}</div>
  `;
}

function extractArticleMeta(file, markdown, options = {}) {
  const { frontmatter, body } = splitFrontmatter(markdown);
  const title = frontmatter.title || body.match(/^#\s+(.+)$/m)?.[1].trim() || file;
  const summary = frontmatter.description || findSummary(body);
  const sections = [...body.matchAll(/^##\s+(.+)$/gm)].map((match) => stripMarkdown(match[1]));
  const heroImage = body.match(/!\[[^\]]*]\(([^)]+)\)/)?.[1] || '';
  const imageCount = (body.match(/!\[[^\]]*]\([^)]+\)/g) || []).length;
  const date = frontmatter.date || options.commitDate || '';

  return {
    file,
    slug: frontmatter.slug || slugFromFile(file),
    title,
    summary,
    date,
    dateLabel: formatDate(date),
    heroImage,
    imageCount,
    readingMinutes: Math.max(1, Math.ceil(stripMarkdown(body).length / 700)),
    sections,
    sectionCount: sections.length,
    rawDirectoryUrl: options.rawDirectoryUrl || '',
    rawRootUrl: options.rawRootUrl || ''
  };
}

function renderMarkdown(markdown, article) {
  const { body } = splitFrontmatter(markdown);
  const lines = body.split('\n');
  const blocks = [];
  let paragraph = [];
  let list = [];
  let listType = '';

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push(`<p>${renderInline(paragraph.join(' '), article)}</p>`);
      paragraph = [];
    }
  };

  const flushList = () => {
    if (list.length > 0) {
      blocks.push(`<${listType}>${list.join('')}</${listType}>`);
      list = [];
      listType = '';
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    const image = line.match(/^!\[([^\]]*)]\(([^)]+)\)$/);
    if (image) {
      flushParagraph();
      flushList();
      blocks.push(`<img src="${escapeAttribute(resolveAssetUrl(image[2], article))}" alt="${escapeAttribute(image[1])}">`);
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1].length;
      blocks.push(`<h${level}>${renderInline(heading[2], article)}</h${level}>`);
      continue;
    }

    if (line.startsWith('>')) {
      flushParagraph();
      flushList();
      blocks.push(`<blockquote><p>${renderInline(line.replace(/^>\s?/, ''), article)}</p></blockquote>`);
      continue;
    }

    const unordered = line.match(/^[-*]\s+(.+)$/);
    const ordered = line.match(/^\d+\.\s+(.+)$/);
    if (unordered || ordered) {
      flushParagraph();
      const desiredType = unordered ? 'ul' : 'ol';
      if (listType && listType !== desiredType) {
        flushList();
      }
      listType = desiredType;
      list.push(`<li>${renderInline((unordered || ordered)[1], article)}</li>`);
      continue;
    }

    paragraph.push(line);
  }

  flushParagraph();
  flushList();

  return blocks.join('');
}

function renderInline(value, article) {
  return escapeHtml(value)
    .replace(/&lt;u&gt;(.+?)&lt;\/u&gt;/g, '<u>$1</u>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)]\(([^)]+)\)/g, (_match, text, href) => {
      return `<a href="${escapeAttribute(resolveLinkUrl(href, article))}" target="_blank" rel="noreferrer">${text}</a>`;
    });
}

function filterArticles(value) {
  const query = value.trim().toLowerCase();

  if (!query) {
    return blogData.articles;
  }

  return blogData.articles.filter((article) => {
    return [article.title, article.summary, article.sections.join(' '), article.markdown]
      .join(' ')
      .toLowerCase()
      .includes(query);
  });
}

function splitFrontmatter(markdown) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);

  if (!match) {
    return { frontmatter: {}, body: markdown };
  }

  return {
    frontmatter: parseFrontmatter(match[1]),
    body: match[2]
  };
}

function parseFrontmatter(value) {
  return value.split('\n').reduce((result, line) => {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.+)$/);

    if (match) {
      result[match[1]] = match[2].replace(/^['"]|['"]$/g, '').trim();
    }

    return result;
  }, {});
}

function findSummary(markdown) {
  const firstQuote = markdown
    .split('\n')
    .find((line) => line.trim().startsWith('>') && stripMarkdown(line).length > 0);

  if (firstQuote) {
    return truncate(stripMarkdown(firstQuote), 132);
  }

  const paragraph = markdown
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .find((block) => block && !block.startsWith('#') && !block.startsWith('![') && !block.startsWith('```'));

  return truncate(stripMarkdown(paragraph || ''), 132);
}

function compareArticles(a, b) {
  const dateA = Date.parse(a.date);
  const dateB = Date.parse(b.date);

  if (!Number.isNaN(dateA) && !Number.isNaN(dateB) && dateA !== dateB) {
    return dateB - dateA;
  }

  return a.title.localeCompare(b.title, 'zh-CN');
}

function formatDate(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
}

function getHashSlug() {
  const rawHash = decodeURIComponent(location.hash.replace(/^#/, ''));
  return rawHash.startsWith('article-') ? rawHash.slice('article-'.length) : '';
}

function getRepositoryUrl(config) {
  return `https://github.com/${config.owner || 'mactawishHui'}/${config.repo || 'agent-thinking'}`;
}

function getRawDirectoryUrl(path, directoryConfig) {
  const directory = path.split('/').slice(0, -1).join('/');
  const suffix = directory ? `${encodePath(directory)}/` : '';
  return `${directoryConfig.rawRootUrl}${suffix}`;
}

function resolveAssetUrl(value, article) {
  if (/^(https?:|data:|blob:)/.test(value)) {
    return value;
  }

  if (value.startsWith('/')) {
    return `${article.rawRootUrl}${value.replace(/^\/+/, '')}`;
  }

  return `${article.rawDirectoryUrl}${value}`;
}

function resolveLinkUrl(value, article) {
  if (/^(https?:|mailto:|#)/.test(value)) {
    return value;
  }

  return resolveAssetUrl(value, article);
}

function slugFromFile(file) {
  return file
    .replace(/\.md$/i, '')
    .replace(/-article$/i, '')
    .replace(/[^a-zA-Z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function stripMarkdown(value) {
  return value
    .replace(/!\[([^\]]*)]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
    .replace(/^>\s?/gm, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(value, maxLength) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1).trim()}...`;
}

function normalizeDirectory(directory) {
  return directory.replace(/^\/+|\/+$/g, '');
}

function encodePath(path) {
  return path
    .split('/')
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join('/');
}

function renderFatalState(error) {
  sourceStatus.textContent = 'GitHub 读取失败';
  articleList.innerHTML = `<div class="empty-state"><p>${escapeHtml(error.message)}</p></div>`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, '&#096;');
}
