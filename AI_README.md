# AI_README — 项目交接文档

> 给下一个接手本项目的 AI 看的。请在修改代码之前读完本文档。

---

## 1. 项目现状（截至 2026-04-10）

FastAPI + Jinja SSR + 原生前端的图片与 PDF 工具站，路由入口统一在 `/zh-CN/*`。

已完成功能：
- 图片压缩（JPG/PNG/GIF/WebP）、指定体积压缩
- 图片格式转换（PNG/JPG/WebP/AVIF/BMP/ICO/TIFF/HEIC/RAW）
- 图片改尺寸、DPI 修改
- 图片转 PDF、PDF 转图片、PDF 合并/拆分/提图/删除页
- 工具目录与首页搜索
- 暗/亮主题切换（localStorage 持久化）
- 多语言：中文/英语/日语（`app/static/js/i18n.js`）
- 上传区支持点击选择文件（不只是拖放）
- 服务器端临时文件 7 天自动清理（启动 + 每 12 小时）
- Edge Translate 翻译代理 `/api/translate`
- GitHub → 服务器一键部署脚本 `deploy/deploy.sh`

---

## 2. 代码结构

### 2.1 入口

`app/main.py`
- FastAPI app
- 页面路由（全部在 `/zh-CN/*`）
- `/api/process/{slug}` — 上传处理
- `/api/translate` — Edge Translate 代理（POST，body: `{texts: [...], to: "en"}`）
- `startup()` — 启动时清理旧 job 目录，并创建定时清理协程（12h 间隔）
- `cleanup_old_jobs()` — 删除 7 天前的 `storage/jobs/*` 目录

### 2.2 工具注册

`app/tool_registry.py`  
**新增工具只改这一个文件**，路由、首页卡片、SEO 文案、FAQ、步骤等都自动生成。  
关键函数：
- `all_tools()` — 所有工具列表
- `visible_tools()` — 显示在站点的工具
- `home_tools()` — 首页展示的工具
- `category_groups()` — 按分类分组（用于目录页 Tab）
- `nav_groups()` — 顶部导航工具

### 2.3 处理引擎

`app/services/processor.py`  
- `process_tool(slug, mode, payload, files, ...)` — 统一入口
- 模式：`image_compress` / `image_convert` / `image_resize` / `image_target_size` / `image_dpi` / `image_to_pdf` / `pdf_to_image` / `pdf_merge` / `pdf_split` / `pdf_extract_images` / `pdf_delete_pages`

### 2.4 前端

`app/static/js/app.js`
- 上传区 drag-and-drop + 点击选择
- 文件队列渲染（waiting/OK/error 状态）
- 本地处理（Canvas）：compress / convert / resize / target_size / image_to_pdf
- 服务器处理：其余模式
- JS 中的用户可见文字通过 `window.I18N.t(text)` 翻译

`app/static/js/i18n.js`  
**国际化引擎**，详见下方"国际化"章节。

`app/static/css/site.css`
- CSS 变量：`[data-theme="light"]` / `[data-theme="dark"]`
- `.dropzone` — 上传区，已支持点击（hidden file input + `.dropzone-btn`）
- `.lang-switcher` / `.lang-btn` / `.lang-btn.active` — 语言切换按钮

### 2.5 模板

```
app/templates/
  base.html                  全局骨架，引入 i18n.js（非 defer）、app.js（defer）
  partials/header.html       顶部导航，含 #lang-switcher 容器
  partials/footer.html       页脚
  partials/tool_cards.html   工具卡片网格
  pages/home.html            首页
  pages/tools.html           全部工具目录
  pages/tool.html            工具详情页（含上传区 + 文件队列）
  pages/legal.html           联系/隐私/404
```

`pages/tool.html` 上传区结构：
```html
<label class="dropzone" for="files">
  <input id="files" .../>               <!-- hidden via CSS -->
  <span class="dropzone-icon">📂</span>
  <span class="dropzone-title" data-i18n="dropzone.title">...</span>
  <button type="button" class="dropzone-btn" onclick="...click()">选择文件</button>
  <span class="dropzone-hint" ...>单个文件不超过 XMB · 最多 N 个</span>
</label>
```

---

## 3. 国际化（i18n）

**文件**：`app/static/js/i18n.js`  
**支持语言**：`zh-CN`（默认，不做翻译）、`en`、`ja`

### 工作原理

1. **静态字典**（`STATIC` 对象）：覆盖所有 UI chrome（header/footer/按钮/队列文字/结果提示）。零网络请求，即时生效。

2. **动态翻译**（Edge Translate API）：翻译工具名称、描述、FAQ 等动态内容。
   - 先尝试浏览器直接调用 `https://edge.microsoft.com/translate/translatetext`（免费，无密钥）
   - 若 CORS 阻断，自动 fallback 到 `/api/translate` 服务端代理
   - 结果缓存到 localStorage（7 天有效期，按页面路径 × 语言分 key）

3. **`window.I18N.t(text)`**：app.js 中 JS 生成的文字通过此方法翻译。

### 语言切换

- `#lang-switcher` 容器由 `I18N._renderSwitcher()` 注入按钮（`i18n.js` 加载时执行）
- 切换时写入 `localStorage["pic-lang"]` 并 `location.reload()`
- i18n.js 以 `<script>`（非 defer）加载，确保页面渲染前语言已初始化

### 添加新语言

在 `i18n.js` 中：
1. 在 `SUPPORTED` 数组加入 `{ code: "ko", label: "한국어" }`
2. 在 `STATIC` 对象加入 `ko: { ... }` 静态字典
3. 动态翻译部分会自动走 Edge API（只需检查 `_edgeTranslate` 里的语言代码映射是否正确）

---

## 4. 文件清理机制

- `cleanup_old_jobs()` 在 `app/main.py` 中定义
- `startup()` 事件：进程启动时立即清理一次
- `periodic_cleanup(interval_hours=12)` 协程：每 12 小时后台清理
- 清理规则：`storage/jobs/*` 目录 mtime 超过 7 天（`JOB_MAX_AGE_DAYS = 7`）则删除
- 若需修改保留天数，改 `JOB_MAX_AGE_DAYS` 常量

---

## 5. 上传限制

- `max_file_mb`：在 `tool_registry.py` 的每个 `ToolConfig` 里配置；未配置则走 `default_max_file_mb()`
- `max_files`：同上，走 `default_max_files()`
- 前端 `validateFiles()` 在队列渲染时即时校验，超限文件标红不处理
- 后端 `process_tool()` 二次校验，超限抛 `ProcessingError`

---

## 6. 路由

| 路径 | 说明 |
|---|---|
| `/zh-CN` | 首页 |
| `/zh-CN/tools` | 全部工具目录 |
| `/zh-CN/{slug}` | 工具详情页 |
| `/zh-CN/contact` | 联系我们 |
| `/zh-CN/privacy-policy` | 隐私政策 |
| `/api/process/{slug}` | 文件处理 POST |
| `/api/translate` | Edge Translate 代理 POST |
| `/robots.txt` | SEO |
| `/sitemap.xml` | SEO |

---

## 7. 部署

### 服务器信息
- IP：`38.76.208.69`
- 系统：Ubuntu
- 部署目录：`/opt/pic_convertor`
- 服务名：`pic-convertor`（systemd）
- 端口：`8000`

### 日常更新流程
```bash
ssh root@38.76.208.69
bash /opt/pic_convertor/deploy/deploy.sh
```
脚本：拉取 GitHub main 分支 → `pip install -r requirements.txt` → `systemctl restart`

### 首次部署
```bash
git clone https://github.com/jiejingta/pic_convertor.git /opt/pic_convertor
cd /opt/pic_convertor
bash deploy/install_server.sh
```

---

## 8. 测试

```bash
.venv/bin/python -m pytest -q
```

测试覆盖（`tests/test_site.py`）：
- 首页 / 工具页 / sitemap 可访问（200）
- 图片压缩 / 转换 / 改尺寸 / 指定 KB / 转 PDF / PDF 转图片 / PDF 合并等核心流程
- 后端上传大小限制拦截

---

## 9. 注意事项

- `i18n.js` 必须以普通 `<script>` 加载（非 defer），否则页面渲染时 `window.I18N` 尚未定义，`app.js` 中的 `_t()` 调用会退化为中文
- Edge Translate API 是 Microsoft Edge 内置的翻译服务，免费无密钥。**不保证永久可用**；若不可用，静态字典部分仍正常工作，动态内容只是保持中文原文
- `storage/jobs/` 下的文件不纳入 git，已在 `.gitignore` 排除（若没有需要补上）
- 若后续新增工具，在 `tool_registry.py` 注册，在 `processor.py` 添加对应 mode 处理即可

---

## 10. 依赖

```
fastapi, uvicorn[standard], jinja2, python-multipart
Pillow, pillow-heif, rawpy, PyMuPDF
httpx          ← Edge Translate 代理需要
pytest, httpx  ← 测试
```
