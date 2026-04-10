# 墨图工坊 · Pic Convertor

在线图片与 PDF 处理工具站，基于 `FastAPI + Jinja SSR + 原生前端`。

线上地址：[http://38.76.208.69:8000/zh-CN](http://38.76.208.69:8000/zh-CN)

---

## 功能概览

| 分类 | 工具 |
|---|---|
| **图片压缩** | JPG / PNG / GIF / WebP 压缩；指定体积压缩到 20 / 50 / 100 KB |
| **格式转换** | PNG ↔ JPG / WebP / AVIF / BMP / ICO / TIFF；HEIC → JPG；RAW → JPG |
| **尺寸调整** | 批量调整宽高，支持保持比例 |
| **DPI 修改** | 批量修改图片 DPI |
| **图片转 PDF** | 多图合并为单个 PDF，或每图单独输出 |
| **PDF 工具** | PDF 转图片、合并、拆分、提取图片、删除指定页 |

**产品特点**

- 多语言：支持中文 / English / 日本語（Edge Translate 自动翻译 + 本地静态字典，零 API 成本）
- 本地优先：常见图片优先在浏览器内处理，文件不上传服务器
- 批量下载：结果支持逐个下载或一键打包 ZIP
- 自动清理：服务器生成的临时文件 7 天后自动清除
- 前后端双重限制：文件大小和数量均受限，防滥用
- 暗/亮主题切换，持久化存储用户偏好
- SEO 友好：每页独立 title / description / canonical + sitemap / robots

---

## 技术栈

- **后端**：Python 3.12+、FastAPI、Jinja2、Pillow、pillow-heif、rawpy、PyMuPDF
- **前端**：原生 JS；CDN 引入 JSZip、pdf-lib
- **国际化**：Edge Translate API（无需密钥）+ 静态字典 + localStorage 缓存

---

## 目录结构

```
app/
  config.py               站点配置
  main.py                 FastAPI 入口、页面路由、API、定时清理
  seo.py                  canonical 与结构化数据生成
  tool_registry.py        工具注册表（添加新工具从这里改）
  services/processor.py  图片 / PDF 处理引擎
  templates/              Jinja 模板（base / pages / partials）
  static/css/site.css     全站样式（日间/夜间双主题）
  static/js/app.js        工具交互逻辑
  static/js/i18n.js       国际化引擎
deploy/
  deploy.sh               从 GitHub 拉代码并重启服务（主力部署脚本）
  install_server.sh       首次安装（仅需执行一次）
  pic-convertor.service   systemd 服务单元文件
tests/
  test_site.py            基础回归测试
start.bat                 Windows 一键启动
```

---

## 本地开发

```bash
python -m venv .venv
# Windows:
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
# Linux / macOS:
.venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn app.main:app --reload
```

或直接双击 `start.bat`（Windows）。

访问：`http://127.0.0.1:8000/zh-CN`

### 运行测试

```bash
.venv/bin/python -m pytest -q
```

---

## 服务器部署

### 首次安装

```bash
# 在服务器上以 root 执行
git clone https://github.com/jiejingta/pic_convertor.git /opt/pic_convertor
cd /opt/pic_convertor
bash deploy/install_server.sh
```

### 日常更新（推荐）

```bash
bash /opt/pic_convertor/deploy/deploy.sh
```

脚本会自动：从 GitHub 拉取最新代码 → 更新依赖 → 重启 systemd 服务 → 验证启动状态。

### 服务管理

```bash
systemctl status pic-convertor --no-pager
systemctl restart pic-convertor
journalctl -u pic-convertor -n 100 --no-pager
```

---

## 当前部署信息

| 项目 | 值 |
|---|---|
| 服务器 | `38.76.208.69` |
| 访问入口 | `http://38.76.208.69:8000/zh-CN` |
| 部署目录 | `/opt/pic_convertor` |
| 服务名 | `pic-convertor` |
| 端口 | `8000`（80/443 已被其他服务占用，通过反向代理可转发） |

---

## 生产注意点

- 临时文件存放于 `storage/jobs/<job_id>/`，启动时及每 12 小时自动清理 7 天前的文件
- PDF、RAW、HEIC、GIF、DPI 等场景须服务端处理
- 边缘格式支持情况以 `app/services/processor.py` 底层库实际能力为准
