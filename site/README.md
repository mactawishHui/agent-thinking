# Agent Thinking

这里记录我对 AI、Agent、工程化工作流和个人创造力的一些长期思考。

这个仓库不是新闻剪贴板，也不是工具清单，更像是一个公开的思考档案。每篇文章尽量从具体体验出发，聊清楚一个我自己真正被打动、正在实践、或者反复琢磨的问题。

## Blog

这个仓库按两个顶层业务目录组织：

- `site/`：博客网站代码、测试、启动脚本和 GitHub Pages 部署配置。
- `articles/`：正式文章 Markdown 和文章 assets。

博客页面运行时会读取 `site/blog-config.js` 指定的 GitHub 仓库目录，并自动展示该目录下的 Markdown 文档。

默认配置读取当前仓库的 `articles/`：

```js
window.BLOG_CONFIG = {
  owner: 'mactawishHui',
  repo: 'agent-thinking',
  branch: 'main',
  articlesDirectory: 'articles'
};
```

如果之后把文章迁到 `docs/posts`，只需要修改 `articlesDirectory`，例如：

```js
articlesDirectory: 'docs/posts'
```

`blog-data.js` 仍然可以作为 GitHub API 失败时的离线缓存。需要刷新缓存时运行：

```bash
cd site
npm run build
```

本地预览：

```bash
cd site
npm run serve
```

然后打开 `http://127.0.0.1:4173/`。

## Deployment

仓库已包含 GitHub Pages 工作流：`.github/workflows/deploy-pages.yml`。部署步骤：

1. 把变更 push 到 `main`。
2. 打开 GitHub 仓库 Settings → Pages。
3. Source 选择 `GitHub Actions`。
4. 之后每次 push 到 `main`，工作流会把 `site/` 发布为静态站点。

## Articles

- [Harness Engineering，AI Agent 不是要放开跑，而是要在规则里赢](../articles/harness-engineering-article.md)
- [AI Agent 越能写，我们越需要奥卡姆剃刀](../articles/harness-occam-razor-article.md)
- [可能隐藏在FDE工程师背后的战略意图](../articles/fde-engineers-ai-company-real-strategy-article.md)
- [Agent 是手段，而非目的](../articles/agent-means-not-purpose-article.md)
- [我现在使用 Agent 的六条实践原则](../articles/agent-practical-best-practices-article.md)
- [Claude 员工为什么能把想法直接做成产品](../articles/claude-prototype-workflow-article.md)
- [Agent 很强，但人不能偷懒](../articles/agent-human-not-lazy-article.md)
- [AI 提高下限，但人决定上限](../articles/ai-raises-floor-human-ceiling-article.md)
- [Voice Coding 是先进生产力工具](../articles/voice-coding-article.md)

## Assets

文章相关图片和结构图放在 [articles/assets](../articles/assets/) 目录下。
