
from pathlib import Path
import re

pattern = re.compile(
    r'<header\b[^>]*class=["\'][^"\']*\bsite-header\b'
    r'[^"\']*["\'][^>]*>[\s\S]*?</header>',
    re.IGNORECASE
)

for file in Path(".").rglob("index.html"):
    if any(part in {".git", ".venv"} for part in file.parts):
        continue

    html = file.read_text(encoding="utf-8")

    def replace_header(match):
        opening_tag = match.group(0).split(">", 1)[0]
        classes = "site-header"

        if "support-header" in opening_tag:
            classes += " support-header"

        return (
            f'<header class="{classes}" '
            f'id="didar-site-header"></header>'
        )

    updated, count = pattern.subn(
        replace_header, html, count=1
    )

    if count:
        file.write_text(updated, encoding="utf-8")
        print("Updated:", file)
