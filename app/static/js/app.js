const FIELD_BUILDERS = {
  quality(tool) {
    return `<div class="field"><label for="quality">输出质量</label><input id="quality" name="quality" type="number" min="1" max="100" value="${tool.default_options.quality ?? 90}" /></div>`;
  },
  keep_metadata(tool) {
    return `<div class="field"><label for="keep_metadata">保留图片元数据</label><select id="keep_metadata" name="keep_metadata"><option value="false">否</option><option value="true" ${tool.default_options.keep_metadata ? "selected" : ""}>是</option></select></div>`;
  },
  lossless(tool) {
    return `<div class="field"><label for="lossless">无损优先</label><select id="lossless" name="lossless"><option value="false">关闭</option><option value="true" ${tool.default_options.lossless ? "selected" : ""}>开启</option></select></div>`;
  },
  target_kb(tool) {
    const value = tool.default_options.target_kb ?? 100;
    return `<div class="field"><label for="target_kb">目标大小 (KB)</label><input id="target_kb" name="target_kb" type="number" min="5" value="${value}" ${tool.ui.locked_target_kb ? "readonly" : ""} /></div>`;
  },
  format_select(tool) {
    const options = tool.output_formats.length ? tool.output_formats : [tool.default_options.output_format];
    const current = tool.fixed_output_format ?? tool.default_options.output_format;
    return `<div class="field"><label for="output_format">输出格式</label><select id="output_format" name="output_format">${options.map((item) => `<option value="${item}" ${item === current ? "selected" : ""}>${item.toUpperCase()}</option>`).join("")}</select></div>`;
  },
  size(tool) {
    return `<div class="field"><label for="width">宽度 (px)</label><input id="width" name="width" type="number" min="1" value="${tool.default_options.width ?? 1920}" /></div><div class="field"><label for="height">高度 (px)</label><input id="height" name="height" type="number" min="1" value="${tool.default_options.height ?? 1080}" /></div>`;
  },
  keep_aspect_ratio(tool) {
    return `<div class="field"><label for="keep_aspect_ratio">保持比例</label><select id="keep_aspect_ratio" name="keep_aspect_ratio"><option value="true" ${(tool.default_options.keep_aspect_ratio ?? true) ? "selected" : ""}>是</option><option value="false" ${(tool.default_options.keep_aspect_ratio ?? true) ? "" : "selected"}>否</option></select></div>`;
  },
  dpi(tool) {
    return `<div class="field"><label for="dpi">目标 DPI</label><input id="dpi" name="dpi" type="number" min="36" max="1200" value="${tool.default_options.dpi ?? 300}" /></div>`;
  },
  pdf_layout(tool) {
    return `<div class="field"><label for="page_size">页面尺寸</label><select id="page_size" name="page_size">${["A4", "Letter", "Original"].map((item) => `<option value="${item}" ${item === (tool.default_options.page_size ?? "A4") ? "selected" : ""}>${item}</option>`).join("")}</select></div><div class="field"><label for="orientation">方向</label><select id="orientation" name="orientation">${["portrait", "landscape"].map((item) => `<option value="${item}" ${item === (tool.default_options.orientation ?? "portrait") ? "selected" : ""}>${item === "portrait" ? "纵向" : "横向"}</option>`).join("")}</select></div><div class="field"><label for="margin">边距 (px)</label><input id="margin" name="margin" type="number" min="0" value="${tool.default_options.margin ?? 24}" /></div><div class="field"><label for="merge_mode">输出方式</label><select id="merge_mode" name="merge_mode"><option value="single" ${(tool.default_options.merge_mode ?? "single") === "single" ? "selected" : ""}>合并成一个 PDF</option><option value="multiple" ${(tool.default_options.merge_mode ?? "single") === "multiple" ? "selected" : ""}>每张图单独导出</option></select></div>`;
  },
  pdf_image_format(tool) {
    const options = tool.output_formats.length ? tool.output_formats : [tool.fixed_output_format ?? tool.default_options.output_format ?? "jpg"];
    const current = tool.fixed_output_format ?? tool.default_options.output_format ?? "jpg";
    return `<div class="field"><label for="output_format">导出格式</label><select id="output_format" name="output_format">${options.map((item) => `<option value="${item}" ${item === current ? "selected" : ""}>${item.toUpperCase()}</option>`).join("")}</select></div><div class="field"><label for="zoom">清晰度倍率</label><input id="zoom" name="zoom" type="number" min="1" max="4" step="0.5" value="${tool.default_options.zoom ?? 2}" /></div>`;
  },
  page_ranges(tool) {
    return `<div class="field full"><label for="page_ranges">页码范围</label><textarea id="page_ranges" name="page_ranges" placeholder="例如：1-3,5,8-10">${tool.default_options.page_ranges ?? ""}</textarea></div>`;
  },
};

const LOCAL_RASTER_EXTS = new Set(["jpg", "jpeg", "png", "webp", "bmp"]);
const LOCAL_COMPRESS_EXTS = new Set(["jpg", "jpeg", "webp"]);
const LOCAL_IMAGE_OUTPUTS = new Set(["jpg", "jpeg", "png", "webp"]);

function readToolIndex() {
  const node = document.querySelector("#tool-index-data");
  if (!node) return [];
  try {
    return JSON.parse(node.textContent);
  } catch (_error) {
    return [];
  }
}

const TOOL_INDEX = readToolIndex();

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function normalizeExt(filename) {
  const chunks = filename.toLowerCase().split(".");
  return chunks.length > 1 ? chunks.at(-1) : "";
}

function normalizeOutputFormat(value) {
  if (!value) return "jpg";
  if (value === "jpeg") return "jpg";
  if (value === "tif") return "tiff";
  return value.toLowerCase();
}

function stem(filename) {
  const parts = filename.split(".");
  parts.pop();
  return parts.join(".") || filename;
}

function renderFields(tool, container) {
  const order = ["quality", "keep_metadata", "lossless", "target_kb", "format_select", "size", "keep_aspect_ratio", "dpi", "pdf_layout", "pdf_image_format", "page_ranges"];
  const html = order.filter((key) => tool.ui[key]).map((key) => FIELD_BUILDERS[key]?.(tool) ?? "").join("");
  container.innerHTML = html || '<div class="field full"><label>当前工具无需额外参数</label><input type="text" value="直接上传文件即可" readonly /></div>';
}

function initThemeToggle() {
  const storageKey = "pic-convertor-theme";
  const button = document.querySelector("[data-theme-toggle]");
  const saved = window.localStorage.getItem(storageKey);
  if (saved === "dark" || saved === "light") {
    document.body.dataset.theme = saved;
  }
  const syncLabel = () => {
    if (!button) return;
    button.textContent = document.body.dataset.theme === "dark" ? "切换日间" : "切换夜间";
  };
  syncLabel();
  button?.addEventListener("click", () => {
    document.body.dataset.theme = document.body.dataset.theme === "dark" ? "light" : "dark";
    window.localStorage.setItem(storageKey, document.body.dataset.theme);
    syncLabel();
  });
}

function searchTools(query) {
  const keyword = query.trim().toLowerCase();
  if (!keyword) return [];
  return TOOL_INDEX.filter((tool) => tool.search_blob.includes(keyword)).slice(0, 10);
}

function renderSearchCards(results) {
  if (!results.length) {
    return '<div class="search-empty">没有找到完全匹配的工具，试试“压缩”“转 JPG”“PDF”这类关键词。</div>';
  }
  return results
    .map(
      (tool) => `<a class="search-result-card" href="${tool.path}">
        <div>
          <strong>${tool.title}</strong>
          <p>${tool.description}</p>
          <span>${tool.category_label} · ${tool.processing_label}</span>
        </div>
        <strong>进入</strong>
      </a>`,
    )
    .join("");
}

function initSearchPanels() {
  document.querySelectorAll("[data-tool-search='home']").forEach((panel) => {
    const input = panel.querySelector("[data-tool-search-input]");
    const results = panel.parentElement.querySelector("[data-tool-search-results]");
    const chips = panel.querySelectorAll("[data-search-chip]");

    const run = () => {
      const query = input.value.trim();
      if (!query) {
        results.classList.add("hidden");
        results.innerHTML = "";
        return;
      }
      results.classList.remove("hidden");
      results.innerHTML = renderSearchCards(searchTools(query));
    };

    input?.addEventListener("input", run);
    chips.forEach((chip) =>
      chip.addEventListener("click", () => {
        input.value = chip.dataset.searchChip || "";
        run();
      }),
    );
  });

  document.querySelectorAll("[data-tool-search='catalog']").forEach((panel) => {
    const input = panel.querySelector("[data-tool-search-input]");
    const buttons = panel.querySelectorAll("[data-category-filter]");
    let activeCategory = "all";

    const apply = () => {
      const query = (input?.value || "").trim().toLowerCase();
      document.querySelectorAll("[data-category-group]").forEach((group) => {
        const matchesCategory = activeCategory === "all" || group.dataset.categoryGroup === activeCategory;
        let visibleCount = 0;
        group.querySelectorAll("[data-tool-card]").forEach((card) => {
          const haystack = card.dataset.search || "";
          const visible = matchesCategory && (!query || haystack.includes(query));
          card.classList.toggle("is-hidden", !visible);
          if (visible) visibleCount += 1;
        });
        group.classList.toggle("is-hidden", visibleCount === 0);
      });
    };

    input?.addEventListener("input", apply);
    buttons.forEach((button) =>
      button.addEventListener("click", () => {
        activeCategory = button.dataset.categoryFilter || "all";
        buttons.forEach((item) => item.classList.toggle("is-active", item === button));
        apply();
      }),
    );
    apply();
  });
}

function extractValues(form) {
  const values = Object.fromEntries(new FormData(form).entries());
  for (const [key, value] of Object.entries(values)) {
    values[key] = typeof value === "string" ? value.trim() : value;
  }
  return values;
}

function createQueueItemMarkup(entry) {
  return `<div class="queue-item">
    <div>
      <strong>${entry.file.name}</strong>
      <p>${formatBytes(entry.file.size)} · ${entry.note}</p>
    </div>
    <span class="queue-tag ${entry.level}">${entry.badge}</span>
  </div>`;
}

function renderQueue(queueList, summaryNode, entries) {
  if (!entries.length) {
    queueList.classList.add("empty");
    queueList.innerHTML = "选择文件后，这里会显示文件名、大小和可否处理。";
    summaryNode.textContent = "还没有选择文件";
    return;
  }
  const accepted = entries.filter((item) => item.level !== "error");
  const total = accepted.reduce((sum, item) => sum + item.file.size, 0);
  summaryNode.textContent = `已选 ${accepted.length} 个文件，合计 ${formatBytes(total)}`;
  queueList.classList.remove("empty");
  queueList.innerHTML = entries.map(createQueueItemMarkup).join("");
}

function isLocalOutputFormat(format) {
  return LOCAL_IMAGE_OUTPUTS.has(normalizeOutputFormat(format));
}

function canProcessLocally(tool, files, values) {
  if (!files.length) {
    return { local: false, reason: tool.processing_notice };
  }
  if (tool.client_strategy === "server") {
    return { local: false, reason: tool.processing_notice };
  }
  if (values.keep_metadata === "true" || values.lossless === "true") {
    return { local: false, reason: "当前参数要求保留元数据或无损输出，本次将切换到服务器处理。" };
  }
  if (tool.mode === "image_dpi") {
    return { local: false, reason: "DPI 元数据写入更适合由服务器完成。" };
  }
  if (tool.mode.startsWith("pdf_") || ["pdf_merge", "pdf_split", "pdf_extract_images", "pdf_delete_pages"].includes(tool.mode)) {
    return { local: false, reason: tool.processing_notice };
  }
  if (!window.PDFLib && tool.mode === "image_to_pdf") {
    return { local: false, reason: "当前浏览器未加载 PDF 生成库，本次将切换到服务器处理。" };
  }

  const outputFormat = normalizeOutputFormat(tool.fixed_output_format || values.output_format || "");
  const allSupported = files.every((file) => {
    const ext = normalizeExt(file.name);
    if (tool.mode === "image_compress") {
      return LOCAL_COMPRESS_EXTS.has(ext);
    }
    if (tool.mode === "image_target_size") {
      return LOCAL_COMPRESS_EXTS.has(ext);
    }
    if (tool.mode === "image_convert" || tool.mode === "image_resize") {
      return LOCAL_RASTER_EXTS.has(ext) && isLocalOutputFormat(outputFormat);
    }
    if (tool.mode === "image_to_pdf") {
      return LOCAL_RASTER_EXTS.has(ext);
    }
    return false;
  });

  if (!allSupported) {
    return { local: false, reason: "当前文件类型或输出格式不适合在浏览器内处理，本次将使用服务器。" };
  }
  return { local: true, reason: "本次会优先在浏览器中处理，文件不会上传到服务器。" };
}

function validateFiles(tool, files, values) {
  const maxFiles = Number(tool.max_files || 30);
  const maxFileBytes = Number(tool.max_file_mb || 25) * 1024 * 1024;
  const trimmed = files.slice(0, maxFiles);
  const overLimitFiles = files.slice(maxFiles);
  const localPlan = canProcessLocally(tool, trimmed, values);

  const entries = trimmed.map((file) => {
    if (file.size > maxFileBytes) {
      return {
        file,
        level: "error",
        badge: "超出限制",
        note: `单个文件不能超过 ${tool.max_file_mb}MB`,
        accepted: false,
      };
    }
    return {
      file,
      level: localPlan.local ? "ok" : "warn",
      badge: localPlan.local ? "浏览器处理" : "服务器处理",
      note: localPlan.reason,
      accepted: true,
    };
  });

  overLimitFiles.forEach((file) =>
    entries.push({
      file,
      level: "error",
      badge: "超出数量",
      note: `一次最多选择 ${maxFiles} 个文件`,
      accepted: false,
    }),
  );

  return { entries, acceptedFiles: entries.filter((item) => item.accepted).map((item) => item.file), localPlan };
}

function setResultMessage(node, message, className = "result-card") {
  node.className = className;
  node.innerHTML = `<p>${message}</p>`;
}

function renderRemoteResult(node, payload) {
  const archive = payload.archive_url ? `<a class="button primary" href="${payload.archive_url}" download>下载 ZIP</a>` : "";
  const cards = payload.items
    .map((item) => {
      const saved = item.saved_bytes ? `<p>节省 ${formatBytes(item.saved_bytes)}</p>` : "";
      const preview = item.preview_url ? `<img src="${item.preview_url}" alt="${item.name}" class="result-preview" />` : `<div class="result-preview"></div>`;
      return `<article class="result-item">${preview}<div><h3>${item.name}</h3><p>${formatBytes(item.size_bytes)}</p>${saved}<a class="button ghost" href="${item.url}" download>下载文件</a></div></article>`;
    })
    .join("");
  node.className = "result-live";
  node.innerHTML = `<div class="result-toolbar"><p>处理完成，共生成 ${payload.count} 个结果文件。</p>${archive}</div><div class="result-list">${cards}</div>`;
}

async function blobFromCanvas(canvas, mimeType, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("生成文件失败，请重试。"));
    }, mimeType, quality);
  });
}

function outputMime(format) {
  const normalized = normalizeOutputFormat(format);
  return normalized === "jpg" ? "image/jpeg" : `image/${normalized}`;
}

function outputName(file, format) {
  const normalized = normalizeOutputFormat(format);
  return `${stem(file.name)}.${normalized}`;
}

async function loadImage(file) {
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`${file.name} 无法在当前浏览器中解码。`));
      img.src = url;
    });
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function resizeDimensions(width, height, targetWidth, targetHeight, keepAspectRatio) {
  if (!targetWidth && !targetHeight) return { width, height };
  const safeWidth = targetWidth || width;
  const safeHeight = targetHeight || height;
  if (!keepAspectRatio) return { width: safeWidth, height: safeHeight };
  const ratio = Math.min(safeWidth / width, safeHeight / height);
  return { width: Math.max(1, Math.round(width * ratio)), height: Math.max(1, Math.round(height * ratio)) };
}

function drawToCanvas(image, width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha: true });
  context.drawImage(image, 0, 0, width, height);
  return canvas;
}

async function makeRasterOutput(file, tool, values) {
  const image = await loadImage(file);
  const ext = normalizeExt(file.name);
  const chosenFormat =
    normalizeOutputFormat(tool.fixed_output_format || values.output_format || (tool.mode === "image_compress" || tool.mode === "image_target_size" ? ext : "jpg"));
  const qualityValue = Math.max(0.1, Math.min(1, Number(values.quality || tool.default_options.quality || 90) / 100));
  let canvas = drawToCanvas(image, image.naturalWidth, image.naturalHeight);

  if (tool.mode === "image_resize") {
    const targetWidth = Number(values.width || image.naturalWidth);
    const targetHeight = Number(values.height || image.naturalHeight);
    const keepAspectRatio = values.keep_aspect_ratio !== "false";
    const dimensions = resizeDimensions(image.naturalWidth, image.naturalHeight, targetWidth, targetHeight, keepAspectRatio);
    canvas = drawToCanvas(image, dimensions.width, dimensions.height);
  }

  if (tool.mode === "image_target_size") {
    const targetBytes = Number(values.target_kb || tool.default_options.target_kb || 100) * 1024;
    const mime = outputMime(chosenFormat);
    let bestBlob = await blobFromCanvas(canvas, mime, 0.92);
    for (const scale of [1, 0.92, 0.84, 0.76, 0.68]) {
      const width = Math.max(1, Math.round(image.naturalWidth * scale));
      const height = Math.max(1, Math.round(image.naturalHeight * scale));
      const scaled = drawToCanvas(image, width, height);
      let low = 0.1;
      let high = 0.95;
      let candidate = bestBlob;
      for (let index = 0; index < 8; index += 1) {
        const attemptQuality = (low + high) / 2;
        const blob = await blobFromCanvas(scaled, mime, attemptQuality);
        if (blob.size <= targetBytes) {
          candidate = blob;
          low = attemptQuality;
        } else {
          high = attemptQuality;
        }
      }
      if (candidate.size <= targetBytes) {
        bestBlob = candidate;
        break;
      }
      if (candidate.size < bestBlob.size) bestBlob = candidate;
    }
    return buildLocalResult(file, bestBlob, outputName(file, chosenFormat));
  }

  const finalQuality = tool.mode === "image_compress" ? qualityValue : chosenFormat === "png" ? undefined : qualityValue;
  const blob = await blobFromCanvas(canvas, outputMime(chosenFormat), finalQuality);
  return buildLocalResult(file, blob, outputName(file, chosenFormat));
}

function buildLocalResult(file, blob, name) {
  const isPreview = blob.type.startsWith("image/");
  const objectUrl = URL.createObjectURL(blob);
  return {
    name,
    blob,
    url: objectUrl,
    preview_url: isPreview ? objectUrl : null,
    size_bytes: blob.size,
    size_kb: +(blob.size / 1024).toFixed(2),
    source_name: file.name,
    source_size_bytes: file.size,
    saved_bytes: file.size > blob.size ? file.size - blob.size : null,
  };
}

async function fileToUint8Array(file) {
  return new Uint8Array(await file.arrayBuffer());
}

async function canvasPngBytes(file) {
  const image = await loadImage(file);
  const canvas = drawToCanvas(image, image.naturalWidth, image.naturalHeight);
  const blob = await blobFromCanvas(canvas, "image/png");
  return new Uint8Array(await blob.arrayBuffer());
}

function pdfPageDimensions(values, imageWidth, imageHeight) {
  const size = values.page_size || "A4";
  const orientation = values.orientation || "portrait";
  let width = 595.28;
  let height = 841.89;
  if (size === "Letter") {
    width = 612;
    height = 792;
  } else if (size === "Original") {
    width = imageWidth;
    height = imageHeight;
  }
  if (orientation === "landscape") {
    return { width: height, height: width };
  }
  return { width, height };
}

async function buildPdfForFiles(files, values, outputNameValue) {
  const { PDFDocument } = window.PDFLib;
  const pdfDoc = await PDFDocument.create();
  const margin = Number(values.margin || 24);

  for (const file of files) {
    const ext = normalizeExt(file.name);
    const image = await loadImage(file);
    const pageSize = pdfPageDimensions(values, image.naturalWidth, image.naturalHeight);
    const page = pdfDoc.addPage([pageSize.width, pageSize.height]);

    let embedded;
    if (ext === "jpg" || ext === "jpeg") {
      embedded = await pdfDoc.embedJpg(await fileToUint8Array(file));
    } else if (ext === "png") {
      embedded = await pdfDoc.embedPng(await fileToUint8Array(file));
    } else {
      embedded = await pdfDoc.embedPng(await canvasPngBytes(file));
    }

    const innerWidth = pageSize.width - margin * 2;
    const innerHeight = pageSize.height - margin * 2;
    const scale = Math.min(innerWidth / embedded.width, innerHeight / embedded.height);
    const drawWidth = embedded.width * scale;
    const drawHeight = embedded.height * scale;
    const x = (pageSize.width - drawWidth) / 2;
    const y = (pageSize.height - drawHeight) / 2;
    page.drawImage(embedded, { x, y, width: drawWidth, height: drawHeight });
  }

  const bytes = await pdfDoc.save();
  const blob = new Blob([bytes], { type: "application/pdf" });
  return {
    name: outputNameValue,
    blob,
    url: URL.createObjectURL(blob),
    preview_url: null,
    size_bytes: blob.size,
    size_kb: +(blob.size / 1024).toFixed(2),
  };
}

async function processLocally(tool, files, values, resultNode) {
  setResultMessage(resultNode, "正在浏览器中处理，请稍候…");
  let outputs = [];

  if (tool.mode === "image_to_pdf") {
    if ((values.merge_mode || "single") === "multiple") {
      outputs = [];
      for (const file of files) {
        outputs.push(await buildPdfForFiles([file], values, `${stem(file.name)}.pdf`));
      }
    } else {
      outputs = [await buildPdfForFiles(files, values, `${tool.slug}.pdf`)];
    }
  } else {
    outputs = [];
    for (const file of files) {
      outputs.push(await makeRasterOutput(file, tool, values));
    }
  }

  let archiveUrl = null;
  if (outputs.length > 1 && window.JSZip) {
    const zip = new window.JSZip();
    outputs.forEach((item) => zip.file(item.name, item.blob));
    const archiveBlob = await zip.generateAsync({ type: "blob" });
    archiveUrl = URL.createObjectURL(archiveBlob);
  }

  renderRemoteResult(resultNode, { count: outputs.length, items: outputs, archive_url: archiveUrl });
}

async function processOnServer(tool, files, values, resultNode) {
  setResultMessage(resultNode, "正在上传并处理，请稍候…");
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  Object.entries(values).forEach(([key, value]) => formData.append(key, value));

  const response = await fetch(`/api/process/${tool.slug}`, { method: "POST", body: formData });
  const payload = await response.json();
  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || "处理失败，请稍后重试。");
  }
  renderRemoteResult(resultNode, payload);
}

function attachToolWorkspace(panel) {
  const tool = JSON.parse(panel.dataset.tool);
  const form = panel.querySelector("#tool-form");
  const dynamicFields = panel.querySelector("#dynamic-fields");
  const queueList = panel.querySelector("#queue-list");
  const queueSummary = panel.querySelector("#queue-summary");
  const resultState = panel.querySelector("#result-state");
  const fileInput = form.querySelector("#files");
  const dropzone = form.querySelector(".dropzone");
  const formHint = form.querySelector("#form-hint");

  renderFields(tool, dynamicFields);

  const state = {
    files: [],
    acceptedFiles: [],
    entries: [],
    localPlan: { local: false, reason: tool.processing_notice },
  };

  const reevaluate = () => {
    const values = extractValues(form);
    const evaluation = validateFiles(tool, state.files, values);
    state.entries = evaluation.entries;
    state.acceptedFiles = evaluation.acceptedFiles;
    state.localPlan = evaluation.localPlan;
    renderQueue(queueList, queueSummary, state.entries);
    formHint.textContent = state.localPlan.reason;
  };

  const setFiles = (fileList) => {
    state.files = Array.from(fileList);
    reevaluate();
  };

  fileInput.addEventListener("change", () => setFiles(fileInput.files));
  form.addEventListener("change", () => {
    if (state.files.length) reevaluate();
  });

  ["dragenter", "dragover"].forEach((eventName) =>
    dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropzone.classList.add("is-dragover");
    }),
  );

  ["dragleave", "drop"].forEach((eventName) =>
    dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropzone.classList.remove("is-dragover");
    }),
  );

  dropzone.addEventListener("drop", (event) => {
    const files = event.dataTransfer?.files;
    if (files?.length) {
      setFiles(files);
    }
  });

  form.addEventListener("reset", () => {
    window.setTimeout(() => {
      state.files = [];
      state.acceptedFiles = [];
      state.entries = [];
      state.localPlan = { local: false, reason: tool.processing_notice };
      renderQueue(queueList, queueSummary, []);
      formHint.textContent = tool.processing_notice;
      setResultMessage(resultState, "选择文件后会立即显示队列。点击“开始处理”后，这里会展示进度和下载结果。", "result-placeholder");
      renderFields(tool, dynamicFields);
    }, 0);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!state.acceptedFiles.length) {
      setResultMessage(resultState, "请先选择符合大小和数量限制的文件。");
      return;
    }

    const values = extractValues(form);
    try {
      if (state.localPlan.local) {
        try {
          await processLocally(tool, state.acceptedFiles, values, resultState);
        } catch (localError) {
          if (tool.client_strategy === "hybrid") {
            setResultMessage(resultState, `浏览器处理失败，正在切换到服务器：${localError.message}`);
            await processOnServer(tool, state.acceptedFiles, values, resultState);
          } else {
            throw localError;
          }
        }
      } else {
        await processOnServer(tool, state.acceptedFiles, values, resultState);
      }
    } catch (error) {
      setResultMessage(resultState, error.message || "处理失败，请稍后重试。");
    }
  });
}

function initWorkspaces() {
  document.querySelectorAll(".workspace-panel").forEach(attachToolWorkspace);
}

document.addEventListener("DOMContentLoaded", () => {
  initThemeToggle();
  initSearchPanels();
  initWorkspaces();
});
