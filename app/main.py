from __future__ import annotations

import asyncio
import shutil
from contextlib import asynccontextmanager
from datetime import datetime, timedelta

import httpx
from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, PlainTextResponse, RedirectResponse, Response
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from app.config import BAIDU_PUSH_TOKEN, JOBS_DIR, SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, STATIC_DIR, TEMPLATES_DIR
from app.services.processor import ProcessingError, process_tool
from app.seo import (
    breadcrumb_schema,
    canonical,
    collection_schema,
    faq_schema,
    iso_today,
    json_ld,
    resolve_site_url,
    software_schema,
    website_schema,
)
from app.tool_registry import (
    CATEGORY_META,
    all_tools,
    category_groups,
    default_max_file_mb,
    default_max_files,
    get_tool,
    home_tools,
    nav_groups,
    scenario_groups,
    tool_index,
    visible_tools,
)

FAVICON_PATH = STATIC_DIR / "favicon.svg"
OG_IMAGE_PATH = STATIC_DIR / "images" / "og-default.png"
JOB_MAX_AGE_DAYS = 7


def ensure_og_image() -> None:
    """Generate a branded 1200×630 OG image if it doesn't already exist."""
    if OG_IMAGE_PATH.exists():
        return
    try:
        from PIL import Image, ImageDraw, ImageFont  # type: ignore

        OG_IMAGE_PATH.parent.mkdir(parents=True, exist_ok=True)
        w, h = 1200, 630
        img = Image.new("RGB", (w, h), "#1a1a2e")
        draw = ImageDraw.Draw(img)

        # Accent bar
        draw.rectangle([(0, 0), (w, 8)], fill="#6c63ff")

        # Try to use a bundled font; fall back to default
        try:
            font_title = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 96)
            font_sub = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 42)
        except OSError:
            font_title = ImageFont.load_default()
            font_sub = font_title

        title_text = "墨图工坊"
        sub_text = "在线处理图片与 PDF 的轻量工具站"

        # Center title
        bbox = draw.textbbox((0, 0), title_text, font=font_title)
        tw = bbox[2] - bbox[0]
        draw.text(((w - tw) / 2, 220), title_text, font=font_title, fill="#ffffff")

        # Center subtitle
        bbox2 = draw.textbbox((0, 0), sub_text, font=font_sub)
        sw = bbox2[2] - bbox2[0]
        draw.text(((w - sw) / 2, 370), sub_text, font=font_sub, fill="#a0a0c0")

        img.save(OG_IMAGE_PATH, "PNG", optimize=True)
    except Exception:
        pass  # Non-critical; site works fine without it


def cleanup_old_jobs() -> int:
    """Delete job directories older than JOB_MAX_AGE_DAYS. Returns count of removed dirs."""
    cutoff = datetime.now() - timedelta(days=JOB_MAX_AGE_DAYS)
    removed = 0
    if not JOBS_DIR.exists():
        return 0
    for entry in JOBS_DIR.iterdir():
        if entry.is_dir():
            try:
                mtime = datetime.fromtimestamp(entry.stat().st_mtime)
                if mtime < cutoff:
                    shutil.rmtree(entry, ignore_errors=True)
                    removed += 1
            except OSError:
                pass
    return removed


async def periodic_cleanup(interval_hours: int = 12) -> None:
    while True:
        await asyncio.sleep(interval_hours * 3600)
        cleanup_old_jobs()


async def baidu_push_urls(site_url: str) -> None:
    """Push all tool page URLs to Baidu active indexing API on startup."""
    if not BAIDU_PUSH_TOKEN:
        return
    domain = site_url.rstrip("/").replace("https://", "").replace("http://", "")
    api = f"http://data.zz.baidu.com/urls?site={domain}&token={BAIDU_PUSH_TOKEN}"
    urls = [f"{site_url}/zh-CN"] + [f"{site_url}/zh-CN/{t.slug}" for t in all_tools()]
    body = "\n".join(urls)
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            await client.post(api, content=body, headers={"Content-Type": "text/plain"})
    except Exception:
        pass  # Non-critical


@asynccontextmanager
async def lifespan(app: FastAPI):  # noqa: ARG001
    cleanup_old_jobs()
    ensure_og_image()
    task = asyncio.create_task(periodic_cleanup())
    # Delay Baidu push slightly so site_url is resolvable via first request
    asyncio.create_task(
        baidu_push_urls(
            __import__("app.config", fromlist=["SITE_URL"]).SITE_URL
            or "https://convert.steampan.cn"
        )
    )
    yield
    task.cancel()


app = FastAPI(title=SITE_NAME, description=SITE_DESCRIPTION, lifespan=lifespan)
templates = Jinja2Templates(directory=str(TEMPLATES_DIR))

app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
app.mount("/storage", StaticFiles(directory=str(JOBS_DIR.parent)), name="storage")


def base_page(*, site_url: str, title: str, description: str, path: str, schemas: list[dict]) -> dict:
    return {
        "title": title,
        "description": description,
        "canonical": canonical(site_url, path),
        "og_image": f"{site_url}/static/images/og-default.png",
        "path": path,
        "site_name": SITE_NAME,
        "site_tagline": SITE_TAGLINE,
        "structured_data": json_ld(schemas),
    }


def render(request: Request, template_name: str, *, page: dict, **context) -> HTMLResponse:
    payload = {
        "request": request,
        "page": page,
        "site_name": SITE_NAME,
        "site_tagline": SITE_TAGLINE,
        "nav_tools": nav_groups(),
        "category_meta": CATEGORY_META,
        "tool_index": tool_index(),
        **context,
    }
    return templates.TemplateResponse(request=request, name=template_name, context=payload)


@app.get("/", include_in_schema=False)
async def root() -> RedirectResponse:
    return RedirectResponse(url="/zh-CN", status_code=307)


@app.get("/favicon.ico", include_in_schema=False)
async def favicon() -> FileResponse:
    return FileResponse(FAVICON_PATH, media_type="image/svg+xml")


@app.get("/baidu_verify_codeva-0A2u2r4LhB.html", include_in_schema=False)
async def baidu_verify() -> PlainTextResponse:
    return PlainTextResponse("1c8b8620ead6942e8a2130abcca2ef34")


@app.get("/zh-CN", response_class=HTMLResponse)
async def home(request: Request) -> HTMLResponse:
    path = "/zh-CN"
    site_url = resolve_site_url(request)
    page = base_page(
        site_url=site_url,
        title=f"{SITE_NAME} - 在线图片与 PDF 工具",
        description=SITE_DESCRIPTION,
        path=path,
        schemas=[
            website_schema(site_url),
            breadcrumb_schema(site_url, [("首页", path)]),
            collection_schema(
                site_url,
                "图片与 PDF 工具集合",
                SITE_DESCRIPTION,
                path,
                [{"title": tool.title, "path": f"/zh-CN/{tool.slug}"} for tool in visible_tools()[:32]],
            ),
        ],
    )
    return render(
        request,
        "pages/home.html",
        page=page,
        featured_tools=home_tools(),
        featured_groups=category_groups(),
        scenario_groups=scenario_groups(),
    )


@app.get("/zh-CN/tools", response_class=HTMLResponse)
async def tools_page(request: Request) -> HTMLResponse:
    path = "/zh-CN/tools"
    site_url = resolve_site_url(request)
    page = base_page(
        site_url=site_url,
        title=f"全部工具 - {SITE_NAME}",
        description="浏览图片压缩、格式转换、尺寸调整、DPI 和 PDF 工具的完整目录。",
        path=path,
        schemas=[
            website_schema(site_url),
            breadcrumb_schema(site_url, [("首页", "/zh-CN"), ("全部工具", path)]),
            collection_schema(
                site_url,
                "全部工具",
                "完整工具目录页面",
                path,
                [{"title": tool.title, "path": f"/zh-CN/{tool.slug}"} for tool in visible_tools()],
            ),
        ],
    )
    return render(request, "pages/tools.html", page=page, tool_groups=category_groups())


@app.get("/zh-CN/contact", response_class=HTMLResponse)
async def contact(request: Request) -> HTMLResponse:
    path = "/zh-CN/contact"
    site_url = resolve_site_url(request)
    page = base_page(
        site_url=site_url,
        title=f"联系我们 - {SITE_NAME}",
        description="项目联系、问题反馈与合作沟通入口。",
        path=path,
        schemas=[website_schema(site_url), breadcrumb_schema(site_url, [("首页", "/zh-CN"), ("联系我们", path)])],
    )
    content = {
        "title": "联系我们",
        "summary": "当前项目为本地可运行站点示例，若需扩展部署、增加格式或接入对象存储，可基于现有结构继续开发。",
        "items": [
            "问题反馈建议直接基于项目仓库提交，便于跟踪具体工具页与处理异常。",
            "如需更多格式支持，可先在统一配置表补路由，再扩充处理服务。",
            "生产环境建议补充文件生命周期清理、访问鉴权与审计日志。",
        ],
    }
    return render(request, "pages/legal.html", page=page, content=content)


@app.get("/zh-CN/privacy-policy", response_class=HTMLResponse)
async def privacy(request: Request) -> HTMLResponse:
    path = "/zh-CN/privacy-policy"
    site_url = resolve_site_url(request)
    page = base_page(
        site_url=site_url,
        title=f"隐私政策 - {SITE_NAME}",
        description="说明文件处理、临时存储和结果下载的基本策略。",
        path=path,
        schemas=[website_schema(site_url), breadcrumb_schema(site_url, [("首页", "/zh-CN"), ("隐私政策", path)])],
    )
    content = {
        "title": "隐私政策",
        "summary": "本项目默认以临时任务目录输出结果文件，便于下载与调试，不以长期留存为目标。",
        "items": [
            "上传文件仅用于当前处理任务，不作额外画像或营销用途。",
            "结果文件默认保存在本地 storage/jobs 目录，便于下载与调试。",
            "如接入公网部署，建议增加自动清理策略与访问控制。",
        ],
    }
    return render(request, "pages/legal.html", page=page, content=content)


@app.get("/zh-CN/{slug}", response_class=HTMLResponse)
async def tool_page(request: Request, slug: str) -> HTMLResponse:
    site_url = resolve_site_url(request)
    item = get_tool(slug)
    if item is None:
        page = base_page(
            site_url=site_url,
            title=f"页面不存在 - {SITE_NAME}",
            description="你访问的页面不存在。",
            path=f"/zh-CN/{slug}",
            schemas=[website_schema(site_url)],
        )
        content = {
            "title": "页面不存在",
            "summary": "请返回首页或通过工具目录重新进入。",
            "items": ["返回 /zh-CN 浏览热门工具。", "访问 /zh-CN/tools 查看完整工具列表。"],
        }
        return render(request, "pages/legal.html", page=page, content=content)

    tool = item.to_payload()
    path = f"/zh-CN/{slug}"
    page = base_page(
        site_url=site_url,
        title=tool["meta_title"],
        description=tool["meta_description"],
        path=path,
        schemas=[
            website_schema(site_url),
            breadcrumb_schema(site_url, [("首页", "/zh-CN"), ("工具", "/zh-CN/tools"), (item.title, path)]),
            software_schema(site_url, item.title, item.description, path),
            faq_schema(tool["faqs"]),
        ],
    )
    related = [ref for ref in (get_tool(slug) for slug in item.related_slugs) if ref]
    return render(request, "pages/tool.html", page=page, tool=tool, related_tools=related)


@app.get("/robots.txt", response_class=PlainTextResponse)
async def robots(request: Request) -> str:
    site_url = resolve_site_url(request)
    return "\n".join(["User-agent: *", "Allow: /", f"Sitemap: {canonical(site_url, '/sitemap.xml')}"])


@app.get("/sitemap.xml", response_class=Response)
async def sitemap(request: Request) -> Response:
    site_url = resolve_site_url(request)
    urls = ["/zh-CN", "/zh-CN/tools", "/zh-CN/contact", "/zh-CN/privacy-policy", *[f"/zh-CN/{tool.slug}" for tool in all_tools()]]
    today = iso_today()
    body = ["<?xml version='1.0' encoding='UTF-8'?>", "<urlset xmlns='http://www.sitemaps.org/schemas/sitemap/0.9'>"]
    for path in urls:
        body.extend(["<url>", f"<loc>{canonical(site_url, path)}</loc>", f"<lastmod>{today}</lastmod>", "</url>"])
    body.append("</urlset>")
    return Response("\n".join(body), media_type="application/xml")


@app.post("/api/translate", response_class=JSONResponse)
async def translate_proxy(request: Request) -> JSONResponse:
    """Server-side proxy for Edge Translate API (avoids CORS in browser)."""
    try:
        body = await request.json()
        texts = body.get("texts", [])
        to_lang = body.get("to", "en")
        if not texts or len(texts) > 200:
            return JSONResponse({"error": "invalid"}, status_code=400)
        url = f"https://edge.microsoft.com/translate/translatetext?from=zh-Hans&to={to_lang}&isEnterpriseClient=false"
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(url, json=texts, headers={"Content-Type": "application/json"})
        return JSONResponse(resp.json())
    except Exception:
        return JSONResponse(texts)  # fallback: return originals


@app.post("/api/process/{slug}", response_class=JSONResponse)
async def api_process(slug: str, request: Request) -> JSONResponse:
    item = get_tool(slug)
    if item is None:
        return JSONResponse({"ok": False, "error": "工具不存在。"}, status_code=404)

    form = await request.form()
    files = form.getlist("files")
    payload = {key: value for key, value in form.items() if key != "files"}

    try:
        result = process_tool(
            slug,
            item.mode,
            payload,
            files,
            fixed_output=item.fixed_output_format,
            max_file_mb=item.max_file_mb or default_max_file_mb(item),
            max_files=item.max_files or default_max_files(item),
        )
    except ProcessingError as exc:
        return JSONResponse({"ok": False, "error": str(exc)}, status_code=400)
    except Exception as exc:  # pragma: no cover
        return JSONResponse({"ok": False, "error": f"处理失败: {exc}"}, status_code=500)
    return JSONResponse({"ok": True, **result})
