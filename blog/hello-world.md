欢迎来到我的博客！这是第一篇文章，同时也是这个博客系统的使用说明。

## 如何发布新文章

只需两步：

**第一步**：在 `blog/` 目录下新建一个 Markdown 文件，比如 `my-post.md`，用 Markdown 写文章内容。

**第二步**：在 `blog/posts.json` 中添加一条索引：

```json
{
  "file": "my-post.md",
  "title": "文章标题",
  "date": "2026-07-20",
  "tags": ["技术", "笔记"],
  "summary": "这篇文章的一句话摘要，会显示在博客列表页。"
}
```

保存后推送到 GitHub，文章就发布了。列表页会自动按日期倒序排列，标签会自动生成过滤按钮。

## 支持的写作元素

### 代码块（自动高亮）

```python
def hello(name: str) -> str:
    return f"Hello, {name}!"

print(hello("world"))
```

### 引用

> 好记性不如烂笔头 —— 把学到的东西写下来，才是真正学会了。

### 表格

| 元素 | 支持 |
|------|------|
| 代码高亮 | ✅ |
| 图片 | ✅ |
| 表格 | ✅ |
| 链接 | ✅ |

### 图片

把图片放到 `blog/images/` 目录，然后这样引用：

```markdown
![描述](blog/images/example.png)
```

祝写作愉快！✍️
