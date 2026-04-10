/**
 * app.js — Main frontend logic
 *
 * Handles:
 *  1. Theme toggle (body.classList 'light')
 *  2. Search (hero + header + catalog)
 *  3. Tool workspace: 4-state queue, local/server processing, result bar
 *  4. Sidebar controls: quality slider, preset buttons, toggle switches
 */

// ── Constants ──────────────────────────────────────────────────────────────────
const LOCAL_RASTER_EXTS   = new Set(["jpg","jpeg","png","webp","bmp","avif"]);
const LOCAL_COMPRESS_EXTS = new Set(["jpg","jpeg","webp"]);
const LOCAL_IMAGE_OUTPUTS = new Set(["jpg","jpeg","png","webp"]);

// ── Utility ────────────────────────────────────────────────────────────────────
function _t(s) { return window.I18N ? window.I18N.t(s) : s; }

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function normalizeExt(filename) {
  const parts = filename.toLowerCase().split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

function normalizeOutputFormat(value) {
  if (!value) return "jpg";
  if (value === "jpeg") return "jpg";
  if (value === "tif")  return "tiff";
  return value.toLowerCase();
}

function stem(filename) {
  const parts = filename.split(".");
  parts.pop();
  return parts.join(".") || filename;
}

// ── Tool index (for search) ────────────────────────────────────────────────────
function readToolIndex() {
  const el = document.getElementById("tool-index-data");
  if (!el) return [];
  try { return JSON.parse(el.textContent); } catch(_) { return []; }
}
const TOOL_INDEX = readToolIndex();

// ── Theme toggle ───────────────────────────────────────────────────────────────
function initThemeToggle() {
  const KEY = "pic-convertor-theme";
  const btn = document.querySelector("[data-theme-toggle]");
  if (localStorage.getItem(KEY) === "light") document.body.classList.add("light");

  const sync = () => {
    if (!btn) return;
    const isLight = document.body.classList.contains("light");
    btn.textContent = isLight ? "🌙" : "☀️";
    btn.title = isLight ? "切换夜间" : "切换日间";
  };
  sync();
  btn?.addEventListener("click", () => {
    document.body.classList.toggle("light");
    localStorage.setItem(KEY, document.body.classList.contains("light") ? "light" : "dark");
    sync();
  });
}

// ── Search ─────────────────────────────────────────────────────────────────────
function searchTools(q) {
  const kw = q.trim().toLowerCase();
  if (!kw) return [];
  return TOOL_INDEX.filter(t => (t.search_blob || "").includes(kw)).slice(0, 8);
}

function renderSearchDropdown(results) {
  if (!results.length) {
    return `<div class="search-empty">没有找到相关工具，试试"压缩""PDF""转换"。</div>`;
  }
  return results.map(t =>
    `<a class="search-result-card" href="/zh-CN/${t.slug}">
      <strong>${t.title}</strong>
      <p>${t.description || ""}</p>
    </a>`
  ).join("");
}

function bindSearch(inputId, resultsId) {
  const input   = document.getElementById(inputId);
  const results = document.getElementById(resultsId);
  if (!input || !results) return;

  input.addEventListener("input", () => {
    const q = input.value.trim();
    if (!q) { results.classList.add("hidden"); return; }
    results.classList.remove("hidden");
    results.innerHTML = renderSearchDropdown(searchTools(q));
  });

  document.addEventListener("click", e => {
    if (!input.contains(e.target) && !results.contains(e.target)) {
      results.classList.add("hidden");
    }
  });
}

function initCatalogFilter() {
  // tools.html uses data-cat-section on sections and data-tool-card on cards
  const input   = document.getElementById("catalog-search-input");
  const btnList = document.querySelectorAll(".cat-tab[data-cat]");
  if (!btnList.length && !input) return;

  let activeCat = "all";

  const apply = () => {
    const q = (input ? input.value.trim().toLowerCase() : "");
    document.querySelectorAll("[data-cat-section]").forEach(section => {
      const matchCat = activeCat === "all" || section.dataset.catSection === activeCat;
      let visible = 0;
      section.querySelectorAll("[data-tool-card]").forEach(card => {
        const show = matchCat && (!q || (card.dataset.search || "").includes(q));
        card.style.display = show ? "" : "none";
        if (show) visible++;
      });
      section.style.display = visible ? "" : "none";
    });
  };

  input?.addEventListener("input", apply);

  btnList.forEach(btn => {
    btn.addEventListener("click", () => {
      activeCat = btn.dataset.cat || "all";
      btnList.forEach(b => b.classList.toggle("active", b === btn));
      apply();
    });
  });
}

function initSearch() {
  bindSearch("hero-search-input",   "hero-search-results");
  bindSearch("header-search-input", "header-search-results");
  initCatalogFilter();
}

// ── Sidebar toggle buttons ─────────────────────────────────────────────────────
function initToggleButtons() {
  document.querySelectorAll(".toggle[id^='tog-']").forEach(btn => {
    const key    = btn.id.replace("tog-", "");
    const hidden = document.getElementById(`v-${key}`);
    btn.addEventListener("click", () => {
      btn.classList.toggle("on");
      if (hidden) hidden.value = btn.classList.contains("on") ? "true" : "false";
    });
  });

  // Quality preset buttons
  document.querySelectorAll(".preset-btn[data-q]").forEach(btn => {
    btn.addEventListener("click", () => {
      const q      = btn.dataset.q;
      const slider = document.getElementById("quality-slider");
      const valEl  = document.getElementById("quality-val");
      const hidden = document.getElementById("quality-hidden");
      if (slider) slider.value = q;
      if (valEl)  valEl.textContent = q + "%";
      if (hidden) hidden.value = q;
      document.querySelectorAll(".preset-btn[data-q]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });
}

// ── Read settings from sidebar ────────────────────────────────────────────────
function getSettings() {
  const card = document.getElementById("settings-card");
  if (!card) return {};
  const values = {};
  card.querySelectorAll("input[name], select[name]").forEach(el => {
    values[el.name] = el.value;
  });
  return values;
}

// ── Local image processing ────────────────────────────────────────────────────
function outputMime(fmt) {
  const f = normalizeOutputFormat(fmt);
  return f === "jpg" ? "image/jpeg" : `image/${f}`;
}
function outputName(file, fmt) {
  return `${stem(file.name)}.${normalizeOutputFormat(fmt)}`;
}

async function blobFromCanvas(canvas, mime, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => blob ? resolve(blob) : reject(new Error("生成文件失败，请重试。")),
      mime, quality
    );
  });
}

async function loadImage(file) {
  const url = URL.createObjectURL(file);
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload  = () => resolve(img);
      img.onerror = () => reject(new Error(`${file.name} 无法在当前浏览器中解码。`));
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function drawToCanvas(img, w, h) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  c.getContext("2d", { alpha: true }).drawImage(img, 0, 0, w, h);
  return c;
}

function resizeDimensions(iw, ih, tw, th, keepAspect) {
  if (!tw && !th) return { width: iw, height: ih };
  const sw = tw || iw, sh = th || ih;
  if (!keepAspect) return { width: sw, height: sh };
  const r = Math.min(sw / iw, sh / ih);
  return { width: Math.max(1, Math.round(iw * r)), height: Math.max(1, Math.round(ih * r)) };
}

async function makeRasterOutput(file, tool, values) {
  const img = await loadImage(file);
  const ext = normalizeExt(file.name);
  const fmt = normalizeOutputFormat(
    tool.fixed_output_format || values.output_format ||
    (["image_compress","image_target_size"].includes(tool.mode) ? ext : "jpg")
  );
  const quality = Math.max(0.1, Math.min(1,
    Number(values.quality || (tool.default_options && tool.default_options.quality) || 82) / 100
  ));
  let canvas = drawToCanvas(img, img.naturalWidth, img.naturalHeight);

  if (tool.mode === "image_resize") {
    const tw = Number(values.width  || img.naturalWidth);
    const th = Number(values.height || img.naturalHeight);
    const keep = values.keep_aspect_ratio !== "false";
    const d = resizeDimensions(img.naturalWidth, img.naturalHeight, tw, th, keep);
    canvas = drawToCanvas(img, d.width, d.height);
  }

  if (tool.mode === "image_target_size") {
    const targetBytes = Number(values.target_kb || (tool.default_options && tool.default_options.target_kb) || 100) * 1024;
    const mime = outputMime(fmt);
    let best = await blobFromCanvas(canvas, mime, 0.92);
    for (const scale of [1, 0.92, 0.84, 0.76, 0.68]) {
      const w  = Math.max(1, Math.round(img.naturalWidth  * scale));
      const h  = Math.max(1, Math.round(img.naturalHeight * scale));
      const sc = drawToCanvas(img, w, h);
      let lo = 0.1, hi = 0.95, cand = best;
      for (let i = 0; i < 8; i++) {
        const q = (lo + hi) / 2;
        const b = await blobFromCanvas(sc, mime, q);
        if (b.size <= targetBytes) { cand = b; lo = q; } else { hi = q; }
      }
      if (cand.size <= targetBytes) { best = cand; break; }
      if (cand.size < best.size) best = cand;
    }
    return buildLocalResult(file, best, outputName(file, fmt));
  }

  const finalQ = tool.mode === "image_compress" ? quality : (fmt === "png" ? undefined : quality);
  const blob = await blobFromCanvas(canvas, outputMime(fmt), finalQ);
  return buildLocalResult(file, blob, outputName(file, fmt));
}

function buildLocalResult(file, blob, name) {
  const url = URL.createObjectURL(blob);
  return {
    name,
    blob,
    url,
    preview_url: blob.type.startsWith("image/") ? url : null,
    size_bytes:  blob.size,
    source_name: file.name,
    source_size_bytes: file.size,
    saved_bytes: file.size > blob.size ? file.size - blob.size : null,
  };
}

async function fileToUint8Array(file) {
  return new Uint8Array(await file.arrayBuffer());
}

async function canvasPngBytes(file) {
  const img  = await loadImage(file);
  const c    = drawToCanvas(img, img.naturalWidth, img.naturalHeight);
  const blob = await blobFromCanvas(c, "image/png");
  return new Uint8Array(await blob.arrayBuffer());
}

function pdfPageDimensions(values, iw, ih) {
  const size   = values.page_size   || "A4";
  const orient = values.orientation || "portrait";
  let w = 595.28, h = 841.89;
  if (size === "Letter")   { w = 612;  h = 792; }
  else if (size === "Original") { w = iw; h = ih; }
  return orient === "landscape" ? { width: h, height: w } : { width: w, height: h };
}

async function buildPdfForFiles(files, values, name) {
  const { PDFDocument } = window.PDFLib;
  const pdf    = await PDFDocument.create();
  const margin = Number(values.margin || 24);
  for (const file of files) {
    const ext  = normalizeExt(file.name);
    const img  = await loadImage(file);
    const ps   = pdfPageDimensions(values, img.naturalWidth, img.naturalHeight);
    const page = pdf.addPage([ps.width, ps.height]);
    let emb;
    if      (ext === "jpg" || ext === "jpeg") emb = await pdf.embedJpg(await fileToUint8Array(file));
    else if (ext === "png")                   emb = await pdf.embedPng(await fileToUint8Array(file));
    else                                      emb = await pdf.embedPng(await canvasPngBytes(file));
    const iw = ps.width - margin * 2, ih = ps.height - margin * 2;
    const sc = Math.min(iw / emb.width, ih / emb.height);
    const dw = emb.width * sc, dh = emb.height * sc;
    page.drawImage(emb, { x: (ps.width - dw) / 2, y: (ps.height - dh) / 2, width: dw, height: dh });
  }
  const bytes = await pdf.save();
  const blob  = new Blob([bytes], { type: "application/pdf" });
  return {
    name, blob, url: URL.createObjectURL(blob),
    preview_url: null, size_bytes: blob.size,
    source_name: files[0] ? files[0].name : "",
    source_size_bytes: files[0] ? files[0].size : 0,
    saved_bytes: null,
  };
}

// ── Decide local vs server ────────────────────────────────────────────────────
function canProcessLocally(tool, files, values) {
  if (!files.length || tool.client_strategy === "server") return false;
  if (values.keep_metadata === "true" || values.lossless === "true") return false;
  if (tool.mode === "image_dpi") return false;
  if (tool.mode.startsWith("pdf_") ||
      ["pdf_merge","pdf_split","pdf_extract_images","pdf_delete_pages"].includes(tool.mode)) return false;
  if (tool.mode === "image_to_pdf" && !window.PDFLib) return false;
  const fmt = normalizeOutputFormat(tool.fixed_output_format || values.output_format || "");
  return files.every(file => {
    const ext = normalizeExt(file.name);
    if (["image_compress","image_target_size"].includes(tool.mode)) return LOCAL_COMPRESS_EXTS.has(ext);
    if (["image_convert","image_resize"].includes(tool.mode))
      return LOCAL_RASTER_EXTS.has(ext) && LOCAL_IMAGE_OUTPUTS.has(fmt);
    if (tool.mode === "image_to_pdf") return LOCAL_RASTER_EXTS.has(ext);
    return false;
  });
}

// ── Queue state ───────────────────────────────────────────────────────────────
// entry: { file, state: 'waiting'|'processing'|'done'|'error', result, error, thumbUrl }
let queueState = [];
let toolData   = null;

function renderFileItem(entry, index) {
  const { file, state, result, error } = entry;

  // Thumbnail
  let thumbHtml;
  if (entry.thumbUrl) {
    thumbHtml = `<img src="${entry.thumbUrl}" />`;
  } else if (file.type === "application/pdf") {
    thumbHtml = "📄";
  } else {
    thumbHtml = "📎";
  }

  // Meta row
  let metaHtml = `<span>${formatBytes(file.size)}</span>`;
  let extraHtml = "";
  let statusHtml = "";

  if (state === "waiting") {
    statusHtml =
      `<span class="status-chip waiting">${_t("等待中")}</span>` +
      `<button class="file-action-btn" data-remove="${index}" title="移除">✕</button>`;

  } else if (state === "processing") {
    statusHtml = `<span class="status-chip processing">${_t("处理中…")}</span>`;
    extraHtml  = `<div class="progress-bar"><div class="progress-fill indeterminate"></div></div>`;

  } else if (state === "done" && result) {
    const pct = result.saved_bytes && file.size
      ? ` (${_t("节省")} ${Math.round(result.saved_bytes / file.size * 100)}%)`
      : "";
    metaHtml =
      `<span>${formatBytes(file.size)}</span><span>→</span>` +
      `<span style="color:var(--green)">✓ ${formatBytes(result.size_bytes)}${pct}</span>`;
    const dlAttr = result.url ? `href="${result.url}" download="${result.name}"` : "";
    const hasCompare = entry.thumbUrl && result.preview_url;
    statusHtml =
      `<span class="status-chip done">✓ ${_t("完成")}</span>` +
      (hasCompare ? `<button class="file-action-btn compare-btn" data-index="${index}" title="前后对比">⇔</button>` : "") +
      `<a class="file-action-btn download" ${dlAttr} title="${_t("下载")}">⬇</a>` +
      `<button class="file-action-btn" data-remove="${index}" title="移除">✕</button>`;

  } else if (state === "error") {
    extraHtml =
      `<div class="error-msg">⚠ ${error || _t("处理失败，请稍后重试。")} ` +
      `<button class="retry-btn" data-retry="${index}">${_t("重试")}</button></div>`;
    statusHtml =
      `<span class="status-chip error">${_t("失败")}</span>` +
      `<button class="file-action-btn" data-remove="${index}" title="移除">✕</button>`;
  }

  return `<div class="file-item ${state}" data-index="${index}">
    <div class="file-thumb">${thumbHtml}</div>
    <div class="file-info">
      <div class="file-name">${file.name}</div>
      <div class="file-meta">${metaHtml}</div>
      ${extraHtml}
    </div>
    <div class="file-status">${statusHtml}</div>
  </div>`;
}

function renderQueue() {
  const list  = document.getElementById("file-list");
  const wrap  = document.getElementById("queue-wrap");
  const label = document.getElementById("queue-label");
  if (!list || !wrap) return;

  if (!queueState.length) { wrap.style.display = "none"; return; }

  wrap.style.display = "";
  if (label) label.textContent = `${_t("文件队列")} (${queueState.length})`;
  list.innerHTML = queueState.map((e, i) => renderFileItem(e, i)).join("");

  // Remove buttons
  list.querySelectorAll("[data-remove]").forEach(btn => {
    btn.addEventListener("click", () => {
      const i = Number(btn.dataset.remove);
      if (queueState[i] && queueState[i].thumbUrl) {
        URL.revokeObjectURL(queueState[i].thumbUrl);
      }
      queueState.splice(i, 1);
      renderQueue();
      updateProcessBtn();
      updateResultBar();
    });
  });

  // Retry buttons
  list.querySelectorAll("[data-retry]").forEach(btn => {
    btn.addEventListener("click", () => {
      const i = Number(btn.dataset.retry);
      if (queueState[i]) { queueState[i].state = "waiting"; queueState[i].error = null; }
      renderQueue();
      updateProcessBtn();
    });
  });

  // Compare buttons
  list.querySelectorAll(".compare-btn[data-index]").forEach(btn => {
    btn.addEventListener("click", () => {
      const i = Number(btn.dataset.index);
      const entry = queueState[i];
      if (entry && entry.thumbUrl && entry.result && entry.result.preview_url) {
        showCompareModal(entry.thumbUrl, entry.result.preview_url, entry.file.name, entry.result.name);
      }
    });
  });
}

// ── Before/after comparison modal ─────────────────────────────────────────────
function showCompareModal(beforeUrl, afterUrl, beforeName, afterName) {
  // Remove any existing modal
  document.getElementById("compare-modal")?.remove();

  const modal = document.createElement("div");
  modal.id = "compare-modal";
  modal.className = "compare-modal";
  modal.innerHTML = `
    <div class="compare-backdrop"></div>
    <div class="compare-dialog">
      <div class="compare-header">
        <span>前后对比</span>
        <button class="compare-close" id="compare-close-btn">✕</button>
      </div>
      <div class="compare-body">
        <div class="compare-wrap" id="compare-wrap">
          <div class="compare-after-layer">
            <img src="${afterUrl}" draggable="false" />
            <span class="compare-label compare-label-right">处理后</span>
          </div>
          <div class="compare-before-layer" id="compare-before">
            <img src="${beforeUrl}" draggable="false" />
            <span class="compare-label compare-label-left">原图</span>
          </div>
          <div class="compare-handle" id="compare-handle">
            <div class="compare-handle-line"></div>
            <div class="compare-handle-knob">⇔</div>
          </div>
        </div>
      </div>
    </div>`;
  document.body.appendChild(modal);

  const wrap   = document.getElementById("compare-wrap");
  const before = document.getElementById("compare-before");
  const handle = document.getElementById("compare-handle");
  let pct = 50;

  function setPos(x) {
    const rect = wrap.getBoundingClientRect();
    pct = Math.max(2, Math.min(98, (x - rect.left) / rect.width * 100));
    before.style.width = pct + "%";
    handle.style.left  = pct + "%";
  }

  let dragging = false;
  handle.addEventListener("mousedown",  e => { dragging = true; e.preventDefault(); });
  wrap.addEventListener("mousedown",    e => { dragging = true; setPos(e.clientX); });
  document.addEventListener("mousemove", e => { if (dragging) setPos(e.clientX); });
  document.addEventListener("mouseup",   () => { dragging = false; });

  handle.addEventListener("touchstart",  e => { dragging = true; e.preventDefault(); }, { passive: false });
  document.addEventListener("touchmove", e => { if (dragging && e.touches[0]) setPos(e.touches[0].clientX); }, { passive: true });
  document.addEventListener("touchend",  () => { dragging = false; });

  function close() { modal.remove(); }
  document.getElementById("compare-close-btn").addEventListener("click", close);
  modal.querySelector(".compare-backdrop").addEventListener("click", close);
  document.addEventListener("keydown", function onKey(e) {
    if (e.key === "Escape") { close(); document.removeEventListener("keydown", onKey); }
  });
}

function updateResultBar() {
  const bar = document.getElementById("result-bar");
  if (!bar) return;

  const done = queueState.filter(e => e.state === "done" && e.result);
  if (!done.length) { bar.style.display = "none"; return; }

  const allFinished = queueState.length > 0 &&
    queueState.every(e => e.state === "done" || e.state === "error");
  if (!allFinished) { bar.style.display = "none"; return; }

  const totalSaved = done.reduce((s, e) => s + (e.result.saved_bytes || 0), 0);
  const savedStr   = totalSaved > 0 ? `，节省 <strong>${formatBytes(totalSaved)}</strong>` : "";

  let dlBtn = "";
  if (done.length > 1 && window.JSZip) {
    dlBtn = `<button class="download-all-btn" id="dl-all-btn">⬇ ${_t("打包下载")}</button>`;
  } else if (done.length === 1 && done[0].result.url) {
    dlBtn = `<a class="download-all-btn" href="${done[0].result.url}" download="${done[0].result.name}">⬇ ${_t("下载")}</a>`;
  }

  bar.style.display = "";
  bar.innerHTML = `
    <div class="result-bar-icon">🎉</div>
    <div class="result-bar-text">${done.length} 个文件处理完成${savedStr}</div>
    ${dlBtn}`;

  document.getElementById("dl-all-btn")?.addEventListener("click", async () => {
    const btn = document.getElementById("dl-all-btn");
    if (btn) { btn.textContent = "⏳ 打包中…"; btn.disabled = true; }
    try {
      const zip = new window.JSZip();
      done.forEach(e => { if (e.result.blob) zip.file(e.result.name, e.result.blob); });
      const blob = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${(toolData && toolData.slug) || "files"}.zip`;
      a.click();
    } finally {
      if (btn) { btn.textContent = `⬇ ${_t("打包下载")}`; btn.disabled = false; }
    }
  });
}

function updateProcessBtn() {
  const btn = document.getElementById("process-btn");
  if (!btn) return;
  const waiting = queueState.filter(e => e.state === "waiting" || e.state === "error");
  btn.disabled = !waiting.length;
  if (waiting.length) {
    btn.textContent = `${_t("开始处理")} (${waiting.length})`;
  } else {
    btn.textContent = _t("开始处理");
  }
}

// ── Add files ─────────────────────────────────────────────────────────────────
function addFilesToQueue(fileList) {
  if (!toolData) return;
  const maxFiles = Number(toolData.max_files || 30);
  const maxBytes = Number(toolData.max_file_mb || 25) * 1024 * 1024;

  Array.from(fileList).forEach(file => {
    if (queueState.length >= maxFiles) return;
    const entry = { file, state: "waiting", result: null, error: null, thumbUrl: null };
    if (file.type.startsWith("image/")) {
      entry.thumbUrl = URL.createObjectURL(file);
    }
    if (file.size > maxBytes) {
      entry.state = "error";
      entry.error = `文件超过 ${toolData.max_file_mb}MB 限制`;
    }
    queueState.push(entry);
  });

  renderQueue();
  updateProcessBtn();
}

// ── Server processing helpers ──────────────────────────────────────────────────
function serverItemToResult(item, file) {
  return {
    name:  item.name,
    blob:  null,
    url:   item.url,
    preview_url:       item.preview_url  || null,
    size_bytes:        item.size_bytes,
    source_name:       file ? file.name  : "",
    source_size_bytes: file ? file.size  : 0,
    saved_bytes:       item.saved_bytes  || null,
  };
}

async function processAllOnServer(tool, files, values) {
  const fd = new FormData();
  files.forEach(f => fd.append("files", f));
  Object.entries(values).forEach(([k, v]) => fd.append(k, v));
  const resp = await fetch(`/api/process/${tool.slug}`, { method: "POST", body: fd });
  const data = await resp.json();
  if (!resp.ok || !data.ok) throw new Error(data.error || _t("处理失败，请稍后重试。"));
  return (data.items || []).map((item, i) => serverItemToResult(item, files[i]));
}

// ── Process files ─────────────────────────────────────────────────────────────
async function processFiles() {
  if (!toolData) return;
  const values   = getSettings();
  const waiting  = queueState.filter(e => e.state === "waiting");
  if (!waiting.length) return;

  const useLocal = canProcessLocally(toolData, waiting.map(e => e.file), values);

  if (useLocal) {
    // Process each file individually so we can show per-file state
    for (let i = 0; i < queueState.length; i++) {
      if (queueState[i].state !== "waiting") continue;
      queueState[i].state = "processing";
      renderQueue();
      try {
        let result;
        if (toolData.mode === "image_to_pdf") {
          result = await buildPdfForFiles(
            [queueState[i].file], values, `${stem(queueState[i].file.name)}.pdf`
          );
        } else {
          result = await makeRasterOutput(queueState[i].file, toolData, values);
        }
        queueState[i].state  = "done";
        queueState[i].result = result;
      } catch (err) {
        if (toolData.client_strategy === "hybrid") {
          // Fall back to server for this one file
          try {
            const fd = new FormData();
            fd.append("files", queueState[i].file);
            Object.entries(values).forEach(([k, v]) => fd.append(k, v));
            const resp = await fetch(`/api/process/${toolData.slug}`, { method: "POST", body: fd });
            const data = await resp.json();
            if (!resp.ok || !data.ok) throw new Error(data.error);
            queueState[i].state  = "done";
            queueState[i].result = serverItemToResult(data.items[0], queueState[i].file);
          } catch (srvErr) {
            queueState[i].state = "error";
            queueState[i].error = srvErr.message || _t("处理失败，请稍后重试。");
          }
        } else {
          queueState[i].state = "error";
          queueState[i].error = err.message || _t("处理失败，请稍后重试。");
        }
      }
      renderQueue();
    }

  } else {
    // Server: batch all waiting files
    const waitingIdx = queueState
      .map((e, i) => ({ e, i }))
      .filter(x => x.e.state === "waiting");

    waitingIdx.forEach(({ i }) => { queueState[i].state = "processing"; });
    renderQueue();

    try {
      const files   = waitingIdx.map(x => x.e.file);
      const results = await processAllOnServer(toolData, files, values);
      waitingIdx.forEach(({ i }, ri) => {
        queueState[i].state  = "done";
        queueState[i].result = results[ri];
      });
    } catch (err) {
      waitingIdx.forEach(({ i }) => {
        queueState[i].state = "error";
        queueState[i].error = err.message || _t("处理失败，请稍后重试。");
      });
    }
    renderQueue();
  }

  updateResultBar();
  updateProcessBtn();
}

// ── Tool workspace init ────────────────────────────────────────────────────────
function initToolWorkspace() {
  const dataEl = document.getElementById("tool-data");
  if (!dataEl) return;
  try { toolData = JSON.parse(dataEl.textContent); } catch (_) { return; }

  const zone      = document.getElementById("uploadZone");
  const fileInput = document.getElementById("fileInput");
  const processBtn = document.getElementById("process-btn");
  const clearBtn  = document.getElementById("queue-clear");
  if (!zone || !fileInput) return;

  // File input
  fileInput.addEventListener("change", () => {
    if (fileInput.files.length) addFilesToQueue(fileInput.files);
    fileInput.value = "";
  });

  // Drag & drop
  zone.addEventListener("dragover", e => {
    e.preventDefault();
    zone.classList.add("drag-over");
  });
  zone.addEventListener("dragleave", e => {
    if (!zone.contains(e.relatedTarget)) zone.classList.remove("drag-over");
  });
  zone.addEventListener("drop", e => {
    e.preventDefault();
    zone.classList.remove("drag-over");
    if (e.dataTransfer && e.dataTransfer.files.length) addFilesToQueue(e.dataTransfer.files);
  });

  // Clipboard paste (Ctrl+V / Cmd+V)
  document.addEventListener("paste", e => {
    if (!toolData) return;
    const items = Array.from(e.clipboardData.items || []);
    const files = items
      .filter(it => it.kind === "file" && it.type.startsWith("image/"))
      .map(it => it.getAsFile())
      .filter(Boolean);
    if (files.length) { e.preventDefault(); addFilesToQueue(files); }
  });

  // Process
  processBtn?.addEventListener("click", () => { processFiles(); });

  // Clear
  clearBtn?.addEventListener("click", () => {
    queueState.forEach(e => { if (e.thumbUrl) URL.revokeObjectURL(e.thumbUrl); });
    queueState = [];
    renderQueue();
    updateProcessBtn();
    const bar = document.getElementById("result-bar");
    if (bar) bar.style.display = "none";
  });

  initToggleButtons();
}

// ── Boot ───────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  initThemeToggle();
  initSearch();
  initToolWorkspace();
});
