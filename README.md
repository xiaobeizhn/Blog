# 披着被子的博客

基于 [Astro](https://astro.build/) 的个人博客，部署在 Netlify。

## 功能

- 极简清爽的阅读体验，支持深色模式
- Markdown 写作，标签分类
- **后台实时编辑器**：访问 `/admin`，使用 Cherry Markdown 分屏编辑 + 实时预览
- 图片粘贴上传，保存即发布
- RSS、Sitemap、SEO

## 写文章

1. 访问 `/admin`，输入 GitHub Fine-grained Token 登录
2. 点击「新建文章」
3. 在编辑器中用 Markdown 写作（左侧编辑，右侧实时预览）
4. 可以直接粘贴图片到编辑器
5. 点击「保存并发布」
6. 等待 1-3 分钟，Netlify 自动构建部署

### Token 要求

在 [GitHub Token 设置](https://github.com/settings/tokens?type=beta) 生成 Fine-grained Token：

- **Repository access**: 仅 `Blog` 仓库
- **Permissions**: Contents → Read and write

Token 仅保存在你的浏览器本地，不会上传到服务器。

## 本地开发

```bash
npm install
npm run dev       # 启动开发服务器
npm run build     # 构建静态站点
npm run preview   # 预览构建结果
```

## 项目结构

```
src/
├── components/       # Astro 组件 + 管理后台 React 组件
│   └── admin/        # 后台管理（AuthGate、Editor、GitHubClient）
├── content/blog/     # Markdown 文章
├── layouts/          # 页面布局
├── pages/            # 路由页面
│   └── admin/        # 后台管理页面
├── styles/           # 全局样式
└── consts.ts         # 站点配置
```

## 部署

推送到 `main` 分支后，Netlify 自动构建部署。

- Build command: `npm run build`
- Publish directory: `dist`
