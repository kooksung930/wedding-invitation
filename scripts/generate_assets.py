from __future__ import annotations

import json
from pathlib import Path

import qrcode
from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
GALLERY_DIR = ROOT / "gallery"
WEB_GALLERY_DIR = GALLERY_DIR / "web"
RESOURCE_DIR = ROOT / "resource"
QR_PATH = RESOURCE_DIR / "bride_valley_qr.png"
MANIFEST_PATH = WEB_GALLERY_DIR / "manifest.json"
VENUE_URL = "https://naver.me/FDnCdx7B"
MAX_SIZE = (1600, 1600)
JPEG_QUALITY = 82


def generate_qr() -> None:
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=3,
    )
    qr.add_data(VENUE_URL)
    qr.make(fit=True)
    image = qr.make_image(fill_color="#4a332c", back_color="#f7f0e8").convert("RGB")
    image.save(QR_PATH)


def build_gallery() -> None:
    WEB_GALLERY_DIR.mkdir(parents=True, exist_ok=True)
    items: list[str] = []

    for path in sorted(GALLERY_DIR.iterdir()):
        if not path.is_file():
            continue
        if path.parent == WEB_GALLERY_DIR:
            continue
        if path.suffix.lower() not in {".jpg", ".jpeg", ".png"}:
            continue

        output_path = WEB_GALLERY_DIR / f"{path.stem}.jpg"
        with Image.open(path) as image:
            image = ImageOps.exif_transpose(image)
            if image.mode not in {"RGB", "L"}:
                image = image.convert("RGB")
            elif image.mode == "L":
                image = image.convert("RGB")
            image.thumbnail(MAX_SIZE, Image.Resampling.LANCZOS)
            image.save(
                output_path,
                "JPEG",
                quality=JPEG_QUALITY,
                optimize=True,
                progressive=True,
            )
        items.append(f"gallery/web/{output_path.name}")

    MANIFEST_PATH.write_text(
        json.dumps(items, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def main() -> None:
    generate_qr()
    build_gallery()


if __name__ == "__main__":
    main()
