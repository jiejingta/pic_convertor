from __future__ import annotations

import io
import json
import math
import shutil
import zipfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from uuid import uuid4

import fitz
import rawpy
from PIL import Image, ImageOps, ImageSequence, UnidentifiedImageError
from pillow_heif import register_heif_opener

from app.config import JOBS_DIR

register_heif_opener()
Image.MAX_IMAGE_PIXELS = None

OUTPUT_FORMATS = {
    "jpg": "JPEG",
    "jpeg": "JPEG",
    "png": "PNG",
    "webp": "WEBP",
    "avif": "AVIF",
    "bmp": "BMP",
    "ico": "ICO",
    "tiff": "TIFF",
    "gif": "GIF",
}

RAW_EXTENSIONS = {
    "raw", "cr2", "cr3", "crw", "dcr", "dng", "erf", "fff", "mrw", "nef", "orf", "pef", "raf", "x3f", "3fr", "arw"
}


class ProcessingError(Exception):
    pass


@dataclass
class SavedInput:
    path: Path
    name: str
    size_bytes: int


def suffix_of(path: Path) -> str:
    return path.suffix.lower().lstrip(".")


def normalize_format(value: str | None, *, fallback: str = "jpg") -> str:
    if not value:
        return fallback
    lowered = value.lower()
    if lowered in {"jpg", "jpeg"}:
        return "jpg"
    if lowered in {"tif", "tiff"}:
        return "tiff"
    if lowered == "jfif":
        return "jpg"
    if lowered in OUTPUT_FORMATS:
        return lowered
    raise ProcessingError(f"暂不支持导出 {value} 格式。")


def ensure_mode(image: Image.Image, output_format: str) -> Image.Image:
    if output_format == "jpg":
        if image.mode in {"RGBA", "LA"}:
            background = Image.new("RGB", image.size, (255, 255, 255))
            background.paste(image, mask=image.getchannel("A"))
            return background
        return image.convert("RGB")
    if output_format in {"png", "webp", "avif", "tiff", "gif"}:
        return image.convert("RGBA") if image.mode == "P" and "transparency" in image.info else image
    if output_format in {"bmp", "ico"}:
        return image.convert("RGBA")
    return image


def parse_bool(value: Any, *, default: bool = False) -> bool:
    if value is None:
        return default
    return str(value).lower() in {"1", "true", "yes", "on"}


def parse_int(value: Any, *, default: int) -> int:
    if value in (None, ""):
        return default
    return int(float(str(value)))


def parse_float(value: Any, *, default: float) -> float:
    if value in (None, ""):
        return default
    return float(str(value))


def parse_page_ranges(raw: str) -> list[tuple[int, int]]:
    ranges: list[tuple[int, int]] = []
    for chunk in [part.strip() for part in raw.split(",") if part.strip()]:
        if "-" in chunk:
            start_raw, end_raw = chunk.split("-", 1)
            start = int(start_raw)
            end = int(end_raw)
        else:
            start = end = int(chunk)
        if start <= 0 or end <= 0 or end < start:
            raise ProcessingError("页码范围格式不正确。")
        ranges.append((start, end))
    if not ranges:
        raise ProcessingError("请至少输入一个页码范围。")
    return ranges


def create_job_dirs() -> tuple[str, Path, Path, Path]:
    job_id = uuid4().hex
    job_dir = JOBS_DIR / job_id
    input_dir = job_dir / "input"
    output_dir = job_dir / "output"
    input_dir.mkdir(parents=True, exist_ok=True)
    output_dir.mkdir(parents=True, exist_ok=True)
    return job_id, job_dir, input_dir, output_dir


def save_uploads(files: list[Any], input_dir: Path, *, max_file_mb: int, max_files: int) -> list[SavedInput]:
    if len(files) > max_files:
        raise ProcessingError(f"一次最多上传 {max_files} 个文件。")
    saved: list[SavedInput] = []
    max_file_bytes = max_file_mb * 1024 * 1024
    for index, upload in enumerate(files, start=1):
        filename = Path(getattr(upload, "filename", "") or f"file-{index}").name
        if not filename:
            continue
        target = input_dir / filename
        with target.open("wb") as handle:
            shutil.copyfileobj(upload.file, handle)
        if target.stat().st_size > max_file_bytes:
            target.unlink(missing_ok=True)
            raise ProcessingError(f"{filename} 超过单个文件大小限制（{max_file_mb}MB）。")
        saved.append(SavedInput(path=target, name=filename, size_bytes=target.stat().st_size))
    if not saved:
        raise ProcessingError("请至少上传一个文件。")
    return saved


def open_image(path: Path) -> Image.Image:
    extension = suffix_of(path)
    if extension in RAW_EXTENSIONS:
        with rawpy.imread(str(path)) as raw:
            rgb = raw.postprocess(use_camera_wb=True, output_bps=8)
        return Image.fromarray(rgb)
    try:
        return Image.open(path)
    except UnidentifiedImageError as exc:
        raise ProcessingError(f"无法识别图片文件: {path.name}") from exc


def output_name(name: str, extension: str) -> str:
    return f"{Path(name).stem}.{extension}"


def serialize_item(path: Path, *, source_name: str | None = None, source_size: int | None = None) -> dict[str, Any]:
    relative = path.relative_to(JOBS_DIR.parent).as_posix()
    size_bytes = path.stat().st_size
    return {
        "name": path.name,
        "url": f"/storage/{relative}",
        "preview_url": f"/storage/{relative}" if path.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".avif", ".ico", ".tif", ".tiff"} else None,
        "size_bytes": size_bytes,
        "size_kb": round(size_bytes / 1024, 2),
        "source_name": source_name,
        "source_size_bytes": source_size,
        "saved_bytes": source_size - size_bytes if source_size and source_size > size_bytes else None,
    }


def make_zip(paths: list[Path], output_dir: Path, archive_name: str = "results.zip") -> Path | None:
    if len(paths) <= 1:
        return None
    archive = output_dir / archive_name
    with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED) as bundle:
        for path in paths:
            bundle.write(path, arcname=path.name)
    return archive


def save_image_bytes(
    image: Image.Image,
    *,
    output_format: str,
    quality: int = 90,
    keep_metadata: bool = False,
    lossless: bool = False,
    dpi: int | None = None,
) -> bytes:
    if output_format not in OUTPUT_FORMATS:
        raise ProcessingError(f"暂不支持导出 {output_format}。")

    prepared = ensure_mode(image.copy(), output_format)
    buffer = io.BytesIO()
    params: dict[str, Any] = {}
    if keep_metadata and "exif" in image.info:
        params["exif"] = image.info["exif"]
    if dpi:
        params["dpi"] = (dpi, dpi)

    if output_format == "jpg":
        params.update({"format": "JPEG", "quality": max(1, min(100, quality)), "optimize": True, "progressive": True})
    elif output_format == "png":
        if not lossless:
            colors = max(16, min(256, int(quality * 2.3)))
            if prepared.mode not in {"RGBA", "LA"}:
                prepared = prepared.convert("P", palette=Image.ADAPTIVE, colors=colors)
        params.update({"format": "PNG", "optimize": True, "compress_level": 9})
    elif output_format == "webp":
        params.update({"format": "WEBP", "quality": max(1, min(100, quality)), "lossless": lossless, "method": 6})
    elif output_format == "avif":
        params.update({"format": "AVIF", "quality": max(1, min(100, quality)), "speed": 6})
    elif output_format == "bmp":
        params.update({"format": "BMP"})
    elif output_format == "ico":
        icon = prepared.copy()
        icon.thumbnail((256, 256))
        prepared = icon
        params.update({"format": "ICO"})
    elif output_format == "tiff":
        params.update({"format": "TIFF", "compression": "tiff_lzw" if lossless else "tiff_adobe_deflate"})
    elif output_format == "gif":
        params.update({"format": "GIF", "optimize": True})
        if prepared.mode not in {"P", "L"}:
            prepared = prepared.convert("P", palette=Image.ADAPTIVE, colors=max(16, min(256, int(quality * 2.3))))

    prepared.save(buffer, **params)
    return buffer.getvalue()


def write_image(
    image: Image.Image,
    destination: Path,
    *,
    output_format: str,
    quality: int = 90,
    keep_metadata: bool = False,
    lossless: bool = False,
    dpi: int | None = None,
) -> Path:
    payload = save_image_bytes(
        image,
        output_format=output_format,
        quality=quality,
        keep_metadata=keep_metadata,
        lossless=lossless,
        dpi=dpi,
    )
    destination.write_bytes(payload)
    return destination


def resize_image(image: Image.Image, width: int, height: int, keep_aspect_ratio: bool) -> Image.Image:
    width = max(1, width)
    height = max(1, height)
    prepared = image.copy()
    if keep_aspect_ratio:
        return ImageOps.contain(prepared, (width, height), method=Image.Resampling.LANCZOS)
    return prepared.resize((width, height), Image.Resampling.LANCZOS)


def compress_target_bytes(image: Image.Image, *, output_format: str, target_kb: int, keep_metadata: bool) -> bytes:
    target_bytes = target_kb * 1024
    working = image.copy()
    best = save_image_bytes(working, output_format=output_format, quality=92, keep_metadata=keep_metadata)
    if len(best) <= target_bytes:
        return best

    for scale in (1.0, 0.92, 0.84, 0.76, 0.68, 0.6):
        if scale < 1.0:
            width = max(1, math.floor(image.width * scale))
            height = max(1, math.floor(image.height * scale))
            working = resize_image(image, width, height, keep_aspect_ratio=True)
        low, high = 10, 95
        candidate = best
        for _ in range(8):
            quality = (low + high) // 2
            attempt = save_image_bytes(working, output_format=output_format, quality=quality, keep_metadata=keep_metadata)
            if len(attempt) <= target_bytes:
                candidate = attempt
                low = quality + 1
            else:
                high = quality - 1
        if len(candidate) <= target_bytes:
            return candidate
        if len(candidate) < len(best):
            best = candidate
    return best


def process_animated_gif(source: Path, destination: Path, quality: int) -> Path:
    image = Image.open(source)
    frames = []
    durations = []
    for frame in ImageSequence.Iterator(image):
        prepared = frame.convert("P", palette=Image.ADAPTIVE, colors=max(16, min(256, int(quality * 2.2))))
        frames.append(prepared)
        durations.append(frame.info.get("duration", 80))
    if not frames:
        raise ProcessingError(f"GIF 文件没有可处理的帧: {source.name}")
    frames[0].save(
        destination,
        format="GIF",
        save_all=True,
        append_images=frames[1:],
        optimize=True,
        loop=image.info.get("loop", 0),
        duration=durations,
    )
    return destination


def pick_image_output(source: SavedInput, form: dict[str, Any], *, default: str | None = None) -> str:
    raw_default = form.get("output_format") or default or suffix_of(source.path) or "jpg"
    try:
        result = normalize_format(raw_default, fallback="jpg")
    except ProcessingError:
        result = "jpg"
    if result not in OUTPUT_FORMATS:
        raise ProcessingError(f"当前不支持输出 {result}。")
    return result


def process_image_mode(mode: str, source: SavedInput, output_dir: Path, form: dict[str, Any], fixed_output: str | None = None) -> Path:
    quality = parse_int(form.get("quality"), default=90)
    keep_metadata = parse_bool(form.get("keep_metadata"))
    output_format = pick_image_output(source, form, default=fixed_output)

    if mode == "image_compress" and suffix_of(source.path) == "gif":
        destination = output_dir / output_name(source.name, "gif")
        return process_animated_gif(source.path, destination, quality)

    image = open_image(source.path)

    if mode == "image_resize":
        width = parse_int(form.get("width"), default=image.width)
        height = parse_int(form.get("height"), default=image.height)
        keep_aspect_ratio = parse_bool(form.get("keep_aspect_ratio"), default=True)
        image = resize_image(image, width, height, keep_aspect_ratio)
    elif mode == "image_dpi":
        dpi = parse_int(form.get("dpi"), default=300)
        destination = output_dir / output_name(source.name, output_format)
        return write_image(image, destination, output_format=output_format, quality=quality, keep_metadata=keep_metadata, dpi=dpi)
    elif mode == "image_target_size":
        target_kb = parse_int(form.get("target_kb"), default=100)
        payload = compress_target_bytes(image, output_format=output_format, target_kb=target_kb, keep_metadata=keep_metadata)
        destination = output_dir / output_name(source.name, output_format)
        destination.write_bytes(payload)
        return destination

    lossless = parse_bool(form.get("lossless"))
    destination = output_dir / output_name(source.name, output_format)
    return write_image(
        image,
        destination,
        output_format=output_format,
        quality=quality,
        keep_metadata=keep_metadata,
        lossless=lossless,
    )


def pdf_page_rect(page_size: str, orientation: str, image_size: tuple[int, int], margin: int) -> fitz.Rect:
    if page_size == "A4":
        width, height = (595, 842)
    elif page_size == "Letter":
        width, height = (612, 792)
    else:
        width, height = image_size
    if orientation == "landscape":
        width, height = height, width
    return fitz.Rect(0, 0, width, height)


def fit_rect(page_rect: fitz.Rect, image_size: tuple[int, int], margin: int) -> fitz.Rect:
    page_w = page_rect.width - margin * 2
    page_h = page_rect.height - margin * 2
    image_w, image_h = image_size
    ratio = min(page_w / image_w, page_h / image_h)
    target_w = image_w * ratio
    target_h = image_h * ratio
    x0 = (page_rect.width - target_w) / 2
    y0 = (page_rect.height - target_h) / 2
    return fitz.Rect(x0, y0, x0 + target_w, y0 + target_h)


def build_pdf_from_images(sources: list[SavedInput], output_dir: Path, form: dict[str, Any]) -> list[Path]:
    page_size = str(form.get("page_size") or "A4")
    orientation = str(form.get("orientation") or "portrait")
    margin = parse_int(form.get("margin"), default=24)
    merge_mode = str(form.get("merge_mode") or "single")

    def render_one(target_name: str, selected_sources: list[SavedInput]) -> Path:
        pdf = fitz.open()
        for source in selected_sources:
            image = open_image(source.path)
            image_bytes = save_image_bytes(image, output_format="png", quality=95)
            rect = pdf_page_rect(page_size, orientation, image.size, margin)
            page = pdf.new_page(width=rect.width, height=rect.height)
            page.insert_image(fit_rect(rect, image.size, margin), stream=image_bytes)
        target = output_dir / target_name
        pdf.save(target)
        pdf.close()
        return target

    if merge_mode == "multiple":
        return [render_one(f"{Path(item.name).stem}.pdf", [item]) for item in sources]
    return [render_one("merged-images.pdf", sources)]


def export_pdf_pages(source: SavedInput, output_dir: Path, form: dict[str, Any], fixed_output: str | None) -> list[Path]:
    output_format = normalize_format(fixed_output or str(form.get("output_format") or "jpg"), fallback="jpg")
    zoom = parse_float(form.get("zoom"), default=2.0)
    quality = parse_int(form.get("quality"), default=90)
    document = fitz.open(source.path)
    outputs: list[Path] = []
    for index, page in enumerate(document, start=1):
        pixmap = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom), alpha=False)
        image = Image.open(io.BytesIO(pixmap.tobytes("png")))
        target = output_dir / f"{Path(source.name).stem}-p{index:03d}.{output_format}"
        write_image(image, target, output_format=output_format, quality=quality)
        outputs.append(target)
    document.close()
    return outputs


def merge_pdfs(sources: list[SavedInput], output_dir: Path) -> list[Path]:
    merged = fitz.open()
    for source in sources:
        current = fitz.open(source.path)
        merged.insert_pdf(current)
        current.close()
    target = output_dir / "merged.pdf"
    merged.save(target)
    merged.close()
    return [target]


def split_pdf(source: SavedInput, output_dir: Path, ranges_raw: str) -> list[Path]:
    document = fitz.open(source.path)
    ranges = parse_page_ranges(ranges_raw)
    outputs: list[Path] = []
    for start, end in ranges:
        if end > document.page_count:
            raise ProcessingError("拆分页码超出 PDF 页数。")
        bundle = fitz.open()
        bundle.insert_pdf(document, from_page=start - 1, to_page=end - 1)
        target = output_dir / f"{Path(source.name).stem}-{start}-{end}.pdf"
        bundle.save(target)
        bundle.close()
        outputs.append(target)
    document.close()
    return outputs


def extract_pdf_images(source: SavedInput, output_dir: Path) -> list[Path]:
    document = fitz.open(source.path)
    outputs: list[Path] = []
    for page_number, page in enumerate(document, start=1):
        for index, image_info in enumerate(page.get_images(full=True), start=1):
            image = document.extract_image(image_info[0])
            extension = image.get("ext", "png")
            target = output_dir / f"{Path(source.name).stem}-p{page_number:03d}-{index:02d}.{extension}"
            target.write_bytes(image["image"])
            outputs.append(target)
    document.close()
    if not outputs:
        raise ProcessingError("这个 PDF 中没有检测到可提取的内嵌图片。")
    return outputs


def delete_pdf_pages(source: SavedInput, output_dir: Path, ranges_raw: str) -> list[Path]:
    document = fitz.open(source.path)
    remove_pages: set[int] = set()
    for start, end in parse_page_ranges(ranges_raw):
        if end > document.page_count:
            raise ProcessingError("删除页码超出 PDF 页数。")
        remove_pages.update(range(start - 1, end))

    result = fitz.open()
    for page_index in range(document.page_count):
        if page_index in remove_pages:
            continue
        result.insert_pdf(document, from_page=page_index, to_page=page_index)
    if result.page_count == 0:
        result.close()
        document.close()
        raise ProcessingError("删除后 PDF 将为空，请至少保留一页。")
    target = output_dir / f"{Path(source.name).stem}-clean.pdf"
    result.save(target)
    result.close()
    document.close()
    return [target]


def serialize_job(job_id: str, outputs: list[Path], output_dir: Path, inputs: list[SavedInput]) -> dict[str, Any]:
    source_map = {item.name: item for item in inputs}
    items = []
    for path in outputs:
        stem = Path(path.name).stem
        source = next((entry for entry in inputs if Path(entry.name).stem in stem), None)
        items.append(serialize_item(path, source_name=source.name if source else None, source_size=source.size_bytes if source else None))
    archive = make_zip(outputs, output_dir)
    return {
        "job_id": job_id,
        "items": items,
        "archive_url": serialize_item(archive)["url"] if archive else None,
        "count": len(items),
    }


def process_tool(
    slug: str,
    mode: str,
    form: dict[str, Any],
    files: list[Any],
    *,
    fixed_output: str | None = None,
    max_file_mb: int = 25,
    max_files: int = 30,
) -> dict[str, Any]:
    job_id, _job_dir, input_dir, output_dir = create_job_dirs()
    saved = save_uploads(files, input_dir, max_file_mb=max_file_mb, max_files=max_files)

    outputs: list[Path] = []
    if mode in {"image_compress", "image_convert", "image_resize", "image_target_size", "image_dpi"}:
        for source in saved:
            outputs.append(process_image_mode(mode, source, output_dir, form, fixed_output))
    elif mode == "image_to_pdf":
        outputs = build_pdf_from_images(saved, output_dir, form)
    elif mode == "pdf_to_image":
        for source in saved:
            outputs.extend(export_pdf_pages(source, output_dir, form, fixed_output))
    elif mode == "pdf_merge":
        outputs = merge_pdfs(saved, output_dir)
    elif mode == "pdf_split":
        if len(saved) != 1:
            raise ProcessingError("PDF 拆分一次只支持上传一个 PDF。")
        outputs = split_pdf(saved[0], output_dir, str(form.get("page_ranges") or ""))
    elif mode == "pdf_extract_images":
        if len(saved) != 1:
            raise ProcessingError("提取图片一次只支持上传一个 PDF。")
        outputs = extract_pdf_images(saved[0], output_dir)
    elif mode == "pdf_delete_pages":
        if len(saved) != 1:
            raise ProcessingError("删除页数一次只支持上传一个 PDF。")
        outputs = delete_pdf_pages(saved[0], output_dir, str(form.get("page_ranges") or ""))
    else:
        raise ProcessingError(f"未知处理模式: {mode}")

    if not outputs:
        raise ProcessingError("没有生成任何输出文件。")
    return serialize_job(job_id, outputs, output_dir, saved)
