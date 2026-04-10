from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any

from app.config import SITE_NAME


@dataclass(frozen=True)
class ToolConfig:
    slug: str
    title: str
    description: str
    subtitle: str
    category: str
    mode: str
    icon: str
    nav_title: str | None = None
    badge: str | None = None
    fixed_input_formats: tuple[str, ...] = ()
    fixed_output_format: str | None = None
    output_formats: tuple[str, ...] = ()
    accept_extensions: tuple[str, ...] = ()
    default_options: dict[str, Any] = field(default_factory=dict)
    ui: dict[str, Any] = field(default_factory=dict)
    related_slugs: tuple[str, ...] = ()
    hero_tags: tuple[str, ...] = ()
    aliases: tuple[str, ...] = ()
    use_cases: tuple[str, ...] = ()
    max_file_mb: int | None = None
    max_files: int | None = None
    show_on_home: bool = True
    show_on_tools: bool = True
    home_rank: int = 0

    def to_payload(self) -> dict[str, Any]:
        payload = asdict(self)
        payload["nav_title"] = self.nav_title or self.title
        payload["meta_title"] = f"{self.title} - 免费在线工具 | {SITE_NAME}"
        base_description = self.description.rstrip("。.!！?？")
        payload["meta_description"] = (
            f"{base_description}。支持批量处理、文件预览、清晰的结果下载和常见问题说明。"
        )
        payload["features"] = build_features(self.mode)
        payload["steps"] = build_steps(self.mode, self.title)
        payload["faqs"] = build_faqs(self.mode, self.title)
        payload["accept"] = ",".join(self.accept_extensions)
        payload["use_cases"] = list(self.use_cases or build_use_cases(self))
        payload["processing_label"] = build_processing_label(self)
        payload["processing_notice"] = build_processing_notice(self)
        payload["client_strategy"] = build_client_strategy(self)
        payload["max_file_mb"] = self.max_file_mb or default_max_file_mb(self)
        payload["max_files"] = self.max_files or default_max_files(self)
        payload["search_blob"] = build_search_blob(self)
        payload["format_summary"] = build_format_summary(self)
        return payload


CATEGORY_META = {
    "popular": {"label": "热门功能", "description": "最常被用来处理上传、格式和文档问题的工具"},
    "compress": {"label": "压缩与体积控制", "description": "适合网站上传、报名附件和素材瘦身"},
    "convert": {"label": "格式与尺寸调整", "description": "把图片改成目标格式、尺寸或分辨率"},
    "pdf": {"label": "PDF 处理", "description": "适合合并、拆分、提图和图片转 PDF"},
    "converters": {"label": "更多格式入口", "description": "面向细分格式的单独转换页"},
}

NAV_SLUGS = ("compress", "convert", "resize-image-to-kb", "dpi-converter", "jpg-to-pdf", "merge-pdf")
POPULAR_SLUGS = ("compress", "convert", "resize", "resize-image-to-kb", "300-dpi-converter", "jpg-to-pdf")

IMAGE_OUTPUT_FORMATS = ("jpg", "jpeg", "png", "webp", "avif", "bmp", "ico", "tiff")
PDF_IMAGE_OUTPUT_FORMATS = ("jpg", "png", "webp")
RAW_FORMATS = ("raw", "cr2", "cr3", "crw", "dcr", "dng", "erf", "fff", "mrw", "nef", "orf", "pef", "raf", "x3f", "3fr", "arw")

FORMAT_LABELS = {
    "jpg": "JPG",
    "jpeg": "JPEG",
    "png": "PNG",
    "webp": "WEBP",
    "avif": "AVIF",
    "bmp": "BMP",
    "ico": "ICO",
    "gif": "GIF",
    "tif": "TIF",
    "tiff": "TIFF",
    "heic": "HEIC",
    "heif": "HEIF",
    "jfif": "JFIF",
    "psd": "PSD",
    "dds": "DDS",
    "raw": "RAW",
    "cr2": "CR2",
    "cr3": "CR3",
    "crw": "CRW",
    "dcr": "DCR",
    "dng": "DNG",
    "erf": "ERF",
    "fff": "FFF",
    "mrw": "MRW",
    "nef": "NEF",
    "orf": "ORF",
    "pef": "PEF",
    "raf": "RAF",
    "x3f": "X3F",
    "3fr": "3FR",
    "arw": "ARW",
}

FORMAT_EXTENSIONS = {
    "jpg": (".jpg", ".jpeg", ".jfif", ".jpe", ".jif", ".jfi"),
    "jpeg": (".jpeg", ".jpg", ".jfif", ".jpe", ".jif", ".jfi"),
    "png": (".png",),
    "webp": (".webp",),
    "avif": (".avif",),
    "bmp": (".bmp",),
    "ico": (".ico",),
    "gif": (".gif",),
    "tif": (".tif", ".tiff"),
    "tiff": (".tiff", ".tif"),
    "heic": (".heic",),
    "heif": (".heif",),
    "jfif": (".jfif",),
    "psd": (".psd", ".psb"),
    "dds": (".dds",),
    "raw": tuple(f".{name}" for name in RAW_FORMATS),
    "cr2": (".cr2",),
    "cr3": (".cr3",),
    "crw": (".crw",),
    "dcr": (".dcr",),
    "dng": (".dng",),
    "erf": (".erf",),
    "fff": (".fff",),
    "mrw": (".mrw",),
    "nef": (".nef",),
    "orf": (".orf",),
    "pef": (".pef",),
    "raf": (".raf",),
    "x3f": (".x3f",),
    "3fr": (".3fr",),
    "arw": (".arw",),
}

COMMON_IMAGE_FORMATS = ("jpg", "jpeg", "png", "webp", "avif", "bmp", "gif", "heic", "heif", "tif", "tiff", "jfif", "psd")
COMMON_IMAGE_ACCEPT = tuple(dict.fromkeys(ext for fmt in COMMON_IMAGE_FORMATS for ext in FORMAT_EXTENSIONS[fmt]))
ALL_IMAGE_FORMATS = COMMON_IMAGE_FORMATS + RAW_FORMATS
ALL_IMAGE_ACCEPT = tuple(dict.fromkeys(ext for fmt in ALL_IMAGE_FORMATS for ext in FORMAT_EXTENSIONS.get(fmt, ())))

SERVER_ONLY_SLUGS = {
    "gif-compress",
    "png-compress",
    "raw-converter",
    "heic-to-jpg",
    "300-dpi-converter",
    "dpi-converter",
    "pdf-to-jpg",
    "pdf-to-image",
    "merge-pdf",
    "split-pdf",
    "extract-images-from-pdf",
    "delete-pdf-pages",
}

HYBRID_SLUGS = {
    "compress",
    "convert",
    "resize",
    "resize-image-to-kb",
    "jpg-to-pdf",
    "image-to-pdf",
    "png-to-jpg",
    "jpg-to-png",
    "webp-to-jpg",
    "webp-to-png",
    "jpg-compress",
    "webp-compress",
    "compress-image-to-20kb",
    "compress-image-to-50kb",
    "compress-image-to-100kb",
}


def build_features(mode: str) -> list[dict[str, str]]:
    if mode in {"image_compress", "image_target_size"}:
        items = [
            ("适合上传限制场景", "针对网站、表单和社媒平台的体积限制做优化。"),
            ("支持批量处理", "一次选择多张图片，统一完成压缩并集中下载。"),
            ("参数可调", "可以按质量、无损优先或目标大小灵活控制结果。"),
            ("结果直观", "完成后会展示输出大小、缩减幅度和下载入口。"),
        ]
    elif mode in {"image_convert", "image_dpi", "image_resize"}:
        items = [
            ("步骤简单", "上传图片后直接选择目标格式或尺寸即可处理。"),
            ("批量输出", "多文件同批次处理，统一下载为 ZIP。"),
            ("适合日常素材整理", "适用于电商图片、文章配图、设计交付和运营上传。"),
            ("优先本地处理常见格式", "常用图片会尽量在浏览器内完成，减少等待时间。"),
        ]
    else:
        items = [
            ("适合文档整理", "把散乱图片和 PDF 页面整理成可提交、可归档的文件。"),
            ("输出规则可控", "支持页码区间、布局和导出格式设置。"),
            ("批量下载", "处理完成后可集中打包，减少逐个保存。"),
            ("面向正式交付", "适用于合同、发票、申请材料和扫描件整理。"),
        ]
    return [{"title": title, "body": body} for title, body in items]


def build_steps(mode: str, title: str) -> list[str]:
    if mode == "image_compress":
        return ["上传图片。", "调整压缩参数。", "开始处理。", "下载单图或 ZIP。"]
    if mode == "image_target_size":
        return ["上传图片。", "输入目标 KB。", "等待系统自动迭代压缩。", "下载结果。"]
    if mode in {"image_convert", "image_resize", "image_dpi"}:
        return ["上传图片或文件夹。", "设置格式、尺寸或 DPI。", "提交任务。", "预览并下载。"]
    if mode == "image_to_pdf":
        return ["上传图片。", "设置页面尺寸、方向与边距。", "生成 PDF。", "下载合并或拆分结果。"]
    if mode == "pdf_to_image":
        return ["上传 PDF。", "选择图片格式和渲染倍率。", "执行逐页转换。", "下载图片或 ZIP。"]
    return ["上传 PDF。", "输入页码范围或处理规则。", "执行任务。", "下载结果文件。"]


def build_faqs(mode: str, title: str) -> list[dict[str, str]]:
    base = {
        "image_compress": [
            ("支持批量处理吗？", "支持，一次上传多张图片后会按统一参数处理。"),
            ("会展示压缩比例吗？", "会，结果里会返回原始大小和输出大小。"),
            ("适合哪些场景？", "适合网站资源、电商主图、文章配图和社媒素材压缩。"),
        ],
        "image_target_size": [
            ("可以压到指定 KB 吗？", "会尽量逼近目标大小，并在合理范围内自动调整质量。"),
            ("多张图片也能一起处理吗？", "可以，系统会对每张图分别执行目标体积压缩。"),
            ("如果目标很极限怎么办？", "会必要时结合质量与尺寸回退策略继续尝试。"),
        ],
        "image_convert": [
            ("支持批量转换吗？", "支持，多张图片会按同一输出格式统一处理。"),
            ("透明背景会保留吗？", "目标格式支持透明度时会尽量保留。"),
            ("支持哪些格式？", "支持常见位图、HEIC，以及多种 RAW 家族入口页。"),
        ],
        "image_resize": [
            ("会拉伸图片吗？", "默认提供保持比例选项，避免无意拉伸。"),
            ("能同时改尺寸和格式吗？", "可以，改尺寸后仍可输出为指定格式。"),
            ("支持批量吗？", "支持批量改尺寸与统一导出。"),
        ],
        "image_dpi": [
            ("会改变像素尺寸吗？", "默认只调整 DPI 元数据，不主动改像素尺寸。"),
            ("300 DPI 和普通 DPI 页面区别是什么？", "300 DPI 页面预设为印刷常用值，普通页面可自由输入。"),
            ("哪些格式可用？", "常见 JPG、PNG、TIFF、WEBP 等格式都可作为输出。"),
        ],
        "image_to_pdf": [
            ("可以合并多张图片吗？", "可以，默认支持合并成一个 PDF，也可分别导出。"),
            ("能设置纸张尺寸和方向吗？", "可以，支持 A4、Letter、原始尺寸以及横向纵向。"),
            ("上传顺序会保留吗？", "会，上传顺序直接决定 PDF 页顺序。"),
        ],
        "pdf_to_image": [
            ("会逐页导出吗？", "会，系统会按 PDF 页数输出单独图片。"),
            ("可以控制清晰度吗？", "可以，通过渲染倍率和质量参数控制输出效果。"),
            ("如何下载结果？", "多页结果会提供 ZIP 下载，也可逐页下载。"),
        ],
        "pdf_merge": [
            ("支持多个 PDF 合并吗？", "支持，上传多个文件后会按当前顺序合并。"),
            ("会改动原页面内容吗？", "不会，默认只做文档级拼接。"),
            ("适合归档吗？", "适合合同、发票和扫描件整理。"),
        ],
        "pdf_split": [
            ("能按页码范围拆分吗？", "可以，支持单页和多个区间。"),
            ("多区间会怎么输出？", "系统会生成多个 PDF 文件并统一打包。"),
            ("适合哪些场景？", "适合章节提取、合同拆件和附件整理。"),
        ],
        "pdf_extract_images": [
            ("提取的是原始图片吗？", "会优先提取 PDF 内嵌图片对象。"),
            ("多张图片如何返回？", "会按页码和序号命名，并提供 ZIP 下载。"),
            ("适合素材回收吗？", "适合从方案、手册和资料中回收原图。"),
        ],
        "pdf_delete_pages": [
            ("可以删多个页码吗？", "可以，支持单页、多页和多个区间组合输入。"),
            ("顺序会保留吗？", "会，剩余页面保持原有顺序。"),
            ("原文件会被覆盖吗？", "不会，会生成新的 PDF 下载文件。"),
        ],
    }
    items = base.get(mode, base["image_convert"])
    result = [{"question": q, "answer": a} for q, a in items]
    result.append({"question": f"{title} 是否免费可用？", "answer": f"是的，{title} 页面可直接使用。"})
    return result


def build_use_cases(tool: ToolConfig) -> tuple[str, ...]:
    special = {
        "resize-image-to-kb": ("报名照片", "考试上传", "表单附件"),
        "compress": ("网站上传", "电商素材", "社媒配图"),
        "jpg-to-pdf": ("证件扫描", "作品集整理", "申请材料"),
        "merge-pdf": ("合同归档", "发票汇总", "资料打包"),
        "split-pdf": ("章节拆分", "附件拆件", "页码提取"),
        "delete-pdf-pages": ("删除封面", "去空白页", "清理附录"),
        "extract-images-from-pdf": ("提取插图", "回收原图", "素材整理"),
        "300-dpi-converter": ("印刷输出", "出版交付", "海报素材"),
    }
    if tool.slug in special:
        return special[tool.slug]
    if tool.mode == "image_compress":
        return ("网站上传", "内容发布", "素材瘦身")
    if tool.mode == "image_target_size":
        return ("报名附件", "上传限额", "证件照片")
    if tool.mode == "image_convert":
        return ("格式兼容", "跨平台传图", "素材整理")
    if tool.mode == "image_resize":
        return ("改尺寸", "裁切前准备", "统一比例")
    if tool.mode == "image_dpi":
        return ("印刷准备", "扫描件整理", "分辨率调整")
    if tool.mode == "pdf_to_image":
        return ("导出页面", "制作缩略图", "提取预览")
    return ("文档整理", "批量处理", "统一下载")


def build_processing_label(tool: ToolConfig) -> str:
    strategy = build_client_strategy(tool)
    if strategy == "browser":
        return "浏览器本地处理"
    if strategy == "hybrid":
        return "优先本地处理"
    return "服务器处理"


def build_processing_notice(tool: ToolConfig) -> str:
    strategy = build_client_strategy(tool)
    if strategy == "browser":
        return "常见图片会直接在浏览器里处理，文件无需上传到服务器。"
    if strategy == "hybrid":
        return "常见图片会优先在浏览器中处理；不支持的格式会自动切换到服务器。"
    return "当前工具需要在服务器完成处理，适合 PDF、RAW 和特殊格式场景。"


def build_client_strategy(tool: ToolConfig) -> str:
    if tool.slug in SERVER_ONLY_SLUGS or tool.mode.startswith("pdf_"):
        return "server"
    if tool.slug in HYBRID_SLUGS or tool.mode in {"image_compress", "image_convert", "image_resize", "image_target_size", "image_to_pdf"}:
        return "hybrid"
    return "server"


def default_max_file_mb(tool: ToolConfig) -> int:
    if tool.mode.startswith("pdf_") or tool.mode in {"pdf_merge", "pdf_split", "pdf_extract_images", "pdf_delete_pages", "image_to_pdf"}:
        return 80
    if tool.slug == "raw-converter":
        return 60
    return 25


def default_max_files(tool: ToolConfig) -> int:
    if tool.mode in {"pdf_split", "pdf_extract_images", "pdf_delete_pages"}:
        return 1
    if tool.mode == "pdf_merge":
        return 20
    return 30


def build_search_blob(tool: ToolConfig) -> str:
    parts = [tool.title, tool.description, tool.subtitle, *tool.aliases, *tool.use_cases, tool.slug.replace("-", " ")]
    return " ".join(parts).lower()


def build_format_summary(tool: ToolConfig) -> str:
    if tool.mode.startswith("pdf_") or tool.mode in {"pdf_merge", "pdf_split", "pdf_extract_images", "pdf_delete_pages"}:
        return "支持 PDF 文件"
    if tool.fixed_input_formats:
        labels = [FORMAT_LABELS.get(fmt, fmt.upper()) for fmt in tool.fixed_input_formats[:6]]
        return "支持 " + "、".join(labels)
    return "支持常见图片格式"


def tool(**kwargs: Any) -> ToolConfig:
    return ToolConfig(hero_tags=("批量处理", "参数可控", "上传反馈清晰", "统一下载"), **kwargs)


def build_core_tools() -> list[ToolConfig]:
    return [
        tool(
            slug="compress",
            title="图片压缩",
            description="在线批量压缩 JPG、PNG、WEBP、GIF 等图片，兼顾体积与画质。",
            subtitle="批量导入图片，调节质量与压缩策略，更适合网站上传、素材瘦身和快速交付。",
            category="popular",
            mode="image_compress",
            icon="◌",
            accept_extensions=COMMON_IMAGE_ACCEPT,
            default_options={"quality": 82, "keep_metadata": False, "lossless": False},
            ui={"quality": True, "keep_metadata": True, "lossless": True},
            related_slugs=("jpg-compress", "png-compress", "webp-compress", "resize-image-to-kb"),
            home_rank=10,
        ),
        tool(
            slug="convert",
            title="图片格式转换",
            description="将 PNG、WEBP、BMP、TIFF、HEIC 或 RAW 图像批量转换为常见格式。",
            subtitle="统一选择输出格式和质量参数，让批量转换更稳定、更适合素材整理与交付。",
            category="popular",
            mode="image_convert",
            icon="◇",
            accept_extensions=ALL_IMAGE_ACCEPT,
            output_formats=IMAGE_OUTPUT_FORMATS,
            default_options={"output_format": "jpg", "quality": 90, "keep_metadata": False},
            ui={"format_select": True, "quality": True, "keep_metadata": True},
            related_slugs=("png-to-jpg", "jpg-to-png", "webp-to-jpg", "raw-converter"),
            home_rank=9,
        ),
        tool(
            slug="resize",
            title="图片改尺寸",
            description="安全、免费、轻松地调整图像大小，支持像素尺寸与比例控制。",
            subtitle="适合网站配图、电商主图、文章插图和社媒素材尺寸规范化。",
            category="popular",
            mode="image_resize",
            icon="▣",
            accept_extensions=COMMON_IMAGE_ACCEPT,
            output_formats=IMAGE_OUTPUT_FORMATS,
            default_options={"width": 1920, "height": 1080, "keep_aspect_ratio": True, "output_format": "jpg", "quality": 90},
            ui={"size": True, "keep_aspect_ratio": True, "format_select": True, "quality": True},
            related_slugs=("resize-image-to-kb", "compress", "dpi-converter"),
            home_rank=8,
        ),
        tool(
            slug="resize-image-to-kb",
            title="照片压缩到指定大小",
            description="将图像压缩为 20KB、50KB、100KB、200KB 或任意目标大小。",
            subtitle="输入目标体积后自动迭代处理，适合报名照片、表单附件和上传限制场景。",
            category="popular",
            mode="image_target_size",
            icon="◎",
            accept_extensions=COMMON_IMAGE_ACCEPT,
            default_options={"target_kb": 100, "keep_metadata": False},
            ui={"target_kb": True, "keep_metadata": True},
            related_slugs=("compress-image-to-20kb", "compress-image-to-50kb", "compress-image-to-100kb"),
            home_rank=7,
        ),
        tool(
            slug="300-dpi-converter",
            title="300 DPI 修改器",
            description="在线批量把图片的 DPI 设为 300，适合印刷、出版和高精度交付。",
            subtitle="保留像素尺寸，仅更新分辨率元数据，减少重复进设计软件调整的步骤。",
            category="popular",
            mode="image_dpi",
            icon="◍",
            accept_extensions=COMMON_IMAGE_ACCEPT,
            output_formats=("jpg", "png", "tiff", "webp"),
            default_options={"dpi": 300, "output_format": "jpg", "quality": 92},
            ui={"dpi": True, "format_select": True, "quality": True},
            related_slugs=("dpi-converter", "resize"),
            home_rank=6,
        ),
        tool(
            slug="jpg-to-pdf",
            title="JPG 转 PDF",
            description="将 JPG、PNG、BMP、TIFF、WEBP、HEIC 等图片转换为 PDF，可合并或拆分输出。",
            subtitle="支持方向、边距、页面尺寸和合并方式设置，适合证件扫描、作品集和提交流程。",
            category="popular",
            mode="image_to_pdf",
            icon="▤",
            accept_extensions=ALL_IMAGE_ACCEPT,
            default_options={"page_size": "A4", "orientation": "portrait", "margin": 24, "merge_mode": "single"},
            ui={"pdf_layout": True},
            related_slugs=("image-to-pdf", "pdf-to-jpg", "merge-pdf"),
            badge="New",
            home_rank=5,
        ),
        tool(
            slug="jpg-compress",
            title="JPG 压缩",
            description="批量压缩 JPG 文件，并尽量保持细节与色彩完整。",
            subtitle="适合相机导出图、电商主图、内容封面和大图交付压缩。",
            category="compress",
            mode="image_compress",
            icon="J",
            fixed_input_formats=("jpg", "jpeg"),
            accept_extensions=FORMAT_EXTENSIONS["jpg"],
            default_options={"quality": 82, "keep_metadata": False, "lossless": False},
            ui={"quality": True, "keep_metadata": True},
            related_slugs=("compress", "compress-image-to-50kb"),
            home_rank=4,
        ),
        tool(
            slug="png-compress",
            title="PNG 压缩",
            description="使用有损和无损策略压缩 PNG 图像，并尽量保留透明度。",
            subtitle="适合 UI 资源、Logo、图标和需要透明背景的网页素材。",
            category="compress",
            mode="image_compress",
            icon="P",
            fixed_input_formats=("png",),
            accept_extensions=FORMAT_EXTENSIONS["png"],
            default_options={"quality": 88, "keep_metadata": False, "lossless": True},
            ui={"quality": True, "keep_metadata": True, "lossless": True},
            related_slugs=("compress", "compress-image-to-100kb"),
            home_rank=3,
        ),
        tool(
            slug="gif-compress",
            title="GIF 压缩",
            description="批量压缩和减小 GIF 动画文件大小，适合社媒和内容后台上传限制。",
            subtitle="通过色板与质量策略降低动画体积，兼顾播放顺滑度与下载速度。",
            category="compress",
            mode="image_compress",
            icon="G",
            fixed_input_formats=("gif",),
            accept_extensions=FORMAT_EXTENSIONS["gif"],
            default_options={"quality": 75, "keep_metadata": False, "lossless": False},
            ui={"quality": True},
            related_slugs=("compress", "webp-compress"),
            home_rank=2,
        ),
        tool(
            slug="webp-compress",
            title="WebP 压缩",
            description="使用有损或无损方式压缩 WebP 图片，适合现代 Web 资源优化。",
            subtitle="在性能与体积之间取得平衡，适合网页首屏与内容卡片场景。",
            category="compress",
            mode="image_compress",
            icon="W",
            fixed_input_formats=("webp",),
            accept_extensions=FORMAT_EXTENSIONS["webp"],
            default_options={"quality": 80, "keep_metadata": False, "lossless": False},
            ui={"quality": True, "keep_metadata": True, "lossless": True},
            related_slugs=("compress", "png-compress"),
            home_rank=1,
        ),
        tool(
            slug="compress-image-to-20kb",
            title="图片压缩到 20KB",
            description="适合极限体积约束场景，例如报名照、证件照或表单上传。",
            subtitle="系统会优先在画质可接受范围内逼近 20KB 目标。",
            category="compress",
            mode="image_target_size",
            icon="20",
            accept_extensions=COMMON_IMAGE_ACCEPT,
            default_options={"target_kb": 20, "keep_metadata": False},
            ui={"target_kb": True, "keep_metadata": True, "locked_target_kb": True},
            related_slugs=("resize-image-to-kb", "compress-image-to-50kb"),
            show_on_home=False,
        ),
        tool(
            slug="compress-image-to-50kb",
            title="图片压缩到 50KB",
            description="轻松批量压缩 JPG、PNG、WEBP 文件至 50KB。",
            subtitle="适合网站头像、证件照提交与内容后台图片限制场景。",
            category="compress",
            mode="image_target_size",
            icon="50",
            accept_extensions=COMMON_IMAGE_ACCEPT,
            default_options={"target_kb": 50, "keep_metadata": False},
            ui={"target_kb": True, "keep_metadata": True, "locked_target_kb": True},
            related_slugs=("resize-image-to-kb", "compress-image-to-100kb"),
        ),
        tool(
            slug="compress-image-to-100kb",
            title="图片压缩到 100KB",
            description="轻松批量压缩 JPG、PNG、WEBP 文件至 100KB。",
            subtitle="常用于博客配图、封面上传、社媒缩略图与轻量化资源交付。",
            category="compress",
            mode="image_target_size",
            icon="100",
            accept_extensions=COMMON_IMAGE_ACCEPT,
            default_options={"target_kb": 100, "keep_metadata": False},
            ui={"target_kb": True, "keep_metadata": True, "locked_target_kb": True},
            related_slugs=("resize-image-to-kb", "compress-image-to-50kb"),
        ),
        tool(
            slug="png-to-jpg",
            title="PNG 转 JPG",
            description="快速将多个 PNG 图像转换为 JPG，适合网站压缩与兼容性处理。",
            subtitle="自动处理批量输出与统一下载，适合透明图层转白底输出场景。",
            category="convert",
            mode="image_convert",
            icon="→",
            fixed_input_formats=("png",),
            fixed_output_format="jpg",
            accept_extensions=FORMAT_EXTENSIONS["png"],
            default_options={"output_format": "jpg", "quality": 92, "keep_metadata": False},
            ui={"quality": True, "keep_metadata": True},
            related_slugs=("convert", "jpg-to-png", "image-to-jpg"),
        ),
        tool(
            slug="jpg-to-png",
            title="JPG 转 PNG",
            description="在线快速将多个 JPG 图片转为 PNG，适合需要透明编辑流程的中间稿输出。",
            subtitle="一次完成批量转换，适合继续设计、修图或做透明背景相关处理。",
            category="convert",
            mode="image_convert",
            icon="↔",
            fixed_input_formats=("jpg", "jpeg"),
            fixed_output_format="png",
            accept_extensions=FORMAT_EXTENSIONS["jpg"],
            default_options={"output_format": "png", "quality": 95, "keep_metadata": False},
            ui={"keep_metadata": True},
            related_slugs=("convert", "png-to-jpg", "image-to-png"),
        ),
        tool(
            slug="webp-to-jpg",
            title="WEBP 转 JPG",
            description="在线将多张 WEBP 图片转换为 JPG，便于旧系统兼容与通用分发。",
            subtitle="适合站点资源回传、办公系统上传和社媒后台二次编辑。",
            category="convert",
            mode="image_convert",
            icon="W→J",
            fixed_input_formats=("webp",),
            fixed_output_format="jpg",
            accept_extensions=FORMAT_EXTENSIONS["webp"],
            default_options={"output_format": "jpg", "quality": 90, "keep_metadata": False},
            ui={"quality": True, "keep_metadata": True},
            related_slugs=("convert", "webp-to-png", "image-to-jpg"),
        ),
        tool(
            slug="webp-to-png",
            title="WEBP 转 PNG",
            description="在线将多个 WEBP 图像转换为 PNG，适合进一步设计编辑或透明输出。",
            subtitle="在兼顾画质的前提下，将现代网页格式转为更通用的设计稿格式。",
            category="convert",
            mode="image_convert",
            icon="W→P",
            fixed_input_formats=("webp",),
            fixed_output_format="png",
            accept_extensions=FORMAT_EXTENSIONS["webp"],
            default_options={"output_format": "png", "quality": 95, "keep_metadata": False},
            ui={"keep_metadata": True},
            related_slugs=("convert", "webp-to-jpg", "image-to-png"),
        ),
        tool(
            slug="heic-to-jpg",
            title="HEIC 转 JPG",
            description="将 iPhone HEIC 图像转换为 JPG，便于网页、办公系统和社媒上传。",
            subtitle="支持批量处理苹果设备图像，让跨平台兼容更省事。",
            category="convert",
            mode="image_convert",
            icon="H→J",
            fixed_input_formats=("heic", "heif"),
            fixed_output_format="jpg",
            accept_extensions=FORMAT_EXTENSIONS["heic"] + FORMAT_EXTENSIONS["heif"],
            default_options={"output_format": "jpg", "quality": 92, "keep_metadata": False},
            ui={"quality": True, "keep_metadata": True},
            related_slugs=("convert", "raw-converter", "image-to-jpg"),
        ),
        tool(
            slug="raw-converter",
            title="RAW 转换器",
            description="转换 CR2、CR3、NEF、ARW、ORF、PEF、RAF、RAW 等相机原片为常见格式。",
            subtitle="适合摄影初筛、快速预览交付和跨端流转的批量 RAW 输出场景。",
            category="convert",
            mode="image_convert",
            icon="RAW",
            fixed_input_formats=RAW_FORMATS,
            accept_extensions=tuple(dict.fromkeys(ext for fmt in RAW_FORMATS for ext in FORMAT_EXTENSIONS[fmt])),
            output_formats=("jpg", "png", "webp", "tiff"),
            default_options={"output_format": "jpg", "quality": 92, "keep_metadata": False},
            ui={"format_select": True, "quality": True, "keep_metadata": True},
            related_slugs=("convert", "heic-to-jpg", "image-to-jpg"),
        ),
        tool(
            slug="dpi-converter",
            title="DPI 转换器",
            description="在线批量更改图像 DPI，可自由输入任意目标分辨率值。",
            subtitle="适合印刷、出版、扫描件整理和规范化导出场景。",
            category="convert",
            mode="image_dpi",
            icon="DPI",
            accept_extensions=COMMON_IMAGE_ACCEPT,
            output_formats=("jpg", "png", "tiff", "webp"),
            default_options={"dpi": 144, "output_format": "jpg", "quality": 92},
            ui={"dpi": True, "format_select": True, "quality": True},
            related_slugs=("300-dpi-converter", "resize"),
            show_on_home=False,
        ),
        tool(
            slug="pdf-to-jpg",
            title="PDF 转 JPG",
            description="将 PDF 文档逐页转换为高质量 JPG 图片，适合提取页面预览与内容分发。",
            subtitle="支持渲染倍率设置与批量下载，适合扫描件、方案页和演示稿导出。",
            category="pdf",
            mode="pdf_to_image",
            icon="PDF→J",
            fixed_output_format="jpg",
            accept_extensions=(".pdf",),
            default_options={"output_format": "jpg", "zoom": 2.0, "quality": 90},
            ui={"pdf_image_format": True, "quality": True},
            related_slugs=("pdf-to-image", "extract-images-from-pdf", "jpg-to-pdf"),
            badge="New",
        ),
        tool(
            slug="pdf-to-image",
            title="PDF 转 图片",
            description="在几秒钟内将 PDF 转换为高质量的 JPG、PNG 或 WEBP 图片。",
            subtitle="适合页面归档、缩略图生成和内容审核流转。",
            category="pdf",
            mode="pdf_to_image",
            icon="PDF→IMG",
            accept_extensions=(".pdf",),
            output_formats=PDF_IMAGE_OUTPUT_FORMATS,
            default_options={"output_format": "png", "zoom": 2.0, "quality": 92},
            ui={"pdf_image_format": True, "quality": True},
            related_slugs=("pdf-to-jpg", "extract-images-from-pdf"),
            badge="New",
        ),
        tool(
            slug="merge-pdf",
            title="PDF 合并",
            description="合并多个 PDF 文件以创建单个文档，适合扫描件归档与材料提交。",
            subtitle="上传顺序即合并顺序，统一输出单个 PDF 文件。",
            category="pdf",
            mode="pdf_merge",
            icon="＋",
            accept_extensions=(".pdf",),
            related_slugs=("split-pdf", "delete-pdf-pages", "jpg-to-pdf"),
            badge="New",
        ),
        tool(
            slug="split-pdf",
            title="PDF 拆分",
            description="按页码区间拆分 PDF，把选定页面输出为单独文件。",
            subtitle="适合合同拆件、章节提取和多份附件整理。",
            category="pdf",
            mode="pdf_split",
            icon="÷",
            accept_extensions=(".pdf",),
            default_options={"page_ranges": "1-1"},
            ui={"page_ranges": True},
            related_slugs=("merge-pdf", "delete-pdf-pages"),
            badge="New",
        ),
        tool(
            slug="extract-images-from-pdf",
            title="提取 PDF 中图片",
            description="从 PDF 文档中提取内嵌图片资源，适合回收设计稿与资料中的原图。",
            subtitle="自动按页码与序号整理结果，便于统一打包下载。",
            category="pdf",
            mode="pdf_extract_images",
            icon="⇩",
            accept_extensions=(".pdf",),
            related_slugs=("pdf-to-image", "delete-pdf-pages"),
            badge="New",
        ),
        tool(
            slug="delete-pdf-pages",
            title="删除 PDF 页数",
            description="从 PDF 文档中删除指定页面，输出新的整理版本。",
            subtitle="适合清理封面、空白页、重复页和无关附录。",
            category="pdf",
            mode="pdf_delete_pages",
            icon="−",
            accept_extensions=(".pdf",),
            default_options={"page_ranges": "1"},
            ui={"page_ranges": True},
            related_slugs=("split-pdf", "merge-pdf"),
            badge="New",
        ),
    ]


def build_source_converter(source_format: str) -> ToolConfig:
    label = FORMAT_LABELS[source_format]
    return tool(
        slug=f"{source_format}-converter",
        title=f"{label} 转换器",
        description=f"将 {label} 图片转换为 JPG、PNG、WEBP、AVIF、BMP、ICO 或 TIFF 等格式。",
        subtitle=f"以 {label} 为输入起点，批量输出到常用图片格式。",
        category="converters",
        mode="image_convert",
        icon=label,
        fixed_input_formats=(source_format,),
        output_formats=tuple(fmt for fmt in IMAGE_OUTPUT_FORMATS if fmt != source_format),
        accept_extensions=FORMAT_EXTENSIONS[source_format],
        default_options={"output_format": "jpg", "quality": 90, "keep_metadata": False},
        ui={"format_select": True, "quality": True, "keep_metadata": True},
        related_slugs=("convert", "image-to-jpg", "image-to-png"),
        show_on_home=False,
    )


def build_image_to_format(target_format: str) -> ToolConfig:
    label = FORMAT_LABELS[target_format]
    return tool(
        slug=f"image-to-{target_format}",
        title=f"图片转 {label}",
        description=f"把常见图片批量转换为 {label} 格式，统一输出并支持 ZIP 下载。",
        subtitle=f"适合把不同来源的图片统一整理为 {label} 工作流。",
        category="converters",
        mode="image_convert",
        icon=label,
        fixed_output_format=target_format,
        accept_extensions=ALL_IMAGE_ACCEPT,
        default_options={"output_format": target_format, "quality": 90, "keep_metadata": False},
        ui={"quality": True, "keep_metadata": True},
        related_slugs=("convert", "png-to-jpg", "jpg-to-png"),
        show_on_home=False,
    )


def build_image_to_pdf_variant(source_format: str, label: str) -> ToolConfig:
    return tool(
        slug=f"{source_format}-to-pdf",
        title=f"{label} 转 PDF",
        description=f"把 {label} 图片转换为 PDF，可选单文件合并或多文件分别导出。",
        subtitle=f"适合把 {label} 图片整理成可提交、可打印、可归档的 PDF 文档。",
        category="pdf",
        mode="image_to_pdf",
        icon=f"{label}→PDF",
        fixed_input_formats=(source_format,),
        accept_extensions=FORMAT_EXTENSIONS[source_format],
        default_options={"page_size": "A4", "orientation": "portrait", "margin": 24, "merge_mode": "single"},
        ui={"pdf_layout": True},
        related_slugs=("jpg-to-pdf", "merge-pdf"),
        show_on_home=False,
        badge="New",
    )


def build_tools() -> dict[str, ToolConfig]:
    tools = build_core_tools()
    tools.extend(
        build_source_converter(fmt)
        for fmt in (
            "jpg", "png", "webp", "avif", "bmp", "cr2", "cr3", "crw", "dcr", "dds", "dng", "erf", "fff",
            "gif", "heic", "heif", "jfif", "mrw", "nef", "orf", "pef", "psd", "raf", "raw", "tif", "tiff",
            "x3f", "3fr", "arw",
        )
    )
    tools.extend(build_image_to_format(fmt) for fmt in ("jpg", "jpeg", "png", "webp", "avif", "bmp", "ico", "tiff"))
    tools.extend(
        [
            tool(
                slug="image-to-pdf",
                title="图片转 PDF",
                description="将多种图片格式整理成一个或多个 PDF 文件。",
                subtitle="适合多源图片统一归档与材料提交。",
                category="pdf",
                mode="image_to_pdf",
                icon="IMG→PDF",
                accept_extensions=ALL_IMAGE_ACCEPT,
                default_options={"page_size": "A4", "orientation": "portrait", "margin": 24, "merge_mode": "single"},
                ui={"pdf_layout": True},
                related_slugs=("jpg-to-pdf", "png-to-pdf", "webp-to-pdf"),
                show_on_home=False,
                badge="New",
            ),
            build_image_to_pdf_variant("png", "PNG"),
            build_image_to_pdf_variant("webp", "WEBP"),
            build_image_to_pdf_variant("heic", "HEIC"),
            build_image_to_pdf_variant("tiff", "TIFF"),
            build_image_to_pdf_variant("bmp", "BMP"),
        ]
    )
    return {item.slug: item for item in tools}


TOOLS = build_tools()


def get_tool(slug: str) -> ToolConfig | None:
    return TOOLS.get(slug)


def all_tools() -> list[ToolConfig]:
    return list(TOOLS.values())


def visible_tools() -> list[ToolConfig]:
    return [item for item in TOOLS.values() if item.show_on_tools]


def home_tools() -> list[ToolConfig]:
    return sorted((item for item in TOOLS.values() if item.show_on_home), key=lambda item: item.home_rank, reverse=True)


def category_groups() -> list[dict[str, Any]]:
    groups: list[dict[str, Any]] = []
    for key, meta in CATEGORY_META.items():
        items = [item for item in TOOLS.values() if item.category == key and item.show_on_tools]
        if items:
            items.sort(key=lambda item: (0 if item.slug in POPULAR_SLUGS else 1, item.title))
            groups.append({"key": key, **meta, "items": items})
    return groups


def nav_groups() -> list[ToolConfig]:
    return [TOOLS[slug] for slug in NAV_SLUGS if slug in TOOLS]


def tool_index() -> list[dict[str, Any]]:
    index: list[dict[str, Any]] = []
    for item in visible_tools():
        payload = item.to_payload()
        index.append(
            {
                "slug": item.slug,
                "title": item.title,
                "description": item.description,
                "category": item.category,
                "category_label": CATEGORY_META[item.category]["label"],
                "processing_label": payload["processing_label"],
                "use_cases": payload["use_cases"],
                "search_blob": payload["search_blob"],
                "path": f"/zh-CN/{item.slug}",
            }
        )
    return index


def scenario_groups() -> list[dict[str, Any]]:
    groups = [
        {
            "title": "我想把图片压到上传限制",
            "description": "适合报名、表单、后台上传等有大小限制的场景。",
            "slugs": ("resize-image-to-kb", "compress-image-to-50kb", "compress-image-to-100kb"),
        },
        {
            "title": "我想改格式或改尺寸",
            "description": "把图片统一成指定格式、宽高或适合不同平台的比例。",
            "slugs": ("convert", "resize", "png-to-jpg", "jpg-to-png"),
        },
        {
            "title": "我想处理印刷和清晰度",
            "description": "适合 300 DPI、打印输出和扫描件整理。",
            "slugs": ("300-dpi-converter", "dpi-converter", "resize"),
        },
        {
            "title": "我想整理 PDF 文件",
            "description": "把图片转成 PDF，或者对 PDF 进行合并、拆分、提图和删页。",
            "slugs": ("jpg-to-pdf", "merge-pdf", "split-pdf", "extract-images-from-pdf"),
        },
    ]
    return [{**group, "items": [TOOLS[slug] for slug in group["slugs"] if slug in TOOLS]} for group in groups]
