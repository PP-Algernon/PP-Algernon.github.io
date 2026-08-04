/* ==========================================================
   多页面共用逻辑：配置加载 / 主题模式 / 导航栏 / 工具函数
   被 home.html、blog.html、post.html 共同引用
   ========================================================== */

const CONFIG_FILE = 'config.json';
const CONTENT_DIR = 'contents/';

async function loadConfig() {
    const res = await fetch(CONFIG_FILE);
    if (!res.ok) throw new Error('config.json 加载失败');
    return res.json();
}

let _themeConfig = null;   // 缓存配置,供深浅模式切换时重新应用主题色

function applyThemeColors(config) {
    _themeConfig = config;
    const root = document.documentElement.style;

    // 主题色支持按深浅模式分别配置:theme.light / theme.dark 优先,
    // 未配置时回落到 theme.primary_color / secondary_color
    const mode = document.documentElement.getAttribute('data-theme') || resolveTheme(config);
    const modeColors = config.theme?.[mode] || {};
    const primary = modeColors.primary_color || config.theme?.primary_color;
    const secondary = modeColors.secondary_color || config.theme?.secondary_color;
    if (primary) root.setProperty('--primary', primary);
    if (secondary) root.setProperty('--secondary', secondary);

    // 背景图只初始化一次(切换深浅模式时重复调用本函数,跳过)
    if (document.documentElement.getAttribute('data-bg-image') === 'on') return;

    // 背景图片：theme.background_images(多张) 或 background_image(单张) 非空时启用。
    // 多张时打开页面随机挑一张;background_rotate_interval > 0 时定时淡入淡出轮换。
    const images = (config.theme?.background_images?.length
        ? config.theme.background_images
        : [config.theme?.background_image]).filter(Boolean);
    if (images.length) {
        if (config.theme.background_opacity != null) {
            root.setProperty('--bg-image-opacity', config.theme.background_opacity);
        }
        if (config.theme.background_blur != null) {
            root.setProperty('--bg-image-blur', `${config.theme.background_blur}px`);
        }
        document.documentElement.setAttribute('data-bg-image', 'on');
        // 像素风图片：保持像素锐利,不做平滑插值
        if (config.theme.background_pixelated) {
            document.documentElement.setAttribute('data-bg-pixelated', 'on');
        }
        initBackgroundImages(images, config.theme.background_rotate_interval);
    }
}

/* 背景图层：双层交替淡入淡出。CSS 变量里的相对路径会按 main.css 目录解析,
   所以这里统一转为基于页面的绝对 URL */
function initBackgroundImages(images, rotateInterval) {
    const scene = document.querySelector('.bg-scene');
    if (!scene) return;

    const urls = images.map(p => new URL(p, document.baseURI).href);
    // 随机起点(单张时恒为 0)
    let index = Math.floor(Math.random() * urls.length);

    // 两个图层,交替承载当前图片,靠 opacity 过渡实现淡入淡出
    const layers = [0, 1].map(() => {
        const el = document.createElement('div');
        el.className = 'bg-img-layer';
        scene.prepend(el);   // 放最底层,光斑和网格盖在上面
        return el;
    });
    let active = 0;

    function show(i) {
        const next = 1 - active;
        // 预加载完成后再切换,避免闪空白
        const img = new Image();
        img.onload = () => {
            layers[next].style.backgroundImage = `url("${urls[i]}")`;
            layers[next].classList.add('visible');
            layers[active].classList.remove('visible');
            active = next;
        };
        img.src = urls[i];
    }

    show(index);

    const interval = Number(rotateInterval) || 0;
    if (interval > 0 && urls.length > 1) {
        setInterval(() => {
            index = (index + 1) % urls.length;
            show(index);
        }, Math.max(interval, 5) * 1000);   // 最短 5 秒,防手滑填太小
    }
}

/* ---------------- 主题模式 ---------------- */

function resolveTheme(config) {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light') return saved;
    const mode = config?.dark_mode || 'auto';
    if (mode === 'dark' || mode === 'light') return mode;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const icon = document.querySelector('#theme-toggle i');
    if (icon) icon.className = theme === 'dark' ? 'bi bi-sun' : 'bi bi-moon-stars';
    // 深浅模式各自的主题色(theme.light / theme.dark)随模式切换
    if (_themeConfig) applyThemeColors(_themeConfig);
}

function bindThemeToggle(onChange) {
    document.getElementById('theme-toggle').addEventListener('click', () => {
        const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        localStorage.setItem('theme', next);
        applyTheme(next);
        if (typeof onChange === 'function') onChange(next);
    });
}

/* ---------------- 导航栏 ---------------- */

/**
 * 渲染导航栏。
 * opts.base — 分区锚点的前缀：主页为 ''，子页面为 'home.html'
 * opts.name — 导航栏显示的名字（可选，默认取 config.name）
 */
function renderNav(config, opts = {}) {
    const base = opts.base || '';
    document.getElementById('nav-name').textContent = opts.name || config.name || '个人主页';

    const gh = document.getElementById('nav-github');
    if (gh && config.github_username) gh.href = `https://github.com/${config.github_username}`;

    // 首页访问过后会缓存 GitHub 头像，子页面直接复用
    const cachedAvatar = localStorage.getItem('gh_avatar');
    const navAvatar = document.getElementById('nav-avatar');
    if (navAvatar && cachedAvatar) navAvatar.src = cachedAvatar;

    const ul = document.getElementById('nav-items');
    ul.replaceChildren();

    // 首页分区锚点
    (config.sections || []).forEach(s => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = `${base}#${s.id}`;
        a.textContent = s.nav || s.id;
        li.appendChild(a);
        ul.appendChild(li);
    });

    // 独立页面链接（如博客）
    const here = location.pathname.split('/').pop() || 'index.html';
    (config.pages || []).forEach(p => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = p.url;
        a.textContent = p.nav || p.url;
        if (p.url === here || (here === 'post.html' && p.url === 'blog.html')) {
            a.classList.add('active');
        }
        li.appendChild(a);
        ul.appendChild(li);
    });
}

function bindNavToggle() {
    // 移动端折叠菜单（只绑定一次）
    const toggle = document.getElementById('nav-toggle');
    const menu = document.getElementById('nav-menu');
    toggle.addEventListener('click', () => menu.classList.toggle('open'));
    document.getElementById('nav-items').addEventListener('click', e => {
        if (e.target.tagName === 'A') menu.classList.remove('open');
    });
}

/* ---------------- 页脚 ---------------- */

function renderFooter(config) {
    document.getElementById('copyright-text').textContent = config.copyright || '';
}

/* ---------------- 工具函数 ---------------- */

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function sanitizeHtml(html) {
    const tpl = document.createElement('template');
    tpl.innerHTML = html;
    tpl.content.querySelectorAll('script, style, iframe, object, embed, link, meta, base, form').forEach(n => n.remove());
    tpl.content.querySelectorAll('*').forEach(node => {
        [...node.attributes].forEach(attr => {
            const name = attr.name.toLowerCase();
            if (name.startsWith('on')) { node.removeAttribute(attr.name); return; }
            if (['href', 'src'].includes(name)) {
                try {
                    const url = new URL(attr.value, location.href);
                    if (!['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol)) {
                        node.removeAttribute(attr.name);
                    }
                } catch { node.removeAttribute(attr.name); }
            }
        });
    });
    return tpl.innerHTML;
}
