# 我的个人主页

一个纯静态、零构建的个人主页，融合了「科技渐变风」与「学术主页」两种模板的优点：

- ✨ **零构建部署**：纯 HTML/CSS/JS，push 到 GitHub 即上线，无需任何编译步骤
- 🌓 **深浅色模式**：跟随系统自动切换，也可手动切换（记忆偏好）
- 📊 **GitHub 数据集成**：自动展示头像、仓库/Stars/Followers 统计、热门项目卡片、语言分布图表、技术栈标签
- 📝 **Markdown 驱动内容**：简介、成果、奖项等分区直接编辑 `contents/*.md`，刷新即生效
- ✍️ **内置博客系统**：多页面结构，写 Markdown + 加一条索引即可发布文章，支持标签过滤和代码高亮
- 📱 **完全响应式**：适配手机到桌面各种屏幕

## 目录结构

```
.
├── index.html          # 首页
├── blog.html           # 博客列表页
├── post.html           # 博客文章页
├── config.json         # 个人信息与站点配置（改这里！）
├── contents/           # 首页各分区的 Markdown 内容
│   ├── home.md         # 个人简介（默认自动加载 GitHub 个人介绍）
│   ├── publications.md # 论文/成果
│   └── awards.md       # 奖项荣誉
├── blog/               # 博客文章
│   ├── posts.json      # 文章索引（发布新文章时在这里加一条）
│   └── *.md            # 文章正文
└── static/
    ├── css/main.css    # 样式
    ├── js/common.js    # 多页面共用逻辑
    ├── js/main.js      # 首页逻辑
    ├── js/blog.js      # 博客列表页逻辑
    ├── js/post.js      # 文章页逻辑
    └── assets/         # 头像、图标等资源
```

## 快速开始

### 1. 修改配置

编辑 `config.json`：

```json
{
  "github_username": "your-username",
  "name": "Your Name",
  "chinese_name": "姓名",
  "bio": "一句话介绍自己",
  "theme": {
    "primary_color": "#6a11cb",
    "secondary_color": "#2575fc"
  }
}
```

设置了 `github_username` 后，头像、名称、统计数据会自动从 GitHub 拉取；
`social_links` 里的图标名来自 [Bootstrap Icons](https://icons.getbootstrap.com/)。

### 2. 编辑内容

直接修改 `contents/` 下的 Markdown 文件。要增删分区，编辑 `config.json` 的 `sections`：

```json
{ "id": "blog", "nav": "博客", "title": "我的博客", "icon": "pencil-fill" }
```

新增分区后创建对应的 `contents/blog.md` 即可。`"type": "github"` 的分区是特殊的 GitHub 项目展示区。

### 3. 写博客

发布一篇新文章只需两步：

1. 在 `blog/` 目录新建 Markdown 文件，如 `blog/my-post.md`，用 Markdown 写正文
2. 在 `blog/posts.json` 中加一条索引：

```json
{
  "file": "my-post.md",
  "title": "文章标题",
  "date": "2026-07-20",
  "tags": ["技术", "笔记"],
  "summary": "一句话摘要，显示在博客列表页。"
}
```

推送到 GitHub 后文章即发布。列表按日期自动倒序，标签自动生成过滤按钮，代码块自动高亮。
文章内插图放到 `blog/images/`，用 `![描述](blog/images/xxx.png)` 引用。

### 4. 本地预览

因为页面通过 fetch 加载配置和 Markdown，需用本地服务器打开（不能直接双击 index.html）：

```bash
# 任选其一
python -m http.server 8000
npx serve .
```

然后访问 http://localhost:8000

### 5. 部署到 GitHub Pages

1. 在 GitHub 新建仓库，命名为 `<你的用户名>.github.io`
2. 推送代码：

```bash
git init
git add .
git commit -m "init homepage"
git branch -M main
git remote add origin https://github.com/<你的用户名>/<你的用户名>.github.io.git
git push -u origin main
```

3. 打开仓库 **Settings → Pages**，Source 选择 **Deploy from a branch**，分支选 `main`、目录选 `/ (root)`，保存
4. 等待约 1-10 分钟，访问 `https://<你的用户名>.github.io` 🎉

> 💡 GitHub API 匿名访问限制为每 IP 每小时 60 次，正常浏览完全够用；若超限，页面统计区会暂时不显示，稍后自动恢复。

## 自定义

| 想改什么 | 改哪里 |
|---------|--------|
| 主题配色 | `config.json` → `theme` |
| 深浅模式默认值 | `config.json` → `dark_mode`（`auto`/`dark`/`light`） |
| 展示的项目数量 | `config.json` → `max_repos` |
| 「关于我」内容来源 | `config.json` → `introduction_from_github`（`true` 自动加载 GitHub 个人介绍 README，`false` 使用 `contents/home.md`） |
| 头像 | 自动用 GitHub 头像；无 GitHub 时替换 `static/assets/img/avatar.svg` |
| 页面样式 | `static/css/main.css`（CSS 变量集中在文件顶部） |
| 功能逻辑 | `static/js/main.js` |

## License

MIT
