/* ==========================================================
   博客文章页逻辑（依赖 common.js）
   - 根据 URL 参数 ?p=<file> 加载 blog/<file> 的 Markdown
   - 从 blog/posts.json 读取标题/日期/标签等元信息
   - 代码高亮（highlight.js），主题跟随深浅模式
   ========================================================== */

const POSTS_INDEX = 'blog/posts.json';
const BLOG_DIR = 'blog/';

function currentPostFile() {
    const p = new URLSearchParams(location.search).get('p') || '';
    // 只允许 blog 目录内的 .md 文件名，防止路径穿越
    if (!/^[\w\-. 一-龥]+\.md$/.test(p) || p.includes('..')) return null;
    return p;
}

function syncHljsTheme() {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    const light = document.getElementById('hljs-theme-light');
    const darkCss = document.getElementById('hljs-theme-dark');
    if (light) light.disabled = dark;
    if (darkCss) darkCss.disabled = !dark;
}

async function loadPost() {
    const file = currentPostFile();
    const body = document.getElementById('post-body');

    if (!file) {
        body.innerHTML = '<p style="color:var(--text-muted)">未指定文章。<a href="blog.html">返回博客列表</a></p>';
        return;
    }

    // 元信息（标题、日期、标签）
    let meta = null;
    try {
        const res = await fetch(POSTS_INDEX);
        if (res.ok) {
            const posts = await res.json();
            meta = posts.find(p => p.file === file) || null;
        }
    } catch { /* 索引读取失败不影响正文展示 */ }

    // 正文
    try {
        const res = await fetch(BLOG_DIR + file);
        if (!res.ok) throw new Error(res.status);
        const md = await res.text();
        body.innerHTML = sanitizeHtml(marked.parse(md));
    } catch {
        body.innerHTML = '<p style="color:var(--text-muted)">文章加载失败，请检查 blog/' + escapeHtml(file) + ' 是否存在。</p>';
        return;
    }

    // 标题与元信息
    const title = meta?.title || file.replace(/\.md$/, '');
    document.getElementById('post-title').textContent = title;
    document.title = title;

    const metaEl = document.getElementById('post-meta');
    metaEl.replaceChildren();
    if (meta?.date) {
        const span = document.createElement('span');
        span.innerHTML = `<i class="bi bi-calendar3"></i> ${escapeHtml(meta.date)}`;
        metaEl.appendChild(span);
    }
    (meta?.tags || []).forEach(t => {
        const span = document.createElement('span');
        span.className = 'post-tag';
        span.textContent = t;
        metaEl.appendChild(span);
    });

    // 代码高亮
    if (window.hljs) {
        document.querySelectorAll('#post-body pre code').forEach(el => hljs.highlightElement(el));
    }
}

window.addEventListener('DOMContentLoaded', async () => {
    marked.use({ mangle: false, headerIds: false });

    let config = {};
    try { config = await loadConfig(); } catch (e) { console.error(e); }

    applyThemeColors(config);
    applyTheme(resolveTheme(config));
    syncHljsTheme();
    bindThemeToggle(() => syncHljsTheme());

    renderNav(config, { base: 'home.html' });
    bindNavToggle();
    renderFooter(config);

    await loadPost();
});
