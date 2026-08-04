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
├── index.html          # 欢迎引导页（站点入口：基础信息 + 页面导航）
├── home.html           # 个人主页（简介/项目/成果/奖项）
├── blog.html           # 博客列表页
├── post.html           # 博客文章页
├── config.json         # 个人信息与站点配置（改这里！）
├── contents/           # 主页各分区的 Markdown 内容
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
    "light": { "primary_color": "#8F5FA8", "secondary_color": "#708090" },
    "dark":  { "primary_color": "#D8BFD8", "secondary_color": "#C0C0C0" },
    "background_image": "static/assets/img/bg.jpg",
    "background_opacity": 0.35,
    "background_blur": 0
  }
}
```

设置了 `github_username` 后，头像、名称、统计数据会自动从 GitHub 拉取；
`social_links` 里的图标名来自 [Bootstrap Icons](https://icons.getbootstrap.com/)。

`theme` 中的主题色配置：
- `theme.light` / `theme.dark` — 分别指定浅色、深色模式下的 `primary_color` 和 `secondary_color`，切换模式时自动应用
- 也可以直接在 `theme` 顶层写 `primary_color` / `secondary_color` 作为两种模式共用的颜色（`light`/`dark` 未配置时的回落值）

`theme` 中的背景图片配置（可选）：
- `background_image` — 单张背景图路径，本地文件（建议放 `static/assets/img/`）或网络 URL 均可，支持 GIF 动图；留空 `""` 则不启用，只显示默认的动态渐变光斑。建议文件名只用英文/数字（中文、括号等字符在部分环境下可能加载失败）
- `background_images` — 多张背景图数组，配置后优先于 `background_image`。每次打开页面**随机**挑一张显示
- `background_rotate_interval` — 轮换间隔（秒）。大于 0 且有多张图时，定时按顺序淡入淡出切换；设为 `0` 则只随机不轮换（最短 5 秒）
- `background_opacity` — 背景图不透明度 0~1，建议 0.2~0.5，太高会影响文字可读性
- `background_blur` — 背景图模糊像素值，0 为不模糊，8~16 可做毛玻璃效果
- `background_pixelated` — 设为 `true` 时禁用缩放平滑，像素风图片放大后保持锐利的颗粒感（像素画 GIF 建议开启，普通照片保持 `false`）

GitHub 项目区默认排除 fork 仓库、主页仓库（`<用户名>.github.io`）和个人介绍仓库（`<用户名>/<用户名>`）；
要额外排除其他仓库，在 `config.json` 顶层加 `"exclude_repos": ["仓库名1", "仓库名2"]`。技术栈和语言分布统计同样基于过滤后的仓库。

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
