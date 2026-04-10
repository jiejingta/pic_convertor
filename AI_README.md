# AI_README

## 1. 项目现状

- 根目录新增了面向 GitHub 访客的 `README.md`，用于介绍项目、功能与部署方式。
- 当前项目是一个 `FastAPI + Jinja SSR + 原生前端处理` 的图片与 PDF 工具站。
- 页面组织结构对标 `imgdiet` 的中文站路由风格，主入口统一在 `/zh-CN/*`。
- 当前默认是日间模式，支持手动切换夜间模式。
- 首页、工具页、目录页、联系页、隐私页都已落地，并已经从“开发占位页”调整为“用户可直接使用”的运营版结构。
- 核心工具链路已可运行：
  - 图片压缩
  - 图片格式转换
  - 图片改尺寸
  - 指定 KB 压缩
  - DPI 修改
  - 图片转 PDF
  - PDF 转图片
  - PDF 合并 / 拆分 / 提图 / 删除页数
- 当前交互重点：
  - 按场景分类找工具
  - 站内搜索工具
  - 上传后立即显示文件队列与校验状态
  - 对常见图片优先使用浏览器本地处理
  - 对 PDF / RAW / 特殊格式走服务器处理
  - 前后端双重限制文件大小与数量
- 已补齐站点级 SEO：
  - 独立 title / description / canonical
  - FAQ 结构化数据
  - 软件工具结构化数据
  - sitemap.xml
  - robots.txt
  - canonical / sitemap / robots 会按真实访问域名动态输出，避免发布后仍指向 localhost

## 2. 代码结构

### 2.0 根目录文档

- `README.md`
  - 面向 GitHub 访客的项目说明
  - 包含功能概览、本地运行、Windows 一键启动、Ubuntu 部署与运维命令
- `AI_README.md`
  - 面向新 AI / 新同学的项目索引
  - 以代码结构、路由组织、当前实现注意点为主

### 2.1 应用入口

- `app/main.py`
  - FastAPI 应用入口
  - 页面路由
  - sitemap / robots
  - `/api/process/{slug}` 处理接口

### 2.2 工具配置

- `app/tool_registry.py`
  - 全站工具路由配置源
  - 首页 / 顶部导航 / 目录页分组来源
  - 长尾转换器页面生成逻辑
  - 工具页默认 SEO 文案、FAQ、步骤、功能点

### 2.3 处理引擎

- `app/services/processor.py`
  - 上传文件落盘
  - 图片读写与格式转换
  - 目标体积压缩
  - 尺寸调整
  - DPI 写入
  - 图片转 PDF
  - PDF 转图片
  - PDF 合并 / 拆分 / 提图 / 删除页数
  - 结果目录与 ZIP 打包

### 2.4 SEO

- `app/seo.py`
  - canonical
  - 真实请求域名解析
  - BreadcrumbList
  - FAQPage
  - SoftwareApplication
  - CollectionPage

### 2.5 页面与静态资源

- `app/templates/`
  - `base.html`：全局骨架
  - `pages/home.html`：首页
  - `pages/tools.html`：全部工具页
  - `pages/tool.html`：工具详情页
  - `pages/legal.html`：联系/隐私/404 类页面
- `app/static/css/site.css`
  - 全站日间/夜间双主题样式
- `app/static/js/app.js`
  - 工具页动态参数面板
  - 首页与工具目录搜索
  - 主题切换
  - 上传队列、大小/数量校验
  - 浏览器本地图片处理
  - 服务器回退与结果下载渲染
- `app/static/favicon.svg`
  - 站点 favicon 资源

## 3. 路由组织

### 3.1 站点页

- `/zh-CN`
- `/zh-CN/tools`
- `/zh-CN/contact`
- `/zh-CN/privacy-policy`

### 3.2 核心工具页

- 热门：
  - `/zh-CN/compress`
  - `/zh-CN/convert`
  - `/zh-CN/resize`
  - `/zh-CN/resize-image-to-kb`
  - `/zh-CN/300-dpi-converter`
  - `/zh-CN/jpg-to-pdf`
- 压缩：
  - `/zh-CN/jpg-compress`
  - `/zh-CN/png-compress`
  - `/zh-CN/gif-compress`
  - `/zh-CN/webp-compress`
  - `/zh-CN/compress-image-to-20kb`
  - `/zh-CN/compress-image-to-50kb`
  - `/zh-CN/compress-image-to-100kb`
- 转换：
  - `/zh-CN/png-to-jpg`
  - `/zh-CN/jpg-to-png`
  - `/zh-CN/webp-to-jpg`
  - `/zh-CN/webp-to-png`
  - `/zh-CN/heic-to-jpg`
  - `/zh-CN/raw-converter`
  - `/zh-CN/dpi-converter`
- PDF：
  - `/zh-CN/pdf-to-jpg`
  - `/zh-CN/pdf-to-image`
  - `/zh-CN/merge-pdf`
  - `/zh-CN/split-pdf`
  - `/zh-CN/extract-images-from-pdf`
  - `/zh-CN/delete-pdf-pages`

### 3.3 长尾页面

- 已生成一批参考站同类长尾页：
  - `*-converter`
  - `image-to-*`
  - `*-to-pdf`

## 4. 依赖与运行

### 4.1 依赖

- Python 3.14
- 关键包：
  - `fastapi`
  - `uvicorn`
  - `jinja2`
  - `Pillow`
  - `pillow-heif`
  - `rawpy`
  - `PyMuPDF`

### 4.1.1 浏览器侧依赖

- 通过 CDN 引入：
  - `JSZip`
  - `pdf-lib`
- 用途：
  - 本地批量打包下载
  - 浏览器内图片转 PDF

### 4.2 本地运行

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

默认访问：

- `http://127.0.0.1:8000/zh-CN`

### 4.3 一键启动

- 根目录提供了 `start.bat`
- 双击或在 PowerShell 中执行下面命令即可：

```powershell
.\start.bat
```

- 脚本行为：
  - 自动检查并创建 `.venv`
  - 自动安装 `requirements.txt`
  - 自动启动 `uvicorn`
  - 启动后自动打开浏览器到 `/zh-CN`

### 4.4 Ubuntu 部署现状

- 已部署到服务器：
  - IP：`38.76.208.69`
  - 系统：`Ubuntu 24.04.1 LTS`
- 当前部署方式：
  - 项目目录：`/opt/pic_convertor`
  - 服务名：`pic-convertor`
  - 进程方式：`systemd + uvicorn`
  - 监听地址：`0.0.0.0:8000`
- 当前访问入口：
  - `http://38.76.208.69:8000/zh-CN`
- 说明：
  - 该服务器的 `80/443` 已被现有 `docker-proxy` 占用，且 `http://38.76.208.69/*` 会落到既有站点逻辑。
  - 为避免影响原有业务，本项目没有接管 `80/443`，而是独立发布在 `8000` 端口。
  - 站点 canonical / sitemap / robots 会跟随当前访问主机生成，便于后续切换独立域名。

### 4.5 服务器运维命令

```bash
systemctl status pic-convertor --no-pager
systemctl restart pic-convertor
journalctl -u pic-convertor -n 100 --no-pager
```

## 5. 验证现状

- 已通过：
  - `python -m compileall app`
  - `python -m pytest -q`
- 当前测试覆盖：
  - 首页 / 工具页 / sitemap 页面可访问
  - 页面不再暴露内部术语
  - 图片转换与改尺寸
  - 指定 KB 压缩
  - 图片转 PDF
  - PDF 转图片
  - PDF 合并 / 拆分 / 提图 / 删除页数
  - 后端上传限制拦截

## 6. 当前实现注意点

- 文件结果默认输出到 `storage/jobs/<job_id>/`，方便直接下载与调试。
- 当前未加任务自动清理策略；若后续持续公网运营，需要补定时清理和访问控制。
- 常见图片处理已尽量前置到浏览器，但 PDF、RAW、HEIC、GIF、DPI 及部分特殊格式仍主要依赖服务器。
- 某些非常边缘的输入格式是否能成功读取，最终仍取决于底层库支持情况，以 `processor.py` 真实行为为准。
- 若后续新增工具页，优先修改 `app/tool_registry.py`，再看是否需要扩展 `app/services/processor.py`。
