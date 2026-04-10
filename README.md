# Pic Convertor

`Pic Convertor` 是一个面向中文用户的在线图片与 PDF 工具站，使用 `FastAPI + Jinja SSR + 原生前端处理` 实现。项目路由与工具组织参考 `imgdiet` 中文站风格，重点覆盖图片压缩、格式转换、尺寸调整、DPI 修改以及常见 PDF 工具。

线上示例地址：

- [http://38.76.208.69:8000/zh-CN](http://38.76.208.69:8000/zh-CN)

## 功能概览

- 图片压缩：JPG / PNG / GIF / WebP 压缩，支持指定体积压缩
- 图片格式转换：PNG、JPG、WebP、HEIC、RAW 等转常见格式
- 图片改尺寸：批量调整宽高，支持保持比例
- DPI 修改：批量修改图片 DPI
- 图片转 PDF：支持合并为单个 PDF
- PDF 工具：PDF 转图片、合并、拆分、提取图片、删除页面
- 工具分类与站内搜索：帮助用户按场景快速找到合适工具
- 前后端双重上传限制：限制文件大小与数量，降低服务器压力

## 产品与实现特点

- 默认日间模式，支持手动切换夜间模式
- 上传后立即展示文件队列、限制校验和处理状态
- 常见图片处理尽量在浏览器端完成，减少服务器 CPU 与带宽压力
- PDF、RAW、HEIC、GIF、DPI 等场景回退到服务端处理
- SEO 友好：每个页面都有独立 `title`、`description`、`canonical`
- 已生成 `robots.txt` 与 `sitemap.xml`
- `canonical` / `robots` / `sitemap` 会根据实际访问域名动态输出

## 技术栈

- Python 3.14
- FastAPI
- Jinja2
- Pillow
- pillow-heif
- rawpy
- PyMuPDF
- 原生 JavaScript
- 浏览器侧依赖：`JSZip`、`pdf-lib`

## 目录结构

```text
app/
  config.py                站点配置
  main.py                  FastAPI 入口与页面/API 路由
  seo.py                   canonical 与结构化数据
  tool_registry.py         工具配置与页面生成来源
  services/processor.py    图片/PDF 处理引擎
  templates/               Jinja 页面模板
  static/                  CSS / JS / favicon
deploy/
  install_server.sh        Ubuntu 安装与部署脚本
  pic-convertor.service    systemd 服务文件
tests/
  test_site.py             基础回归测试
start.bat                  Windows 一键启动脚本
AI_README.md               项目内索引文档
```

## 本地开发

### 方式一：手动启动

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

访问地址：

- [http://127.0.0.1:8000/zh-CN](http://127.0.0.1:8000/zh-CN)

### 方式二：Windows 一键启动

根目录已提供 `start.bat`：

```powershell
.\start.bat
```

脚本会自动：

- 检查并创建 `.venv`
- 安装 `requirements.txt`
- 启动 `uvicorn`
- 自动打开浏览器到 `/zh-CN`

## 测试

```powershell
.\.venv\Scripts\python.exe -m compileall app tests
.\.venv\Scripts\python.exe -m pytest -q
```

## Ubuntu 部署

当前项目已部署在 Ubuntu 服务器，并通过 `systemd` 常驻运行。

### 1. 上传项目到服务器

建议上传到：

```bash
/opt/pic_convertor
```

### 2. 安装依赖并注册服务

在服务器执行：

```bash
cd /opt/pic_convertor
bash deploy/install_server.sh
```

脚本会自动：

- 安装 `python3`、`python3-venv`、`python3-pip`
- 创建 `.venv`
- 安装项目依赖
- 写入 `pic-convertor.service`
- 启用并重启服务

### 3. 服务管理命令

```bash
systemctl status pic-convertor --no-pager
systemctl restart pic-convertor
journalctl -u pic-convertor -n 100 --no-pager
```

### 4. 当前线上部署说明

- 部署目录：`/opt/pic_convertor`
- 服务名：`pic-convertor`
- 监听地址：`0.0.0.0:8000`
- 当前访问入口：[http://38.76.208.69:8000/zh-CN](http://38.76.208.69:8000/zh-CN)

说明：

- 服务器的 `80/443` 已被现有业务占用
- 当前项目未接管主站端口，而是独立运行在 `8000`
- 若后续切换正式域名，可在反向代理层转发到该端口

## 生产环境注意点

- 结果文件默认输出到 `storage/jobs/<job_id>/`
- 当前没有自动清理任务，持续公网运营时建议增加定时清理
- 若需要更强隔离，建议增加对象存储、访问控制和任务生命周期管理
- 是否能支持某些边缘格式，最终以 `app/services/processor.py` 中底层库的真实能力为准

## 许可

当前仓库未附带额外开源许可证。如需公开商用或接受外部贡献，建议补充 `LICENSE`。
