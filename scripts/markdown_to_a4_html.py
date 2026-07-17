#!/usr/bin/env python3
"""Convert a Markdown file to an A4-printable HTML document.

Usage:
  python3 scripts/markdown_to_a4_html.py README.md Prints/README_print.html
"""

from __future__ import annotations

import argparse
import html
import re
import sys
from pathlib import Path
from typing import List, Tuple


def escape_html(text: str) -> str:
    return html.escape(text, quote=False)


def format_inline(text: str) -> str:
    text = escape_html(text)
    text = re.sub(r"`([^`]+)`", r"<code>\1</code>", text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"\*([^*]+)\*", r"<em>\1</em>", text)
    text = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r'<a href="\2">\1</a>', text)
    return text


def parse_markdown(lines: List[str]) -> List[Tuple[str, str]]:
    blocks: List[Tuple[str, str]] = []
    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        if not stripped:
            i += 1
            continue

        if stripped.startswith("```"):
            fence_lang = stripped[3:].strip()
            code_lines: List[str] = []
            i += 1
            while i < len(lines) and not lines[i].strip().startswith("```"):
                code_lines.append(lines[i])
                i += 1
            if i < len(lines):
                i += 1
            code = "\n".join(code_lines)
            blocks.append(("code", f"<pre><code class=\"language-{escape_html(fence_lang)}\">{escape_html(code)}</code></pre>"))
            continue

        if re.match(r"^#{1,6}\s+", line):
            level = len(line) - len(line.lstrip("#"))
            title = line.lstrip("#").strip()
            blocks.append(("heading", f"<h{level}>{format_inline(title)}</h{level}>"))
            i += 1
            continue

        if re.match(r"^---\s*$", stripped):
            blocks.append(("hr", "<hr />"))
            i += 1
            continue

        if re.match(r"^\|", stripped):
            rows: List[List[str]] = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                cells = [cell.strip() for cell in lines[i].strip().strip("|").split("|")]
                rows.append(cells)
                i += 1
            if len(rows) >= 2:
                header = rows[0]
                body_rows = rows[2:] if len(rows) > 1 and re.fullmatch(r":?-{3,}:?", rows[1][0]) else rows[1:]
                table_rows = ["<tr>" + "".join(f"<th>{format_inline(c)}</th>" for c in header) + "</tr>"]
                for row in body_rows:
                    table_rows.append("<tr>" + "".join(f"<td>{format_inline(c)}</td>" for c in row) + "</tr>")
                blocks.append(("table", "<table>" + "".join(table_rows) + "</table>"))
                continue

        if re.match(r"^[-*]\s+", stripped):
            items: List[str] = []
            while i < len(lines) and re.match(r"^[-*]\s+", lines[i].strip()):
                items.append(lines[i].strip()[2:].strip())
                i += 1
            blocks.append(("ul", "<ul>" + "".join(f"<li>{format_inline(item)}</li>" for item in items) + "</ul>"))
            continue

        if re.match(r"^\d+\.\s+", stripped):
            items: List[str] = []
            while i < len(lines) and re.match(r"^\d+\.\s+", lines[i].strip()):
                items.append(lines[i].strip().split(".", 1)[1].strip())
                i += 1
            blocks.append(("ol", "<ol>" + "".join(f"<li>{format_inline(item)}</li>" for item in items) + "</ol>"))
            continue

        if stripped.startswith(">"):
            quote_lines: List[str] = []
            while i < len(lines) and lines[i].strip().startswith(">"):
                quote_lines.append(lines[i].strip()[1:].strip())
                i += 1
            blocks.append(("blockquote", "<blockquote>" + "".join(f"<p>{format_inline(line)}</p>" for line in quote_lines) + "</blockquote>"))
            continue

        paragraph_lines: List[str] = []
        while i < len(lines) and lines[i].strip():
            if lines[i].strip().startswith("```"):
                break
            if re.match(r"^#{1,6}\s+", lines[i]) or re.match(r"^---\s*$", lines[i].strip()) or re.match(r"^\|", lines[i].strip()) or re.match(r"^[-*]\s+", lines[i].strip()) or re.match(r"^\d+\.\s+", lines[i].strip()) or lines[i].strip().startswith(">"):
                break
            paragraph_lines.append(lines[i].strip())
            i += 1
        if paragraph_lines:
            text = " ".join(paragraph_lines)
            blocks.append(("p", f"<p>{format_inline(text)}</p>"))
            continue

        i += 1

    return blocks


def build_html(markdown_text: str, source_name: str) -> str:
    lines = markdown_text.splitlines()
    blocks = parse_markdown(lines)

    title = source_name.replace(".md", "").replace(".markdown", "")
    pages: List[str] = []
    current_parts: List[str] = []
    current_page_length = 0
    title_block: str | None = None
    section_parts: List[str] = []

    def flush_page() -> None:
        nonlocal current_parts, current_page_length
        if current_parts:
            pages.append("<section class=\"page\">" + "".join(current_parts) + "</section>")
            current_parts = []
            current_page_length = 0

    def append_section(section_html: str) -> None:
        nonlocal current_parts, current_page_length, title_block
        section_length = len(section_html)
        if current_parts and current_page_length + section_length > 2200:
            flush_page()
        if title_block and not current_parts:
            current_parts.append(title_block)
            title_block = None
        current_parts.append(section_html)
        current_page_length = len("".join(current_parts))

    for kind, content in blocks:
        if kind == "heading" and "<h1>" in content:
            title = content.replace("<h1>", "").replace("</h1>", "")
            title_block = content
            continue

        if kind == "heading" and "<h2>" in content:
            if section_parts:
                append_section("".join(section_parts))
            section_parts = [content]
            continue

        if kind == "heading" and "<h3>" in content:
            section_parts.append(content)
            continue

        section_parts.append(content)

    if section_parts:
        append_section("".join(section_parts))

    flush_page()

    if not pages:
        pages = ["<section class=\"page\"><p>本文がありません。</p></section>"]

    page_markup = "\n".join(pages)

    return f"""<!doctype html>
<html lang=\"ja\">
<head>
  <meta charset=\"utf-8\">
  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">
  <title>{escape_html(title)}（印刷用）</title>
  <style>
    :root {{
      --ink: #111827;
      --muted: #5b6472;
      --line: #d7dce5;
      --bg: #e8ecf3;
      --accent: #1f4d8f;
    }}

    @page {{
      size: A4;
      margin: 12mm;
    }}

    * {{ box-sizing: border-box; }}

    body {{
      margin: 0;
      font-family: \"Noto Sans JP\", \"Hiragino Kaku Gothic ProN\", \"Yu Gothic\", sans-serif;
      line-height: 1.6;
      color: var(--ink);
      background: var(--bg);
      padding: 10px 0;
    }}

    .page {{
      width: 210mm;
      min-height: 297mm;
      margin: 12px auto;
      padding: 12mm 14mm;
      background: #fff;
      border: 1px solid var(--line);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
      page-break-after: always;
      break-after: page;
    }}

    .page:last-child {{
      page-break-after: auto;
      break-after: auto;
    }}

    .doc-title {{
      font-size: 24px;
      font-weight: 700;
      margin: 0 0 6px;
      color: var(--accent);
    }}

    .doc-subtitle {{
      font-size: 12px;
      color: var(--muted);
      margin: 0 0 12px;
    }}

    h1, h2, h3 {{
      color: var(--accent);
      break-inside: avoid;
      page-break-inside: avoid;
    }}

    h1 {{ font-size: 26px; margin: 0 0 12px; }}
    h2 {{ font-size: 18px; margin: 20px 0 8px; padding-bottom: 6px; border-bottom: 2px solid var(--line); }}
    h3 {{ font-size: 15px; margin: 14px 0 6px; }}

    p, li, td, th {{ font-size: 12px; }}

    p {{ margin: 0 0 8px; }}

    ul, ol {{ padding-left: 18px; margin: 0 0 10px; }}
    li {{ margin: 3px 0; }}

    blockquote {{
      margin: 8px 0 10px;
      padding: 8px 10px;
      border-left: 4px solid var(--accent);
      background: #f7f9fc;
      color: var(--muted);
    }}

    pre {{
      margin: 8px 0 10px;
      padding: 8px 10px;
      background: #0f172a;
      color: #f8fafc;
      overflow-x: auto;
      font-size: 11px;
      white-space: pre-wrap;
      word-break: break-word;
    }}

    code {{ font-family: Consolas, \"Courier New\", monospace; font-size: 11px; }}

    table {{
      width: 100%;
      border-collapse: collapse;
      margin: 8px 0 12px;
      font-size: 11px;
    }}

    th, td {{
      border: 1px solid var(--line);
      padding: 6px 8px;
      text-align: left;
      vertical-align: top;
    }}

    th {{ background: #f4f7fb; }}

    hr {{ border: none; border-top: 1px solid var(--line); margin: 12px 0; }}

    a {{ color: var(--accent); text-decoration: none; }}

    @media print {{
      body {{ background: #fff; padding: 0; }}
      .page {{
        margin: 0;
        border: none;
        box-shadow: none;
        width: auto;
        min-height: 297mm;
      }}
    }}
  </style>
</head>
<body>
  <main>
    {page_markup}
  </main>
</body>
</html>
"""


def main() -> int:
    parser = argparse.ArgumentParser(description="Convert Markdown to A4-printable HTML")
    parser.add_argument("input", nargs="?", default="README.md", help="Input Markdown file")
    parser.add_argument("output", nargs="?", default=None, help="Output HTML file")
    args = parser.parse_args()

    input_path = Path(args.input)
    output_path = Path(args.output) if args.output else Path("Prints") / f"{input_path.stem}_print.html"

    if not input_path.exists():
        print(f"Error: input file not found: {input_path}", file=sys.stderr)
        return 1

    markdown_text = input_path.read_text(encoding="utf-8")
    html_text = build_html(markdown_text, input_path.name)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(html_text, encoding="utf-8")
    print(f"Wrote {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
