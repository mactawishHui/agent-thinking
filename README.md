# Agent Thinking

这里记录我对 AI、Agent、工程化工作流和个人创造力的一些长期思考。

这个仓库不是新闻剪贴板，也不是工具清单，更像是一个公开的思考档案。每篇文章尽量从具体体验出发，聊清楚一个我自己真正被打动、正在实践、或者反复琢磨的问题。

## Blog

这个仓库按两个顶层业务目录组织：

- `site/`：博客网站代码、测试和启动脚本。
- `articles/`：正式文章 Markdown 和文章 assets。

Zeabur 部署时会运行 `site` 里的构建脚本，自动扫描 `articles/` 下的 Markdown 并生成博客数据。之后每次把新文章 push 到 GitHub，Zeabur 会触发重新部署，网站就会更新。

浏览器端也保留了 `site/blog-config.js` 指定 GitHub 目录的同步能力；如果 GitHub API 被限流或不可用，页面会继续展示构建时生成的缓存文章。

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

本地需要刷新构建缓存时运行：

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

部署到 Zeabur：

1. 登录 Zeabur，创建 Project。
2. Add Service → GitHub，选择 `mactawishHui/agent-thinking` 仓库。
3. 在服务 Settings 里把 Root Directory 设为 `site`。
4. Build Command 设为 `npm run build`。
5. Start Command 设为 `npm run start`。
6. 后续 push 到 GitHub 后，Zeabur 会自动重新部署。

## Articles

- [Harness Engineering，AI Agent 不是要放开跑，而是要在规则里赢](./articles/harness-engineering-article.md)
- [AI Agent 越能写，我们越需要奥卡姆剃刀](./articles/harness-occam-razor-article.md)
- [可能隐藏在FDE工程师背后的战略意图](./articles/fde-engineers-ai-company-real-strategy-article.md)
- [Agent 是手段，而非目的](./articles/agent-means-not-purpose-article.md)
- [我现在使用 Agent 的六条实践原则](./articles/agent-practical-best-practices-article.md)
- [Claude 员工为什么能把想法直接做成产品](./articles/claude-prototype-workflow-article.md)
- [Agent 很强，但人不能偷懒](./articles/agent-human-not-lazy-article.md)
- [AI 提高下限，但人决定上限](./articles/ai-raises-floor-human-ceiling-article.md)
- [Voice Coding 是先进生产力工具](./articles/voice-coding-article.md)

## Assets

文章相关图片和结构图放在 [articles/assets](./articles/assets/) 目录下。
