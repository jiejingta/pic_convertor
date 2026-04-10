from __future__ import annotations

import io
from pathlib import Path

import fitz
import pytest
from fastapi.testclient import TestClient
from PIL import Image, ImageDraw

from app.main import app
from app.services import processor
from app.services.processor import ProcessingError


class DummyUpload:
    def __init__(self, filename: str, payload: bytes) -> None:
        self.filename = filename
        self.file = io.BytesIO(payload)


def image_bytes(fmt: str = "PNG", size: tuple[int, int] = (320, 200), color: str = "#4477ff") -> bytes:
    mode = "RGB" if fmt.upper() in {"JPEG", "JPG"} else "RGBA"
    image = Image.new(mode, size, color)
    ImageDraw.Draw(image).rectangle((24, 24, size[0] - 24, size[1] - 24), outline="white", width=6)
    buffer = io.BytesIO()
    image.save(buffer, format=fmt)
    return buffer.getvalue()


def pdf_bytes(with_image: bool = False, pages: int = 1) -> bytes:
    document = fitz.open()
    for index in range(pages):
        page = document.new_page()
        page.insert_text((72, 72), f"Hello PDF {index + 1}")
        if with_image and index == 0:
            page.insert_image(fitz.Rect(72, 140, 220, 260), stream=image_bytes("PNG", (220, 140), "#ff8844"))
    payload = document.tobytes()
    document.close()
    return payload


def setup_jobs(tmp_path, monkeypatch) -> None:
    jobs_dir = tmp_path / "jobs"
    jobs_dir.mkdir(parents=True, exist_ok=True)
    monkeypatch.setattr(processor, "JOBS_DIR", jobs_dir)


def test_home_and_tool_pages_render() -> None:
    client = TestClient(app)
    home = client.get("/zh-CN")
    convert = client.get("/zh-CN/convert")
    tools = client.get("/zh-CN/tools")
    assert home.status_code == 200
    assert convert.status_code == 200
    assert tools.status_code == 200
    assert client.get("/sitemap.xml").status_code == 200
    for response in (home, convert, tools):
        assert "SEO 标题" not in response.text
        assert "配置驱动生成" not in response.text
        assert "结构化数据" not in response.text
        assert 'href="http://testserver' in response.text
    favicon = client.get("/favicon.ico")
    assert favicon.status_code == 200
    assert favicon.headers["content-type"].startswith("image/svg+xml")


def test_image_convert_and_resize(tmp_path, monkeypatch) -> None:
    setup_jobs(tmp_path, monkeypatch)
    upload = DummyUpload("sample.png", image_bytes("PNG"))
    result = processor.process_tool("png-to-jpg", "image_convert", {"output_format": "jpg", "quality": "88"}, [upload], fixed_output="jpg")
    assert result["count"] == 1
    output = Path(tmp_path / "jobs" / result["job_id"] / "output").glob("*.jpg")
    assert next(output)

    upload = DummyUpload("sample.jpg", image_bytes("JPEG"))
    resized = processor.process_tool(
        "resize",
        "image_resize",
        {"width": "120", "height": "90", "keep_aspect_ratio": "true", "output_format": "png"},
        [upload],
    )
    assert resized["count"] == 1


def test_target_size_and_image_to_pdf(tmp_path, monkeypatch) -> None:
    setup_jobs(tmp_path, monkeypatch)
    upload = DummyUpload("sample.png", image_bytes("PNG", (1200, 900)))
    result = processor.process_tool("compress-image-to-100kb", "image_target_size", {"target_kb": "100"}, [upload])
    assert result["count"] == 1

    pdf_result = processor.process_tool(
        "jpg-to-pdf",
        "image_to_pdf",
        {"page_size": "A4", "orientation": "portrait", "margin": "24", "merge_mode": "single"},
        [DummyUpload("a.png", image_bytes("PNG")), DummyUpload("b.png", image_bytes("PNG", color="#55bb88"))],
    )
    assert pdf_result["count"] == 1
    assert pdf_result["items"][0]["name"].endswith(".pdf")


def test_pdf_modes(tmp_path, monkeypatch) -> None:
    setup_jobs(tmp_path, monkeypatch)
    source_pdf = DummyUpload("sample.pdf", pdf_bytes(with_image=True))

    images = processor.process_tool("pdf-to-image", "pdf_to_image", {"output_format": "png", "zoom": "1.5"}, [source_pdf])
    assert images["count"] >= 1

    merged = processor.process_tool(
        "merge-pdf",
        "pdf_merge",
        {},
        [DummyUpload("a.pdf", pdf_bytes()), DummyUpload("b.pdf", pdf_bytes())],
    )
    assert merged["count"] == 1

    split = processor.process_tool("split-pdf", "pdf_split", {"page_ranges": "1-1"}, [DummyUpload("a.pdf", pdf_bytes())])
    assert split["count"] == 1

    extracted = processor.process_tool("extract-images-from-pdf", "pdf_extract_images", {}, [DummyUpload("a.pdf", pdf_bytes(with_image=True))])
    assert extracted["count"] >= 1

    cleaned = processor.process_tool("delete-pdf-pages", "pdf_delete_pages", {"page_ranges": "1"}, [DummyUpload("a.pdf", pdf_bytes(pages=2))])
    assert cleaned["count"] == 1


def test_upload_limits_are_enforced(tmp_path, monkeypatch) -> None:
    setup_jobs(tmp_path, monkeypatch)
    with pytest.raises(ProcessingError):
        processor.process_tool(
            "compress",
            "image_compress",
            {"quality": "80"},
            [DummyUpload("too-large.jpg", image_bytes("JPEG", (600, 600)))],
            max_file_mb=0,
            max_files=1,
        )
