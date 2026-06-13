import { readdirSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const DEFAULT_REPOSITORY_URL = 'https://github.com/mactawishHui/agent-thinking';
const DEFAULT_BRANCH = 'main';

export function parseReadmeArticleLinks(readme) {
  const articleSection = readme.split(/^##\s+Articles\s*$/m)[1]?.split(/^##\s+/m)[0] ?? '';
  const links = [];
  const articleLinkPattern = /^-\s+\[([^\]]+)\]\(\.\/([^)]+\.md)\)\s*$/gm;
  let match;

  while ((match = articleLinkPattern.exec(articleSection)) !== null) {
    links.push({
      title: match[1].trim(),
      file: match[2].trim()
    });
  }

  return links;
}

export function extractArticleMeta(file, markdown) {
  const title = markdown.match(/^#\s+(.+)$/m)?.[1].trim() ?? file;
  const heroImage = markdown.match(/!\[[^\]]*]\(([^)]+)\)/)?.[1] ?? '';
  const imageCount = (markdown.match(/!\[[^\]]*]\([^)]+\)/g) ?? []).length;
  const sections = [...markdown.matchAll(/^##\s+(.+)$/gm)].map((match) => stripMarkdown(match[1]));
  const summary = findSummary(markdown, sections);
  const readingMinutes = Math.max(1, Math.ceil(stripMarkdown(markdown).length / 700));

  return {
    file,
    slug: slugFromFile(file),
    title,
    summary,
    heroImage,
    imageCount,
    readingMinutes,
    sections,
    sectionCount: sections.length
  };
}

export function buildBlogData(options = {}) {
  const rootUrl = toRootUrl(options.rootDir ?? new URL('../../', import.meta.url));
  const repositoryUrl = normalizeRepositoryUrl(options.repositoryUrl ?? DEFAULT_REPOSITORY_URL);
  const branch = options.branch ?? DEFAULT_BRANCH;
  const articlesDirectory = normalizeDirectory(options.articlesDirectory ?? 'articles');
  const directoryConfig = buildGitHubDirectoryConfig({ repositoryUrl, branch, articlesDirectory });
  const read = (file) => readFileSync(new URL(file, rootUrl), 'utf8');
  const articleFiles = listLocalArticleFiles(rootUrl, articlesDirectory);
  const articles = articleFiles.map((file, index) => {
    const markdown = read(`${articlesDirectory}/${file}`);
    const meta = extractArticleMeta(file, markdown);

    return {
      ...meta,
      order: index + 1,
      path: `${articlesDirectory}/${file}`,
      markdown,
      rawRootUrl: `https://raw.githubusercontent.com/${directoryConfig.owner}/${directoryConfig.repo}/${branch}/`,
      rawDirectoryUrl: directoryConfig.rawBaseUrl,
      githubUrl: `${directoryConfig.htmlBaseUrl}${encodeGitHubPath(file)}`,
      downloadUrl: `${directoryConfig.rawBaseUrl}${encodeGitHubPath(file)}`
    };
  });

  return {
    site: {
      title: options.title ?? 'Agent Thinking',
      description: options.description ?? '关于 AI、Agent、工程化工作流和个人创造力的长期记录。'
    },
    repository: {
      name: repositoryUrl.replace(/^https:\/\/github\.com\//, ''),
      url: repositoryUrl,
      branch,
      articlesPath: directoryConfig.htmlBaseUrl
    },
    source: {
      mode: 'local-cache',
      directory: articlesDirectory
    },
    articles
  };
}

export function buildGitHubDirectoryConfig(options = {}) {
  const repositoryUrl = normalizeRepositoryUrl(options.repositoryUrl ?? DEFAULT_REPOSITORY_URL);
  const branch = options.branch ?? DEFAULT_BRANCH;
  const directory = normalizeDirectory(options.articlesDirectory ?? '');
  const { owner, repo } = parseGitHubRepository(repositoryUrl);
  const encodedDirectory = encodeGitHubPath(directory);
  const apiPath = encodedDirectory ? `contents/${encodedDirectory}` : 'contents';
  const directorySuffix = directory ? `${encodedDirectory}/` : '';

  return {
    owner,
    repo,
    branch,
    directory,
    repositoryUrl,
    apiUrl: `https://api.github.com/repos/${owner}/${repo}/${apiPath}?ref=${encodeURIComponent(branch)}`,
    rawBaseUrl: `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${directorySuffix}`,
    htmlBaseUrl: `${repositoryUrl}/blob/${branch}/${directorySuffix}`
  };
}

export function parseGitHubDirectoryItems(items, config, options = {}) {
  const includePattern = new RegExp(options.includePattern ?? '\\.md$');
  const excludePattern = new RegExp(options.excludePattern ?? '^(README|chatgpt_conversation_)', 'i');

  return items
    .filter((item) => item.type === 'file')
    .filter((item) => includePattern.test(item.name))
    .filter((item) => !excludePattern.test(item.name))
    .map((item) => {
      const file = item.path.replace(`${config.directory}/`, '');

      return {
        file,
        path: item.path,
        name: item.name,
        downloadUrl: item.download_url || `${config.rawBaseUrl}${encodeURIComponent(file)}`,
        githubUrl: `${config.htmlBaseUrl}${encodeURIComponent(file)}`
      };
    });
}

export function serializeBlogData(data) {
  return `window.BLOG_DATA = ${JSON.stringify(data, null, 2)};\n`;
}

function findSummary(markdown, sections) {
  const firstQuote = markdown
    .split('\n')
    .find((line) => line.trim().startsWith('>') && stripMarkdown(line).length > 0);

  if (firstQuote) {
    return truncate(stripMarkdown(firstQuote), 120);
  }

  if (sections.length > 0) {
    return truncate(sections[0], 120);
  }

  const paragraph = markdown
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .find((block) => {
      return block &&
        !block.startsWith('#') &&
        !block.startsWith('![') &&
        !block.startsWith('>') &&
        !block.startsWith('```');
    });

  return truncate(stripMarkdown(paragraph ?? ''), 120);
}

function extractReadmeDescription(readme) {
  const betweenTitleAndArticles = readme
    .split(/^#\s+.+$/m)[1]
    ?.split(/^##\s+Articles\s*$/m)[0] ?? '';

  return betweenTitleAndArticles
    .split(/\n{2,}/)
    .map((block) => stripMarkdown(block.trim()))
    .filter(Boolean)
    .join(' ');
}

function listLocalArticleFiles(rootUrl, articlesDirectory) {
  return readdirSync(new URL(`${articlesDirectory}/`, rootUrl), { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => /\.md$/i.test(name))
    .filter((name) => !/^(README|chatgpt_conversation_)/i.test(name))
    .sort((a, b) => a.localeCompare(b, 'en'));
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

function toRootUrl(rootDir) {
  if (rootDir instanceof URL) {
    return rootDir;
  }

  const normalized = rootDir.endsWith('/') ? rootDir : `${rootDir}/`;
  return pathToFileURL(normalized);
}

function normalizeRepositoryUrl(url) {
  return url.replace(/\.git$/, '').replace(/\/$/, '');
}

function parseGitHubRepository(repositoryUrl) {
  const match = normalizeRepositoryUrl(repositoryUrl).match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)$/);

  if (!match) {
    throw new Error(`Unsupported GitHub repository URL: ${repositoryUrl}`);
  }

  return {
    owner: match[1],
    repo: match[2]
  };
}

function normalizeDirectory(directory) {
  return directory.replace(/^\/+|\/+$/g, '');
}

function encodeGitHubPath(path) {
  return path
    .split('/')
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join('/');
}
