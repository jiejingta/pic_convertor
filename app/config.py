from __future__ import annotations

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
APP_DIR = BASE_DIR / "app"
TEMPLATES_DIR = APP_DIR / "templates"
STATIC_DIR = APP_DIR / "static"
STORAGE_DIR = BASE_DIR / "storage"
JOBS_DIR = STORAGE_DIR / "jobs"

SITE_NAME = "墨图工坊"
SITE_TAGLINE = "在线处理图片与 PDF 的轻量工具站"
SITE_URL = os.getenv("PUBLIC_BASE_URL", "").rstrip("/")
SITE_LOCALE = "zh-CN"
SITE_DESCRIPTION = (
    "墨图工坊提供图片压缩、格式转换、尺寸调整、DPI 修改和 PDF 工具，"
    "支持批量处理、清晰的文件反馈和统一下载流程。"
)

JOBS_DIR.mkdir(parents=True, exist_ok=True)
