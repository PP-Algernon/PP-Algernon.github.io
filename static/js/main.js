/* ==========================================================
   首页逻辑（依赖 common.js）
   - 渲染侧栏个人卡 / 内容分区
   - Markdown 分区从 contents/<id>.md 加载；
     home 分区可自动加载 GitHub 个人介绍 README
   - GitHub API：用户信息、仓库、语言统计、图表
   ========================================================== */

const GITHUB_API = 'https://api.github.com';

/* 常见语言的 GitHub 官方配色 */
const LANG_COLORS = {
    JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572A5',
    Java: '#b07219', C: '#555555', 'C++': '#f34b7d', 'C#': '#178600',
    Go: '#00ADD8', Rust: '#dea584', HTML: '#e34c26', CSS: '#563d7c',
    Vue: '#41b883', Shell: '#89e051', PHP: '#4F5D95', Ruby: '#701516',
    Kotlin: '#A97BFF', Swift: '#F05138', Dart: '#00B4AB', R: '#198CE7',
    MATLAB: '#e16737', 'Jupyter Notebook': '#DA5B0B', TeX: '#3D6117',
};

/* 深色文字的浅色语言标签需要特殊处理 */
const DARK_TEXT_LANGS = new Set(['JavaScript', 'Shell']);

const state = { config: null, ghUser: null, ghRepos: [] };

function displayName(config) {
    const u = state.ghUser;
    let name = config.name;
    if (!name || name === 'Your Name' || (u && name === u.login)) {
        name = u ? (u.name || u.login) : (name || '个人主页');
    }
    return config.chinese_name ? `${name} | ${config.chinese_name}` : name;
}

function renderProfile(config) {
    const u = state.ghUser;
    const name = displayName(config);

    document.getElementById('profile-name').textContent = name;
    document.title = `${name} - 个人主页`;

    const bioEl = document.getElementById('profile-bio');
    bioEl.textContent = config.bio || u?.bio || '';

    // 头像与 favicon（并缓存给子页面导航栏用）
    if (u) {
        document.getElementById('profile-avatar').src = u.avatar_url;
        document.getElementById('nav-avatar').src = u.avatar_url;
        document.getElementById('favicon').href = u.avatar_url;
        try { localStorage.setItem('gh_avatar', u.avatar_url); } catch { /* 忽略 */ }
    }

    // 位置 / 公司 / 邮箱等元信息
    const meta = document.getElementById('profile-meta');
    meta.replaceChildren();
    const metaItems = [];
    if (u?.location) metaItems.push({ icon: 'geo-alt', text: u.location });
    if (u?.company) metaItems.push({ icon: 'building', text: u.company });
    if (config.email && config.email.includes('@') && config.email.length > 3) {
        metaItems.push({ icon: 'envelope', text: config.email });
    }
    metaItems.forEach(m => {
        const span = document.createElement('span');
        span.innerHTML = `<i class="bi bi-${m.icon}"></i>${escapeHtml(m.text)}`;
        meta.appendChild(span);
    });

    // GitHub 按钮
    const btn = document.getElementById('profile-github-btn');
    if (config.github_username) btn.href = `https://github.com/${config.github_username}`;
}

function renderSectionShells(config) {
    const main = document.getElementById('sections');
    main.replaceChildren();
    (config.sections || []).forEach((s, i) => {
        const sec = document.createElement('section');
        sec.className = 'glass-panel content-section slide-in';
        sec.style.animationDelay = `${0.15 * i}s`;
        sec.id = s.id;

        const h2 = document.createElement('h2');
        h2.className = 'section-title';
        if (s.icon) {
            const icon = document.createElement('i');
            icon.className = 'bi bi-' + s.icon;
            h2.appendChild(icon);
        }
        h2.appendChild(document.createTextNode(s.title || s.nav || s.id));

        const body = document.createElement('div');
        body.id = s.id + '-body';
        body.className = s.type === 'github' ? 'gh-body' : 'md-body';

        sec.appendChild(h2);
        sec.appendChild(body);
        main.appendChild(sec);
    });
}

/* ---------------- Markdown 分区 ---------------- */

async function loadMarkdownSection(id, config) {
    const target = document.getElementById(id + '-body');
    if (!target) return;

    // home 分区优先使用 GitHub 个人介绍（<用户名>/<用户名> 仓库的 README）
    if (id === 'home' && config?.introduction_from_github && config.github_username) {
        const md = await fetchGithubProfileReadme(config.github_username);
        if (md) {
            target.innerHTML = sanitizeHtml(marked.parse(md));
            return;
        }
        // 拉取失败则回落到本地 contents/home.md
    }

    try {
        const res = await fetch(CONTENT_DIR + id + '.md');
        if (!res.ok) throw new Error(res.status);
        const md = await res.text();
        target.innerHTML = sanitizeHtml(marked.parse(md));
    } catch {
        target.innerHTML = '<p style="color:var(--text-muted)">内容加载失败，请检查 contents/' + id + '.md 是否存在。</p>';
    }
}

async function fetchGithubProfileReadme(user) {
    // 依次尝试 main / master 分支
    for (const branch of ['main', 'master']) {
        try {
            const res = await fetch(`https://raw.githubusercontent.com/${user}/${user}/${branch}/README.md`);
            if (res.ok) return await res.text();
        } catch { /* 继续尝试下一分支 */ }
    }
    return null;
}

/* ---------------- GitHub API ---------------- */

async function fetchGithub(config) {
    const user = config.github_username;
    if (!user || user === 'your-username') return;
    try {
        const [userRes, repoRes] = await Promise.all([
            fetch(`${GITHUB_API}/users/${user}`),
            fetch(`${GITHUB_API}/users/${user}/repos?sort=updated&per_page=100`),
        ]);
        if (!userRes.ok || !repoRes.ok) throw new Error('GitHub API 请求失败');
        state.ghUser = await userRes.json();
        // 排除 fork、主页仓库(<用户名>.github.io)、个人介绍仓库(<用户名>/<用户名>),
        // 以及 config.exclude_repos 中列出的仓库
        const excluded = new Set(
            [`${user}.github.io`, user, ...(config.exclude_repos || [])].map(n => n.toLowerCase())
        );
        state.ghRepos = (await repoRes.json())
            .filter(r => !r.fork && !excluded.has(r.name.toLowerCase()));
    } catch (e) {
        console.warn('GitHub 数据获取失败：', e);
    }
}

function langStats() {
    const counts = {};
    state.ghRepos.forEach(r => {
        if (r.language) counts[r.language] = (counts[r.language] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

/* 侧栏：技术栈标签 + 语言分布图 */
function renderSidebarExtras() {
    if (!state.ghUser) return;
    const stats = langStats();
    if (stats.length === 0) return;

    const techCard = document.getElementById('tech-card');
    const langCard = document.getElementById('lang-card');
    techCard.hidden = false;
    langCard.hidden = false;

    const tags = document.getElementById('tech-tags');
    tags.replaceChildren();
    stats.forEach(([lang]) => {
        const span = document.createElement('span');
        span.className = 'tech-tag';
        const bg = LANG_COLORS[lang] || '#8b949e';
        span.style.background = bg;
        if (DARK_TEXT_LANGS.has(lang)) span.style.color = '#22272e';
        span.innerHTML = `<i class="bi bi-code-slash"></i>${escapeHtml(lang)}`;
        tags.appendChild(span);
    });
}

/* 内容区：GitHub 项目分区 */
function renderGithubSection(config, sectionId) {
    const target = document.getElementById(sectionId + '-body');
    if (!target) return;
    target.replaceChildren();

    if (!state.ghUser) {
        target.innerHTML = '<div class="gh-error"><i class="bi bi-github"></i> 暂无 GitHub 数据 —— 请检查网络，或确认 config.json 中的 <code>github_username</code> 配置正确。</div>';
        return;
    }

    // 项目列表（按 stars 排序）
    const list = document.createElement('div');
    list.className = 'repo-list';
    state.ghRepos
        .slice()
        .sort((a, b) => b.stargazers_count - a.stargazers_count)
        .slice(0, config.max_repos || 6)
        .forEach(r => {
            const a = document.createElement('a');
            a.className = 'repo-item';
            a.href = r.html_url;
            a.target = '_blank';
            a.rel = 'noopener';
            const dot = LANG_COLORS[r.language] || '#8b949e';
            a.innerHTML = `
                <div class="repo-head">
                    <span class="repo-name"><i class="bi bi-journal-code"></i> ${escapeHtml(r.name)}</span>
                    <span class="repo-stars"><i class="bi bi-star-fill"></i> ${r.stargazers_count}</span>
                </div>
                <div class="repo-desc">${escapeHtml(r.description || '暂无描述')}</div>
                <div class="repo-foot">
                    <span>${r.language ? `<span class="lang-dot" style="background:${dot}"></span>${escapeHtml(r.language)}` : ''}</span>
                    <span><i class="bi bi-clock"></i> 更新于 ${r.updated_at.slice(0, 10)}</span>
                </div>`;
            list.appendChild(a);
        });
    target.appendChild(list);

    // Stars 柱状图
    const chartWrap = document.createElement('div');
    chartWrap.className = 'star-chart-wrap';
    chartWrap.innerHTML = '<canvas id="star-chart"></canvas>';
    target.appendChild(chartWrap);

    renderCharts();
}

/* ---------------- 图表 ---------------- */

let langChart = null;
let starChart = null;

function cssVar(name, fallback) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

function hexToRgba(hex, alpha) {
    const m = hex.replace('#', '');
    const full = m.length === 3 ? m.split('').map(c => c + c).join('') : m;
    const n = parseInt(full, 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

function renderCharts() {
    if (!state.ghUser || typeof Chart === 'undefined') return;
    const textColor = cssVar('--text-muted', '#888');
    const primary = cssVar('--primary', '#6a11cb');
    const secondary = cssVar('--secondary', '#2575fc');

    // 语言分布环形图（侧栏）
    const langCanvas = document.getElementById('lang-chart');
    if (langCanvas) {
        const stats = langStats().slice(0, 8);
        if (langChart) langChart.destroy();
        langChart = new Chart(langCanvas, {
            type: 'doughnut',
            data: {
                labels: stats.map(([l]) => l),
                datasets: [{
                    data: stats.map(([, n]) => n),
                    backgroundColor: stats.map(([l]) => LANG_COLORS[l] || '#8b949e'),
                    borderWidth: 0,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '62%',
                plugins: { legend: { position: 'right', labels: { color: textColor, boxWidth: 10, font: { size: 11 } } } },
            },
        });
    }

    // 热门仓库 Stars 柱状图（内容区）
    const starCanvas = document.getElementById('star-chart');
    if (starCanvas) {
        const topRepos = state.ghRepos
            .slice()
            .sort((a, b) => b.stargazers_count - a.stargazers_count)
            .slice(0, 6);

        if (starChart) starChart.destroy();
        const ctx = starCanvas.getContext('2d');
        const gradient = ctx.createLinearGradient(0, 0, starCanvas.parentElement.clientWidth || 400, 0);
        gradient.addColorStop(0, hexToRgba(primary.startsWith('#') ? primary : '#6a11cb', 0.75));
        gradient.addColorStop(1, hexToRgba(secondary.startsWith('#') ? secondary : '#2575fc', 0.75));

        starChart = new Chart(starCanvas, {
            type: 'bar',
            data: {
                labels: topRepos.map(r => r.name),
                datasets: [{
                    data: topRepos.map(r => r.stargazers_count),
                    backgroundColor: gradient,
                    borderRadius: 8,
                    maxBarThickness: 26,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: { legend: { display: false } },
                scales: {
                    x: { ticks: { color: textColor, precision: 0 }, grid: { display: false } },
                    y: { ticks: { color: textColor }, grid: { display: false } },
                },
            },
        });
    }
}

/* ---------------- 滚动高亮导航 ---------------- */

function bindScrollSpy(config) {
    const ids = (config.sections || []).map(s => s.id);
    const links = [...document.querySelectorAll('#nav-items a')];
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + entry.target.id));
            }
        });
    }, { rootMargin: '-30% 0px -60% 0px' });
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) observer.observe(el);
    });
}

/* ---------------- 启动 ---------------- */

window.addEventListener('DOMContentLoaded', async () => {
    marked.use({ mangle: false, headerIds: false });

    try {
        state.config = await loadConfig();
    } catch (e) {
        console.error(e);
        state.config = {};
    }
    const config = state.config;

    applyThemeColors(config);
    applyTheme(resolveTheme(config));
    bindThemeToggle(() => renderCharts()); // 切换主题时重绘图表

    renderNav(config, { name: displayName(config) });
    bindNavToggle();
    renderProfile(config);       // 先用配置渲染一次（GitHub 数据到达后再充实）
    renderSectionShells(config);
    renderFooter(config);
    bindScrollSpy(config);

    // Markdown 分区与 GitHub 数据并行加载
    const mdSections = (config.sections || []).filter(s => s.type !== 'github');
    const ghSections = (config.sections || []).filter(s => s.type === 'github');

    await Promise.all([
        ...mdSections.map(s => loadMarkdownSection(s.id, config)),
        fetchGithub(config),
    ]);

    // GitHub 数据就绪后，充实侧栏与项目区
    renderNav(config, { name: displayName(config) });
    renderProfile(config);
    renderSidebarExtras();
    ghSections.forEach(s => renderGithubSection(config, s.id));
});
