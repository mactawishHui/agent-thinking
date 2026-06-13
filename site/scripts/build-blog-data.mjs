import { writeFileSync } from 'node:fs';
import { buildBlogData, serializeBlogData } from './blog-data.mjs';

const repositoryUrl = process.env.REPOSITORY_URL ?? 'https://github.com/mactawishHui/agent-thinking';
const articlesDirectory = process.env.ARTICLES_DIRECTORY ?? 'articles';
const data = buildBlogData({
  rootDir: new URL('../../', import.meta.url),
  repositoryUrl,
  articlesDirectory
});

writeFileSync(new URL('../blog-data.js', import.meta.url), serializeBlogData(data));
console.log(`Generated blog-data.js with ${data.articles.length} articles.`);
