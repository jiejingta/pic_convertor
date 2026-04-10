from __future__ import annotations

import json
from datetime import date
from typing import Any

from fastapi import Request

from app.config import SITE_DESCRIPTION, SITE_NAME, SITE_URL


def resolve_site_url(request: Request | None = None) -> str:
    if SITE_URL:
        return SITE_URL
    if request is None:
        return "http://localhost:8000"
    forwarded_proto = request.headers.get("x-forwarded-proto", "").split(",")[0].strip()
    forwarded_host = request.headers.get("x-forwarded-host", "").split(",")[0].strip()
    scheme = forwarded_proto or request.url.scheme or "http"
    host = forwarded_host or request.headers.get("host") or request.url.netloc
    return f"{scheme}://{host}".rstrip("/")


def canonical(site_url: str, path: str) -> str:
    return f"{site_url.rstrip('/')}{path}"


def website_schema(site_url: str) -> dict[str, Any]:
    return {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": SITE_NAME,
        "description": SITE_DESCRIPTION,
        "url": site_url,
        "inLanguage": "zh-CN",
    }


def breadcrumb_schema(site_url: str, items: list[tuple[str, str]]) -> dict[str, Any]:
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": index, "name": label, "item": canonical(site_url, path)}
            for index, (label, path) in enumerate(items, start=1)
        ],
    }


def faq_schema(faqs: list[dict[str, str]]) -> dict[str, Any]:
    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {
                "@type": "Question",
                "name": item["question"],
                "acceptedAnswer": {"@type": "Answer", "text": item["answer"]},
            }
            for item in faqs
        ],
    }


def software_schema(site_url: str, title: str, description: str, path: str) -> dict[str, Any]:
    return {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": title,
        "applicationCategory": "MultimediaApplication",
        "operatingSystem": "Web",
        "description": description,
        "url": canonical(site_url, path),
        "publisher": {"@type": "Organization", "name": SITE_NAME},
        "offers": {"@type": "Offer", "price": "0", "priceCurrency": "CNY"},
    }


def collection_schema(site_url: str, title: str, description: str, path: str, entries: list[dict[str, str]]) -> dict[str, Any]:
    return {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": title,
        "description": description,
        "url": canonical(site_url, path),
        "mainEntity": {
            "@type": "ItemList",
            "itemListElement": [
                {
                    "@type": "ListItem",
                    "position": index,
                    "name": entry["title"],
                    "url": canonical(site_url, entry["path"]),
                }
                for index, entry in enumerate(entries, start=1)
            ],
        },
    }


def json_ld(schemas: list[dict[str, Any]]) -> list[str]:
    return [json.dumps(schema, ensure_ascii=False) for schema in schemas]


def iso_today() -> str:
    return date.today().isoformat()
