/**
 * i18n.js — Lightweight multi-language support
 *
 * Strategy:
 *  1. Static dict covers all hardcoded UI chrome (fast, zero API cost).
 *  2. Edge Translate API translates dynamic content (tool names/descriptions).
 *     - Tries direct browser call first (no server load if CORS passes).
 *     - Falls back to /api/translate proxy if blocked by CORS.
 *  3. Translations cached in localStorage per (pathname × language).
 *  4. Language change saves pref and reloads page; translations applied on load.
 */

const LANG_KEY = "pic-lang";
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const SUPPORTED = [
  { code: "zh-CN", label: "中文" },
  { code: "en",    label: "EN" },
  { code: "ja",    label: "日本語" },
];

// ─── Static translation dict ─────────────────────────────────────────────────
// Keys are Chinese source strings; values are target translations.
const STATIC = {
  en: {
    // Header / Nav
    "在线处理图片与 PDF，更适合日常上传和资料整理": "Process images & PDFs online, optimised for everyday uploads",
    "全部工具": "All Tools",
    "联系我们": "Contact",
    "隐私政策": "Privacy Policy",
    "切换夜间": "Dark mode",
    "切换日间": "Light mode",
    // Dropzone
    "拖拽文件到这里，或点击选择文件": "Drop files here, or click to browse",
    "选择文件": "Browse files",
    // Queue
    "已选文件": "Selected files",
    "还没有选择文件": "No files selected",
    "选择文件后，这里会显示文件名、大小和可否处理。": "File names, sizes and processing status will appear here.",
    "浏览器处理": "Local",
    "服务器处理": "Server",
    "超出限制": "Too large",
    "超出数量": "Too many",
    // Buttons / queue states
    "开始处理": "Process",
    "清空": "Clear",
    "下载文件": "Download",
    "下载 ZIP": "Download ZIP",
    "下载": "Download",
    "打包下载": "Download ZIP",
    "等待中": "Waiting",
    "处理中…": "Processing…",
    "完成": "Done",
    "失败": "Failed",
    "重试": "Retry",
    "文件队列": "File Queue",
    "个文件处理完成": " file(s) processed",
    // Processing messages (mirrored in app.js via window.I18N.t)
    "正在浏览器中处理，请稍候…": "Processing locally…",
    "正在上传并处理，请稍候…": "Uploading & processing…",
    "请先选择符合大小和数量限制的文件。": "Please select files within the size and count limits.",
    "处理失败，请稍后重试。": "Processing failed. Please try again.",
    // Result area
    "结果会显示在这里": "Results appear here",
    "选择文件后会立即显示队列。点击「开始处理」后，这里会展示进度和下载结果。":
      "The queue appears after file selection. Click Process to see progress and download results.",
    "处理完成，共生成": "Done —",
    "个结果文件。": "result file(s).",
    "节省": "Saved",
    // Tool page sections
    "开始处理": "Process Now",
    "上传文件，确认参数，然后生成结果": "Upload files, adjust settings, then process",
    "系统会先校验文件大小和数量，再决定使用浏览器本地处理还是服务器处理。":
      "Files are validated first; processing runs locally or on the server as needed.",
    "结果": "Output",
    "使用体验": "Features",
    "的优势": "highlights",
    "使用步骤": "How to use",
    "如何使用": "How to use",
    "常见问题": "FAQ",
    "相关工具": "Related tools",
    "继续下一步处理": "Continue processing",
    // Tool hero tags
    "浏览器内处理": "Processed locally",
    "不上传服务器": "No upload needed",
    // Home page
    "先说你的目标，再帮你选对工具。": "Tell us what you need — we'll find the right tool.",
    "上传更顺手，整理更省事": "Smoother uploads, less hassle",
    "浏览全部工具": "Browse all tools",
    "直接开始转换": "Start converting",
    "常用入口": "Popular",
    "最常被使用的功能": "Most-used features",
    "适合上传限制、格式兼容、文章配图和 PDF 整理。": "For upload limits, format issues, image editing, and PDF tasks.",
    "按目标选择": "Browse by goal",
    "不知道该用哪个？先按场景走": "Not sure which tool? Start with your use case.",
    "把「我想做什么」放在前面，比从几十个功能名里硬找更省时间。":
      "Thinking about what you want to achieve is faster than scanning a long feature list.",
    "搜索工具": "Search tools",
    "常用工具可直接进入": "tools ready to use",
    "本地优先": "Local-first",
    "常见图片优先在浏览器处理": "Common images processed in-browser",
    "批量下载": "Batch download",
    "结果可逐个下载或打包": "Download individually or as a ZIP",
    // Footer
    "热门入口": "Popular",
    "PDF 工具": "PDF Tools",
    "站点信息": "Site",
    "图片压缩": "Compress images",
    "图片格式转换": "Convert format",
    "照片压缩到指定大小": "Resize to target size",
    "JPG 转 PDF": "JPG to PDF",
    "PDF 转 JPG": "PDF to JPG",
    "PDF 合并": "Merge PDF",
    "PDF 拆分": "Split PDF",
    "删除 PDF 页数": "Delete PDF pages",
    "全部工具": "All Tools",
    // Misc
    "围绕图片与 PDF 常见需求设计，强调清晰反馈、批量处理和稳定下载。":
      "Designed around common image & PDF tasks, with clear feedback and reliable downloads.",
  },

  ja: {
    // Header / Nav
    "在线处理图片与 PDF，更适合日常上传和资料整理": "画像とPDFをオンラインで処理",
    "全部工具": "すべてのツール",
    "联系我们": "お問い合わせ",
    "隐私政策": "プライバシーポリシー",
    "切换夜间": "ダークモード",
    "切换日间": "ライトモード",
    // Dropzone
    "拖拽文件到这里，或点击选择文件": "ここにファイルをドロップ、またはクリックで選択",
    "选择文件": "ファイルを選択",
    // Queue
    "已选文件": "選択済みファイル",
    "还没有选择文件": "ファイルが選択されていません",
    "选择文件后，这里会显示文件名、大小和可否处理。": "ファイルを選択するとここに表示されます。",
    "浏览器处理": "ローカル処理",
    "服务器处理": "サーバー処理",
    "超出限制": "サイズ超過",
    "超出数量": "数量超過",
    // Buttons / queue states
    "开始处理": "処理開始",
    "清空": "クリア",
    "下载文件": "ダウンロード",
    "下载 ZIP": "ZIPダウンロード",
    "下载": "ダウンロード",
    "打包下载": "ZIPで一括ダウンロード",
    "等待中": "待機中",
    "处理中…": "処理中…",
    "完成": "完了",
    "失败": "失敗",
    "重试": "再試行",
    "文件队列": "ファイルキュー",
    "个文件处理完成": "件のファイルを処理しました",
    // Processing messages
    "正在浏览器中处理，请稍候…": "ローカルで処理中…",
    "正在上传并处理，请稍候…": "アップロード・処理中…",
    "请先选择符合大小和数量限制的文件。": "サイズと数量の制限内のファイルを選択してください。",
    "处理失败，请稍后重试。": "処理に失敗しました。後でもう一度お試しください。",
    // Result area
    "结果会显示在这里": "結果はここに表示されます",
    "选择文件后会立即显示队列。点击「开始处理」后，这里会展示进度和下载结果。":
      "ファイルを選択するとキューが表示されます。「処理開始」をクリックすると進捗と結果が表示されます。",
    "处理完成，共生成": "完了 —",
    "个结果文件。": "件のファイル",
    "节省": "節約",
    // Tool page sections
    "开始处理": "処理開始",
    "上传文件，确认参数，然后生成结果": "ファイルをアップロードし、設定を確認してから処理",
    "系统会先校验文件大小和数量，再决定使用浏览器本地处理还是服务器处理。":
      "ファイルを検証してからローカルまたはサーバーで処理します。",
    "结果": "出力",
    "使用体験": "機能",
    "の优势": "の特長",
    "使用步骤": "使い方",
    "如何使用": "使い方",
    "常见问题": "よくある質問",
    "相关工具": "関連ツール",
    "继续下一步处理": "次の処理へ",
    // Home page
    "先说你的目标，再帮你选对工具。": "目的を教えてください。最適なツールを選びます。",
    "上传更顺手，整理更省事": "スムーズなアップロード、効率的な整理",
    "浏览全部工具": "すべてのツールを見る",
    "直接开始转换": "変換を始める",
    "常用入口": "人気",
    "最常被使用的功能": "最も使われる機能",
    "按目标选択": "目的で選ぶ",
    "搜索工具": "ツールを検索",
    "常用工具可直接进入": "個のツールをすぐ使用可能",
    "本地优先": "ローカル優先",
    "常见图片优先在浏览器处理": "一般的な画像はブラウザで処理",
    "批量下载": "一括ダウンロード",
    "结果可逐个下载或打包": "個別またはZIPでダウンロード",
    // Footer
    "热门入口": "人気",
    "PDF 工具": "PDFツール",
    "站点信息": "サイト情報",
    "图片压缩": "画像圧縮",
    "图片格式转換": "形式変換",
    "照片压缩到指定大小": "指定サイズへ圧縮",
    "JPG 转 PDF": "JPGをPDFに",
    "PDF 转 JPG": "PDFをJPGに",
    "PDF 合并": "PDFを結合",
    "PDF 拆分": "PDFを分割",
    "删除 PDF 页数": "PDFのページ削除",
    "全部工具": "すべてのツール",
    "围绕图片与 PDF 常见需求设计，强调清晰反馈、批量处理和稳定下载。":
      "画像とPDFの一般的なニーズに応えた設計で、明確なフィードバックと安定したダウンロードを提供します。",
  },
};

// ─── Core i18n engine ─────────────────────────────────────────────────────────
const I18N = {
  current: "zh-CN",

  init() {
    const saved = localStorage.getItem(LANG_KEY) || "zh-CN";
    this.current = saved;
    document.documentElement.lang = saved;
    this._renderSwitcher();
    if (saved !== "zh-CN") {
      this._applyLanguage(saved);
    }
  },

  /** Translate a single string — used by app.js for JS-generated messages. */
  t(text) {
    if (this.current === "zh-CN") return text;
    return STATIC[this.current]?.[text] ?? text;
  },

  /** Called by the lang switcher buttons. */
  switchTo(lang) {
    if (lang === this.current) return;
    localStorage.setItem(LANG_KEY, lang);
    location.reload();
  },

  // ── Private ─────────────────────────────────────────────────────────────────
  async _applyLanguage(lang) {
    // 1. Static dict — instant, no network
    this._applyStatic(lang);

    // 2. Dynamic content (tool cards, descriptions) via Edge API + cache
    await this._applyDynamic(lang);
  },

  _applyStatic(lang) {
    const dict = STATIC[lang] || {};
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.dataset.i18n;
      if (dict[key]) el.textContent = dict[key];
    });
    // Elements whose textContent is a direct dict key
    document.querySelectorAll("[data-i18n-text]").forEach((el) => {
      const src = el.textContent.trim();
      if (dict[src]) el.textContent = dict[src];
    });
  },

  async _applyDynamic(lang) {
    const cacheKey = `i18n:${location.pathname}:${lang}`;
    let map = this._loadCache(cacheKey);
    const selectors = [
      ".tool-card h3",
      ".tool-card p",
      ".tool-card-meta span",
      ".hero-copy",
      ".section-copy",
      ".tool-subtitle",
      ".scenario-copy p",
      ".scenario-copy h3",
      ".section-head p",
      ".panel-head p",
      ".hero-panel-head p",
      ".feature-card h3",
      ".feature-card p",
      ".content-card p",
      ".content-card h2",
      ".faq-list h3",
      ".faq-list p",
      ".step-list li",
      ".hero-tags span",
      ".tool-hero-actions span",
      ".tool-summary p",
      ".tool-summary li",
      ".eyebrow",
      "[data-i18n-dynamic]",
    ];
    const elements = Array.from(document.querySelectorAll(selectors.join(",")));

    // Collect texts not yet in cache
    const missing = [];
    elements.forEach((el) => {
      const src = el.textContent.trim();
      if (src && !map[src] && src.length > 1 && !/^\s*[\d\s.,/]+\s*$/.test(src)) {
        missing.push(src);
      }
    });

    if (missing.length > 0) {
      const unique = [...new Set(missing)];
      const translated = await this._edgeTranslate(unique, lang);
      unique.forEach((src, i) => {
        map[src] = translated[i] || src;
      });
      this._saveCache(cacheKey, map);
    }

    // Apply
    elements.forEach((el) => {
      const src = el.textContent.trim();
      if (map[src] && map[src] !== src) el.textContent = map[src];
    });
  },

  async _edgeTranslate(texts, lang) {
    const chunks = [];
    for (let i = 0; i < texts.length; i += 50) chunks.push(texts.slice(i, i + 50));
    const results = [];
    for (const chunk of chunks) {
      const translated = await this._translateChunk(chunk, lang);
      results.push(...translated);
    }
    return results;
  },

  async _translateChunk(texts, lang) {
    const edgeLang = lang === "en" ? "en" : lang === "ja" ? "ja" : lang;
    const edgeUrl = `https://edge.microsoft.com/translate/translatetext?from=zh-Hans&to=${edgeLang}&isEnterpriseClient=false`;

    // Try direct browser call first (no server load)
    try {
      const resp = await fetch(edgeUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(texts),
      });
      if (resp.ok) return await resp.json();
    } catch (_) {
      // CORS blocked — fall through to proxy
    }

    // Server-side proxy fallback
    try {
      const resp = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texts, to: edgeLang }),
      });
      if (resp.ok) return await resp.json();
    } catch (_) {
      // network error
    }

    return texts; // ultimate fallback: return originals
  },

  _loadCache(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return {};
      const { ts, data } = JSON.parse(raw);
      if (Date.now() - ts > CACHE_TTL_MS) {
        localStorage.removeItem(key);
        return {};
      }
      return data;
    } catch (_) {
      return {};
    }
  },

  _saveCache(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
    } catch (_) {
      // storage quota exceeded — skip cache
    }
  },

  _renderSwitcher() {
    const container = document.getElementById("lang-switcher");
    if (!container) return;
    container.innerHTML = SUPPORTED.map((l) => {
      const active = l.code === this.current ? " active" : "";
      return `<button class="lang-btn${active}" data-lang="${l.code}" aria-label="Switch to ${l.label}">${l.label}</button>`;
    }).join("");
    container.querySelectorAll(".lang-btn").forEach((btn) => {
      btn.addEventListener("click", () => this.switchTo(btn.dataset.lang));
    });
  },
};

// Auto-init on DOM ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => I18N.init());
} else {
  I18N.init();
}

// Expose globally so app.js can call I18N.t(...)
window.I18N = I18N;
