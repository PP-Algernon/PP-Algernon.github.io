/* ==========================================================
   博客列表页逻辑（依赖 common.js）
   - 从 blog/posts.json 加载文章索引
   - 渲染文章卡片、按标签过滤
   ========================================================== */

const POSTS_INDEX = 'blog/posts.json';

let allPosts = [];
let activeTag = '';

async function loadPosts() {
    const res = await fetch(POSTS_INDEX);
    if (!res.ok) throw new Error('posts.json 加载失败');
    const posts = await res.json();
    // 按日期倒序
    return posts.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

function collectTags(posts) {
    const set = new Set();
    posts.forEach(p => (p.tags || []).forEach(t => set.add(t)));
    return [...set];
}

function renderFilter(posts) {
    const tags = collectTags(posts);
    if (tags.length === 0) return;

    const wrap = document.getElementById('blog-filter');
    wrap.hidden = false;

    tags.forEach(tag => {
        const btn = document.createElement('button');
        btn.className = 'filter-tag';
        btn.dataset.tag = tag;
        btn.textContent = tag;
        wrap.appendChild(btn);
    });

    wrap.addEventListener('click', e => {
        const btn = e.target.closest('.filter-tag');
        if (!btn) return;
        activeTag = btn.dataset.tag;
        [...wrap.querySelectorAll('.filter-tag')].forEach(b =>
            b.classList.toggle('active', b === btn));
        renderPosts();
    });
}

function renderPosts() {
    const list = document.getElementById('post-list');
    list.replaceChildren();

    const posts = activeTag
        ? allPosts.filter(p => (p.tags || []).includes(activeTag))
        : allPosts;

    if (posts.length === 0) {
        list.innerHTML = '<div class="gh-error"><i class="bi bi-journal-x"></i> 暂无文章</div>';
        return;
    }

    posts.forEach((p, i) => {
        const card = document.createElement('a');
        card.className = 'glass-panel post-card fade-in';
        card.style.animationDelay = `${Math.min(i * 0.08, 0.5)}s`;
        card.href = 'post.html?p=' + encodeURIComponent(p.file);

        const tags = (p.tags || [])
            .map(t => `<span class="post-tag">${escapeHtml(t)}</span>`)
            .join('');

        card.innerHTML = `
            <div class="post-card-date"><i class="bi bi-calendar3"></i> ${escapeHtml(p.date || '')}</div>
            <h2 class="post-card-title">${escapeHtml(p.title)}</h2>
            <p class="post-card-summary">${escapeHtml(p.summary || '')}</p>
            <div class="post-card-foot">
                <span class="post-tags">${tags}</span>
                <span class="post-more">阅读全文 <i class="bi bi-arrow-right"></i></span>
            </div>`;
        list.appendChild(card);
    });
}

window.addEventListener('DOMContentLoaded', async () => {
    let config = {};
    try { config = await loadConfig(); } catch (e) { console.error(e); }

    applyThemeColors(config);
    applyTheme(resolveTheme(config));
    bindThemeToggle();

    renderNav(config, { base: 'index.html' });
    bindNavToggle();
    renderFooter(config);

    const name = config.name || '';
    if (name) document.title = `博客 - ${name}`;
    if (config.blog_subtitle) {
        document.getElementById('blog-subtitle').textContent = config.blog_subtitle;
    }

    try {
        allPosts = await loadPosts();
        renderFilter(allPosts);
        renderPosts();
    } catch (e) {
        console.error(e);
        document.getElementById('post-list').innerHTML =
            '<div class="gh-error"><i class="bi bi-exclamation-triangle"></i> 文章索引加载失败，请检查 blog/posts.json。</div>';
    }
});
